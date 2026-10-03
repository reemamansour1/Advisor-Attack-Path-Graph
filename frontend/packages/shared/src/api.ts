import type {
  AttackPath,
  Incident,
  IncidentExplanation,
  IncidentStatus,
  SecurityEvent,
} from "./domain.js";

export interface IncidentListResponse {
  incidents: Incident[];
}

export interface IncidentResponse {
  incident: Incident;
}

export interface IncidentGraphResponse {
  attackPath: AttackPath;
}

export interface IncidentExplanationResponse {
  explanation: IncidentExplanation;
}

export interface UpdateIncidentRequest {
  status: IncidentStatus;
}

export interface IngestEventRequest {
  event: SecurityEvent;
}

export interface IngestEventResponse {
  accepted: boolean;
  eventId: string;
}
