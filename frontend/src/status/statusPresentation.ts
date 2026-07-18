import type {
  ComparisonState,
  Confidence,
  RequirementKind,
  VerificationStatus,
} from "../types/catalog";
import type { SupportStatus } from "../types/projectCard";

interface Presentation {
  label: string;
  tone: "positive" | "informational" | "warning" | "neutral" | "muted";
  symbol: string;
}

export const verificationPresentation: Record<VerificationStatus, Presentation> = {
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
  unverified: { label: "Unverified", tone: "warning", symbol: "◇" },
  conflicted: {
    label: "Conflicted evidence",
    tone: "warning",
    symbol: "!",
  },
};

export const comparisonStatePresentation: Record<ComparisonState, Presentation> = {
  value: { label: "Value", tone: "neutral", symbol: "" },
  not_present: { label: "No corresponding entry", tone: "muted", symbol: "·" },
  unknown: { label: "Unknown", tone: "neutral", symbol: "?" },
  not_applicable: { label: "Not applicable", tone: "muted", symbol: "–" },
  not_analyzed: { label: "Not analyzed", tone: "muted", symbol: "—" },
  no_evidence_found: { label: "No evidence found", tone: "neutral", symbol: "○" },
};

export const supportStatusPresentation: Record<SupportStatus, Presentation> = {
  claimed: { label: "Claimed support", tone: "neutral", symbol: "◇" },
  documented: { label: "Documented support", tone: "informational", symbol: "▤" },
  statically_confirmed: { label: "Statically confirmed", tone: "positive", symbol: "●" },
  runtime_verified: { label: "Runtime verified support", tone: "positive", symbol: "◆" },
  partially_implemented: { label: "Partially implemented", tone: "warning", symbol: "◐" },
  planned: { label: "Planned", tone: "neutral", symbol: "○" },
  deprecated: { label: "Deprecated", tone: "warning", symbol: "!" },
};

export const confidencePresentation: Record<Confidence, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
  unknown: "Unknown confidence",
};

export const requirementPresentation: Record<RequirementKind, string> = {
  must: "Must",
  prefer: "Prefer",
  avoid: "Avoid",
};
