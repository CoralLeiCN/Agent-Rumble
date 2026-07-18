import { evidence, makeComparison, searchFixture } from "./fixtures";
import type {
  CatalogGateway,
  ComparisonResponse,
  EvidenceRecord,
  SearchResponse,
} from "../types/catalog";

const pause = () => new Promise<void>((resolve) => window.setTimeout(resolve, 180));

export class StaticCatalogGateway implements CatalogGateway {
  async searchProjects(query: string): Promise<SearchResponse> {
    await pause();
    return { ...searchFixture, query: query.trim() || searchFixture.query };
  }

  async compareProjects(projectIds: string[]): Promise<ComparisonResponse> {
    await pause();
    return makeComparison(projectIds);
  }

  async getEvidence(evidenceId: string): Promise<EvidenceRecord> {
    await pause();
    const record = evidence[evidenceId];
    if (!record) {
      throw new Error(`No illustrative evidence fixture exists for ${evidenceId}.`);
    }
    return record;
  }
}

export const catalogGateway: CatalogGateway = new StaticCatalogGateway();
