export const apiRoutes = {
  events: "/events",
  incidents: "/incidents",
  incident: (incidentId: string) => `/incidents/${encodeURIComponent(incidentId)}`,
  graph: (incidentId: string) => `/incidents/${encodeURIComponent(incidentId)}/graph`,
  explain: (incidentId: string) => `/incidents/${encodeURIComponent(incidentId)}/explain`,
} as const;
