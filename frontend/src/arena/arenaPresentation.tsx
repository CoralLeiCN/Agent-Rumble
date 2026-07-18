import {
  comparisonStatePresentation,
  confidencePresentation,
  verificationPresentation,
} from "../status/statusPresentation";
import type { VerificationStatus } from "../types/catalog";
import type {
  RumbleComparisonState,
  RumbleConfidence,
  RumbleRequirementAlignment,
  RumbleRoundVerdict,
  RumbleVerificationStatus,
} from "../types/rumble";

const extendedVerification = {
  unverified: { label: "Unverified", symbol: "◇", tone: "warning" },
  conflicted: { label: "Conflicted", symbol: "!", tone: "warning" },
} as const;

const catalogStatuses = new Set<RumbleVerificationStatus>([
  "documented",
  "statically_confirmed",
  "runtime_verified",
]);

export function verificationFor(status: RumbleVerificationStatus) {
  if (catalogStatuses.has(status)) {
    return verificationPresentation[status as VerificationStatus];
  }
  return extendedVerification[status as keyof typeof extendedVerification];
}

export function confidenceFor(confidence: RumbleConfidence) {
  return confidence === "unknown"
    ? "Confidence unknown"
    : confidencePresentation[confidence];
}

export function comparisonStateFor(state: RumbleComparisonState) {
  return comparisonStatePresentation[state];
}

export const alignmentLabels: Record<RumbleRequirementAlignment, string> = {
  satisfies: "Satisfies this context",
  partially_satisfies: "Partially satisfies",
  does_not_satisfy: "Does not satisfy",
  unclear: "Contextual fit unclear",
  not_applicable: "Not applicable",
};

export const verdictPresentation: Record<
  RumbleRoundVerdict,
  { label: string; symbol: string; tone: string }
> = {
  entrant_a_advantage: { label: "Contextual edge · left corner", symbol: "↙", tone: "edge" },
  entrant_b_advantage: { label: "Contextual edge · right corner", symbol: "↘", tone: "edge" },
  trade_off: { label: "Trade-off", symbol: "↔", tone: "tradeoff" },
  inconclusive: { label: "Inconclusive", symbol: "?", tone: "inconclusive" },
};

export function humanizeRole(role: string) {
  return role.replaceAll("_", " ");
}

export function shortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
