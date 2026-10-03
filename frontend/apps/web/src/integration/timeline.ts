import type { SecurityEvent } from "@aapg/shared";

/**
 * Integration contract for the timeline.
 * The placeholder renders these events read-only. Playback stays with event module.
 */
export interface TimelineProps {
  events: SecurityEvent[];
}
