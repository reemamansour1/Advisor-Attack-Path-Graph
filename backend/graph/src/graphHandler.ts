import { createNeptuneExecutor, getAttackPath } from "./neptune.js";

/** Small traversal entry point for the GET /incidents/{id}/graph handler. */
export async function graphForAdvisor(advisorId: string) {
  if (!advisorId || advisorId.length > 128) throw new Error("A valid advisorId is required");
  return getAttackPath(createNeptuneExecutor(), advisorId);
}
