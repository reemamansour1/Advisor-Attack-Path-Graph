import type {
  AttackPath,
  Incident,
  IncidentExplanation,
  IncidentExplanationResponse,
  IncidentGraphResponse,
  IncidentListResponse,
  IncidentResponse,
  IngestEventResponse,
  SecurityEvent,
  UpdateIncidentRequest,
} from "@aapg/shared";

import type { EventIngestClient, IncidentService } from "./incidentService.js";
import { apiRoutes } from "./routes.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function readJson(response: Response): Promise<unknown> {
  return response.json() as Promise<unknown>;
}

async function requestJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    headers: {
      accept: "application/json",
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`Incident API returned ${response.status} for ${url}`);
  }
  return readJson(response);
}

function readIncident(value: unknown): Incident {
  if (!isRecord(value) || typeof value.incidentId !== "string" || typeof value.riskScore !== "number") {
    throw new Error("Incident response did not match the shared contract.");
  }
  return value as unknown as Incident;
}

export function createApiIncidentService(baseUrl: string): IncidentService {
  const root = baseUrl.replace(/\/$/, "");

  return {
    async getIncidents() {
      const payload = (await requestJson(`${root}${apiRoutes.incidents}`)) as IncidentListResponse;
      if (!isRecord(payload) || !Array.isArray(payload.incidents)) {
        throw new Error("Incident list response did not match the shared contract.");
      }
      return payload.incidents.map((incident) => readIncident(incident));
    },
    async getIncident(incidentId) {
      const payload = (await requestJson(
        `${root}${apiRoutes.incident(incidentId)}`,
      )) as IncidentResponse;
      if (!isRecord(payload)) {
        throw new Error("Incident response did not match the shared contract.");
      }
      return readIncident(payload.incident);
    },
    async getIncidentGraph(incidentId) {
      const payload = (await requestJson(
        `${root}${apiRoutes.graph(incidentId)}`,
      )) as IncidentGraphResponse;
      if (!isRecord(payload) || !isRecord(payload.attackPath) || !Array.isArray(payload.attackPath.nodes)) {
        throw new Error("Graph response did not match the shared contract.");
      }
      return payload.attackPath as unknown as AttackPath;
    },
    async updateIncident(incidentId, patch) {
      const body: UpdateIncidentRequest = { status: patch.status };
      const payload = (await requestJson(`${root}${apiRoutes.incident(incidentId)}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      })) as IncidentResponse;
      if (!isRecord(payload)) {
        throw new Error("Incident update response did not match the shared contract.");
      }
      return readIncident(payload.incident);
    },
    async explainIncident(incidentId) {
      const payload = (await requestJson(`${root}${apiRoutes.explain(incidentId)}`, {
        method: "POST",
      })) as IncidentExplanationResponse;
      if (
        !isRecord(payload) ||
        !isRecord(payload.explanation) ||
        typeof payload.explanation.narrative !== "string"
      ) {
        throw new Error("Explanation response did not match the shared contract.");
      }
      return payload.explanation as unknown as IncidentExplanation;
    },
  };
}

export function createApiEventIngestClient(baseUrl: string): EventIngestClient {
  const root = baseUrl.replace(/\/$/, "");

  return {
    async postEvent(event: SecurityEvent) {
      const payload = (await requestJson(`${root}${apiRoutes.events}`, {
        method: "POST",
        body: JSON.stringify({ event }),
      })) as IngestEventResponse;
      if (!isRecord(payload) || payload.accepted !== true || typeof payload.eventId !== "string") {
        throw new Error("Event ingest response did not match the shared contract.");
      }
      return { accepted: true, eventId: payload.eventId };
    },
  };
}
