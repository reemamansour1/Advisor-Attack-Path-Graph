import type { SecurityEvent } from "@aapg/shared";
import { describe, expect, it } from "vitest";

import { CORRELATION_WINDOW_MS } from "./cluster.js";
import { correlateEvents } from "./correlate.js";
import { syntheticAttackScenario, syntheticNormalScenario } from "./fixtures.js";
import { calculateFinancialExposure, calculateRiskScore, getSeverity } from "./score.js";

function event(partial: SecurityEvent): SecurityEvent {
  return {
    metadata: { dataClass: "synthetic" },
    ...partial,
  };
}

describe("getSeverity", () => {
  it("maps the documented thresholds", () => {
    expect(getSeverity(0)).toBe("LOW");
    expect(getSeverity(29)).toBe("LOW");
    expect(getSeverity(30)).toBe("MEDIUM");
    expect(getSeverity(49)).toBe("MEDIUM");
    expect(getSeverity(50)).toBe("HIGH");
    expect(getSeverity(79)).toBe("HIGH");
    expect(getSeverity(80)).toBe("CRITICAL");
    expect(getSeverity(115)).toBe("CRITICAL");
  });
});

describe("synthetic scenarios", () => {
  it("keeps normal activity LOW", () => {
    const incidents = correlateEvents(syntheticNormalScenario.events, {
      directory: syntheticNormalScenario.directory,
    });

    expect(incidents).toHaveLength(1);
    const incident = incidents[0];
    expect(incident).toBeDefined();
    if (!incident) return;
    expect(incident.severity).toBe("LOW");
    expect(incident.riskScore).toBeLessThan(30);
    expect(incident.potentialExposure).toBe(0);
    expect(incident.synthetic).toBe(true);
  });

  it("scores the attack scenario CRITICAL at 115", () => {
    const incidents = correlateEvents(syntheticAttackScenario.events, {
      directory: syntheticAttackScenario.directory,
    });

    expect(incidents).toHaveLength(1);
    const incident = incidents[0];
    expect(incident).toBeDefined();
    if (!incident) return;

    expect(incident.severity).toBe("CRITICAL");
    expect(incident.riskScore).toBe(115);
    expect(calculateRiskScore(syntheticAttackScenario.events)).toBe(115);
    expect(incident.signals.reduce((total, signal) => total + signal.weight, 0)).toBe(115);
    expect(incident.signals.map((signal) => signal.code)).not.toContain("NEW_UNTRUSTED_DEVICE");
    expect(incident.title).toBe("Possible Advisor Account Takeover");
    expect(incident.status).toBe("OPEN");
    expect(incident.primaryAdvisorId).toBe("ADV-1042");
    expect(incident.primaryAdvisorName).toBe("Alex Morgan");
    expect(incident.advisorIds).toEqual(["ADV-1042"]);
    expect(incident.affectedClients.map((client) => client.displayName)).toEqual([
      "Priya Shah",
      "Daniel Okonkwo",
      "Riley Chen",
    ]);
    expect(incident.accountIds).toHaveLength(4);
    expect(new Set(incident.accountIds)).toEqual(
      new Set(["ACCOUNT-88301", "ACCOUNT-88314", "ACCOUNT-77420", "ACCOUNT-66110"]),
    );
    expect(incident.potentialExposure).toBe(73_500);
    expect(calculateFinancialExposure(syntheticAttackScenario.events)).toBe(73_500);
    expect(incident.affectedClients.reduce((total, client) => total + client.potentialExposure, 0)).toBe(
      73_500,
    );
    expect(incident.attackPath.primaryNodeIds).toEqual([
      "Device:DEVICE-204",
      "Advisor:ADV-1042",
      "Session:SESSION-8821",
      "Client:CLIENT-501",
      "Account:ACCOUNT-88301",
      "Destination:DEST-9921",
      "Transaction:TX-90218",
    ]);
  });
});

describe("correlation boundaries", () => {
  it("does not combine unrelated events that only share a timestamp", () => {
    const timestamp = "2026-09-18T11:00:00.000Z";
    const incidents = correlateEvents([
      event({
        eventId: "EVT-A",
        eventType: "MALWARE_DETECTED",
        timestamp,
        source: "endpoint-protection",
        advisorId: "ADV-1",
        deviceId: "DEVICE-1",
      }),
      event({
        eventId: "EVT-B",
        eventType: "TRANSFER_INITIATED",
        timestamp,
        source: "money-movement",
        advisorId: "ADV-2",
        clientId: "CLIENT-9",
        accountId: "ACCOUNT-9",
        destinationId: "DEST-9",
        transactionId: "TX-9",
        amount: 250_000,
      }),
    ]);

    expect(incidents).toHaveLength(2);
    const transfer = incidents.find((incident) => incident.eventIds.includes("EVT-B"));
    const malware = incidents.find((incident) => incident.eventIds.includes("EVT-A"));
    expect(transfer?.severity).toBe("LOW");
    expect(transfer?.riskScore).toBe(0);
    expect(transfer?.potentialExposure).toBe(0);
    expect(malware?.severity).toBe("MEDIUM");
    expect(malware?.eventIds).toEqual(["EVT-A"]);
  });

  it("does not treat a large transfer alone as a critical cyber incident", () => {
    const [incident] = correlateEvents([
      event({
        eventId: "EVT-FIN-1",
        eventType: "TRANSFER_INITIATED",
        timestamp: "2026-09-18T12:00:00.000Z",
        source: "money-movement",
        advisorId: "ADV-9",
        clientId: "CLIENT-9",
        accountId: "ACCOUNT-9",
        destinationId: "DEST-9",
        transactionId: "TX-9",
        amount: 250_000,
      }),
    ]);

    expect(incident?.severity).toBe("LOW");
    expect(incident?.riskScore).toBe(0);
    expect(incident?.potentialExposure).toBe(0);
    expect(incident?.severity).not.toBe("CRITICAL");
  });

  it("does not combine events outside the 60 minute window", () => {
    const start = "2026-09-18T10:00:00.000Z";
    const outside = new Date(Date.parse(start) + CORRELATION_WINDOW_MS + 1).toISOString();
    const incidents = correlateEvents([
      event({
        eventId: "EVT-W1",
        eventType: "MALWARE_DETECTED",
        timestamp: start,
        source: "endpoint-protection",
        advisorId: "ADV-1042",
        deviceId: "DEVICE-204",
      }),
      event({
        eventId: "EVT-W2",
        eventType: "TRANSFER_INITIATED",
        timestamp: outside,
        source: "money-movement",
        advisorId: "ADV-1042",
        accountId: "ACCOUNT-88301",
        transactionId: "TX-LATE",
        amount: 48_000,
      }),
    ]);

    expect(incidents).toHaveLength(2);
    expect(incidents.some((incident) => incident.severity === "CRITICAL")).toBe(false);
    expect(incidents.every((incident) => incident.eventIds.length === 1)).toBe(true);
  });

  it("still combines the same advisor path at the 60 minute boundary", () => {
    const start = "2026-09-18T10:00:00.000Z";
    const boundary = new Date(Date.parse(start) + CORRELATION_WINDOW_MS).toISOString();
    const incidents = correlateEvents([
      event({
        eventId: "EVT-EDGE-1",
        eventType: "MALWARE_DETECTED",
        timestamp: start,
        source: "endpoint-protection",
        advisorId: "ADV-1042",
        deviceId: "DEVICE-204",
      }),
      event({
        eventId: "EVT-EDGE-2",
        eventType: "SUSPICIOUS_LOGIN",
        timestamp: boundary,
        source: "identity-provider",
        advisorId: "ADV-1042",
        deviceId: "DEVICE-204",
        sessionId: "SESSION-1",
      }),
    ]);

    expect(incidents).toHaveLength(1);
    expect(incidents[0]?.riskScore).toBe(45);
    expect(incidents[0]?.severity).toBe("MEDIUM");
  });

  it("adds the untrusted-device weight only when metadata says so", () => {
    const score = calculateRiskScore([
      event({
        eventId: "EVT-U1",
        eventType: "SUSPICIOUS_LOGIN",
        timestamp: "2026-09-18T10:08:00.000Z",
        source: "identity-provider",
        advisorId: "ADV-1042",
        deviceId: "DEVICE-204",
        metadata: { newUntrustedDevice: true },
      }),
    ]);

    expect(score).toBe(30);
    expect(getSeverity(score)).toBe("MEDIUM");
  });
});
