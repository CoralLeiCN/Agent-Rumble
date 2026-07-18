import type {
  AssessmentContextView,
  ClaimEvidenceRecord,
  ComparisonCell,
  ComparisonContractField,
  ComparisonGroup,
  ComparisonJsonValue,
  ComparisonProvenance,
  ComparisonResponse,
  ComparisonRow,
  ComparisonSemanticKind,
  ComparisonValueKind,
  ProjectSummary,
  Requirement,
  ResolvedEvidence,
  SearchResponse,
} from "../types/catalog";
import type {
  AgentProjectCard,
  Claim,
  FieldState,
  Source,
} from "../types/projectCard";
import {
  assertSupportedProjectCardContract,
  projectCardContract,
  SUPPORTED_PROJECT_CARD_SCHEMA_VERSION,
  type ContractFieldDefinition,
} from "./projectCardContract";

export { SUPPORTED_PROJECT_CARD_SCHEMA_VERSION } from "./projectCardContract";

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
  assertSupportedProjectCardContract();
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

interface InventoryEntry {
  pointer: string;
  logicalPath: string;
  fieldPattern: string;
  label: string;
  value: ComparisonJsonValue;
  state: ComparisonCell["state"];
  claimIds: string[];
  semanticKind: ComparisonSemanticKind;
  valueKind: ComparisonValueKind;
}

interface InventoryContext {
  card: AgentProjectCard;
  entries: InventoryEntry[];
  pointer: string;
  logicalPath: string;
  fieldPattern: string;
  label: string;
  entityLabels: string[];
  claimIds: string[];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pointerSegment(value: string) {
  return value.replace(/~/g, "~0").replace(/\//g, "~1");
}

function logicalIdentity(value: string) {
  return encodeURIComponent(value);
}

function humanLabel(value: string) {
  return value
    .replace(/^@[^/]+\//, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function claimsForObject(value: Record<string, unknown>, inherited: string[]) {
  const direct = Array.isArray(value.claim_ids)
    ? value.claim_ids.filter((claimId): claimId is string => typeof claimId === "string")
    : [];
  const ownClaim = typeof value.claim_id === "string" ? [value.claim_id] : [];
  return unique([...inherited, ...direct, ...ownClaim]);
}

function semanticKind(pointer: string): ComparisonSemanticKind {
  const property = pointer.slice(pointer.lastIndexOf("/") + 1).replace(/~1/g, "/").replace(/~0/g, "~");
  if (pointer.startsWith("/field_states/")) return "field_state";
  if (property === "support_status") return "support_status";
  if (property === "verification_status") return "verification_status";
  if (property === "confidence") return "confidence";
  if (property === "claim_id" || property === "claim_ids" || property.endsWith("_claim_ids")) {
    return "claim_reference";
  }
  return "value";
}

function comparisonValue(value: unknown, pointer: string): ComparisonJsonValue {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => comparisonValue(item, `${pointer}/${index}`));
  }
  if (isObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, comparisonValue(item, `${pointer}/${pointerSegment(key)}`)]),
    );
  }
  throw new Error(`Canonical comparison value at ${pointer} is not JSON serializable.`);
}

function valueKind(value: ComparisonJsonValue): ComparisonValueKind {
  if (value === null) return "null";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (Array.isArray(value)) return value.length === 0 ? "empty_array" : "primitive_array";
  return "empty_object";
}

function addEntry(value: unknown, context: InventoryContext) {
  const jsonValue = comparisonValue(value, context.pointer);
  context.entries.push({
    pointer: context.pointer,
    logicalPath: context.logicalPath,
    fieldPattern: context.fieldPattern,
    label: context.entityLabels.length > 0
      ? `${context.label} · ${context.entityLabels.join(" · ")}`
      : context.label,
    value: jsonValue,
    state: context.card.field_states[context.pointer] ?? "value",
    claimIds: context.claimIds,
    semanticKind: semanticKind(context.pointer),
    valueKind: valueKind(jsonValue),
  });
}

function stableArrayIdentity(
  fieldPattern: string,
  value: Record<string, unknown>,
  index: number,
  siblings: unknown[],
) {
  if (fieldPattern === "/capabilities") {
    if (typeof value.ontology_id === "string") {
      const duplicateCount = siblings.filter(
        (item) => isObject(item) && item.ontology_id === value.ontology_id,
      ).length;
      if (duplicateCount === 1) return ["ontology_id", value.ontology_id] as const;
      if (typeof value.capability_id === "string") {
        return ["ontology_id+capability_id", `${value.ontology_id}|${value.capability_id}`] as const;
      }
    }
    if (typeof value.capability_id === "string") return ["capability_id", value.capability_id] as const;
  }

  const stableKeyByPattern: Record<string, string> = {
    "/project/repositories": "source_id",
    "/source_snapshot/source_revisions": "source_id",
    "/components": "component_id",
    "/assessment/contexts": "context_id",
    "/claims": "claim_id",
    "/sources": "source_id",
    "/evidence": "evidence_id",
    "/relationships/depends_on": "target_project",
    "/relationships/integrates_with": "target_project",
    "/relationships/comparable_projects": "target_project",
  };
  const stableKey = stableKeyByPattern[fieldPattern];
  if (stableKey && typeof value[stableKey] === "string") {
    return [stableKey, value[stableKey]] as const;
  }
  return ["index", String(index)] as const;
}

function inventoryValue(value: unknown, context: InventoryContext): void {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    addEntry(value, context);
    return;
  }

  if (Array.isArray(value)) {
    if (value.length === 0 || value.every((item) => !isObject(item) && !Array.isArray(item))) {
      addEntry(value, context);
      return;
    }
    value.forEach((item, index) => {
      if (!isObject(item)) {
        inventoryValue(item, {
          ...context,
          pointer: `${context.pointer}/${index}`,
          logicalPath: `${context.logicalPath}/@index=${index}`,
          fieldPattern: `${context.fieldPattern}/*`,
          label: `${context.label} ${index + 1}`,
        });
        return;
      }
      const [identityKey, identityValue] = stableArrayIdentity(
        context.fieldPattern,
        item,
        index,
        value,
      );
      inventoryValue(item, {
        ...context,
        pointer: `${context.pointer}/${index}`,
        logicalPath: `${context.logicalPath}/@${identityKey}=${logicalIdentity(identityValue)}`,
        fieldPattern: `${context.fieldPattern}/*`,
        entityLabels: [...context.entityLabels, `${humanLabel(identityKey)}: ${identityValue}`],
        claimIds: claimsForObject(item, context.claimIds),
      });
    });
    return;
  }

  if (!isObject(value)) {
    addEntry(value, context);
    return;
  }

  const entries = Object.entries(value);
  if (entries.length === 0) {
    addEntry(value, context);
    return;
  }
  const claimIds = claimsForObject(value, context.claimIds);
  entries.forEach(([key, child]) => {
    const segment = pointerSegment(key);
    inventoryValue(child, {
      ...context,
      pointer: `${context.pointer}/${segment}`,
      logicalPath: `${context.logicalPath}/${segment}`,
      fieldPattern: `${context.fieldPattern}/${segment}`,
      label: humanLabel(key),
      claimIds,
    });
  });
}

function rowValueKind(entries: InventoryEntry[]): ComparisonValueKind {
  const concreteKinds = unique(entries.map(({ valueKind: kind }) => kind).filter((kind) => kind !== "null"));
  if (concreteKinds.includes("primitive_array")) return "primitive_array";
  if (concreteKinds.length > 0) return concreteKinds[0] as ComparisonValueKind;
  return "null";
}

function stableValue(value: ComparisonJsonValue | undefined): string {
  if (value === undefined) return "undefined";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableValue).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableValue(value[key])}`).join(",")}}`;
}

function cellSignature(cell: ComparisonCell) {
  return `${cell.state}:${stableValue(cell.value)}`;
}

function inventoryGroup(card: AgentProjectCard, key: string): InventoryEntry[] {
  const value = (card as unknown as Record<string, unknown>)[key];
  if (value === undefined) return [];
  const path = `/${pointerSegment(key)}`;
  const entries: InventoryEntry[] = [];
  inventoryValue(value, {
    card,
    entries,
    pointer: path,
    logicalPath: path,
    fieldPattern: path,
    label: humanLabel(key),
    entityLabels: [],
    claimIds: [],
  });
  return entries;
}

function contractFieldIsCovered(
  definition: ContractFieldDefinition,
  fieldPatterns: Set<string>,
) {
  if (fieldPatterns.has(definition.fieldPattern)) return true;
  return definition.coveredByDescendants && [...fieldPatterns].some(
    (fieldPattern) => fieldPattern.startsWith(`${definition.fieldPattern}/`),
  );
}

function buildComparisonGroup(
  cards: AgentProjectCard[],
  key: string,
  contractFields: ContractFieldDefinition[],
): ComparisonGroup {
  const inventories = new Map(cards.map((card) => [
    card.project.project_id,
    inventoryGroup(card, key),
  ]));
  const logicalPaths = unique(cards.flatMap((card) => (
    inventories.get(card.project.project_id) ?? []
  ).map(({ logicalPath }) => logicalPath)));
  const rows: ComparisonRow[] = logicalPaths.map((logicalPath) => {
    const presentEntries = cards.flatMap((card) => (
      inventories.get(card.project.project_id)?.find((entry) => entry.logicalPath === logicalPath) ?? []
    ));
    const first = presentEntries[0];
    const cells = Object.fromEntries(cards.map((card) => {
      const entry = inventories.get(card.project.project_id)?.find(
        (candidate) => candidate.logicalPath === logicalPath,
      );
      return [card.project.project_id, entry
        ? {
            pointer: entry.pointer,
            state: entry.state,
            value: entry.value,
            claimIds: entry.claimIds,
          }
        : {
            pointer: null,
            state: "not_present" as const,
            claimIds: [],
          }];
    }));
    const isDifferent = unique(Object.values(cells).map(cellSignature)).length > 1;
    return {
      id: logicalPath,
      label: first.label,
      logicalPath,
      fieldPattern: first.fieldPattern,
      semanticKind: first.semanticKind,
      valueKind: rowValueKind(presentEntries),
      cells,
      isDifferent,
    };
  });
  const fieldPatterns = new Set(rows.map(({ fieldPattern }) => fieldPattern));
  const contractOnlyFields: ComparisonContractField[] = contractFields
    .filter((definition) => !contractFieldIsCovered(definition, fieldPatterns))
    .map((definition) => ({
      label: definition.label,
      fieldPattern: definition.fieldPattern,
      semanticKind: semanticKind(definition.fieldPattern),
      valueKind: definition.valueKind,
    }));
  return {
    id: key,
    label: humanLabel(key),
    path: `/${pointerSegment(key)}`,
    rows,
    contractOnlyFields,
  };
}

export function projectCardsToComparison(
  cards: AgentProjectCard[],
  projectIds: string[],
  provenance: ComparisonProvenance,
): ComparisonResponse {
  const selected = projectIds
    .map((id) => cards.find(({ project }) => project.project_id === id))
    .filter((card): card is AgentProjectCard => Boolean(card));
  selected.forEach(assertSupportedCard);
  const knownGroups = projectCardContract.topLevelOrder;
  const knownGroupSet = new Set<string>(knownGroups);
  const unknownGroups = unique(selected.flatMap((card) => Object.keys(card)))
    .filter((key) => !knownGroupSet.has(key))
    .sort();
  const groups = [...knownGroups, ...unknownGroups]
    .map((key) => buildComparisonGroup(
      selected,
      key,
      projectCardContract.fields.filter(({ group }) => group === key),
    ))
    .filter(({ rows, contractOnlyFields }) => rows.length > 0 || contractOnlyFields.length > 0);
  const allRows = groups.flatMap(({ rows }) => rows);
  const allContractOnlyFields = groups.flatMap(({ contractOnlyFields }) => contractOnlyFields);
  const differentAttributeCount = allRows.filter(({ isDifferent }) => isDifferent).length;
  const contractOnlyAttributeCount = allContractOnlyFields.length;
  const sharedAttributeCount = allRows.filter((row) => !row.isDifferent).length;

  return {
    assessmentContexts: selected.flatMap(assessmentContexts),
    projectIds: selected.map(({ project }) => project.project_id),
    cards: selected,
    cardRefs: selected.map((card) => ({
      projectId: card.project.project_id,
      cardId: card.card_id,
      cardVersion: card.card_version,
      schemaVersion: card.schema_version,
    })),
    schemaVersions: unique(selected.map(({ schema_version: version }) => version)),
    provenance,
    groups,
    totalAttributeCount: allRows.length + contractOnlyAttributeCount,
    differentAttributeCount,
    sharedAttributeCount,
    contractOnlyAttributeCount,
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
