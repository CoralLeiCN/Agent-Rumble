import type { AgentProjectCard } from "../types/projectCard";
import { SUPPORTED_PROJECT_CARD_SCHEMA_VERSION } from "./projectCardAdapter";

function resolvePointer(value: unknown, pointer: string): { found: boolean; value: unknown } {
  if (!pointer.startsWith("/")) return { found: false, value: undefined };
  let current: unknown = value;
  for (const encoded of pointer.slice(1).split("/")) {
    const segment = encoded.replace(/~1/g, "/").replace(/~0/g, "~");
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        return { found: false, value: undefined };
      }
      current = current[index];
    } else if (typeof current === "object" && current !== null && segment in current) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return { found: false, value: undefined };
    }
  }
  return { found: true, value: current };
}

function collectNullPointers(value: unknown, path = ""): string[] {
  if (value === null) return [path];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectNullPointers(item, `${path}/${index}`));
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) =>
      collectNullPointers(item, `${path}/${key.replace(/~/g, "~0").replace(/\//g, "~1")}`));
  }
  return [];
}

function duplicates(values: string[]) {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

export function validateProjectCardFixture(card: AgentProjectCard): string[] {
  const errors: string[] = [];
  if (card.schema_version !== SUPPORTED_PROJECT_CARD_SCHEMA_VERSION) {
    errors.push(`unsupported schema_version ${card.schema_version}`);
  }
  if (card.card_version < 1) errors.push("card_version must be positive");
  if (card.project.repositories.length === 0) errors.push("project.repositories must not be empty");
  if (card.source_snapshot.source_revisions.length === 0) errors.push("source_revisions must not be empty");
  if (card.claims.length === 0) errors.push("claims must not be empty");
  if (card.sources.length === 0) errors.push("sources must not be empty");
  if (card.evidence.length === 0) errors.push("evidence must not be empty");
  if (card.assessment.contexts.length === 0) errors.push("assessment.contexts must not be empty");

  const claimIds = card.claims.map(({ claim_id }) => claim_id);
  const sourceIds = card.sources.map(({ source_id }) => source_id);
  const evidenceIds = card.evidence.map(({ evidence_id }) => evidence_id);
  const contextIds = card.assessment.contexts.map(({ context_id }) => context_id);
  for (const duplicate of duplicates(claimIds)) errors.push(`duplicate claim_id ${duplicate}`);
  for (const duplicate of duplicates(sourceIds)) errors.push(`duplicate source_id ${duplicate}`);
  for (const duplicate of duplicates(evidenceIds)) errors.push(`duplicate evidence_id ${duplicate}`);

  for (const repository of card.project.repositories) {
    if (!sourceIds.includes(repository.source_id)) {
      errors.push(`repository references missing source ${repository.source_id}`);
    }
  }
  for (const revision of card.source_snapshot.source_revisions) {
    if (!card.project.repositories.some(({ source_id }) => source_id === revision.source_id)) {
      errors.push(`revision source ${revision.source_id} is not a project repository`);
    }
  }
  for (const evidence of card.evidence) {
    if (!sourceIds.includes(evidence.source_id)) {
      errors.push(`${evidence.evidence_id} references missing source ${evidence.source_id}`);
    }
  }
  for (const claim of card.claims) {
    for (const evidenceId of [...claim.supporting_evidence_ids, ...claim.conflicting_evidence_ids]) {
      if (!evidenceIds.includes(evidenceId)) {
        errors.push(`${claim.claim_id} references missing evidence ${evidenceId}`);
      }
    }
    if (claim.assessment_context_id && !contextIds.includes(claim.assessment_context_id)) {
      errors.push(`${claim.claim_id} references missing context ${claim.assessment_context_id}`);
    }
  }
  for (const capability of card.capabilities) {
    for (const claimId of capability.claim_ids) {
      if (!claimIds.includes(claimId)) errors.push(`${capability.capability_id} references missing claim ${claimId}`);
    }
    for (const evidenceId of capability.evidence_refs) {
      if (!evidenceIds.includes(evidenceId)) errors.push(`${capability.capability_id} references missing evidence ${evidenceId}`);
    }
    if (capability.evidence_status !== "not_found" && capability.evidence_refs.length === 0) {
      errors.push(`${capability.capability_id} has ${capability.evidence_status} status without evidence_refs`);
    }
  }

  const hasRuntimeVerification = card.claims.some(
    ({ verification_status }) => verification_status === "runtime_verified",
  ) || card.capabilities.some(({ support_status }) => support_status === "runtime_verified");
  if (hasRuntimeVerification && card.source_snapshot.analysis_configuration.dynamic_analysis !== true) {
    errors.push("runtime verification requires analysis_configuration.dynamic_analysis=true");
  }

  const nullPointers = collectNullPointers(card);
  for (const pointer of nullPointers) {
    if (!card.field_states[pointer]) errors.push(`null value ${pointer} has no field_state`);
  }
  for (const pointer of Object.keys(card.field_states)) {
    const resolved = resolvePointer(card, pointer);
    if (!resolved.found) {
      errors.push(`field_state pointer ${pointer} does not resolve`);
    } else if (
      resolved.value !== null
      && !(Array.isArray(resolved.value) && resolved.value.length === 0)
    ) {
      errors.push(`field_state pointer ${pointer} does not target null or []`);
    }
  }
  return [...new Set(errors)];
}
