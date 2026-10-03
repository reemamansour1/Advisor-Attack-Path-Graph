import type { TimelineProps } from "../integration/timeline.js";
import { describeEvent, formatEventTime } from "../lib/format.js";

export function TimelinePlaceholder({ events }: TimelineProps) {
  return (
    <section className="rounded-lg border border-dashed border-amber-300 bg-white p-4 shadow-sm" aria-label="Incident timeline">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-navy">Timeline</h3>
        <p className="text-xs text-amber-800">{/*event module: incident timline integration */}</p>
      </div>
      <ol className="mt-3 max-h-40 space-y-2 overflow-auto pr-1">
        {events.map((event) => (
          <li key={event.eventId} className="grid grid-cols-[3.5rem_1fr] gap-3 text-sm">
            <time className="font-mono text-muted" dateTime={event.timestamp}>
              {formatEventTime(event.timestamp)}
            </time>
            <span>{describeEvent(event)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
