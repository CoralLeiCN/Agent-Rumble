import {
  preparedQuery,
  projectCards,
  searchProjectionContext,
} from "../data/fixtures";
import {
  projectCardsToClaimEvidence,
  projectCardsToComparison,
  projectCardsToSearchResponse,
} from "../data/projectCardAdapter";
import type {
  CatalogGateway,
  CardReference,
  ClaimReference,
  ClaimEvidenceRecord,
  ComparisonResponse,
  SearchResponse,
  CatalogContext,
} from "../types/catalog";

/** Test-only catalog adapter. Production builds always use the backend API. */
export class FixtureCatalogGateway implements CatalogGateway {
  async getCatalogContext(): Promise<CatalogContext> {
    return {
      catalogId: "test",
      label: "Test catalog",
      cohortDescription: "Illustrative test projects",
      coverage: ["Static analysis"],
      exclusions: [],
      cardCount: projectCards.length,
      schemaVersions: ["0.3"],
      ontologyVersions: [],
      oldestAnalyzedAt: null,
      newestAnalyzedAt: null,
    };
  }

  async getCurrentCard(projectId: string) {
    const card = projectCards.find(
      (item) => item.project.project_id === projectId,
    );
    if (!card) throw new Error("Project is no longer in the catalog.");
    return card;
  }
  async searchProjects(query: string): Promise<SearchResponse> {
    return projectCardsToSearchResponse(
      projectCards,
      query.trim() || preparedQuery,
      searchProjectionContext,
    );
  }

  async compareProjects(
    references: CardReference[],
  ): Promise<ComparisonResponse> {
    return projectCardsToComparison(
      projectCards,
      references.map(({ projectId }) => projectId),
      "fixture",
    );
  }

  async getClaimEvidence(
    reference: ClaimReference,
  ): Promise<ClaimEvidenceRecord> {
    return projectCardsToClaimEvidence(projectCards, reference);
  }
}
