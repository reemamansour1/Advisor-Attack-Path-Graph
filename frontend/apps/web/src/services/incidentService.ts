import type {
  AttackPath,
  Incident,
  IncidentExplanation,
  IncidentStatus,
  SecurityEvent,
} from "@aapg/shared";

export interface IncidentService {
  getIncidents(): Promise<Incident[]>;
  getIncident(incidentId: string): Promise<Incident | null>;
  getIncidentGraph(incidentId: string): Promise<AttackPath | null>;
  updateIncident(incidentId: string, patch: { status: IncidentStatus }): Promise<Incident>;
  explainIncident(incidentId: string): Promise<IncidentExplanation>;
}

export interface EventIngestClient {
  postEvent(event: SecurityEvent): Promise<{ accepted: boolean; eventId: string }>;
}
