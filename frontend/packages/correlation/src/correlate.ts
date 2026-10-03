import type { EntityDirectory, Incident, SecurityEvent } from "@aapg/shared";

import { clusterEvents } from "./cluster.js";
import { buildIncident } from "./incident.js";

export interface CorrelateOptions {
  directory?: EntityDirectory;
}

/**
 * Deterministic correlation. This function does not call a model and does not
 * assign severity from narrative text.
 */
export function correlateEvents(
  events: readonly SecurityEvent[],
  options: CorrelateOptions = {},
): Incident[] {
  return clusterEvents(events)
    .filter((group) => group.length > 0)
    .map((group) => buildIncident(group, { directory: options.directory }))
    .sort(
      (left, right) => right.riskScore - left.riskScore || left.incidentId.localeCompare(right.incidentId),
    );
}
