import { eventToGraphWritePlan, type GraphSecurityEvent } from "./graphModel.js";
import { createNeptuneExecutor, persistGraphPlan } from "./neptune.js";

const EVENT_TYPES = new Set([
  "MALWARE_DETECTED",
  "SUSPICIOUS_LOGIN",
  "CLIENT_ACCOUNT_ACCESSED",
  "NEW_DESTINATION_ADDED",
  "TRANSFER_INITIATED",
]);

function asEvent(input: unknown): GraphSecurityEvent {
  let candidate = input;
  if (candidate && typeof candidate === "object" && "detail" in candidate) {
    candidate = (candidate as { detail: unknown }).detail;
  }
  if (candidate && typeof candidate === "object" && "event" in candidate) {
    candidate = (candidate as { event: unknown }).event;
  }
  if (typeof candidate === "string") candidate = JSON.parse(candidate) as unknown;
  if (candidate && typeof candidate === "object" && "body" in candidate) {
    const body = (candidate as { body: unknown }).body;
    candidate = typeof body === "string" ? JSON.parse(body) as unknown : body;
  }
  if (!candidate || typeof candidate !== "object") throw new Error("Event payload must be an object");

  const value = candidate as Record<string, unknown>;
  if (typeof value.eventId !== "string" || typeof value.eventType !== "string" || !EVENT_TYPES.has(value.eventType)) {
    throw new Error("eventId and a supported eventType are required");
  }
  if (typeof value.timestamp !== "string" || typeof value.source !== "string") {
    throw new Error("timestamp and source are required");
  }
  return value as unknown as GraphSecurityEvent;
}

/** EventBridge process-event Lambda. Writes relationships only; scoring stays with correlation module. */
export async function handler(input: unknown): Promise<{ accepted: true; eventId: string; nodeCount: number; edgeCount: number }> {
  const event = asEvent(input);
  const plan = eventToGraphWritePlan(event);
  await persistGraphPlan(createNeptuneExecutor(), plan, event.eventId);
  return { accepted: true, eventId: event.eventId, nodeCount: plan.nodes.length, edgeCount: plan.edges.length };
}
