import type {
  ComparisonState,
  Confidence,
  RequirementKind,
  VerificationStatus,
} from "../types/catalog";

interface Presentation {
  label: string;
  tone: "positive" | "informational" | "warning" | "neutral" | "muted";
  symbol: string;
}

export const verificationPresentation: Record<VerificationStatus, Presentation> = {
  claimed: { label: "Claimed", tone: "warning", symbol: "◇" },
  documented: { label: "Documented", tone: "informational", symbol: "▤" },
  statically_confirmed: {
    label: "Confirmed in source",
    tone: "positive",
    symbol: "●",
  },
  runtime_verified: {
    label: "Runtime verified",
    tone: "positive",
    symbol: "◆",
  },
  not_analyzed: { label: "Not analyzed", tone: "muted", symbol: "—" },
  unknown: { label: "Unknown", tone: "neutral", symbol: "?" },
  no_evidence_found: {
    label: "No evidence found",
    tone: "warning",
    symbol: "○",
  },
  not_applicable: { label: "Not applicable", tone: "muted", symbol: "–" },
};

export const comparisonStatePresentation: Record<ComparisonState, Presentation> = {
  value: { label: "Value", tone: "neutral", symbol: "" },
  unknown: verificationPresentation.unknown,
  not_applicable: verificationPresentation.not_applicable,
  not_analyzed: verificationPresentation.not_analyzed,
  no_evidence_found: verificationPresentation.no_evidence_found,
};

export const confidencePresentation: Record<Confidence, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

export const requirementPresentation: Record<RequirementKind, string> = {
  must: "Must",
  prefer: "Prefer",
  avoid: "Avoid",
};
