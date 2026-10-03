import type { EventBridgeHandler } from "aws-lambda";
import type { SecurityEvent } from "@aapg/shared";

export const handler: EventBridgeHandler<
  "security.event",
  SecurityEvent,
  void
> = async (event) => {
  console.log(
    JSON.stringify({
      message: "Security event received from EventBridge",
      eventId: event.detail.eventId,
      eventType: event.detail.eventType,
      timestamp: event.detail.timestamp,
    }),
  );
};