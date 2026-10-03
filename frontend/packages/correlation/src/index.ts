export { CORRELATION_WINDOW_MS, clusterEvents } from "./cluster.js";
export { correlateEvents } from "./correlate.js";
export type { CorrelateOptions } from "./correlate.js";
export { syntheticAttackScenario, syntheticNormalScenario } from "./fixtures.js";
export { buildAttackPath } from "./graph.js";
export { buildIncident } from "./incident.js";
export type { BuildIncidentOptions } from "./incident.js";
export {
  LARGE_TRANSFER_THRESHOLD_USD,
  calculateFinancialExposure,
  calculateRiskScore,
  evaluateSignals,
  getSeverity,
} from "./score.js";
