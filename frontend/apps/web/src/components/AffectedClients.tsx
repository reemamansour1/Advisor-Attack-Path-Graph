import type { AffectedClient } from "@aapg/shared";

import { formatUsd } from "../lib/format.js";

export function AffectedClients({ clients }: { clients: AffectedClient[] }) {
  const total = clients.reduce((sum, client) => sum + client.potentialExposure, 0);

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-sm" aria-label="Affected clients">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-navy">Affected clients</h3>
        <p className="font-mono text-sm">{formatUsd(total)}</p>
      </div>
      <ul className="mt-3 space-y-2">
        {clients.map((client) => (
          <li key={client.clientId} className="flex items-start justify-between gap-3 text-sm">
            <div>
              <p className="font-medium">{client.displayName}</p>
              <p className="font-mono text-xs text-muted">
                {client.clientId} · {client.accountIds.join(", ")}
              </p>
            </div>
            <p className="font-mono">{formatUsd(client.potentialExposure)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
