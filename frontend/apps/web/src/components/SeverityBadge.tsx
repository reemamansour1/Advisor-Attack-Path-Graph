import type { IncidentSeverity } from "@aapg/shared";

const TONE: Record<IncidentSeverity, string> = {
  LOW: "bg-emerald-50 text-low ring-emerald-200",
  MEDIUM: "bg-amber-50 text-medium ring-amber-200",
  HIGH: "bg-orange-50 text-high ring-orange-200",
  CRITICAL: "bg-rose-50 text-critical ring-rose-200",
};

export function SeverityBadge({ severity }: { severity: IncidentSeverity }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${TONE[severity]}`}>
      {severity}
    </span>
  );
}
