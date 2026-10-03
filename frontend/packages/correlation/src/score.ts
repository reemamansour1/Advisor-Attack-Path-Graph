import type { IncidentSeverity, RiskSignal, SecurityEvent } from "@aapg/shared";

export const LARGE_TRANSFER_THRESHOLD_USD = 10_000;

const WEIGHTS = {
  MALWARE_DETECTED: 30,
  SUSPICIOUS_LOGIN: 15,
  NEW_UNTRUSTED_DEVICE: 15,
  MULTIPLE_CLIENT_ACCOUNTS_ACCESSED: 15,
  NEW_DESTINATION_ADDED: 25,
  LARGE_OR_UNUSUAL_TRANSFER: 30,
} as const;

interface Taint {
  advisors: Set<string>;
  devices: Set<string>;
  sessions: Set<string>;
  accounts: Set<string>;
}

function addId(set: Set<string>, value: string | undefined): boolean {
  if (!value || set.has(value)) return false;
  set.add(value);
  return true;
}

function isSuspiciousSeed(event: SecurityEvent): boolean {
  return (
    event.eventType === "MALWARE_DETECTED" ||
    event.eventType === "SUSPICIOUS_LOGIN" ||
    event.metadata?.newUntrustedDevice === true
  );
}

function touchesTaint(event: SecurityEvent, taint: Taint): boolean {
  return (
    (event.advisorId !== undefined && taint.advisors.has(event.advisorId)) ||
    (event.deviceId !== undefined && taint.devices.has(event.deviceId)) ||
    (event.sessionId !== undefined && taint.sessions.has(event.sessionId)) ||
    (event.accountId !== undefined && taint.accounts.has(event.accountId))
  );
}

/**
 * Expands suspicious seeds through advisor, device, session, and account links.
 * A destination match alone does not put a transfer on the suspicious path.
 */
export function buildSuspiciousTaint(events: readonly SecurityEvent[]): Taint {
  const taint: Taint = {
    advisors: new Set<string>(),
    devices: new Set<string>(),
    sessions: new Set<string>(),
    accounts: new Set<string>(),
  };

  for (const event of events) {
    if (!isSuspiciousSeed(event)) continue;
    addId(taint.advisors, event.advisorId);
    addId(taint.devices, event.deviceId);
    addId(taint.sessions, event.sessionId);
    addId(taint.accounts, event.accountId);
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const event of events) {
      if (!touchesTaint(event, taint)) continue;
      changed = addId(taint.advisors, event.advisorId) || changed;
      changed = addId(taint.devices, event.deviceId) || changed;
      changed = addId(taint.sessions, event.sessionId) || changed;
      changed = addId(taint.accounts, event.accountId) || changed;
    }
  }

  return taint;
}

export function isTransferOnSuspiciousPath(event: SecurityEvent, taint: Taint): boolean {
  if (event.eventType !== "TRANSFER_INITIATED") return false;
  return (
    (event.advisorId !== undefined && taint.advisors.has(event.advisorId)) ||
    (event.sessionId !== undefined && taint.sessions.has(event.sessionId)) ||
    (event.accountId !== undefined && taint.accounts.has(event.accountId))
  );
}

export function getSeverity(score: number): IncidentSeverity {
  if (score >= 80) return "CRITICAL";
  if (score >= 50) return "HIGH";
  if (score >= 30) return "MEDIUM";
  return "LOW";
}

export function calculateFinancialExposure(events: readonly SecurityEvent[]): number {
  const taint = buildSuspiciousTaint(events);
  return events.reduce((total, event) => {
    if (!isTransferOnSuspiciousPath(event, taint)) return total;
    return total + (event.amount ?? 0);
  }, 0);
}

export function evaluateSignals(events: readonly SecurityEvent[]): RiskSignal[] {
  const signals: RiskSignal[] = [];
  const taint = buildSuspiciousTaint(events);

  if (events.some((event) => event.eventType === "MALWARE_DETECTED")) {
    signals.push({
      code: "MALWARE_DETECTED",
      label: "Endpoint compromise",
      weight: WEIGHTS.MALWARE_DETECTED,
      detail: "A malware detection shares this advisor path.",
    });
  }

  if (events.some((event) => event.eventType === "SUSPICIOUS_LOGIN")) {
    signals.push({
      code: "SUSPICIOUS_LOGIN",
      label: "Suspicious authentication",
      weight: WEIGHTS.SUSPICIOUS_LOGIN,
      detail: "A suspicious login shares this advisor path.",
    });
  }

  if (events.some((event) => event.metadata?.newUntrustedDevice === true)) {
    signals.push({
      code: "NEW_UNTRUSTED_DEVICE",
      label: "New untrusted device",
      weight: WEIGHTS.NEW_UNTRUSTED_DEVICE,
      detail: "Event metadata marked the device as new and untrusted.",
    });
  }

  const accessedAccounts = new Set(
    events.flatMap((event) =>
      event.eventType === "CLIENT_ACCOUNT_ACCESSED" && event.accountId ? [event.accountId] : [],
    ),
  );
  if (accessedAccounts.size >= 2) {
    signals.push({
      code: "MULTIPLE_CLIENT_ACCOUNTS_ACCESSED",
      label: "Multiple client accounts accessed",
      weight: WEIGHTS.MULTIPLE_CLIENT_ACCOUNTS_ACCESSED,
      detail: `${accessedAccounts.size} client accounts were accessed on this path.`,
    });
  }

  if (events.some((event) => event.eventType === "NEW_DESTINATION_ADDED")) {
    signals.push({
      code: "NEW_DESTINATION_ADDED",
      label: "New external destination",
      weight: WEIGHTS.NEW_DESTINATION_ADDED,
      detail: "A new destination was added on this path.",
    });
  }

  const largeTransfers = events.filter(
    (event) =>
      event.eventType === "TRANSFER_INITIATED" &&
      (event.amount ?? 0) >= LARGE_TRANSFER_THRESHOLD_USD &&
      isTransferOnSuspiciousPath(event, taint),
  );
  if (largeTransfers.length > 0) {
    const largest = largeTransfers.reduce((current, event) => Math.max(current, event.amount ?? 0), 0);
    signals.push({
      code: "LARGE_OR_UNUSUAL_TRANSFER",
      label: "Unusual financial activity",
      weight: WEIGHTS.LARGE_OR_UNUSUAL_TRANSFER,
      detail: `A transfer of ${largest} USD is connected to the suspicious advisor, session, or account path.`,
    });
  }

  return signals;
}

/**
 * Scores one already-related event set. Each signal is counted once.
 * Callers that still need clustering should use correlateEvents().
 */
export function calculateRiskScore(events: readonly SecurityEvent[]): number {
  return evaluateSignals(events).reduce((total, signal) => total + signal.weight, 0);
}
