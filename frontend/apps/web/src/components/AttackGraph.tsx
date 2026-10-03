import { useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import type { GraphEdge, GraphNode } from "@aapg/shared";
import type { AttackGraphProps } from "../integration/attackGraph.js";

import "@xyflow/react/dist/style.css";

const NODE_WIDTH = 190;
const NODE_HEIGHT = 78;
const X_GAP = 70;
const Y_GAP = 42;

const nodeTone: Record<GraphNode["type"], string> = {
  Device: "border-sky-300 bg-sky-50",
  Advisor: "border-indigo-300 bg-indigo-50",
  Session: "border-violet-300 bg-violet-50",
  Client: "border-teal-300 bg-teal-50",
  Account: "border-amber-300 bg-amber-50",
  Destination: "border-orange-400 bg-orange-50",
  Transaction: "border-rose-400 bg-rose-50",
};

function placeNodes(nodes: GraphNode[], primaryNodeIds: string[]): Node[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const primary = primaryNodeIds.map((id) => byId.get(id)).filter((node): node is GraphNode => !!node);
  const ordered = [...primary, ...nodes.filter((node) => !primaryNodeIds.includes(node.id))];
  const layers = new Map<string, number>();

  // Put the selected attack path on the top row in its given order. Remaining
  // entities are placed below, grouped by type so the graph stays readable.
  primary.forEach((node, index) => layers.set(node.id, index));
  const extras = ordered.filter((node) => !layers.has(node.id));
  const positions = new Map<string, { x: number; y: number }>();
  primary.forEach((node, index) => positions.set(node.id, { x: index * (NODE_WIDTH + X_GAP), y: 0 }));
  extras.forEach((node, index) => {
    const row = Math.floor(index / 5) + 1;
    const col = index % 5;
    positions.set(node.id, { x: col * (NODE_WIDTH + X_GAP), y: row * (NODE_HEIGHT + Y_GAP) });
  });

  return nodes.map((node) => {
    const selected = primaryNodeIds.includes(node.id);
    return {
      id: node.id,
      position: positions.get(node.id) ?? { x: 0, y: 0 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: { label: <GraphNodeCard node={node} selected={selected} /> },
      className: "!w-[190px] !border-0 !bg-transparent !p-0",
      draggable: true,
      selectable: true,
    };
  });
}

function GraphNodeCard({ node, selected }: { node: GraphNode; selected: boolean }) {
  return (
    <div className={`rounded-lg border p-3 shadow-sm ${nodeTone[node.type]} ${selected ? "ring-2 ring-rose-500 ring-offset-1" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{node.type}</span>
        {selected ? <span aria-label="On primary path" className="h-2 w-2 rounded-full bg-rose-600" /> : null}
      </div>
      <p className="mt-1 truncate text-sm font-semibold text-slate-900" title={node.label}>{node.label}</p>
      <p className="truncate font-mono text-[10px] text-slate-500" title={node.businessId}>{node.businessId}</p>
    </div>
  );
}

function toFlowEdges(edges: GraphEdge[], primaryNodeIds: string[]): Edge[] {
  const primary = new Set(primaryNodeIds);
  return edges.map((edge) => {
    const onPath = primary.has(edge.source) && primary.has(edge.target);
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.relationship.replaceAll("_", " "),
      type: "smoothstep",
      animated: onPath,
      style: { stroke: onPath ? "#be123c" : "#8da0b8", strokeWidth: onPath ? 2.5 : 1.5 },
      labelStyle: { fill: "#526176", fontSize: 9, fontWeight: 600 },
      labelBgStyle: { fill: "#ffffff", fillOpacity: 0.92 },
      labelBgPadding: [4, 2] as [number, number],
    };
  });
}

export function AttackGraph({ nodes, edges, primaryNodeIds = [] }: AttackGraphProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const flowNodes = useMemo(() => placeNodes(nodes, primaryNodeIds), [nodes, primaryNodeIds]);
  const flowEdges = useMemo(() => toFlowEdges(edges, primaryNodeIds), [edges, primaryNodeIds]);
  const selectedNode = nodes.find((node) => node.id === selectedId) ?? null;

  return (
    <section className="flex min-h-[470px] flex-col overflow-hidden rounded-lg border border-line bg-white shadow-sm">
      <div className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-navy">Attack path</h3>
          <p className="mt-1 text-xs text-muted">Connected entities and financial events · select a node for details</p>
        </div>
        <p className="text-xs text-sky-800">{nodes.length} nodes · {edges.length} links</p>
      </div>
      <div className="relative min-h-[370px] flex-1">
        {nodes.length === 0 ? (
          <div className="grid h-full min-h-[370px] place-items-center text-sm text-muted">No graph entities yet. Run a scenario to build the path.</div>
        ) : (
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            fitView
            fitViewOptions={{ padding: 0.18, maxZoom: 1.1 }}
            minZoom={0.2}
            maxZoom={1.5}
            nodesConnectable={false}
            onNodeClick={(_event, node) => setSelectedId(node.id)}
            onPaneClick={() => setSelectedId(null)}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#dce4ef" gap={20} size={1} />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable nodeColor={(node) => {
              const entity = nodes.find((item) => item.id === node.id);
              return entity?.type === "Transaction" ? "#e11d48" : entity?.type === "Destination" ? "#f97316" : "#4f7cac";
            }} />
          </ReactFlow>
        )}
        {selectedNode ? (
          <aside className="absolute bottom-3 left-3 z-10 max-w-[260px] rounded-md border border-line bg-white/95 p-3 shadow-lg" aria-live="polite">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Selected {selectedNode.type}</p>
                <p className="mt-1 text-sm font-semibold text-ink">{selectedNode.label}</p>
                <p className="mt-1 font-mono text-xs text-muted">{selectedNode.businessId}</p>
                {selectedNode.subtitle ? <p className="mt-1 text-xs text-muted">{selectedNode.subtitle}</p> : null}
              </div>
              <button className="text-muted hover:text-ink" onClick={() => setSelectedId(null)} aria-label="Close node details">×</button>
            </div>
          </aside>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line px-4 py-2 text-[10px] text-muted" aria-label="Graph legend">
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-600" />Primary attack path</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-orange-500" />Destination</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-500" />Transaction</span>
      </div>
    </section>
  );
}
