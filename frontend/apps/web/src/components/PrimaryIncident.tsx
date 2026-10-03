import { ActionButton } from "./ActionButton.js";
import type { Incident } from "@aapg/shared";

import { formatUsd } from "../lib/format.js";
import { SeverityBadge } from "./SeverityBadge.js";

export function PrimaryIncident({
  incident,
  pending,
  onInvestigate,
}: {
  incident: Incident;
  pending: boolean;
  onInvestigate: () => void;
}) {
  const investigating = incident.status === "INVESTIGATING";

  return (
    <section className="rounded-lg border border-line bg-white px-5 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <SeverityBadge severity={incident.severity} />
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              {incident.status}
            </span>
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">{incident.title}</h2>
          <p className="mt-1 text-sm text-muted">
            {incident.primaryAdvisorName ?? "Advisor"} ·{" "}
            <span className="font-mono">{incident.primaryAdvisorId ?? "Unknown"}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Risk score</p>
          <p className="font-mono text-4xl font-medium leading-none text-navy">{incident.riskScore}</p>
          <ActionButton
            onClick={onInvestigate}
            disabled={pending || investigating}
            className="mt-3"
          >
            {investigating ? "✓ Investigating" : "Investigate incident"}
          </ActionButton>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4 text-sm">
        <div>
          <dt className="text-muted">Potential exposure</dt>
          <dd className="font-mono text-lg font-medium">{formatUsd(incident.potentialExposure)}</dd>
        </div>
        <div>
          <dt className="text-muted">Clients affected</dt>
          <dd className="font-mono text-lg font-medium">{incident.affectedClients.length}</dd>
        </div>
        <div>
          <dt className="text-muted">Accounts affected</dt>
          <dd className="font-mono text-lg font-medium">{incident.accountIds.length}</dd>
        </div>
      </dl>
      <ul className="mt-4 flex flex-wrap gap-2" aria-label="Deterministic risk signals">
        {incident.signals.map((signal) => (
          <li key={signal.code} className="rounded-md bg-slate-50 px-2.5 py-1 text-xs text-slate-700 ring-1 ring-line">
            {signal.label}
            <span className="ml-1 font-mono text-navy">+{signal.weight}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
