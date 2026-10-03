import { createApiIncidentService } from "./apiIncidentService.js";
import type { IncidentService } from "./incidentService.js";
import { createMockIncidentService } from "./mockIncidentService.js";

export type { EventIngestClient, IncidentService } from "./incidentService.js";
export { createApiEventIngestClient, createApiIncidentService } from "./apiIncidentService.js";
export { createMockIncidentService } from "./mockIncidentService.js";
export { apiRoutes } from "./routes.js";

export function createIncidentService(baseUrl = import.meta.env.VITE_API_BASE_URL): IncidentService {
  if (baseUrl && baseUrl.trim().length > 0) {
    return createApiIncidentService(baseUrl);
  }
  return createMockIncidentService();
}

let sharedService: IncidentService | undefined;

export function getIncidentService(): IncidentService {
  sharedService ??= createIncidentService();
  return sharedService;
}
