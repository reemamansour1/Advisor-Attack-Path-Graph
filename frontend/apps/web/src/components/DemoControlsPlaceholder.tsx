import type { DemoControlsProps } from "../integration/demoControls.js";
import { ActionButton } from "./ActionButton.js";

type Props = DemoControlsProps & {
  disabled?: boolean;
};

export function DemoControlsPlaceholder({
  onRunNormalScenario,
  onRunAttackScenario,
  onReset,
  disabled = false,
}: Props) {
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label="Demo controls"
    >
      <ActionButton
        variant="normal"
        disabled={disabled || !onRunNormalScenario}
        onClick={() => onRunNormalScenario?.()}
      >
        <span aria-hidden="true">▶</span>
        Run normal scenario
      </ActionButton>

      <ActionButton
        variant="attack"
        disabled={disabled || !onRunAttackScenario}
        onClick={() => onRunAttackScenario?.()}
      >
        <span aria-hidden="true">▶</span>
        Run attack scenario
      </ActionButton>

      <ActionButton
        variant="neutral"
        disabled={disabled || !onReset}
        onClick={() => onReset?.()}
      >
        <span aria-hidden="true">↺</span>
        Reset
      </ActionButton>
    </div>
  );
}