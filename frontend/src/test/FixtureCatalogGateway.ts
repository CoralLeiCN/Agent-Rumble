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
} from "../types/catalog";

/** Test-only catalog adapter. Production builds always use the backend API. */
export class FixtureCatalogGateway implements CatalogGateway {
  readonly dataSource = "http" as const;

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
