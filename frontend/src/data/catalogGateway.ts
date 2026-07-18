import { preparedQuery, projectCards, searchProjectionContext } from "./fixtures";
import {
  projectCardsToClaimEvidence,
  projectCardsToComparison,
  projectCardsToSearchResponse,
} from "./projectCardAdapter";
import type {
  CatalogGateway,
  ClaimEvidenceRecord,
  ComparisonResponse,
  SearchResponse,
} from "../types/catalog";

const pause = () => new Promise<void>((resolve) => window.setTimeout(resolve, 180));

export class StaticCatalogGateway implements CatalogGateway {
  async searchProjects(query: string): Promise<SearchResponse> {
    await pause();
    return projectCardsToSearchResponse(
      projectCards,
      query.trim() || preparedQuery,
      searchProjectionContext,
    );
  }

  async compareProjects(projectIds: string[]): Promise<ComparisonResponse> {
    await pause();
    return projectCardsToComparison(
      projectCards,
      projectIds,
      "fixture",
    );
  }

  async getClaimEvidence(claimId: string): Promise<ClaimEvidenceRecord> {
    await pause();
    return projectCardsToClaimEvidence(projectCards, claimId);
  }
}

export const catalogGateway: CatalogGateway = new StaticCatalogGateway();
