import type {
  AssessmentContextView,
  ClaimEvidenceRecord,
  ComparisonCell,
  ComparisonResponse,
  ProjectSummary,
  Requirement,
  ResolvedEvidence,
  SearchResponse,
} from "../types/catalog";
import type {
  AgentProjectCard,
  Capability,
  Claim,
  FieldState,
  Source,
} from "../types/projectCard";

export const SUPPORTED_PROJECT_CARD_SCHEMA_VERSION = "0.2" as const;

export interface SearchProjectionContext {
  requirements: Requirement[];
  uninterpretedTerms: string[];
}

function assessmentContexts(card: AgentProjectCard): AssessmentContextView[] {
  return card.assessment.contexts.map((context) => ({
    contextId: context.context_id,
    projectId: card.project.project_id,
    useCase: context.use_case,
    comparisonCohort: context.comparison_cohort,
    requirements: context.requirements,
    organizationalConstraints: context.organizational_constraints,
    assessedAt: context.assessed_at,
  }));
}

const primaryTypeLabels: Record<string, string> = {
  agent_application: "Agent application",
  agent_framework_sdk: "Agent framework / SDK",
  agent_harness_runtime: "Agent harness / runtime",
  agent_tool_mcp: "Agent tool / MCP",
  agent_skill: "Agent skill",
};

function primaryRevision(card: AgentProjectCard) {
  const repository = card.project.repositories.find(({ role }) => role === "primary")
    ?? card.project.repositories[0];
  return card.source_snapshot.source_revisions.find(
    ({ source_id }) => source_id === repository?.source_id,
  ) ?? card.source_snapshot.source_revisions[0];
}

function assertSupportedCard(card: AgentProjectCard) {
  if (card.schema_version !== SUPPORTED_PROJECT_CARD_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported Agent Project Card schema ${card.schema_version}; expected draft ${SUPPORTED_PROJECT_CARD_SCHEMA_VERSION}.`,
    );
  }
}

function projectType(card: AgentProjectCard) {
  return card.classification.secondary_characteristics[0]
    ?? primaryTypeLabels[card.project.primary_type]
    ?? card.project.primary_type;
}

function projectRole(card: AgentProjectCard) {
  return card.classification.architecture_layers[0]
    ?? card.project.type_rationale
    ?? "Role not analyzed";
}

export function projectCardToSummary(card: AgentProjectCard): ProjectSummary {
  assertSupportedCard(card);
  const repository = card.project.repositories.find(({ role }) => role === "primary")
    ?? card.project.repositories[0];
  const revision = primaryRevision(card);
  const matchAssessment = card.assessment.best_fit[0];
  const matchClaim = matchAssessment?.claim_ids
    .map((claimId) => card.claims.find(({ claim_id }) => claim_id === claimId))
    .find((claim): claim is Claim => Boolean(claim))
    ?? card.claims[0];
  if (!matchClaim) {
    throw new Error(`Card ${card.card_id} has no claim for its catalog match projection.`);
  }
  return {
    id: card.project.project_id,
    name: card.project.name,
    owner: repository?.owner ?? "Unknown owner",
    projectType: projectType(card),
    role: projectRole(card),
    summary: card.summary.one_line ?? card.summary.purpose ?? "Summary not analyzed.",
    matchReason: matchAssessment?.statement ?? "Fit has not been assessed in this context.",
    constraint: card.assessment.limitations[0]?.statement ?? "No contextual limitation was recorded.",
    languages: card.architecture.languages,
    cardId: card.card_id,
    schemaVersion: card.schema_version,
    cardVersion: card.card_version,
    canonicalPrimaryType: card.project.primary_type,
    analysisDepth: card.source_snapshot.analysis_depth,
    boundary: card.project.boundary ?? "Project boundary not analyzed.",
    sourceCount: card.sources.length,
    revision: revision?.commit ?? revision?.tag ?? "unknown",
    analyzedAt: card.source_snapshot.analyzed_at.slice(0, 10),
    matchClaim: {
      claimId: matchClaim.claim_id,
      verificationStatus: matchClaim.verification_status,
      confidence: matchClaim.confidence,
    },
  };
}

export function projectCardsToSearchResponse(
  cards: AgentProjectCard[],
  query: string,
  context: SearchProjectionContext,
): SearchResponse {
  return {
    query,
    assessmentContexts: cards.flatMap(assessmentContexts),
    requirements: context.requirements,
    uninterpretedTerms: context.uninterpretedTerms,
    projects: cards.map(projectCardToSummary),
  };
}

function claimForCapability(card: AgentProjectCard, capability: Capability) {
  return capability.claim_ids
    .map((claimId) => card.claims.find(({ claim_id }) => claim_id === claimId))
    .find((claim): claim is Claim => Boolean(claim));
}

function capabilityCell(
  card: AgentProjectCard,
  ontologyId: string,
): ComparisonCell {
  const capabilityIndex = card.capabilities.findIndex(({ ontology_id }) => ontology_id === ontologyId);
  const capability = card.capabilities[capabilityIndex];
  if (!capability) {
    throw new Error(`Card ${card.card_id} has no canonical capability projection for ${ontologyId}.`);
  }
  if (capability.support_status === null) {
    const pointer = `/capabilities/${capabilityIndex}/support_status`;
    const state = card.field_states[pointer];
    if (!state) {
      throw new Error(`Card ${card.card_id} does not state why ${pointer} is null.`);
    }
    return { state };
  }
  const claim = claimForCapability(card, capability);
  return {
    state: "value",
    value: capability.description ?? capability.name,
    supportStatus: capability.support_status,
    evidenceStatus: capability.evidence_status,
    verificationStatus: claim?.verification_status,
    confidence: capability.confidence,
    claimConfidence: claim?.confidence,
    claimId: claim?.claim_id,
  };
}

export function projectCardsToComparison(
  cards: AgentProjectCard[],
  projectIds: string[],
): ComparisonResponse {
  const selected = projectIds
    .map((id) => cards.find(({ project }) => project.project_id === id))
    .filter((card): card is AgentProjectCard => Boolean(card));
  const cells = (project: (card: AgentProjectCard) => ComparisonCell) =>
    Object.fromEntries(selected.map((card) => [card.project.project_id, project(card)]));

  return {
    assessmentContexts: selected.flatMap(assessmentContexts),
    projectIds: selected.map(({ project }) => project.project_id),
    sharedAttributeCount: 12,
    rows: [
      {
        id: "role",
        label: "Architecture role",
        group: "Role and fit",
        cells: cells((card) => ({ state: "value", value: projectRole(card) })),
      },
      {
        id: "approval",
        label: "Human approval",
        group: "Material differences",
        cells: cells((card) => capabilityCell(card, "capability:human-approval")),
      },
      {
        id: "state",
        label: "Durable state",
        group: "Material differences",
        cells: cells((card) => capabilityCell(card, "capability:durable-state")),
      },
      {
        id: "boundary",
        label: "Hosted dependency",
        group: "Material differences",
        cells: cells((card) => capabilityCell(card, "capability:self-hosted-core")),
      },
      {
        id: "prototype-when",
        label: "Prototype when…",
        group: "Prototype guidance",
        cells: cells((card) => ({
          state: "value",
          value: card.assessment.best_fit[0]?.statement ?? "Contextual fit is not analyzed.",
        })),
      },
    ],
  };
}

function sourceLocator(source: Source, path: string | null, start: number | null, end: number | null) {
  if (
    source.access_scope !== "public"
    || source.source_type !== "repository"
    || !source.revision_or_version
    || !path
  ) {
    return null;
  }
  const lineFragment = start
    ? `#L${start}${end && end !== start ? `-L${end}` : ""}`
    : "";
  return `${source.uri.replace(/\/$/, "")}/blob/${source.revision_or_version}/${path}${lineFragment}`;
}

function locatorLabel(path: string | null, section: string | null, start: number | null, end: number | null) {
  const location = path ?? section ?? "Source location unavailable";
  const sectionLabel = path && section ? ` · ${section}` : "";
  const lines = start ? ` · line${end && end !== start ? "s" : ""} ${start}${end && end !== start ? `–${end}` : ""}` : "";
  return `${location}${sectionLabel}${lines}`;
}

function resolveEvidence(
  card: AgentProjectCard,
  evidenceId: string,
  relationship: ResolvedEvidence["relationship"],
): ResolvedEvidence {
  const evidence = card.evidence.find(({ evidence_id }) => evidence_id === evidenceId);
  const source = evidence && card.sources.find(({ source_id }) => source_id === evidence.source_id);
  if (!evidence || !source) {
    throw new Error(`Canonical ${relationship} evidence reference ${evidenceId} does not resolve.`);
  }
  return {
    id: evidence.evidence_id,
    relationship,
    evidenceStatus: evidence.evidence_status,
    confidence: evidence.confidence,
    sourceType: source.source_type,
    provenance: source.provenance,
    retrievedAt: source.retrieved_at,
    accessScope: source.access_scope,
    repository: source.uri.replace(/^https:\/\/github\.com\//, ""),
    revision: source.revision_or_version ?? "unknown",
    locator: locatorLabel(
      evidence.locator.path,
      evidence.locator.symbol_or_section,
      evidence.locator.line_start,
      evidence.locator.line_end,
    ),
    excerpt: evidence.excerpt_or_symbol ?? evidence.note ?? "No excerpt was recorded.",
    sourceUrl: sourceLocator(
      source,
      evidence.locator.path,
      evidence.locator.line_start,
      evidence.locator.line_end,
    ),
  };
}

export function projectCardsToClaimEvidence(
  cards: AgentProjectCard[],
  claimId: string,
): ClaimEvidenceRecord {
  const card = cards.find(({ claims }) => claims.some(({ claim_id }) => claim_id === claimId));
  const claim = card?.claims.find(({ claim_id }) => claim_id === claimId);
  if (!card || !claim) {
    throw new Error(`No illustrative claim exists for ${claimId}.`);
  }
  assertSupportedCard(card);
  return {
    claimId: claim.claim_id,
    projectId: card.project.project_id,
    claim: claim.statement,
    claimKind: claim.claim_kind,
    appliesTo: claim.applies_to,
    assessmentContextId: claim.assessment_context_id,
    whyItMatters: claim.reasoning ?? "No contextual reasoning was recorded.",
    verificationStatus: claim.verification_status,
    confidence: claim.confidence,
    supportingEvidence: claim.supporting_evidence_ids.map((id) => resolveEvidence(card, id, "supporting")),
    conflictingEvidence: claim.conflicting_evidence_ids.map((id) => resolveEvidence(card, id, "conflicting")),
  };
}

export function fieldStateAt(card: AgentProjectCard, path: string): FieldState | undefined {
  return card.field_states[path];
}
