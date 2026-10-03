import type {
  AffectedClient,
  EntityDirectory,
  Incident,
  IncidentStatus,
  SecurityEvent,
} from "@aapg/shared";

import { buildAttackPath } from "./graph.js";
import {
  buildSuspiciousTaint,
  calculateFinancialExposure,
  calculateRiskScore,
  evaluateSignals,
  getSeverity,
  isTransferOnSuspiciousPath,
} from "./score.js";

export interface BuildIncidentOptions {
  directory?: EntityDirectory;
  status?: IncidentStatus;
}

function createIncidentId(eventIds: readonly string[]): string {
  const basis = [...eventIds].sort().join("|");
  let hash = 2166136261;
  for (let index = 0; index < basis.length; index += 1) {
    hash ^= basis.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `INC-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function titleFor(signals: ReadonlySet<string>): string {
  const financial =
    signals.has("NEW_DESTINATION_ADDED") || signals.has("LARGE_OR_UNUSUAL_TRANSFER");
  if (signals.has("MALWARE_DETECTED") && signals.has("SUSPICIOUS_LOGIN") && financial) {
    return "Possible Advisor Account Takeover";
  }
  if (signals.has("MALWARE_DETECTED") && signals.has("SUSPICIOUS_LOGIN")) {
    return "Suspicious advisor session";
  }
  if (signals.has("MALWARE_DETECTED")) return "Endpoint compromise under review";
  if (financial) return "Financial activity review";
  return "Routine advisor servicing";
}

function clientIdFor(event: SecurityEvent, directory: EntityDirectory | undefined): string | undefined {
  if (event.clientId) return event.clientId;
  if (!event.accountId || !directory) return undefined;
  return directory.accounts[event.accountId]?.clientId;
}

function mostCommonAdvisor(events: readonly SecurityEvent[]): string | undefined {
  const counts = new Map<string, number>();
  for (const event of events) {
    if (!event.advisorId) continue;
    counts.set(event.advisorId, (counts.get(event.advisorId) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
  );
  return ranked[0]?.[0];
}

function affectedClients(
  events: readonly SecurityEvent[],
  directory: EntityDirectory | undefined,
): AffectedClient[] {
  const taint = buildSuspiciousTaint(events);
  const accountsByClient = new Map<string, Set<string>>();
  const exposureByClient = new Map<string, number>();

  const remember = (clientId: string | undefined, accountId: string | undefined): void => {
    if (!clientId) return;
    const accounts = accountsByClient.get(clientId) ?? new Set<string>();
    if (accountId) accounts.add(accountId);
    accountsByClient.set(clientId, accounts);
    if (!exposureByClient.has(clientId)) exposureByClient.set(clientId, 0);
  };

  for (const event of events) {
    remember(clientIdFor(event, directory), event.accountId);
    if (!isTransferOnSuspiciousPath(event, taint)) continue;
    const clientId = clientIdFor(event, directory);
    if (!clientId) continue;
    exposureByClient.set(clientId, (exposureByClient.get(clientId) ?? 0) + (event.amount ?? 0));
  }

  return [...accountsByClient.entries()]
    .map(([clientId, accounts]) => ({
      clientId,
      displayName: directory?.clients[clientId]?.displayName ?? clientId,
      accountIds: [...accounts].sort(),
      potentialExposure: exposureByClient.get(clientId) ?? 0,
    }))
    .sort(
      (left, right) =>
        right.potentialExposure - left.potentialExposure || left.clientId.localeCompare(right.clientId),
    );
}

export function buildIncident(
  events: readonly SecurityEvent[],
  options: BuildIncidentOptions = {},
): Incident {
  const ordered = [...events].sort(
    (left, right) =>
      Date.parse(left.timestamp) - Date.parse(right.timestamp) ||
      left.eventId.localeCompare(right.eventId),
  );
  const signals = evaluateSignals(ordered);
  const signalCodes = new Set(signals.map((signal) => signal.code));
  const riskScore = calculateRiskScore(ordered);
  const severity = getSeverity(riskScore);
  const potentialExposure = calculateFinancialExposure(ordered);
  const advisorIds = [...new Set(ordered.flatMap((event) => (event.advisorId ? [event.advisorId] : [])))].sort();
  const accountIds = [...new Set(ordered.flatMap((event) => (event.accountId ? [event.accountId] : [])))].sort();
  const primaryAdvisorId = mostCommonAdvisor(ordered);
  const primaryAdvisorName = primaryAdvisorId
    ? options.directory?.advisors[primaryAdvisorId]?.displayName ?? primaryAdvisorId
    : undefined;
  const eventIds = ordered.map((event) => event.eventId);
  const openedAt = ordered[0]?.timestamp ?? new Date(0).toISOString();
  const updatedAt = ordered[ordered.length - 1]?.timestamp ?? openedAt;
  const clients = affectedClients(ordered, options.directory);
  const advisorLabel = primaryAdvisorName ?? "An advisor";

  return {
    incidentId: createIncidentId(eventIds),
    title: titleFor(signalCodes),
    summary: `${advisorLabel} has a deterministic risk score of ${riskScore} (${severity}). Potential exposure on the suspicious path is ${potentialExposure} USD across ${clients.length} clients and ${accountIds.length} accounts.`,
    status: options.status ?? "OPEN",
    severity,
    riskScore,
    signals,
    eventIds,
    events: ordered,
    advisorIds,
    ...(primaryAdvisorId ? { primaryAdvisorId } : {}),
    ...(primaryAdvisorName ? { primaryAdvisorName } : {}),
    affectedClients: clients,
    accountIds,
    potentialExposure,
    attackPath: buildAttackPath(ordered, options.directory),
    openedAt,
    updatedAt,
    synthetic: true,
  };
}
