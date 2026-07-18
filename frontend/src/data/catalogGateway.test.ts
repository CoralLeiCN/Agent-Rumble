import { describe, expect, it } from "vitest";
import { preparedQuery, projectCards } from "./fixtures";
import { StaticCatalogGateway } from "./catalogGateway";
import { validateProjectCardFixture } from "./projectCardValidation";
import { projectCardsToClaimEvidence, projectCardsToComparison } from "./projectCardAdapter";

describe("StaticCatalogGateway", () => {
  it("keeps fixture access behind the future API seam", async () => {
    const gateway = new StaticCatalogGateway();
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
    expect(comparison.rows.some((row) => row.cells.crewai?.state === "not_analyzed")).toBe(true);
    expect(comparison.rows.some((row) => row.cells.crewai?.state === "unknown")).toBe(true);
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

  it("keeps every draft v0.2 fixture structurally and referentially coherent", () => {
    expect(projectCards.map(validateProjectCardFixture)).toEqual([[], [], []]);
    expect(projectCards.every((card) => card.schema_version === "0.2")).toBe(true);
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

  it("keeps capability and evidence semantics without inventing claim verification", () => {
    const card = structuredClone(projectCards[0]);
    card.capabilities[0].claim_ids = [];
    const comparison = projectCardsToComparison([card], [card.project.project_id]);
    const cell = comparison.rows.find(({ id }) => id === "approval")?.cells[card.project.project_id];

    expect(cell).toMatchObject({
      state: "value",
      supportStatus: "statically_confirmed",
      evidenceStatus: "confirmed",
      confidence: "high",
    });
    expect(cell?.verificationStatus).toBeUndefined();
    expect(cell?.claimId).toBeUndefined();
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
    invalid.capabilities[0].evidence_refs = [];
    invalid.claims[0].verification_status = "runtime_verified";
    invalid.source_snapshot.analysis_configuration = {};
    invalid.field_states["/source_snapshot/analysis_configuration"] = "not_analyzed";

    expect(validateProjectCardFixture(invalid)).toEqual(expect.arrayContaining([
      "repository references missing source missing-source",
      expect.stringContaining("status without evidence_refs"),
      "runtime verification requires analysis_configuration.dynamic_analysis=true",
      "field_state pointer /source_snapshot/analysis_configuration does not target null or []",
    ]));
  });
});
