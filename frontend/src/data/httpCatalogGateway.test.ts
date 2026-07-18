import { describe, expect, it, vi } from "vitest";
import { readCatalogGatewayConfig } from "./catalogConfig";
import { HttpCatalogGateway } from "./catalogGateway";
import { projectCards } from "./fixtures";
import { CatalogApiError, FetchJsonTransport, type JsonTransport } from "./httpTransport";
import { encodeOpaquePathIdentifier } from "./opaquePathIdentifier";

describe("HttpCatalogGateway", () => {
  it("maps backend search, pinned cards, comparison cards, and evidence into the current UI contract", async () => {
    const first = projectCards[0];
    const second = projectCards[1];
    const firstProjectRef = encodeOpaquePathIdentifier(first.project.project_id);
    const secondProjectRef = encodeOpaquePathIdentifier(second.project.project_id);
    const unicodeRef = encodeOpaquePathIdentifier("项目/δοκιμή");
    const evidenceRef = encodeOpaquePathIdentifier(first.claims[0].supporting_evidence_ids[0]);
    const sourceUrl = "https://github.com/example/project/blob/revision/source.py#L1";
    const request = vi.fn(async (path: string, init?: RequestInit): Promise<unknown> => {
      if (path === "/api/v1/catalog") return {
        catalog_id: "development-catalog",
        label: "Development catalog",
        cohort_description: "Published development cards",
        coverage: ["Public GitHub"],
        exclusions: ["Private repositories"],
        card_count: 2,
        schema_versions: ["0.3"],
        ontology_versions: ["0.1"],
        oldest_analyzed_at: first.source_snapshot.analyzed_at,
        newest_analyzed_at: second.source_snapshot.analyzed_at,
      };
      if (path === "/api/v1/catalog/search") return {
        query: "human approval",
        assessment_contexts: [{
          context_id: "context-1",
          project_id: first.project.project_id,
          use_case: "human approval",
          comparison_cohort: ["Published Agent Project Cards"],
          requirements: ["Human approval controls"],
          organizational_constraints: ["Static evidence only"],
          assessed_at: "2026-07-18T00:00:00Z",
        }],
        requirements: [{ id: "requirement-1", kind: "must", label: "Human approval" }],
        uninterpreted_terms: [],
        page: 1,
        page_size: 100,
        total: 1,
        projects: [{
          id: first.project.project_id,
          name: first.project.name,
          owner: first.project.repositories[0].owner,
          project_type: "Agent framework / SDK",
          role: "Orchestration",
          summary: first.summary.one_line,
          match_reason: "Human approval is represented.",
          constraint: "Static evidence only.",
          languages: first.architecture.languages,
          card_id: first.card_id,
          schema_version: first.schema_version,
          card_version: first.card_version,
          canonical_primary_type: first.project.primary_type,
          analysis_depth: first.source_snapshot.analysis_depth,
          boundary: first.project.boundary,
          source_count: first.sources.length,
          revision: first.source_snapshot.source_revisions[0].commit,
          analyzed_at: first.source_snapshot.analyzed_at,
          match_claim: null,
        }],
      };
      if (path.includes("/evidence/")) return { source_url: sourceUrl };
      if (path === `/api/v1/projects/${firstProjectRef}/cards/1`) return first;
      if (path === `/api/v1/projects/${secondProjectRef}/cards/current`) return second;
      if (path === `/api/v1/projects/${unicodeRef}/cards/current`) return first;
      if (path === `/api/v1/projects/${unicodeRef}/cards/1`) return first;
      throw new Error(`Unexpected path ${path} (${init?.method ?? "GET"})`);
    });
    const gateway = new HttpCatalogGateway({ request } as JsonTransport);

    expect((await gateway.getCatalogContext()).cardCount).toBe(2);
    expect(await gateway.getCurrentCard("项目/δοκιμή")).toBe(first);
    expect(await gateway.getCard("项目/δοκιμή", 1)).toBe(first);

    const search = await gateway.searchProjects("human approval");
    expect(search.projects[0]).toMatchObject({
      id: first.project.project_id,
      matchReason: "Human approval is represented.",
      constraint: "Static evidence only.",
      matchClaim: { claimId: first.claims[0].claim_id },
    });

    const comparison = await gateway.compareProjects([
      first.project.project_id,
      second.project.project_id,
    ]);
    expect(comparison.provenance).toBe("validated_catalog");
    expect(comparison.cards).toEqual([first, second]);

    const evidence = await gateway.getClaimEvidence(first.claims[0].claim_id);
    expect(evidence.supportingEvidence[0]).toMatchObject({
      id: first.claims[0].supporting_evidence_ids[0],
      sourceUrl,
    });

    expect(request).toHaveBeenCalledWith(
      `/api/v1/projects/${unicodeRef}/cards/current`,
    );
    expect(request).toHaveBeenCalledWith(
      `/api/v1/projects/${unicodeRef}/cards/1`,
    );
    expect(request).toHaveBeenCalledWith(
      `/api/v1/projects/${firstProjectRef}/cards/1`,
    );
    expect(request).toHaveBeenCalledWith(
      `/api/v1/projects/${secondProjectRef}/cards/current`,
    );
    expect(request).toHaveBeenCalledWith(
      `/api/v1/projects/${firstProjectRef}/cards/1/evidence/${evidenceRef}`,
    );
    const searchCall = request.mock.calls.find(([path]) => path === "/api/v1/catalog/search");
    expect(JSON.parse(searchCall?.[1]?.body as string)).toMatchObject({
      text: "human approval",
      page_size: 100,
      assessment_context: {
        use_case: "human approval",
        requirements: ["human approval"],
        organizational_constraints: ["Static evidence only"],
      },
    });

    await gateway.searchProjects("");
    const browseCall = request.mock.calls
      .filter(([path]) => path === "/api/v1/catalog/search")
      .at(-1);
    expect(JSON.parse(browseCall?.[1]?.body as string)).toEqual({
      text: "",
      page: 1,
      page_size: 100,
    });
  });
});

describe("catalog transport configuration", () => {
  it("uses the backend exclusively", () => {
    expect(readCatalogGatewayConfig({})).toEqual({ apiBaseUrl: "" });
    expect(readCatalogGatewayConfig({
      VITE_CATALOG_GATEWAY: "http",
      VITE_CATALOG_API_BASE_URL: "http://localhost:8000",
    })).toEqual({ apiBaseUrl: "http://localhost:8000" });
    expect(() => readCatalogGatewayConfig({ VITE_CATALOG_GATEWAY: "static" })).toThrow(
      /only the live HTTP catalog is supported/,
    );
    expect(() => readCatalogGatewayConfig({ VITE_CATALOG_GATEWAY: "automatic" })).toThrow(
      /only the live HTTP catalog is supported/,
    );
  });

  it("surfaces typed API errors without silently falling back to sample data", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({
      error: { code: "card_not_found", message: "Card was not found.", details: { card_version: 4 } },
    }), {
      status: 404,
      headers: { "content-type": "application/json" },
    }));
    const transport = new FetchJsonTransport({ baseUrl: "http://localhost:8000/", fetch });

    await expect(transport.request("/api/v1/catalog")).rejects.toMatchObject({
      name: "CatalogApiError",
      status: 404,
      code: "card_not_found",
      message: "Card was not found.",
      details: { card_version: 4 },
    } satisfies Partial<CatalogApiError>);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/catalog",
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });
});
