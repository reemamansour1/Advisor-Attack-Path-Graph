import {
  ExecuteOpenCypherQueryCommand,
  NeptunedataClient,
} from "@aws-sdk/client-neptunedata";
import type { GraphEdgeRecord, GraphNodeRecord } from "./graphModel.js";

export interface OpenCypherExecutor {
  execute(query: string, parameters?: Record<string, unknown>): Promise<unknown>;
}

export function createNeptuneExecutor(): OpenCypherExecutor {
  const endpoint = process.env.NEPTUNE_ENDPOINT;
  if (!endpoint) throw new Error("NEPTUNE_ENDPOINT must be set on the Lambda function");
  const client = new NeptunedataClient({
    region: process.env.AWS_REGION ?? "us-east-1",
    endpoint: endpoint.startsWith("http") ? endpoint : `https://${endpoint}:8182`,
  });
  return {
    async execute(query, parameters = {}) {
      return client.send(new ExecuteOpenCypherQueryCommand({
        openCypherQuery: query,
        parameters: JSON.stringify(parameters),
      }));
    },
  };
}

const NODE_LABELS: Record<GraphNodeRecord["type"], string> = {
  Advisor: "Advisor", Device: "Device", Session: "Session", Client: "Client",
  Account: "Account", Destination: "Destination", Transaction: "Transaction",
};

function nodeUpsertQuery(type: GraphNodeRecord["type"]): string {
  // Label text is selected from the fixed node-type map, never from event input.
  const label = NODE_LABELS[type];
  return `
MERGE (n:Entity:${label} {id: $id})
ON CREATE SET n.type = $type, n.businessId = $businessId,
  n.label = $label, n.firstSeen = $firstSeen
SET n.lastSeen = $lastSeen,
    n.amount = CASE WHEN $amount IS NULL THEN n.amount ELSE $amount END
RETURN count(n) AS upserted
`;
}

// Relationship names come only from this fixed whitelist (never from event input).
const EDGE_UPSERTS: Record<GraphEdgeRecord["relationship"], string> = {
  USES: "MATCH (a:Entity {id: $source}), (b:Entity {id: $target}) MERGE (a)-[r:USES]->(b)",
  CREATED_SESSION: "MATCH (a:Entity {id: $source}), (b:Entity {id: $target}) MERGE (a)-[r:CREATED_SESSION]->(b)",
  ASSOCIATED_WITH: "MATCH (a:Entity {id: $source}), (b:Entity {id: $target}) MERGE (a)-[r:ASSOCIATED_WITH]->(b)",
  ACCESSED: "MATCH (a:Entity {id: $source}), (b:Entity {id: $target}) MERGE (a)-[r:ACCESSED]->(b)",
  OWNS: "MATCH (a:Entity {id: $source}), (b:Entity {id: $target}) MERGE (a)-[r:OWNS]->(b)",
  ACCESSED_ACCOUNT: "MATCH (a:Entity {id: $source}), (b:Entity {id: $target}) MERGE (a)-[r:ACCESSED_ACCOUNT]->(b)",
  ADDED_DESTINATION: "MATCH (a:Entity {id: $source}), (b:Entity {id: $target}) MERGE (a)-[r:ADDED_DESTINATION]->(b)",
  INITIATED: "MATCH (a:Entity {id: $source}), (b:Entity {id: $target}) MERGE (a)-[r:INITIATED]->(b)",
  SENT_TO: "MATCH (a:Entity {id: $source}), (b:Entity {id: $target}) MERGE (a)-[r:SENT_TO]->(b)",
};

export async function persistGraphPlan(
  db: OpenCypherExecutor,
  plan: { nodes: GraphNodeRecord[]; edges: GraphEdgeRecord[] },
  eventId: string,
): Promise<void> {
  for (const node of plan.nodes) {
    await db.execute(nodeUpsertQuery(node.type), { ...node, amount: node.amount ?? null });
  }
  for (const edge of plan.edges) {
    const query = `${EDGE_UPSERTS[edge.relationship]} SET r.lastEventId = $eventId RETURN count(r) AS upserted`;
    await db.execute(query, { source: edge.source, target: edge.target, eventId });
  }
}

export interface GraphNodeProjection {
  id: string;
  type: GraphNodeRecord["type"];
  businessId: string;
  label: string;
  subtitle?: string;
}

export interface GraphEdgeProjection {
  id: string;
  source: string;
  target: string;
  relationship: GraphEdgeRecord["relationship"];
}

export interface AttackPathProjection {
  nodes: GraphNodeProjection[];
  edges: GraphEdgeProjection[];
  primaryNodeIds: string[];
}

const READ_REACHABLE_NODES = `
MATCH (root:Entity:Advisor {id: $advisorId})
MATCH p=(root)-[*0..8]-(node:Entity)
WITH DISTINCT node
RETURN node.id AS id, node.type AS type, node.businessId AS businessId,
       node.label AS label, node.amount AS amount
LIMIT 100
`;

const READ_EDGES_FOR_NODES = `
MATCH (source:Entity)-[relationship]->(target:Entity)
WHERE source.id IN $nodeIds AND target.id IN $nodeIds
RETURN DISTINCT source.id AS source, target.id AS target, type(relationship) AS relationship
LIMIT 300
`;

function resultRows(response: unknown): Record<string, unknown>[] {
  if (!response || typeof response !== "object") return [];
  const results = (response as { results?: unknown }).results;
  if (!Array.isArray(results)) return [];
  return results.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
}

export async function getAttackPath(db: OpenCypherExecutor, advisorId: string): Promise<AttackPathProjection> {
  const rootId = advisorId.includes(":") ? advisorId : `Advisor:${advisorId}`;
  const nodeRows = resultRows(await db.execute(READ_REACHABLE_NODES, { advisorId: rootId }));
  const nodes: GraphNodeProjection[] = nodeRows
    .filter((row) => typeof row.id === "string" && typeof row.type === "string" && typeof row.businessId === "string")
    .map((row) => ({
      id: row.id as string,
      type: row.type as GraphNodeRecord["type"],
      businessId: row.businessId as string,
      label: typeof row.label === "string" ? row.label : String(row.businessId),
      ...(typeof row.amount === "number" ? { subtitle: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(row.amount) } : {}),
    }));
  const ids = nodes.map((node) => node.id);
  if (!ids.length) return { nodes: [], edges: [], primaryNodeIds: [] };

  const edgeRows = resultRows(await db.execute(READ_EDGES_FOR_NODES, { nodeIds: ids }));
  const edges: GraphEdgeProjection[] = edgeRows
    .filter((row) => typeof row.source === "string" && typeof row.target === "string" && typeof row.relationship === "string")
    .map((row) => ({
      id: `${String(row.relationship)}:${String(row.source)}:${String(row.target)}`,
      source: row.source as string,
      target: row.target as string,
      relationship: row.relationship as GraphEdgeRecord["relationship"],
    }));

  // Highlight the shortest connected route from the advisor to the largest
  // transfer. This is graph presentation only; it does not score the incident.
  const largestTransfer = nodeRows
    .filter((row) => row.type === "Transaction" && typeof row.amount === "number")
    .sort((left, right) => Number(right.amount) - Number(left.amount))[0];
  const targetId = typeof largestTransfer?.id === "string" ? largestTransfer.id : undefined;
  const adjacent = new Map<string, string[]>();
  for (const edge of edges) {
    adjacent.set(edge.source, [...(adjacent.get(edge.source) ?? []), edge.target]);
    adjacent.set(edge.target, [...(adjacent.get(edge.target) ?? []), edge.source]);
  }
  const previous = new Map<string, string | null>([[rootId, null]]);
  const queue = [rootId];
  for (let index = 0; index < queue.length && targetId && !previous.has(targetId); index += 1) {
    for (const next of adjacent.get(queue[index]!) ?? []) {
      if (previous.has(next)) continue;
      previous.set(next, queue[index]!);
      queue.push(next);
    }
  }
  const primaryNodeIds: string[] = [];
  if (targetId && previous.has(targetId)) {
    let current: string | null = targetId;
    while (current) {
      primaryNodeIds.push(current);
      current = previous.get(current) ?? null;
    }
    primaryNodeIds.reverse();
  }
  return { nodes, edges, primaryNodeIds };
}
