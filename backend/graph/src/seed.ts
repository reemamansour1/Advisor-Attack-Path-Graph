import { attackScenarioSeed } from "../seed/attackScenario.js";
import { eventToGraphWritePlan } from "./graphModel.js";
import { createNeptuneExecutor, persistGraphPlan } from "./neptune.js";
import { pathToFileURL } from "node:url";

/** Upserts the synthetic attack-path fixture; safe to run more than once. */
export async function seedAttackScenario(): Promise<void> {
  const db = createNeptuneExecutor();
  for (const event of attackScenarioSeed) {
    await persistGraphPlan(db, eventToGraphWritePlan(event), event.eventId);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await seedAttackScenario();
  console.log(`Seeded ${attackScenarioSeed.length} synthetic events into Neptune.`);
}
