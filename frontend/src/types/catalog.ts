export type RequirementKind = "must" | "prefer" | "avoid";

import type {
  Confidence,
  EvidenceStatus,
  FieldState,
  SupportStatus,
  VerificationStatus,
} from "./projectCard";

export type { Confidence, VerificationStatus } from "./projectCard";

export type ComparisonState = "value" | FieldState;

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
  state: ComparisonState;
  value?: string;
  supportStatus?: SupportStatus;
  evidenceStatus?: EvidenceStatus;
  verificationStatus?: VerificationStatus;
  confidence?: Confidence;
  claimConfidence?: Confidence;
  claimId?: string;
}

export interface ComparisonRow {
  id: string;
  label: string;
  group: "Role and fit" | "Material differences" | "Prototype guidance";
  cells: Record<string, ComparisonCell>;
}

export interface ComparisonResponse {
  assessmentContexts: AssessmentContextView[];
  projectIds: string[];
  rows: ComparisonRow[];
  sharedAttributeCount: number;
}

export interface CatalogGateway {
  searchProjects(query: string): Promise<SearchResponse>;
  compareProjects(projectIds: string[]): Promise<ComparisonResponse>;
  getClaimEvidence(claimId: string): Promise<ClaimEvidenceRecord>;
}
