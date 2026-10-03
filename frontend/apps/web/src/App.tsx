import { ActionButton } from "./components/ActionButton.js";
import type {
  Incident,
  IncidentExplanation,
} from "@aapg/shared";
import { useEffect, useMemo, useState } from "react";

import { AffectedClients } from "./components/AffectedClients.js";
import { AttackGraph } from "./components/AttackGraph.js";
import { DemoControlsPlaceholder } from "./components/DemoControlsPlaceholder.js";
import { ExplanationPanel } from "./components/ExplanationPanel.js";
import { Header } from "./components/Header.js";
import {
  MetricStrip,
  type DashboardMetrics,
} from "./components/MetricStrip.js";
import { PrimaryIncident } from "./components/PrimaryIncident.js";
import { TimelinePlaceholder } from "./components/TimelinePlaceholder.js";
import { formatUsd } from "./lib/format.js";
import { createApiIncidentService } from "./services/index.js";

const apiRoot = (
  import.meta.env.VITE_API_BASE_URL ?? "/api"
).replace(/\/$/, "");

const incidentService = createApiIncidentService(apiRoot);

type SavedIncident = Incident & {
  explanation?: IncidentExplanation;
};

function summarize(incidents: Incident[]): DashboardMetrics {
  const active = incidents.filter(
    (incident) => incident.status !== "RESOLVED",
  );

  return {
    activeIncidents: active.length,
    criticalIncidents: active.filter(
      (incident) => incident.severity === "CRITICAL",
    ).length,
    advisorsAffected: new Set(
      active.flatMap((incident) => incident.advisorIds),
    ).size,
    clientsAffected: new Set(
      active.flatMap((incident) =>
        incident.affectedClients.map((client) => client.clientId),
      ),
    ).size,
    potentialExposure: formatUsd(
      active.reduce(
        (total, incident) => total + incident.potentialExposure,
        0,
      ),
    ),
  };
}

async function fetchIncidentGraph(incident: Incident): Promise<Incident> {
  const attackPath = await incidentService.getIncidentGraph(
    incident.incidentId,
  );

  if (!attackPath) {
    throw new Error("No graph returned from the backend");
  }

  return { ...incident, attackPath };
}

function savedExplanation(
  incident: Incident,
): IncidentExplanation | null {
  const explanation = (incident as SavedIncident).explanation;

  return typeof explanation?.narrative === "string"
    ? explanation
    : null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Request failed";
}

export function App() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [primary, setPrimary] = useState<Incident | null>(null);
  const [explanation, setExplanation] =
    useState<IncidentExplanation | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const metrics = useMemo(
    () => summarize(incidents),
    [incidents],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const saved = await incidentService.getIncidents();
        const selected = saved[0]
          ? await fetchIncidentGraph(saved[0])
          : null;

        if (cancelled) return;

        setIncidents(saved);
        setPrimary(selected);
        setExplanation(
          selected ? savedExplanation(selected) : null,
        );
      } catch (caught) {
        if (!cancelled) {
          setError(errorMessage(caught));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function runScenario(name: "attack" | "normal") {
    if (pending || loading) return;

    setPending(true);
    setError(null);

    try {
      const response = await fetch(
        `${apiRoot}/demo/scenarios/${name}`,
        { method: "POST" },
      );

      if (!response.ok) {
        throw new Error(
          `Scenario failed (${response.status}); check backend terminal`,
        );
      }

      const payload = (await response.json()) as {
        incidents: Incident[];
      };

      if (!Array.isArray(payload.incidents)) {
        throw new Error("Invalid scenario response");
      }

      const selected = payload.incidents[0]
        ? await fetchIncidentGraph(payload.incidents[0])
        : null;

      setIncidents(payload.incidents);
      setPrimary(selected);
      setExplanation(
        selected ? savedExplanation(selected) : null,
      );
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function investigate() {
    if (!primary || pending || loading) return;

    setPending(true);
    setError(null);

    try {
      const updated = await incidentService.updateIncident(
        primary.incidentId,
        { status: "INVESTIGATING" },
      );

      // Preserve the graph already fetched from Neptune.
      setPrimary({
        ...updated,
        attackPath: primary.attackPath,
      });

      setIncidents((current) =>
        current.map((incident) =>
          incident.incidentId === updated.incidentId
            ? updated
            : incident,
        ),
      );
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function generateExplanation() {
    if (!primary || pending || loading) return;

    setPending(true);
    setError(null);

    try {
      const result = await incidentService.explainIncident(
        primary.incidentId,
      );

      setExplanation(result);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  function resetScreen() {
    if (pending || loading) return;

    setIncidents([]);
    setPrimary(null);
    setExplanation(null);
    setError(null);
  }

  return (
    <div className="min-h-screen bg-paper">
      <Header />

      <main className="mx-auto flex max-w-[1440px] flex-col gap-4 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-navy">
            All data shown in this prototype is synthetic.
          </p>

          <DemoControlsPlaceholder
          disabled={pending || loading}
            onRunNormalScenario={() => void runScenario("normal")}
            onRunAttackScenario={() => void runScenario("attack")}
            onReset={resetScreen}
          />

        </div>

        {loading ? <p>Loading saved incidents…</p> : null}

        {pending ? (
          <p role="status">Processing with AWS…</p>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-critical">
            {error}
          </p>
        ) : null}

        {primary ? (
          <>
            <MetricStrip metrics={metrics} />

            <PrimaryIncident
              incident={primary}
              pending={pending}
              onInvestigate={() => void investigate()}
            />

            <section className="grid grid-cols-[minmax(0,1.4fr)_minmax(360px,0.8fr)] gap-4">
              <AttackGraph
                nodes={primary.attackPath.nodes}
                edges={primary.attackPath.edges}
                primaryNodeIds={primary.attackPath.primaryNodeIds}
              />

              <div className="flex flex-col gap-4">
                <TimelinePlaceholder events={primary.events} />

                <AffectedClients clients={primary.affectedClients} />

                <ActionButton
                  disabled={pending || loading}
                  onClick={() => void generateExplanation()}
                  className="w-full"
                >
                  {pending ? "Please wait…" : "✦ Generate Bedrock explanation"}
                </ActionButton>

                <ExplanationPanel explanation={explanation} />
              </div>
            </section>
          </>
        ) : !loading ? (
          <p className="rounded-lg border border-line bg-white p-6">
            No incidents loaded. Run a scenario.
          </p>
        ) : null}
      </main>
    </div>
  );
}