/**
 * TypeScript representation of Agent Project Card schema v0.3.
 *
 * These types model the canonical machine-readable artifact. UI-specific search,
 * comparison, and evidence projections live in catalog.ts and are produced only
 * by the project-card adapter.
 */
export type NullableString = string | null;
export type Confidence = "high" | "medium" | "low" | "unknown";
export type SupportStatus =
  | "claimed"
  | "documented"
  | "statically_confirmed"
  | "runtime_verified"
  | "partially_implemented"
  | "planned"
  | "deprecated";
export type VerificationStatus =
  | "documented"
  | "statically_confirmed"
  | "runtime_verified"
  | "unverified"
  | "conflicted";
export type FieldState = "unknown" | "not_applicable" | "not_analyzed" | "no_evidence_found";

export interface CardRepository {
  source_id: string;
  url: NullableString;
  owner: NullableString;
  role: "primary" | "supporting" | "documentation" | "example";
  included_paths: string[];
  excluded_paths: string[];
}

export interface SourceRevision {
  source_id: string;
  branch: NullableString;
  tag: NullableString;
  commit: NullableString;
  retrieved_at: string;
  content_digest: NullableString;
}

export interface Capability {
  capability_id: string;
  ontology_id: NullableString;
  name: string;
  description: NullableString;
  support_status: SupportStatus | null;
  scope: NullableString;
  interfaces: string[];
  prerequisites: string[];
  configuration_requirements: string[];
  limitations: string[];
  confidence: Confidence;
  claim_ids: string[];
  evidence_refs: string[];
}

export interface TechnologyEntry {
  name: string;
  version_constraint: NullableString;
  dependency_relation: "direct" | "transitive" | "development" | "optional" | "bundled" | "hosted";
  required: boolean;
  claim_ids: string[];
}

export type TechnologyValue = string | TechnologyEntry;

export interface AssessmentContext {
  context_id: string;
  use_case: string;
  comparison_cohort: string[];
  requirements: string[];
  organizational_constraints: string[];
  assessed_at: string;
}

export interface AssessmentItem {
  statement: string;
  reasoning: NullableString;
  context_id: string;
  confidence: Confidence;
  claim_ids: string[];
}

export interface Claim {
  claim_id: string;
  statement: string;
  claim_kind: "factual" | "interpretive" | "assessment";
  verification_status: VerificationStatus;
  confidence: Confidence;
  applies_to: string;
  assessment_context_id: NullableString;
  supporting_evidence_ids: string[];
  conflicting_evidence_ids: string[];
  reasoning: NullableString;
  last_verified_at: NullableString;
}

export interface Source {
  source_id: string;
  source_type:
    | "repository"
    | "repository_file"
    | "documentation"
    | "package_registry"
    | "release"
    | "issue"
    | "external_page";
  provenance: "first_party" | "third_party" | "unknown";
  uri: string;
  revision_or_version: NullableString;
  retrieved_at: string;
  content_digest: NullableString;
  access_scope: "public" | "private" | "restricted";
}

export interface EvidenceLocator {
  path: NullableString;
  symbol_or_section: NullableString;
  line_start: number | null;
  line_end: number | null;
}

export interface Evidence {
  evidence_id: string;
  source_id: string;
  locator: EvidenceLocator;
  confidence: Confidence;
  excerpt_or_symbol: NullableString;
  note: NullableString;
}

export interface AgentProjectCard {
  schema_version: "0.3";
  card_id: string;
  card_version: number;
  field_states: Record<string, FieldState>;
  project: {
    project_id: string;
    name: string;
    primary_type:
      | "agent_application"
      | "agent_framework_sdk"
      | "agent_harness_runtime"
      | "agent_tool_mcp"
      | "agent_skill"
      | `x-${string}`;
    type_rationale: NullableString;
    boundary: NullableString;
    repositories: CardRepository[];
    packages: string[];
    services: string[];
    documentation_sites: string[];
    license: NullableString;
    status: "active" | "maintenance" | "archived" | "unclear";
  };
  source_snapshot: {
    analyzed_at: string;
    source_revisions: SourceRevision[];
    release_versions: string[];
    analysis_depth: "triage" | "targeted" | "deep" | "dynamic";
    analysis_configuration: Record<string, unknown>;
    analyzer_version: NullableString;
    ontology_versions: {
      classification: NullableString;
      capabilities: NullableString;
    };
  };
  summary: {
    one_line: NullableString;
    purpose: NullableString;
    target_users: string[];
    primary_use_cases: string[];
  };
  classification: {
    secondary_characteristics: string[];
    domains: string[];
    delivery_forms: string[];
    agent_patterns: string[];
    architecture_layers: string[];
    claim_ids: string[];
  };
  capabilities: Capability[];
  architecture: {
    overview: NullableString;
    languages: string[];
    frameworks_and_sdks: TechnologyValue[];
    model_providers: TechnologyValue[];
    runtime_and_orchestration: TechnologyValue[];
    tools_and_mcp: {
      tools: TechnologyValue[];
      mcp_role: "none" | "client" | "server" | "both" | "unclear";
      mcp_details: string[];
    };
    skills: TechnologyValue[];
    memory_and_state: TechnologyValue[];
    retrieval_and_knowledge: TechnologyValue[];
    document_processing: TechnologyValue[];
    execution_and_sandbox: TechnologyValue[];
    gateways_and_routing: TechnologyValue[];
    storage_and_databases: TechnologyValue[];
    interfaces: TechnologyValue[];
    deployment: TechnologyValue[];
    observability_and_evaluation: TechnologyValue[];
    security_and_permissions: TechnologyValue[];
    data_flows: string[];
    control_flows: string[];
  };
  components: Array<{
    component_id: string;
    name: string;
    path: NullableString;
    project_type: NullableString;
    purpose: NullableString;
    claim_ids: string[];
  }>;
  usage: {
    installation: NullableString;
    minimal_start: NullableString;
    configuration: string[];
    required_services: string[];
    extension_points: string[];
  };
  assessment: {
    contexts: AssessmentContext[];
    maturity: "experimental" | "early" | "established" | "mature" | "unclear";
    maturity_signals: AssessmentItem[];
    strengths: AssessmentItem[];
    limitations: AssessmentItem[];
    risks: AssessmentItem[];
    best_fit: AssessmentItem[];
    poor_fit: AssessmentItem[];
    gaps: AssessmentItem[];
  };
  relationships: {
    depends_on: Array<string | Relationship>;
    integrates_with: Array<string | Relationship>;
    comparable_projects: Array<string | Relationship>;
  };
  claims: Claim[];
  sources: Source[];
  evidence: Evidence[];
  open_questions: Array<string | {
    question: string;
    reason: NullableString;
    related_claim_ids: string[];
  }>;
}

export interface Relationship {
  target_project: string;
  scope: NullableString;
  confidence: Confidence;
  claim_ids: string[];
}
