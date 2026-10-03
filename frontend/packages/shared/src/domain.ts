export const SECURITY_EVENT_TYPES = [
  "MALWARE_DETECTED",
  "SUSPICIOUS_LOGIN",
  "CLIENT_ACCOUNT_ACCESSED",
  "NEW_DESTINATION_ADDED",
  "TRANSFER_INITIATED",
] as const;

export type SecurityEventType = (typeof SECURITY_EVENT_TYPES)[number];

export const INCIDENT_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];

export const INCIDENT_STATUSES = ["OPEN", "INVESTIGATING", "ESCALATED", "RESOLVED"] as const;

export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export type EventMetadataValue = string | number | boolean | null;

export type EventMetadata = Record<string, EventMetadataValue>;

export interface SecurityEvent {
  eventId: string;
  eventType: SecurityEventType;
  timestamp: string;
  source: string;
  advisorId?: string;
  deviceId?: string;
  sessionId?: string;
  clientId?: string;
  accountId?: string;
  destinationId?: string;
  transactionId?: string;
  amount?: number;
  severity?: IncidentSeverity;
  metadata?: EventMetadata;
}

export const GRAPH_NODE_TYPES = [
  "Advisor",
  "Device",
  "Session",
  "Client",
  "Account",
  "Destination",
  "Transaction",
] as const;

export type GraphNodeType = (typeof GRAPH_NODE_TYPES)[number];

export const GRAPH_RELATIONSHIPS = [
  "USES",
  "CREATED_SESSION",
  "ASSOCIATED_WITH",
  "ACCESSED",
  "OWNS",
  "ACCESSED_ACCOUNT",
  "ADDED_DESTINATION",
  "INITIATED",
  "SENT_TO",
] as const;

export type GraphRelationship = (typeof GRAPH_RELATIONSHIPS)[number];

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  businessId: string;
  subtitle?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationship: GraphRelationship;
}

export interface AttackPath {
  nodes: GraphNode[];
  edges: GraphEdge[];
  primaryNodeIds: string[];
}

export interface AffectedClient {
  clientId: string;
  displayName: string;
  accountIds: string[];
  potentialExposure: number;
}

export const RISK_SIGNAL_CODES = [
  "MALWARE_DETECTED",
  "SUSPICIOUS_LOGIN",
  "NEW_UNTRUSTED_DEVICE",
  "MULTIPLE_CLIENT_ACCOUNTS_ACCESSED",
  "NEW_DESTINATION_ADDED",
  "LARGE_OR_UNUSUAL_TRANSFER",
] as const;

export type RiskSignalCode = (typeof RISK_SIGNAL_CODES)[number];

export interface RiskSignal {
  code: RiskSignalCode;
  label: string;
  weight: number;
  detail: string;
}

export interface Incident {
  incidentId: string;
  title: string;
  summary: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  riskScore: number;
  signals: RiskSignal[];
  eventIds: string[];
  events: SecurityEvent[];
  advisorIds: string[];
  primaryAdvisorId?: string;
  primaryAdvisorName?: string;
  affectedClients: AffectedClient[];
  accountIds: string[];
  potentialExposure: number;
  attackPath: AttackPath;
  openedAt: string;
  updatedAt: string;
  synthetic: true;
}

export interface IncidentExplanation {
  incidentId: string;
  narrative: string;
  generatedBy: "mock" | "bedrock";
  disclaimer: string;
  evidenceCodes: string[];
}

export interface AdvisorProfile {
  displayName: string;
}

export interface ClientProfile {
  displayName: string;
}

export interface AccountProfile {
  displayName: string;
  clientId: string;
}

export interface NamedProfile {
  displayName: string;
}

export interface DestinationProfile {
  displayName: string;
  trusted: boolean;
}

export interface EntityDirectory {
  advisors: Record<string, AdvisorProfile>;
  clients: Record<string, ClientProfile>;
  accounts: Record<string, AccountProfile>;
  devices: Record<string, NamedProfile>;
  sessions: Record<string, NamedProfile>;
  destinations: Record<string, DestinationProfile>;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  synthetic: true;
  disclaimer: string;
  directory: EntityDirectory;
  events: SecurityEvent[];
}
