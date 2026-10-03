import type { SecurityEvent } from "@aapg/shared";

export const CORRELATION_WINDOW_MS = 60 * 60 * 1000;

const RELATION_FIELDS = [
  "advisorId",
  "deviceId",
  "sessionId",
  "clientId",
  "accountId",
  "destinationId",
] as const satisfies readonly (keyof SecurityEvent)[];

function sharesRelationship(left: SecurityEvent, right: SecurityEvent): boolean {
  return RELATION_FIELDS.some((field) => {
    const value = left[field];
    return typeof value === "string" && value.length > 0 && value === right[field];
  });
}

function compareEvents(left: SecurityEvent, right: SecurityEvent): number {
  const timeDelta = Date.parse(left.timestamp) - Date.parse(right.timestamp);
  if (timeDelta !== 0) return timeDelta;
  return left.eventId.localeCompare(right.eventId);
}

/**
 * Groups events that share an advisor, device, session, client, account, or
 * destination and whose combined time span stays inside the correlation window.
 * Close timestamps alone do not create a relationship.
 */
export function clusterEvents(events: readonly SecurityEvent[]): SecurityEvent[][] {
  const timed = events.map((event, index) => ({
    event,
    index,
    time: Date.parse(event.timestamp),
  }));

  const parent = timed.map((_, index) => index);
  const minTime = timed.map((item) => item.time);
  const maxTime = timed.map((item) => item.time);

  const find = (index: number): number => {
    let root = index;
    while (parent[root] !== root) {
      const next = parent[root];
      if (next === undefined) return root;
      root = next;
    }

    let cursor = index;
    while (cursor !== root) {
      const next = parent[cursor];
      if (next === undefined) break;
      parent[cursor] = root;
      cursor = next;
    }

    return root;
  };

  const pairs: Array<{ left: number; right: number; gap: number }> = [];
  for (let left = 0; left < timed.length; left += 1) {
    for (let right = left + 1; right < timed.length; right += 1) {
      const first = timed[left];
      const second = timed[right];
      if (!first || !second) continue;
      if (!Number.isFinite(first.time) || !Number.isFinite(second.time)) continue;
      const gap = Math.abs(first.time - second.time);
      if (gap > CORRELATION_WINDOW_MS) continue;
      if (!sharesRelationship(first.event, second.event)) continue;
      pairs.push({ left, right, gap });
    }
  }

  pairs.sort((left, right) => left.gap - right.gap || left.left - right.left || left.right - right.right);

  for (const pair of pairs) {
    const rootLeft = find(pair.left);
    const rootRight = find(pair.right);
    if (rootLeft === rootRight) continue;

    const leftMin = minTime[rootLeft];
    const rightMin = minTime[rootRight];
    const leftMax = maxTime[rootLeft];
    const rightMax = maxTime[rootRight];
    if (
      leftMin === undefined ||
      rightMin === undefined ||
      leftMax === undefined ||
      rightMax === undefined
    ) {
      continue;
    }

    const nextMin = Math.min(leftMin, rightMin);
    const nextMax = Math.max(leftMax, rightMax);
    if (nextMax - nextMin > CORRELATION_WINDOW_MS) continue;

    parent[rootRight] = rootLeft;
    minTime[rootLeft] = nextMin;
    maxTime[rootLeft] = nextMax;
  }

  const groups = new Map<number, SecurityEvent[]>();
  for (let index = 0; index < timed.length; index += 1) {
    const item = timed[index];
    if (!item) continue;
    const root = find(index);
    const group = groups.get(root) ?? [];
    group.push(item.event);
    groups.set(root, group);
  }

  return [...groups.values()].map((group) => [...group].sort(compareEvents));
}
