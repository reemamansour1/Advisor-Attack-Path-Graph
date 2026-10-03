import type { SecurityEvent } from "@aapg/shared";

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompactUsd(amount: number): string {
  if (Math.abs(amount) >= 1000 && amount % 1000 === 0) {
    return `$${amount / 1000}K`;
  }
  return formatUsd(amount);
}

export function formatEventTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function describeEvent(event: SecurityEvent): string {
  switch (event.eventType) {
    case "MALWARE_DETECTED":
      return "Malware detected";
    case "SUSPICIOUS_LOGIN":
      return "Suspicious login";
    case "CLIENT_ACCOUNT_ACCESSED":
      return "Client account accessed";
    case "NEW_DESTINATION_ADDED":
      return "New destination added";
    case "TRANSFER_INITIATED":
      return event.amount !== undefined
        ? `${formatCompactUsd(event.amount)} transfer initiated`
        : "Transfer initiated";
    default: {
      const unknown: never = event.eventType;
      return unknown;
    }
  }
}
