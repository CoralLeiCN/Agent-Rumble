export type RequirementKind = "must" | "prefer" | "avoid";

import type {
  AgentProjectCard,
  Confidence,
  EvidenceStatus,
  FieldState,
  VerificationStatus,
} from "./projectCard";

export type { Confidence, VerificationStatus } from "./projectCard";

export type ComparisonJsonValue =
  | null
  | string
  | number
  | boolean
  | ComparisonJsonValue[]
  | { [key: string]: ComparisonJsonValue };

export type ComparisonState = "value" | FieldState | "not_present";

export type ComparisonSemanticKind =
  | "value"
  | "support_status"
  | "evidence_status"
  | "verification_status"
  | "confidence"
  | "field_state"
  | "claim_reference";

export type ComparisonValueKind =
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "primitive_array"
  | "empty_array"
  | "empty_object";

export interface Requirement {
  id: string;
  kind: RequirementKind;
  label: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  owner: string;
  projectType: string;
  role: string;
  summary: string;
  matchReason: string;
  constraint: string;
  languages: string[];
  cardId: string;
  schemaVersion: string;
  cardVersion: number;
  canonicalPrimaryType: string;
  analysisDepth: string;
  boundary: string;
  sourceCount: number;
  revision: string;
  analyzedAt: string;
  matchClaim: {
    claimId: string;
    verificationStatus: VerificationStatus;
    confidence: Confidence;
  };
}

export interface AssessmentContextView {
  contextId: string;
  projectId: string;
  useCase: string;
  comparisonCohort: string[];
  requirements: string[];
  organizationalConstraints: string[];
  assessedAt: string;
}

export interface SearchResponse {
  query: string;
  assessmentContexts: AssessmentContextView[];
  requirements: Requirement[];
  uninterpretedTerms: string[];
  projects: ProjectSummary[];
}

export interface ResolvedEvidence {
  id: string;
  relationship: "supporting" | "conflicting";
  evidenceStatus: EvidenceStatus;
  confidence: Confidence;
  sourceType: string;
  provenance: string;
  retrievedAt: string;
  accessScope: string;
  repository: string;
  revision: string;
  locator: string;
  excerpt: string;
  sourceUrl: string | null;
}

export interface ClaimEvidenceRecord {
  claimId: string;
  projectId: string;
  claim: string;
  claimKind: string;
  appliesTo: string;
  assessmentContextId: string | null;
  whyItMatters: string;
  verificationStatus: VerificationStatus;
  confidence: Confidence;
  supportingEvidence: ResolvedEvidence[];
  conflictingEvidence: ResolvedEvidence[];
}

export interface ComparisonCell {
  pointer: string | null;
  state: ComparisonState;
  value?: ComparisonJsonValue;
  claimIds: string[];
}

export interface ComparisonRow {
  id: string;
  label: string;
  logicalPath: string;
  fieldPattern: string;
  semanticKind: ComparisonSemanticKind;
  valueKind: ComparisonValueKind;
  cells: Record<string, ComparisonCell>;
  isDifferent: boolean;
}

export interface ComparisonContractField {
  label: string;
  fieldPattern: string;
  semanticKind: ComparisonSemanticKind;
  valueKind: ComparisonValueKind;
}

export interface ComparisonGroup {
  id: string;
  label: string;
  path: string;
  rows: ComparisonRow[];
  contractOnlyFields: ComparisonContractField[];
}

export interface ComparisonCardRef {
  projectId: string;
  cardId: string;
  cardVersion: number;
  schemaVersion: string;
}

export type ComparisonProvenance = "fixture" | "validated_catalog";

export interface ComparisonResponse {
  assessmentContexts: AssessmentContextView[];
  projectIds: string[];
  cards: AgentProjectCard[];
  cardRefs: ComparisonCardRef[];
  schemaVersions: string[];
  provenance: ComparisonProvenance;
  groups: ComparisonGroup[];
  totalAttributeCount: number;
  differentAttributeCount: number;
  sharedAttributeCount: number;
  contractOnlyAttributeCount: number;
}

export interface CatalogGateway {
  searchProjects(query: string): Promise<SearchResponse>;
  compareProjects(projectIds: string[]): Promise<ComparisonResponse>;
  getClaimEvidence(claimId: string): Promise<ClaimEvidenceRecord>;
}
