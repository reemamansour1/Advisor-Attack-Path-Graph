import { syntheticAttackScenario, syntheticNormalScenario } from "@aapg/correlation";
import type { Scenario, SecurityEvent } from "@aapg/shared";

// Making sure the object has a normal and attack entries with valid scenarios
export const scenarios: Record<"normal" | "attack", Scenario> = {
    normal: syntheticNormalScenario,
    attack: syntheticAttackScenario,
};
export type ScenarioName = keyof typeof scenarios;
export type ScenarioEventHandler = (event: SecurityEvent) => void;

const EVENT_DELAY_MS = 900;

export function playScenario(
    scenarioName: ScenarioName,
    onEvent: ScenarioEventHandler,
): () => void {
    const scenario = scenarios[scenarioName];

    const timerIds = scenario.events.map((event, index) => 
    window.setTimeout(()=>onEvent(event), index * EVENT_DELAY_MS),
);

return () => {
    timerIds.forEach((timerId) => window.clearTimeout(timerId));
};
}