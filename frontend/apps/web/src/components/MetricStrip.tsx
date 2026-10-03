export interface DashboardMetrics {
  activeIncidents: number;
  criticalIncidents: number;
  advisorsAffected: number;
  clientsAffected: number;
  potentialExposure: string;
}

const LABELS: Array<{ key: keyof DashboardMetrics; label: string }> = [
  { key: "activeIncidents", label: "Active Incidents" },
  { key: "criticalIncidents", label: "Critical Incidents" },
  { key: "advisorsAffected", label: "Advisors Affected" },
  { key: "clientsAffected", label: "Clients Affected" },
  { key: "potentialExposure", label: "Potential Exposure" },
];

export function MetricStrip({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <section aria-label="Incident summary" className="grid grid-cols-5 gap-3">
      {LABELS.map((item) => (
        <article key={item.key} className="rounded-lg border border-line bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{item.label}</p>
          <p className="mt-1 font-mono text-2xl font-medium text-ink">{metrics[item.key]}</p>
        </article>
      ))}
    </section>
  );
}
