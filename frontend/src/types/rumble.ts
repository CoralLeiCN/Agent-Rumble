import type { ClaimReference } from "./catalog";

export type RumbleComparisonState =
  "value" | "unknown" | "not_applicable" | "not_analyzed" | "no_evidence_found";

export type RumbleRequirementAlignment =
  | "satisfies"
  | "partially_satisfies"
  | "does_not_satisfy"
  | "unclear"
  | "not_applicable";

export type RumbleVerificationStatus =
  | "documented"
  | "statically_confirmed"
  | "runtime_verified"
  | "unverified"
  | "conflicted";

export type RumbleConfidence = "high" | "medium" | "low" | "unknown";

export type RumbleRoundVerdict =
  "entrant_a_advantage" | "entrant_b_advantage" | "trade_off" | "inconclusive";

export interface RumbleSourceSnapshot {
  card_id: string;
  card_version: number;
  revision: string;
  analyzed_at: string;
}

export interface RumbleEntrant {
  project_id: string;
  project_name: string;
  project_roles: string[];
  source_snapshot: RumbleSourceSnapshot;
}

export interface RumbleAssessmentContext {
  title: string;
  use_case: string;
  cohort_project_ids: string[];
  requirements: string[];
  organizational_constraints: string[];
  assessed_at: string;
}

export interface RumbleCell {
  state: RumbleComparisonState;
  value?: string | null;
  alignment: RumbleRequirementAlignment;
  verification_status: RumbleVerificationStatus;
  confidence: RumbleConfidence;
  claim_ids: string[];
}

export interface RumbleRoundInput {
  dimension: string;
  label: string;
  requirement: string;
  entrant_a: RumbleCell;
  entrant_b: RumbleCell;
}

export interface RumbleRound extends RumbleRoundInput {
  round_number: number;
  round_id: string;
  title: string;
  verdict: RumbleRoundVerdict;
  callout: string;
}

export interface RumbleProjectionResponse {
  mode: "rumble_arena";
  assessment_context: RumbleAssessmentContext;
  entrants: RumbleEntrant[];
  role_relationship: "overlapping" | "different";
  role_notice: string;
  rounds: RumbleRound[];
  overall_result: "no_universal_winner";
  ring_call: string;
}

export interface RumbleMatchup {
  display_label: string;
  claims: RumbleClaim[];
}

export interface RumbleClaim {
  canonical_reference: ClaimReference;
  claim_id: string;
  project_id: string;
  statement: string;
  why_it_matters: string;
  verification_status: RumbleVerificationStatus;
  confidence: RumbleConfidence;
  supporting_evidence: RumbleEvidence[];
  conflicting_evidence: RumbleEvidence[];
}

export interface RumbleEvidence {
  evidence_id: string;
  repository: string;
  revision: string;
  path: string;
  locator: string;
  excerpt: string;
  source_url: string | null;
}

export interface CanonicalRumbleResult {
  matchup: RumbleMatchup;
  projection: RumbleProjectionResponse;
}

export interface RumbleGateway {
  load(): Promise<CanonicalRumbleResult>;
}
