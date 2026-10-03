import type { GraphSecurityEvent } from "../src/graphModel.js";

/** Repeatable synthetic graph seed: three client transfers total $73,500. */
export const attackScenarioSeed: GraphSecurityEvent[] = [
  {
    eventId: "SEED-ATK-001", eventType: "MALWARE_DETECTED", timestamp: "2026-09-18T10:02:00.000Z",
    source: "synthetic-seed", advisorId: "ADV-1042", deviceId: "DEVICE-204", severity: "HIGH",
  },
  {
    eventId: "SEED-ATK-002", eventType: "SUSPICIOUS_LOGIN", timestamp: "2026-09-18T10:08:00.000Z",
    source: "synthetic-seed", advisorId: "ADV-1042", deviceId: "DEVICE-204", sessionId: "SESSION-8821", severity: "HIGH",
  },
  {
    eventId: "SEED-ATK-003", eventType: "NEW_DESTINATION_ADDED", timestamp: "2026-09-18T10:23:00.000Z",
    source: "synthetic-seed", advisorId: "ADV-1042", deviceId: "DEVICE-204", sessionId: "SESSION-8821",
    clientId: "CLIENT-501", accountId: "ACCOUNT-88301", destinationId: "DEST-9921", severity: "HIGH",
  },
  ...[
    { clientId: "CLIENT-501", accountId: "ACCOUNT-88301", transactionId: "TX-90218", amount: 48000, minute: "41" },
    { clientId: "CLIENT-502", accountId: "ACCOUNT-77420", transactionId: "TX-90231", amount: 18000, minute: "44" },
    { clientId: "CLIENT-503", accountId: "ACCOUNT-66110", transactionId: "TX-90244", amount: 7500, minute: "46" },
  ].map(({ clientId, accountId, transactionId, amount, minute }, index): GraphSecurityEvent => ({
    eventId: `SEED-ATK-00${index + 4}`,
    eventType: "TRANSFER_INITIATED",
    timestamp: `2026-09-18T10:${minute}:00.000Z`,
    source: "synthetic-seed",
    advisorId: "ADV-1042",
    deviceId: "DEVICE-204",
    sessionId: "SESSION-8821",
    clientId,
    accountId,
    destinationId: "DEST-9921",
    transactionId,
    amount,
    severity: "HIGH",
  })),
];
