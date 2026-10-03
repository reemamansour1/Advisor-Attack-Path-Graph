/**
 * Integration contract for the scenario runner and demo controls.
 * The shell does not play scenarios or post events.
 */
export interface DemoControlsProps {
  onRunNormalScenario?: () => void;
  onRunAttackScenario?: () => void;
  onReset?: () => void;
}
