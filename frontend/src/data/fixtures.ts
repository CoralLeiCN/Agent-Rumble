import type { SearchProjectionContext } from "./projectCardAdapter";
import type {
  AgentProjectCard,
  Confidence,
  FieldState,
  SupportStatus,
  VerificationStatus,
} from "../types/projectCard";

export const preparedQuery =
  "A customer-support agent framework with human approval, durable state, and self-hosting";

export const searchProjectionContext: SearchProjectionContext = {
  requirements: [
    { id: "req-approval", kind: "must", label: "Human approval controls" },
    { id: "req-python", kind: "must", label: "Python support" },
    { id: "req-state", kind: "prefer", label: "Durable workflow state" },
    { id: "req-host", kind: "prefer", label: "Self-hosted core" },
    { id: "req-avoid", kind: "avoid", label: "Mandatory hosted control plane" },
  ],
  uninterpretedTerms: ["customer-support"],
};

interface FactFixture {
  key: "approval" | "state" | "self-hosted";
  name: string;
  ontologyId: string;
  description: string;
  supportStatus: SupportStatus;
  verificationStatus: VerificationStatus;
  confidence: Confidence;
  reasoning: string;
  path: string;
  section: string;
  lineStart: number | null;
  lineEnd: number | null;
  excerpt: string;
}

interface CardFixtureInput {
  id: string;
  name: string;
  owner: string;
  repository: string;
  typeLabel: string;
  role: string;
  summary: string;
  boundary: string;
  languages: string[];
  revision: string;
  analyzedAt: string;
  bestFit: string;
  limitation: string;
  facts: FactFixture[];
  unresolvedCapabilities?: Array<{
    name: string;
    ontologyId: string;
    state: FieldState;
  }>;
  openQuestions?: string[];
}

function makeCard(input: CardFixtureInput): AgentProjectCard {
  const sourceId = `source-${input.id}`;
  const contextId = `context-${input.id}`;
  const claimId = (key: FactFixture["key"]) => `claim-${input.id}-${key}`;
  const evidenceId = (key: FactFixture["key"]) => `evidence-${input.id}-${key}`;
  const claimIds = input.facts.map(({ key }) => claimId(key));
  const unresolvedCapabilities = input.unresolvedCapabilities ?? [];
  const unresolvedFieldStates = Object.fromEntries(
    unresolvedCapabilities.map(({ state }, offset) => [
      `/capabilities/${input.facts.length + offset}/support_status`,
      state,
    ]),
  );
  return {
    schema_version: "0.3",
    card_id: `card-${input.id}`,
    card_version: 1,
    field_states: unresolvedFieldStates,
    project: {
      project_id: input.id,
      name: input.name,
      primary_type: "agent_framework_sdk",
      type_rationale: input.role,
      boundary: input.boundary,
      repositories: [{
        source_id: sourceId,
        url: input.repository,
        owner: input.owner,
        role: "primary",
        included_paths: ["src", "docs"],
        excluded_paths: ["vendor"],
      }],
      packages: [],
      services: [],
      documentation_sites: [],
      license: "Open source; validate exact terms before adoption",
      status: "active",
    },
    source_snapshot: {
      analyzed_at: `${input.analyzedAt}T12:00:00Z`,
      source_revisions: [{
        source_id: sourceId,
        branch: "main",
        tag: "illustrative-snapshot",
        commit: input.revision,
        retrieved_at: `${input.analyzedAt}T12:00:00Z`,
        content_digest: `sha256:illustrative-${input.id}`,
      }],
      release_versions: [],
      analysis_depth: "targeted",
      analysis_configuration: { dynamic_analysis: false, fixture: true },
      analyzer_version: "illustrative-prototype/0.1",
      ontology_versions: { classification: "0.1", capabilities: "0.1" },
    },
    summary: {
      one_line: input.summary,
      purpose: input.summary,
      target_users: ["Agent application developers"],
      primary_use_cases: ["Build an agent application"],
    },
    classification: {
      secondary_characteristics: [input.typeLabel],
      domains: ["general purpose"],
      delivery_forms: ["open-source library"],
      agent_patterns: ["tool use", "multi-step orchestration"],
      architecture_layers: [input.role],
      claim_ids: claimIds,
    },
    capabilities: [
      ...input.facts.map((fact) => ({
        capability_id: `capability-${input.id}-${fact.key}`,
        ontology_id: fact.ontologyId,
        name: fact.name,
        description: fact.description,
        support_status: fact.supportStatus,
        scope: input.name,
        interfaces: input.languages.map((language) => `${language} API`),
        prerequisites: [],
        configuration_requirements: [],
        limitations: [],
        confidence: fact.confidence,
        claim_ids: [claimId(fact.key)],
        evidence_refs: [evidenceId(fact.key)],
      })),
      ...unresolvedCapabilities.map((capability, offset) => ({
        capability_id: `capability-${input.id}-unresolved-${offset}`,
        ontology_id: capability.ontologyId,
        name: capability.name,
        description: "This capability state is preserved from the canonical card.",
        support_status: null,
        scope: input.name,
        interfaces: [],
        prerequisites: [],
        configuration_requirements: [],
        limitations: [],
        confidence: "unknown" as const,
        claim_ids: [],
        evidence_refs: [],
      })),
    ],
    architecture: {
      overview: `${input.name} operates as ${input.role.toLowerCase()}.`,
      languages: input.languages,
      frameworks_and_sdks: [],
      model_providers: [],
      runtime_and_orchestration: [input.role],
      tools_and_mcp: { tools: [], mcp_role: "none", mcp_details: [] },
      skills: [],
      memory_and_state: [],
      retrieval_and_knowledge: [],
      document_processing: [],
      execution_and_sandbox: [],
      gateways_and_routing: [],
      storage_and_databases: [],
      interfaces: input.languages.map((language) => `${language} API`),
      deployment: ["Application-hosted library"],
      observability_and_evaluation: [],
      security_and_permissions: [],
      data_flows: [],
      control_flows: [],
    },
    components: [{
      component_id: `component-${input.id}-runtime`,
      name: "Core runtime",
      path: "src",
      project_type: "agent_harness_runtime",
      purpose: input.role,
      claim_ids: claimIds,
    }],
    usage: {
      installation: "Install the project package.",
      minimal_start: "Create an agent workflow in application code.",
      configuration: [],
      required_services: [],
      extension_points: [],
    },
    assessment: {
      contexts: [{
        context_id: contextId,
        use_case: "customer-support agent prototype",
        comparison_cohort: ["openai-agents-sdk", "langgraph", "crewai"],
        requirements: searchProjectionContext.requirements.map(({ label }) => label),
        organizational_constraints: ["Two-week prototype", "Self-hosted preferred"],
        assessed_at: `${input.analyzedAt}T12:00:00Z`,
      }],
      maturity: "unclear",
      maturity_signals: [],
      strengths: [],
      limitations: [{
        statement: input.limitation,
        reasoning: "Contextual prototype fixture; validation is required.",
        context_id: contextId,
        confidence: "medium",
        claim_ids: [claimIds[0]],
      }],
      risks: [],
      best_fit: [{
        statement: input.bestFit,
        reasoning: "Contextual prototype fixture; validation is required.",
        context_id: contextId,
        confidence: "medium",
        claim_ids: [claimIds[0]],
      }],
      poor_fit: [],
      gaps: [],
    },
    relationships: {
      depends_on: [],
      integrates_with: [],
      comparable_projects: ["openai-agents-sdk", "langgraph", "crewai"].filter((id) => id !== input.id),
    },
    claims: input.facts.map((fact) => ({
      claim_id: claimId(fact.key),
      statement: fact.description,
      claim_kind: "factual",
      verification_status: fact.verificationStatus,
      confidence: fact.confidence,
      applies_to: input.id,
      assessment_context_id: contextId,
      supporting_evidence_ids: [evidenceId(fact.key)],
      conflicting_evidence_ids: [],
      reasoning: fact.reasoning,
      last_verified_at: `${input.analyzedAt}T12:00:00Z`,
    })),
    sources: [{
      source_id: sourceId,
      source_type: "repository",
      provenance: "first_party",
      uri: input.repository,
      revision_or_version: input.revision,
      retrieved_at: `${input.analyzedAt}T12:00:00Z`,
      content_digest: `sha256:illustrative-${input.id}`,
      access_scope: "public",
    }],
    evidence: input.facts.map((fact) => ({
      evidence_id: evidenceId(fact.key),
      source_id: sourceId,
      locator: {
        path: fact.path,
        symbol_or_section: fact.section,
        line_start: fact.lineStart,
        line_end: fact.lineEnd,
      },
      confidence: fact.confidence,
      excerpt_or_symbol: fact.excerpt,
      note: fact.reasoning,
    })),
    open_questions: input.openQuestions ?? [],
  };
}

export const projectCards: AgentProjectCard[] = [
  makeCard({
    id: "openai-agents-sdk",
    name: "OpenAI Agents SDK",
    owner: "openai",
    repository: "https://github.com/openai/openai-agents-python",
    typeLabel: "Agent SDK",
    role: "Application agent runtime",
    summary: "A compact SDK for composing agents, tools, handoffs, guardrails, and tracing in application code.",
    boundary: "The Python SDK in the primary public repository.",
    languages: ["Python", "TypeScript"],
    revision: "a94d3f2",
    analyzedAt: "2026-07-15",
    bestFit: "Prototype when you want a small application SDK and can own durable workflow state.",
    limitation: "Durable workflow state requires application-owned infrastructure.",
    facts: [
      {
        key: "approval", name: "Human approval", ontologyId: "capability:human-approval",
        description: "Tool approval is represented before execution.", supportStatus: "statically_confirmed",
        verificationStatus: "statically_confirmed", confidence: "high",
        reasoning: "Sensitive customer-account actions require review before tool execution.",
        path: "src/agents/tool.py", section: "approval handling", lineStart: 610, lineEnd: 636,
        excerpt: "if needs_approval:\n    return ToolCallOutputItem(...)",
      },
      {
        key: "state", name: "Durable state", ontologyId: "capability:durable-state",
        description: "Session state exists; durable workflow recovery is application-owned.", supportStatus: "documented",
        verificationStatus: "documented", confidence: "medium",
        reasoning: "The prepared workflow needs state to survive process boundaries.",
        path: "docs/sessions.md", section: "Sessions", lineStart: 1, lineEnd: 24,
        excerpt: "Sessions provide a persistent memory layer for agent runs.",
      },
      {
        key: "self-hosted", name: "Self-hosted core", ontologyId: "capability:self-hosted-core",
        description: "Core SDK is installable; model-provider dependencies remain.", supportStatus: "statically_confirmed",
        verificationStatus: "statically_confirmed", confidence: "high",
        reasoning: "The prototype prefers an application-hosted library boundary.",
        path: "pyproject.toml", section: "project", lineStart: 1, lineEnd: 36,
        excerpt: "[project]\nname = \"openai-agents\"",
      },
    ],
  }),
  makeCard({
    id: "langgraph",
    name: "LangGraph",
    owner: "langchain-ai",
    repository: "https://github.com/langchain-ai/langgraph",
    typeLabel: "Orchestration framework",
    role: "Stateful workflow runtime",
    summary: "A graph-oriented runtime for long-running, stateful agent workflows with persistence and interrupts.",
    boundary: "The graph runtime and checkpoint packages in the primary public repository.",
    languages: ["Python", "TypeScript"],
    revision: "7bc162e",
    analyzedAt: "2026-07-15",
    bestFit: "Prototype when pause, resume, and stateful workflows are the center of the design.",
    limitation: "The graph execution model adds concepts and operational surface area.",
    facts: [
      {
        key: "approval", name: "Human approval", ontologyId: "capability:human-approval",
        description: "Execution can interrupt for review and resume.", supportStatus: "statically_confirmed",
        verificationStatus: "statically_confirmed", confidence: "high",
        reasoning: "Approval must survive a process boundary in the prepared support workflow.",
        path: "libs/langgraph/langgraph/types.py", section: "interrupt", lineStart: 420, lineEnd: 461,
        excerpt: "def interrupt(value: Any) -> Any:\n    raise GraphInterrupt(...)",
      },
      {
        key: "state", name: "Durable state", ontologyId: "capability:durable-state",
        description: "Checkpointing is central to the graph execution model.", supportStatus: "statically_confirmed",
        verificationStatus: "statically_confirmed", confidence: "high",
        reasoning: "The support workflow should recover pending work without application reconstruction.",
        path: "libs/checkpoint/langgraph/checkpoint/base/__init__.py", section: "BaseCheckpointSaver", lineStart: 120, lineEnd: 170,
        excerpt: "class BaseCheckpointSaver(Generic[V]):\n    \"\"\"Base class for creating a graph checkpointer.\"\"\"",
      },
      {
        key: "self-hosted", name: "Self-hosted core", ontologyId: "capability:self-hosted-core",
        description: "Open-source runtime; hosted platform is optional.", supportStatus: "documented",
        verificationStatus: "documented", confidence: "medium",
        reasoning: "The assessment avoids a mandatory hosted control plane.",
        path: "README.md", section: "LangGraph Platform", lineStart: 1, lineEnd: 30,
        excerpt: "LangGraph is a low-level orchestration framework and runtime.",
      },
    ],
  }),
  makeCard({
    id: "crewai",
    name: "CrewAI",
    owner: "crewAIInc",
    repository: "https://github.com/crewAIInc/crewAI",
    typeLabel: "Multi-agent framework",
    role: "Role-based agent orchestration",
    summary: "A framework for assembling role-based agent teams and structured task flows.",
    boundary: "The open-source Python framework in the primary public repository.",
    languages: ["Python"],
    revision: "e12ab60",
    analyzedAt: "2026-07-14",
    bestFit: "Prototype when role-based teams matter more than low-level workflow control.",
    limitation: "Approval and durable-state behavior need validation for this assessment context.",
    unresolvedCapabilities: [
      { name: "Durable state", ontologyId: "capability:durable-state", state: "not_analyzed" },
      { name: "Self-hosted core", ontologyId: "capability:self-hosted-core", state: "unknown" },
    ],
    openQuestions: ["Does approval survive a process boundary in the assessed configuration?"],
    facts: [{
      key: "approval", name: "Human approval", ontologyId: "capability:human-approval",
      description: "Human review is documented; durable approval needs validation.", supportStatus: "documented",
      verificationStatus: "documented", confidence: "medium",
      reasoning: "A documented prompt is not yet evidence of a durable approval boundary.",
      path: "docs/concepts/tasks.mdx", section: "Human input", lineStart: 1, lineEnd: 1,
      excerpt: "human_input: Whether the task should have a human review the final answer.",
    }],
  }),
];
