/** The graph boundary. Keep these fields aligned with @aapg/shared SecurityEvent. */
export type GraphEventType =
  | "MALWARE_DETECTED"
  | "SUSPICIOUS_LOGIN"
  | "CLIENT_ACCOUNT_ACCESSED"
  | "NEW_DESTINATION_ADDED"
  | "TRANSFER_INITIATED";

export interface GraphSecurityEvent {
  eventId: string;
  eventType: GraphEventType;
  timestamp: string;
  source: string;
  advisorId?: string;
  deviceId?: string;
  sessionId?: string;
  clientId?: string;
  accountId?: string;
  destinationId?: string;
  transactionId?: string;
  amount?: number;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export const RELATIONSHIPS = [
  "USES",
  "CREATED_SESSION",
  "ASSOCIATED_WITH",
  "ACCESSED",
  "OWNS",
  "ACCESSED_ACCOUNT",
  "ADDED_DESTINATION",
  "INITIATED",
  "SENT_TO",
] as const;
export type GraphRelationship = (typeof RELATIONSHIPS)[number];

export interface GraphNodeRecord {
  id: string;
  type: "Advisor" | "Device" | "Session" | "Client" | "Account" | "Destination" | "Transaction";
  businessId: string;
  label: string;
  firstSeen: string;
  lastSeen: string;
  amount?: number;
}

export interface GraphEdgeRecord {
  source: string;
  target: string;
  relationship: GraphRelationship;
}

export interface GraphWritePlan {
  nodes: GraphNodeRecord[];
  edges: GraphEdgeRecord[];
}

const graphId = (type: GraphNodeRecord["type"], id: string): string => `${type}:${id}`;

/** Convert one validated event into idempotent graph entities and relationships. */
export function eventToGraphWritePlan(event: GraphSecurityEvent): GraphWritePlan {
  if (!event.eventId || !event.timestamp || !Number.isFinite(Date.parse(event.timestamp))) {
    throw new Error("eventId and a valid ISO timestamp are required");
  }
  if (!event.source) throw new Error("source is required");
  if (event.amount !== undefined && (!Number.isFinite(event.amount) || event.amount < 0)) {
    throw new Error("amount must be a non-negative number");
  }

  const nodes = new Map<string, GraphNodeRecord>();
  const edges = new Map<string, GraphEdgeRecord>();
  const addNode = (type: GraphNodeRecord["type"], businessId: string | undefined, label?: string, amount?: number) => {
    if (!businessId) return;
    const id = graphId(type, businessId);
    const current = nodes.get(id);
    nodes.set(id, {
      id,
      type,
      businessId,
      label: label ?? businessId,
      firstSeen: current?.firstSeen ?? event.timestamp,
      lastSeen: event.timestamp,
      ...(amount === undefined ? {} : { amount }),
    });
  };
  const addEdge = (
    relationship: GraphRelationship,
    sourceType: GraphNodeRecord["type"],
    sourceId: string | undefined,
    targetType: GraphNodeRecord["type"],
    targetId: string | undefined,
  ) => {
    if (!sourceId || !targetId) return;
    const source = graphId(sourceType, sourceId);
    const target = graphId(targetType, targetId);
    const key = `${relationship}:${source}:${target}`;
    edges.set(key, { source, target, relationship });
  };

  addNode("Advisor", event.advisorId);
  addNode("Device", event.deviceId);
  addNode("Session", event.sessionId);
  addNode("Client", event.clientId);
  addNode("Account", event.accountId);
  addNode("Destination", event.destinationId);
  addNode("Transaction", event.transactionId, event.transactionId, event.amount);

  addEdge("USES", "Advisor", event.advisorId, "Device", event.deviceId);
  addEdge("CREATED_SESSION", "Advisor", event.advisorId, "Session", event.sessionId);
  addEdge("ASSOCIATED_WITH", "Device", event.deviceId, "Session", event.sessionId);
  addEdge("ACCESSED", "Session", event.sessionId, "Client", event.clientId);
  addEdge("OWNS", "Client", event.clientId, "Account", event.accountId);
  addEdge("ACCESSED_ACCOUNT", "Session", event.sessionId, "Account", event.accountId);
  if (event.eventType === "NEW_DESTINATION_ADDED") {
    addEdge("ADDED_DESTINATION", "Account", event.accountId, "Destination", event.destinationId);
  }
  if (event.eventType === "TRANSFER_INITIATED") {
    addEdge("INITIATED", "Account", event.accountId, "Transaction", event.transactionId);
    addEdge("SENT_TO", "Transaction", event.transactionId, "Destination", event.destinationId);
  }
  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}
