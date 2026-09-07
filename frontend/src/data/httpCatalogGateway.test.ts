import { describe, expect, it, vi } from "vitest";
import { readCatalogGatewayConfig } from "./catalogConfig";
import { HttpCatalogGateway } from "./catalogGateway";
import { projectCards } from "./fixtures";
import {
  CatalogApiError,
  FetchJsonTransport,
  type JsonTransport,
} from "./httpTransport";
import { encodeOpaquePathIdentifier } from "./opaquePathIdentifier";
import type { AgentProjectCard } from "../types/projectCard";

function cardPath(card: AgentProjectCard) {
  return `/api/v1/projects/${encodeOpaquePathIdentifier(card.project.project_id)}/cards/${card.card_version}`;
}
function reference(card: AgentProjectCard) {
  return { projectId: card.project.project_id, cardVersion: card.card_version };
}
function summary(card: AgentProjectCard) {
  return {
    id: card.project.project_id,
    name: card.project.name,
    owner: card.project.repositories[0].owner,
    project_type: "Agent framework / SDK",
    role: "Orchestration",
    summary: card.summary.one_line,
    match_reason: "Matches the search",
    constraint: "Static evidence only",
    languages: card.architecture.languages,
    card_id: card.card_id,
    schema_version: card.schema_version,
    card_version: card.card_version,
    canonical_primary_type: card.project.primary_type,
    analysis_depth: card.source_snapshot.analysis_depth,
    boundary: card.project.boundary,
    source_count: card.sources.length,
    revision: card.source_snapshot.source_revisions[0].commit,
    analyzed_at: card.source_snapshot.analyzed_at,
    match_claim: null,
  };
}

describe("HttpCatalogGateway", () => {
  it("loads paginated search summaries without fetching full cards or inventing match evidence", async () => {
    const request = vi.fn(async () => ({
      query: "human approval",
      page: 2,
      page_size: 20,
      total: 45,
      assessment_contexts: [],
      requirements: [],
      uninterpreted_terms: [],
      projects: [summary(projectCards[0])],
    }));
    const gateway = new HttpCatalogGateway({ request } as JsonTransport);
    const result = await gateway.searchProjects(" human approval ", 2);
    expect(result).toMatchObject({ page: 2, pageSize: 20, total: 45 });
    expect(result.projects[0]).toMatchObject({
      id: projectCards[0].project.project_id,
      matchClaim: null,
    });
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(
      "/api/v1/catalog/search",
      expect.objectContaining({
        method: "POST",
        body: expect.any(String),
      }),
    );
    const calls = vi.mocked(request).mock.calls as unknown as [
      string,
      RequestInit,
    ][];
    expect(JSON.parse(calls[0][1].body as string)).toMatchObject({
      text: "human approval",
      page: 2,
      page_size: 20,
    });
  });

  it("scopes shared claim IDs to both the project and immutable card version", async () => {
    const first = projectCards[0];
    const second: AgentProjectCard = JSON.parse(
      JSON.stringify(first).replaceAll(
        JSON.stringify(first.project.project_id),
        JSON.stringify("second-project"),
      ),
    );
    second.claims[0].statement = "The second project's classification";
    const newer = structuredClone(second);
    newer.card_version = second.card_version + 1;
    newer.claims[0].statement = "The newer classification";
    const request = vi.fn(async (path: string): Promise<unknown> => {
      if (path.includes("/evidence/")) return { source_url: null };
      const card = [first, second, newer].find(
        (candidate) => cardPath(candidate) === path,
      );
      if (card) return card;
      throw new Error(`Unexpected path ${path}`);
    });
    const gateway = new HttpCatalogGateway({ request } as JsonTransport);
    const comparison = await gateway.compareProjects([
      reference(first),
      reference(second),
    ]);
    expect(comparison.cards).toEqual([first, second]);
    const claimId = first.claims[0].claim_id;
    await gateway.getCard(newer.project.project_id, newer.card_version);
    const record = await gateway.getClaimEvidence({
      ...reference(second),
      claimId,
    });
    expect(record.projectId).toBe(second.project.project_id);
    expect(record.claim).toBe(second.claims[0].statement);
    // A null URL is an intentional backend safety decision, not a fallback request.
    expect(record.supportingEvidence[0].sourceUrl).toBeNull();
    const latestRecord = await gateway.getClaimEvidence({
      ...reference(newer),
      claimId,
    });
    expect(latestRecord.claim).toBe(newer.claims[0].statement);
    expect(request).toHaveBeenCalledWith(
      `${cardPath(second)}/evidence/${encodeOpaquePathIdentifier(second.claims[0].supporting_evidence_ids[0])}`,
    );
    expect(
      request.mock.calls.filter(([path]) => path === cardPath(second)),
    ).toHaveLength(1);
  });

  it("encodes opaque identifiers and deduplicates simultaneous pinned card requests", async () => {
    const card = structuredClone(projectCards[0]);
    card.project.project_id = "项目/δοκιμή";
    const request = vi.fn(async () => card);
    const gateway = new HttpCatalogGateway({ request } as JsonTransport);
    const [first, second] = await Promise.all([
      gateway.getCard(card.project.project_id, 1),
      gateway.getCard(card.project.project_id, 1),
    ]);
    expect(first).toBe(second);
    expect(request).toHaveBeenCalledExactlyOnceWith(cardPath(card));
  });

  it("rejects responses for the wrong project or card version", async () => {
    const request = vi.fn(async () => projectCards[0]);
    const gateway = new HttpCatalogGateway({ request } as JsonTransport);
    await expect(
      gateway.getCard(projectCards[1].project.project_id, 1),
    ).rejects.toThrow(/pinned reference/);
    await expect(
      gateway.getCard(projectCards[0].project.project_id, 2),
    ).rejects.toThrow(/pinned reference/);
    await expect(
      gateway.getCurrentCard(projectCards[1].project.project_id),
    ).rejects.toThrow(/different project/);
  });
});
describe("catalog transport configuration", () => {
  it("uses the backend exclusively", () => {
    expect(readCatalogGatewayConfig({})).toEqual({ apiBaseUrl: "" });
    expect(
      readCatalogGatewayConfig({
        VITE_CATALOG_GATEWAY: "http",
        VITE_CATALOG_API_BASE_URL: "http://localhost:8000",
      }),
    ).toEqual({ apiBaseUrl: "http://localhost:8000" });
    expect(() =>
      readCatalogGatewayConfig({ VITE_CATALOG_GATEWAY: "static" }),
    ).toThrow(/only the live HTTP catalog is supported/);
    expect(() =>
      readCatalogGatewayConfig({ VITE_CATALOG_GATEWAY: "automatic" }),
    ).toThrow(/only the live HTTP catalog is supported/);
  });

  it("surfaces typed API errors without silently falling back to sample data", async () => {
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            error: {
              code: "card_not_found",
              message: "Card was not found.",
              details: { card_version: 4 },
            },
          }),
          {
            status: 404,
            headers: { "content-type": "application/json" },
          },
        ),
    );
    const transport = new FetchJsonTransport({
      baseUrl: "http://localhost:8000/",
      fetch,
    });

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
