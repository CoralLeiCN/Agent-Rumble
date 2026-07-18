export type RequirementKind = "must" | "prefer" | "avoid";

export type VerificationStatus =
  | "claimed"
  | "documented"
  | "statically_confirmed"
  | "runtime_verified"
  | "not_analyzed"
  | "unknown"
  | "no_evidence_found"
  | "not_applicable";

export type Confidence = "high" | "medium" | "low";

export type ComparisonState =
  | "value"
  | "unknown"
  | "not_applicable"
  | "not_analyzed"
  | "no_evidence_found";

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
  revision: string;
  analyzedAt: string;
  verificationStatus: VerificationStatus;
  confidence: Confidence;
}

export interface SearchResponse {
  query: string;
  assessmentContext: string;
  requirements: Requirement[];
  uninterpretedTerms: string[];
  projects: ProjectSummary[];
}

export interface EvidenceRecord {
  id: string;
  projectId: string;
  claim: string;
  whyItMatters: string;
  verificationStatus: VerificationStatus;
  confidence: Confidence;
  repository: string;
  revision: string;
  locator: string;
  excerpt: string;
  sourceUrl: string;
}

export interface ComparisonCell {
  state: ComparisonState;
  value?: string;
  verificationStatus?: VerificationStatus;
  confidence?: Confidence;
  evidenceId?: string;
}

export interface ComparisonRow {
  id: string;
  label: string;
  group: "Role and fit" | "Material differences" | "Prototype guidance";
  cells: Record<string, ComparisonCell>;
}

export interface ComparisonResponse {
  assessmentContext: string;
  projectIds: string[];
  rows: ComparisonRow[];
  sharedAttributeCount: number;
}

export interface CatalogGateway {
  searchProjects(query: string): Promise<SearchResponse>;
  compareProjects(projectIds: string[]): Promise<ComparisonResponse>;
  getEvidence(evidenceId: string): Promise<EvidenceRecord>;
}
