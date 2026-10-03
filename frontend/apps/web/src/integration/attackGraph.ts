import type { GraphEdge, GraphNode } from "@aapg/shared";

/**
 * Integration contract for The React Flow attack graph.
 * Nodes and edges are already frontend-friendly. No Neptune response is exposed.
 */
export interface AttackGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  primaryNodeIds?: string[];
}
