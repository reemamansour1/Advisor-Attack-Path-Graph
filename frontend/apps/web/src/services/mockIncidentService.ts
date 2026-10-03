import { correlateEvents, syntheticAttackScenario } from "@aapg/correlation";
import type { Incident, IncidentExplanation, IncidentStatus } from "@aapg/shared";

import type { IncidentService } from "./incidentService.js";

function mockExplanation(incident: Incident): IncidentExplanation {
  const signalText = incident.signals
    .map((signal) => `${signal.label} (+${signal.weight})`)
    .join(", ");

  return {
    incidentId: incident.incidentId,
    generatedBy: "mock",
    disclaimer:
      "AI Explanation — Mocked for local development. Amazon Bedrock was not called and did not choose the severity or risk score.",
    evidenceCodes: incident.signals.map((signal) => signal.code),
    narrative: [
      `${incident.title} for ${incident.primaryAdvisorName ?? "the advisor"} (${incident.primaryAdvisorId ?? "unknown advisor"}).`,
      `The correlation engine already scored this synthetic incident at ${incident.riskScore} (${incident.severity}) before any explanation was written.`,
      signalText
        ? `Deterministic signals: ${signalText}.`
        : "No elevated signals fired.",
      `${incident.affectedClients.length} clients and ${incident.accountIds.length} accounts are on the path. Potential exposure counted only for suspicious-path transfers is ${incident.potentialExposure} USD.`,
    ].join(" "),
  };
}

export function createMockIncidentService(): IncidentService {
  let incidents = correlateEvents(syntheticAttackScenario.events, {
    directory: syntheticAttackScenario.directory,
  });

  const requireIncident = (incidentId: string): Incident => {
    const incident = incidents.find((item) => item.incidentId === incidentId);
    if (!incident) {
      throw new Error(`Synthetic incident ${incidentId} was not found.`);
    }
    return incident;
  };

  return {
    async getIncidents() {
      return incidents;
    },
    async getIncident(incidentId) {
      return incidents.find((incident) => incident.incidentId === incidentId) ?? null;
    },
    async getIncidentGraph(incidentId) {
      return incidents.find((incident) => incident.incidentId === incidentId)?.attackPath ?? null;
    },
    async updateIncident(incidentId, patch: { status: IncidentStatus }) {
      const current = requireIncident(incidentId);
      const updated: Incident = {
        ...current,
        status: patch.status,
        updatedAt: new Date().toISOString(),
      };
      incidents = incidents.map((incident) =>
        incident.incidentId === incidentId ? updated : incident,
      );
      return updated;
    },
    async explainIncident(incidentId) {
      return mockExplanation(requireIncident(incidentId));
    },
  };
}
