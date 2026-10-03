import type { IncidentExplanation } from "@aapg/shared";

export function ExplanationPanel({ explanation }: { explanation: IncidentExplanation | null }) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-sm" aria-label="Incident explanation">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-navy">Incident explanation</h3>
        <p className="text-xs font-medium text-amber-800">
          {explanation?.generatedBy === "bedrock" ? "Bedrock explanation" : "AI Explanation — Mocked for local development"}
        </p>
      </div>
      <p className="mt-3 text-sm leading-6 text-ink">
        {explanation?.narrative ?? "An explanation will appear after an incident is loaded."}
      </p>
      {explanation ? <p className="mt-2 text-xs text-muted">{explanation.disclaimer}</p> : null}
    </section>
  );
}
