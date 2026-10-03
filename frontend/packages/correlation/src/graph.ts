import type {
  AttackPath,
  EntityDirectory,
  GraphEdge,
  GraphNode,
  GraphNodeType,
  GraphRelationship,
  SecurityEvent,
} from "@aapg/shared";

function nodeId(type: GraphNodeType, businessId: string): string {
  return `${type}:${businessId}`;
}

function upsertNode(
  nodes: Map<string, GraphNode>,
  type: GraphNodeType,
  businessId: string,
  label: string,
  subtitle?: string,
): void {
  const id = nodeId(type, businessId);
  if (nodes.has(id)) return;
  nodes.set(id, subtitle ? { id, type, businessId, label, subtitle } : { id, type, businessId, label });
}

function addEdge(
  edges: Map<string, GraphEdge>,
  relationship: GraphRelationship,
  sourceType: GraphNodeType,
  sourceId: string | undefined,
  targetType: GraphNodeType,
  targetId: string | undefined,
): void {
  if (!sourceId || !targetId) return;
  const source = nodeId(sourceType, sourceId);
  const target = nodeId(targetType, targetId);
  const id = `${relationship}:${source}:${target}`;
  if (edges.has(id)) return;
  edges.set(id, { id, source, target, relationship });
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function primaryNodeIds(events: readonly SecurityEvent[]): string[] {
  const transfers = events
    .filter((event) => event.eventType === "TRANSFER_INITIATED" && event.transactionId)
    .sort(
      (left, right) =>
        (right.amount ?? 0) - (left.amount ?? 0) || left.eventId.localeCompare(right.eventId),
    );
  const primary = transfers[0];
  if (!primary) {
    const first = events[0];
    if (!first) return [];
    return [
      first.deviceId ? nodeId("Device", first.deviceId) : undefined,
      first.advisorId ? nodeId("Advisor", first.advisorId) : undefined,
      first.sessionId ? nodeId("Session", first.sessionId) : undefined,
    ].filter((id): id is string => id !== undefined);
  }

  const ordered = [
    primary.deviceId ? nodeId("Device", primary.deviceId) : undefined,
    primary.advisorId ? nodeId("Advisor", primary.advisorId) : undefined,
    primary.sessionId ? nodeId("Session", primary.sessionId) : undefined,
    primary.clientId ? nodeId("Client", primary.clientId) : undefined,
    primary.accountId ? nodeId("Account", primary.accountId) : undefined,
    primary.destinationId ? nodeId("Destination", primary.destinationId) : undefined,
    primary.transactionId ? nodeId("Transaction", primary.transactionId) : undefined,
  ];
  return ordered.filter((id): id is string => id !== undefined);
}

export function buildAttackPath(
  events: readonly SecurityEvent[],
  directory?: EntityDirectory,
): AttackPath {
  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();

  for (const event of events) {
    if (event.advisorId) {
      upsertNode(
        nodes,
        "Advisor",
        event.advisorId,
        directory?.advisors[event.advisorId]?.displayName ?? event.advisorId,
        event.advisorId,
      );
    }
    if (event.deviceId) {
      upsertNode(
        nodes,
        "Device",
        event.deviceId,
        event.deviceId,
        directory?.devices[event.deviceId]?.displayName,
      );
    }
    if (event.sessionId) {
      upsertNode(
        nodes,
        "Session",
        event.sessionId,
        event.sessionId,
        directory?.sessions[event.sessionId]?.displayName,
      );
    }
    if (event.clientId) {
      upsertNode(
        nodes,
        "Client",
        event.clientId,
        directory?.clients[event.clientId]?.displayName ?? event.clientId,
        event.clientId,
      );
    }
    if (event.accountId) {
      upsertNode(
        nodes,
        "Account",
        event.accountId,
        event.accountId,
        directory?.accounts[event.accountId]?.displayName,
      );
    }
    if (event.destinationId) {
      upsertNode(
        nodes,
        "Destination",
        event.destinationId,
        directory?.destinations[event.destinationId]?.displayName ?? event.destinationId,
        event.destinationId,
      );
    }
    if (event.transactionId) {
      upsertNode(
        nodes,
        "Transaction",
        event.transactionId,
        event.amount !== undefined ? formatAmount(event.amount) : event.transactionId,
        event.transactionId,
      );
    }

    addEdge(edges, "USES", "Advisor", event.advisorId, "Device", event.deviceId);
    addEdge(edges, "CREATED_SESSION", "Advisor", event.advisorId, "Session", event.sessionId);
    addEdge(edges, "ASSOCIATED_WITH", "Device", event.deviceId, "Session", event.sessionId);
    addEdge(edges, "ACCESSED", "Session", event.sessionId, "Client", event.clientId);
    addEdge(edges, "OWNS", "Client", event.clientId, "Account", event.accountId);
    addEdge(edges, "ACCESSED_ACCOUNT", "Session", event.sessionId, "Account", event.accountId);
    if (event.eventType === "NEW_DESTINATION_ADDED") {
      addEdge(edges, "ADDED_DESTINATION", "Account", event.accountId, "Destination", event.destinationId);
    }
    if (event.eventType === "TRANSFER_INITIATED") {
      addEdge(edges, "INITIATED", "Account", event.accountId, "Transaction", event.transactionId);
      addEdge(edges, "SENT_TO", "Transaction", event.transactionId, "Destination", event.destinationId);
    }
  }

  return {
    nodes: [...nodes.values()],
    edges: [...edges.values()],
    primaryNodeIds: primaryNodeIds(events),
  };
}
