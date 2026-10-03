import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import type { SecurityEvent } from "@aapg/shared";

const eventBridge = new EventBridgeClient({});

const allowedEventTypes = new Set<SecurityEvent["eventType"]>([
  "MALWARE_DETECTED",
  "SUSPICIOUS_LOGIN",
  "CLIENT_ACCOUNT_ACCESSED",
  "NEW_DESTINATION_ADDED",
  "TRANSFER_INITIATED",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSecurityEvent(value: unknown): value is SecurityEvent {
  if (!isRecord(value)) return false;

  return (
    typeof value.eventId === "string" &&
    typeof value.source === "string" &&
    typeof value.timestamp === "string" &&
    Number.isFinite(Date.parse(value.timestamp)) &&
    typeof value.eventType === "string" &&
    allowedEventTypes.has(value.eventType as SecurityEvent["eventType"])
  );
}

function response(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

export const handler: APIGatewayProxyHandlerV2 = async (request) => {
  if (request.requestContext.http.method !== "POST") {
    return response(405, { error: "Method not allowed" });
  }

  let body: unknown;

  try {
    body = JSON.parse(request.body ?? "{}");
  } catch {
    return response(400, { error: "Request body must be valid JSON" });
  }

  const candidate = isRecord(body) ? body.event : undefined;

  if (!isSecurityEvent(candidate)) {
    return response(400, {
      error: "Invalid security event",
      required: ["eventId", "eventType", "timestamp", "source"],
    });
  }

  const eventBusName = process.env.EVENT_BUS_NAME;

  if (!eventBusName) {
    console.error("EVENT_BUS_NAME is not configured");
    return response(500, { error: "Event bus is not configured" });
  }

  try {
    const result = await eventBridge.send(
      new PutEventsCommand({
        Entries: [
          {
            EventBusName: eventBusName,
            Source: "aapg.ingest",
            DetailType: "security.event",
            Detail: JSON.stringify(candidate),
          },
        ],
      }),
    );

    const entry = result.Entries?.[0];

    if ((result.FailedEntryCount ?? 0) > 0 || entry?.ErrorCode) {
      console.error("EventBridge rejected event", entry);
      return response(502, { error: "Unable to publish event" });
    }

    return response(202, {
      accepted: true,
      eventId: candidate.eventId,
    });
  } catch (error) {
    console.error("Event ingestion failed", error);
    return response(500, { error: "Unexpected ingestion failure" });
  }
};