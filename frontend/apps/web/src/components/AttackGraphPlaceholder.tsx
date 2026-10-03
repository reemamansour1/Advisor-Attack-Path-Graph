import type { AttackGraphProps } from "../integration/attackGraph.js";

export function AttackGraphPlaceholder({ nodes, edges, primaryNodeIds = [] }: AttackGraphProps) {
  const primary = primaryNodeIds
    .map((id) => nodes.find((node) => node.id === id))
    .filter((node) => node !== undefined);

  return (
    <section className="flex h-full flex-col rounded-lg border border-dashed border-sky-300 bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-navy">Attack path</h3>
        <p className="text-xs text-sky-800">graph module · React Flow integration point</p>
      </div>
      <p className="mt-1 text-sm text-muted">
        {nodes.length} nodes · {edges.length} edges. This shell passes GraphNode and GraphEdge props.
        React Flow rendering is not implemented here.
      </p>
      <ol className="mt-4 flex flex-1 flex-wrap content-start gap-2" aria-label="Primary attack path">
        {primary.map((node, index) => (
          <li key={node.id} className="flex items-center gap-2">
            <div className="min-w-36 rounded-md border border-line bg-paper px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted">{node.type}</p>
              <p className="text-sm font-semibold">{node.label}</p>
              <p className="font-mono text-xs text-muted">{node.businessId}</p>
            </div>
            {index < primary.length - 1 ? <span aria-hidden="true" className="text-muted">→</span> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
