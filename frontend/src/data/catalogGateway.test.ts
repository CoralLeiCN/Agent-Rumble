import { describe, expect, it } from "vitest";
import { preparedQuery, projectCards } from "./fixtures";
import { validateProjectCardFixture } from "./projectCardValidation";
import { projectCardsToClaimEvidence, projectCardsToComparison } from "./projectCardAdapter";
import { projectCardContract, readProjectCardContract } from "./projectCardContract";
import { FixtureCatalogGateway } from "../test/FixtureCatalogGateway";
import type { ComparisonResponse } from "../types/catalog";
import type { FieldState } from "../types/projectCard";

function comparisonRows(comparison: ComparisonResponse) {
  return comparison.groups.flatMap(({ rows }) => rows);
}

function terminalPointers(value: unknown, pointer = ""): string[] {
  if (value === null || typeof value !== "object") return [pointer];
  if (Array.isArray(value)) {
    if (value.length === 0 || value.every((item) => item === null || typeof item !== "object")) {
      return [pointer];
    }
    return value.flatMap((item, index) => terminalPointers(item, `${pointer}/${index}`));
  }
  const entries = Object.entries(value);
  if (entries.length === 0) return [pointer];
  return entries.flatMap(([key, child]) => terminalPointers(
    child,
    `${pointer}/${key.replace(/~/g, "~0").replace(/\//g, "~1")}`,
  ));
}

describe("fixture card projections", () => {
  it("keeps fixture access in the test-only gateway", async () => {
    const gateway = new FixtureCatalogGateway();
    const search = await gateway.searchProjects(preparedQuery);
    const comparison = await gateway.compareProjects(search.projects.map(({ id }) => id));
    const record = await gateway.getClaimEvidence("claim-openai-agents-sdk-approval");

    expect(search.projects).toHaveLength(3);
    expect(search.projects[0]).not.toHaveProperty("verificationStatus");
    expect(search.projects[0]).toMatchObject({
      cardId: "card-openai-agents-sdk",
      canonicalPrimaryType: "agent_framework_sdk",
      analysisDepth: "targeted",
    });
    expect(search.projects[0].matchClaim.claimId).toBe("claim-openai-agents-sdk-approval");
    expect(search.assessmentContexts[0]).toMatchObject({
      useCase: "customer-support agent prototype",
      organizationalConstraints: ["Two-week prototype", "Self-hosted preferred"],
      assessedAt: "2026-07-15T12:00:00Z",
    });
    expect(comparison.projectIds).toHaveLength(3);
    expect(comparison.provenance).toBe("fixture");
    expect(comparison.cards).toEqual(projectCards);
    expect(comparison.cardRefs[0]).toEqual({
      projectId: "openai-agents-sdk",
      cardId: "card-openai-agents-sdk",
      cardVersion: 1,
      schemaVersion: "0.3",
    });
    expect(comparison.schemaVersions).toEqual(["0.3"]);
    expect(comparisonRows(comparison).some((row) => row.cells.crewai?.state === "not_analyzed")).toBe(true);
    expect(comparisonRows(comparison).some((row) => row.cells.crewai?.state === "unknown")).toBe(true);
    expect(record.supportingEvidence[0].revision).toBe("a94d3f2");
    expect(record).toMatchObject({
      claimKind: "factual",
      appliesTo: "openai-agents-sdk",
      assessmentContextId: "context-openai-agents-sdk",
    });
    expect(record.supportingEvidence[0]).toMatchObject({
      sourceType: "repository",
      provenance: "first_party",
      accessScope: "public",
      retrievedAt: "2026-07-15T12:00:00Z",
    });
    expect(record.conflictingEvidence).toEqual([]);
  });

  it("keeps every pre-release v0.3 fixture structurally and referentially coherent", () => {
    expect(projectCards.map(validateProjectCardFixture)).toEqual([[], [], []]);
    expect(projectCards.every((card) => card.schema_version === "0.3")).toBe(true);
    expect(projectCards.map((card) => JSON.parse(JSON.stringify(card)))).toEqual(projectCards);
    expect(Object.keys(projectCards[2].field_states)).toEqual([
      "/capabilities/1/support_status",
      "/capabilities/2/support_status",
    ]);
  });

  it("resolves supporting and conflicting evidence from a claim through canonical sources", () => {
    const card = structuredClone(projectCards[0]);
    card.claims[0].conflicting_evidence_ids = ["evidence-openai-agents-sdk-state"];

    const record = projectCardsToClaimEvidence([card], card.claims[0].claim_id);

    expect(record.supportingEvidence[0].relationship).toBe("supporting");
    expect(record.conflictingEvidence[0].relationship).toBe("conflicting");
    expect(record.conflictingEvidence[0].repository).toBe("openai/openai-agents-python");
  });

  it("inventories every reachable leaf, explicit null, and known-empty container", () => {
    const comparison = projectCardsToComparison(
      projectCards,
      projectCards.map(({ project }) => project.project_id),
      "fixture",
    );
    const rows = comparisonRows(comparison);

    projectCards.forEach((card) => {
      const rowPointers = new Set(rows.flatMap((row) => {
        const pointer = row.cells[card.project.project_id]?.pointer;
        return pointer === null || pointer === undefined ? [] : [pointer];
      }));
      expect([...new Set(terminalPointers(card))].filter((pointer) => !rowPointers.has(pointer))).toEqual([]);
    });

    expect(rows.find(({ fieldPattern }) => fieldPattern === "/project/packages")?.valueKind)
      .toBe("empty_array");
    expect(rows.find(({ logicalPath }) => logicalPath === "/field_states")?.valueKind)
      .toBe("empty_object");
    expect(rows.find(({ fieldPattern }) => fieldPattern === "/architecture/languages")?.valueKind)
      .toBe("primitive_array");
    expect(rows.some(({ fieldPattern }) => fieldPattern === "/capabilities/*/name")).toBe(true);
    expect(rows.some(({ fieldPattern }) => fieldPattern === "/source_snapshot/analysis_configuration/fixture"))
      .toBe(true);
  });

  it("keeps every packaged contract field reachable even when selected cards have no matching entry", () => {
    const comparison = projectCardsToComparison(
      projectCards,
      projectCards.map(({ project }) => project.project_id),
      "fixture",
    );
    const rows = comparisonRows(comparison);
    const contractOnlyFields = comparison.groups.flatMap(({ contractOnlyFields: fields }) => fields);
    const uncovered = projectCardContract.fields.filter((definition) => (
      !rows.some((row) => (
        row.fieldPattern === definition.fieldPattern
        || (
          definition.coveredByDescendants
          && row.fieldPattern.startsWith(`${definition.fieldPattern}/`)
        )
      ))
      && !contractOnlyFields.some(({ fieldPattern }) => fieldPattern === definition.fieldPattern)
    ));

    expect(projectCardContract.schemaVersion).toBe("0.3");
    expect(uncovered).toEqual([]);
    expect(comparison.contractOnlyAttributeCount).toBe(contractOnlyFields.length);
    expect(comparison.contractOnlyAttributeCount).toBeGreaterThan(0);
  });

  it("derives newly defined fields from schema structure without a presentation whitelist", () => {
    const evolvingContract = readProjectCardContract({
      properties: {
        schema_version: { const: "0.3" },
        future_contract: {
          type: "object",
          properties: {
            policy: {
              type: "object",
              properties: {
                enabled: { type: "boolean" },
              },
            },
          },
        },
      },
    });

    expect(evolvingContract.topLevelOrder).toEqual(["schema_version", "future_contract"]);
    expect(evolvingContract.fields).toContainEqual({
      group: "future_contract",
      fieldPattern: "/future_contract/policy/enabled",
      label: "Enabled",
      valueKind: "boolean",
      coveredByDescendants: false,
    });
  });

  it("keeps schema-defined array item fields reachable without inventing an entity row", () => {
    const card = structuredClone(projectCards[0]);
    card.capabilities = [];
    const comparison = projectCardsToComparison([card], [card.project.project_id], "fixture");
    const capabilities = comparison.groups.find(({ id }) => id === "capabilities");
    const contractField = capabilities?.contractOnlyFields.find(
      ({ fieldPattern }) => fieldPattern === "/capabilities/*/name",
    );

    expect(contractField).toMatchObject({
      label: "Name",
      valueKind: "string",
    });
    expect(capabilities?.rows.some(({ logicalPath }) => logicalPath.includes("*"))).toBe(false);
    expect(capabilities?.rows.find(({ logicalPath }) => logicalPath === "/capabilities")?.cells[
      card.project.project_id
    ].value).toEqual([]);
  });

  it("retains shared fields and computes all comparison counts from rows", () => {
    const comparison = projectCardsToComparison(
      projectCards,
      projectCards.map(({ project }) => project.project_id),
      "fixture",
    );
    const rows = comparisonRows(comparison);
    const schemaRow = rows.find(({ logicalPath }) => logicalPath === "/schema_version");

    expect(schemaRow).toMatchObject({ isDifferent: false, semanticKind: "value" });
    expect(Object.values(schemaRow?.cells ?? {}).map(({ value }) => value)).toEqual(["0.3", "0.3", "0.3"]);
    expect(comparison.totalAttributeCount).toBe(rows.length + comparison.contractOnlyAttributeCount);
    expect(comparison.differentAttributeCount).toBe(rows.filter(({ isDifferent }) => isDifferent).length);
    expect(comparison.sharedAttributeCount).toBe(rows.filter(({ isDifferent }) => !isDifferent).length);
    expect(comparison.totalAttributeCount).toBe(
      comparison.differentAttributeCount
      + comparison.sharedAttributeCount
      + comparison.contractOnlyAttributeCount,
    );
  });

  it("discovers future nested fields and unknown top-level groups without a row list change", () => {
    const first = structuredClone(projectCards[0]);
    const second = structuredClone(projectCards[1]);
    (first.project as unknown as Record<string, unknown>).future_metric = { score: 7 };
    (first as unknown as Record<string, unknown>).future_contract = {
      deployment_modes: ["local", "cloud"],
      policy: { enabled: true },
    };

    const comparison = projectCardsToComparison(
      [first, second],
      [first.project.project_id, second.project.project_id],
      "fixture",
    );
    const futureGroup = comparison.groups.at(-1);
    const rows = comparisonRows(comparison);
    const nestedFuture = rows.find(({ logicalPath }) => logicalPath === "/project/future_metric/score");
    const topFuture = rows.find(({ logicalPath }) => logicalPath === "/future_contract/policy/enabled");

    expect(futureGroup?.id).toBe("future_contract");
    expect(nestedFuture?.cells[first.project.project_id]).toMatchObject({
      pointer: "/project/future_metric/score",
      state: "value",
      value: 7,
    });
    expect(nestedFuture?.cells[second.project.project_id]).toEqual({
      pointer: null,
      state: "not_present",
      claimIds: [],
    });
    expect(topFuture?.cells[first.project.project_id].value).toBe(true);
  });

  it("keeps all four canonical field states distinct from comparison absence", () => {
    const states: FieldState[] = ["unknown", "not_applicable", "not_analyzed", "no_evidence_found"];
    const cards = states.map((state, index) => {
      const card = structuredClone(projectCards[0]);
      card.project.project_id = `state-${index}`;
      card.card_id = `card-state-${index}`;
      card.summary.one_line = null;
      card.field_states["/summary/one_line"] = state;
      return card;
    });
    const comparison = projectCardsToComparison(
      cards,
      cards.map(({ project }) => project.project_id),
      "fixture",
    );
    const row = comparisonRows(comparison).find(({ logicalPath }) => logicalPath === "/summary/one_line");

    expect(cards.map((card) => row?.cells[card.project.project_id].state)).toEqual(states);
    expect(cards.map((card) => row?.cells[card.project.project_id].value)).toEqual([null, null, null, null]);
    expect(row?.isDifferent).toBe(true);
  });

  it("aligns capabilities by ontology and preserves claim references for evidence", () => {
    const card = structuredClone(projectCards[0]);
    const comparison = projectCardsToComparison([card], [card.project.project_id], "fixture");
    const row = comparisonRows(comparison).find(({ logicalPath, fieldPattern }) => (
      logicalPath.includes("ontology_id=capability%3Ahuman-approval")
      && fieldPattern === "/capabilities/*/description"
    ));
    const cell = row?.cells[card.project.project_id];

    expect(cell).toMatchObject({
      pointer: "/capabilities/0/description",
      state: "value",
      value: "Tool approval is represented before execution.",
      claimIds: ["claim-openai-agents-sdk-approval"],
    });
  });

  it("does not require any of the former prototype capabilities", () => {
    const card = structuredClone(projectCards[0]);
    card.capabilities = [{
      ...card.capabilities[0],
      capability_id: "capability-custom",
      ontology_id: "capability:custom",
      name: "Custom capability",
    }];

    expect(() => projectCardsToComparison([card], [card.project.project_id], "fixture")).not.toThrow();
    expect(comparisonRows(projectCardsToComparison([card], [card.project.project_id], "fixture")).some(
      ({ logicalPath }) => logicalPath.includes("ontology_id=capability%3Acustom"),
    )).toBe(true);
  });

  it("only builds an external source link for public revision-pinned evidence", () => {
    const restrictedCard = structuredClone(projectCards[0]);
    restrictedCard.sources[0].access_scope = "restricted";
    const documentationCard = structuredClone(projectCards[0]);
    documentationCard.sources[0].source_type = "documentation";

    const restrictedRecord = projectCardsToClaimEvidence(
      [restrictedCard],
      restrictedCard.claims[0].claim_id,
    );
    const documentationRecord = projectCardsToClaimEvidence(
      [documentationCard],
      documentationCard.claims[0].claim_id,
    );

    expect(restrictedRecord.supportingEvidence[0].sourceUrl).toBeNull();
    expect(documentationRecord.supportingEvidence[0].sourceUrl).toBeNull();
  });

  it("rejects high-risk semantic contract violations", () => {
    const invalid = structuredClone(projectCards[0]);
    invalid.project.repositories[0].source_id = "missing-source";
    invalid.claims[0].verification_status = "runtime_verified";
    invalid.source_snapshot.analysis_configuration = {};
    invalid.field_states["/source_snapshot/analysis_configuration"] = "not_analyzed";

    expect(validateProjectCardFixture(invalid)).toEqual(expect.arrayContaining([
      "repository references missing source missing-source",
      "runtime verification requires analysis_configuration.dynamic_analysis=true",
      "field_state pointer /source_snapshot/analysis_configuration does not target null or []",
    ]));
  });
});
