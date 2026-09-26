import {
  readCatalogGatewayConfig,
  type CatalogGatewayConfig,
} from "./catalogConfig";
import { FetchJsonTransport, type JsonTransport } from "./httpTransport";
import { encodeOpaquePathIdentifier } from "./opaquePathIdentifier";
import {
  projectCardsToClaimEvidence,
  projectCardsToComparison,
} from "./projectCardAdapter";
import type {
  AssessmentContextView,
  AssessmentContextInput,
  CatalogContext,
  ContextualComparison,
  CardReference,
  ClaimReference,
  CatalogGateway,
  ClaimEvidenceRecord,
  ComparisonResponse,
  ProjectSummary,
  Requirement,
  SearchResponse,
} from "../types/catalog";
import type { AgentProjectCard } from "../types/projectCard";

const API_PREFIX = "/api/v1";
const MAX_CACHED_CARDS = 32;

interface RawCatalogContext {
  catalog_id: string;
  label: string;
  cohort_description: string;
  coverage: string[];
  exclusions: string[];
  card_count: number;
  schema_versions: string[];
  ontology_versions: string[];
  oldest_analyzed_at: string | null;
  newest_analyzed_at: string | null;
}

interface RawAssessmentContextView {
  context_id: string;
  project_id: string;
  use_case: string;
  comparison_cohort: string[];
  requirements: string[];
  organizational_constraints: string[];
  assessed_at: string;
}

interface RawProjectSummary {
  id: string;
  name: string;
  owner: string;
  project_type: string;
  role: string;
  summary: string;
  match_reason: string;
  constraint: string;
  languages: string[];
  card_id: string;
  schema_version: string;
  card_version: number;
  canonical_primary_type: string;
  analysis_depth: string;
  boundary: string;
  source_count: number;
  revision: string;
  analyzed_at: string;
  match_claim: {
    claim_id: string;
    verification_status: NonNullable<
      ProjectSummary["matchClaim"]
    >["verificationStatus"];
    confidence: NonNullable<ProjectSummary["matchClaim"]>["confidence"];
  } | null;
}

interface RawSearchResponse {
  page: number;
  page_size: number;
  total: number;
  query: string;
  assessment_contexts: RawAssessmentContextView[];
  requirements: Requirement[];
  uninterpreted_terms: string[];
  projects: RawProjectSummary[];
}

interface RawEvidenceResponse {
  source_url: string | null;
}

function catalogContext(response: RawCatalogContext): CatalogContext {
  return {
    catalogId: response.catalog_id,
    label: response.label,
    cohortDescription: response.cohort_description,
    coverage: response.coverage,
    exclusions: response.exclusions,
    cardCount: response.card_count,
    schemaVersions: response.schema_versions,
    ontologyVersions: response.ontology_versions,
    oldestAnalyzedAt: response.oldest_analyzed_at,
    newestAnalyzedAt: response.newest_analyzed_at,
  };
}

function assessmentContext(
  context: RawAssessmentContextView,
): AssessmentContextView {
  return {
    contextId: context.context_id,
    projectId: context.project_id,
    useCase: context.use_case,
    comparisonCohort: context.comparison_cohort,
    requirements: context.requirements,
    organizationalConstraints: context.organizational_constraints,
    assessedAt: context.assessed_at,
  };
}

function projectSummary(raw: RawProjectSummary): ProjectSummary {
  return {
    id: raw.id,
    name: raw.name,
    owner: raw.owner,
    projectType: raw.project_type,
    role: raw.role,
    summary: raw.summary,
    matchReason: raw.match_reason,
    constraint: raw.constraint,
    languages: raw.languages,
    cardId: raw.card_id,
    schemaVersion: raw.schema_version,
    cardVersion: raw.card_version,
    canonicalPrimaryType: raw.canonical_primary_type,
    analysisDepth: raw.analysis_depth,
    boundary: raw.boundary,
    sourceCount: raw.source_count,
    revision: raw.revision,
    analyzedAt: raw.analyzed_at.slice(0, 10),
    matchClaim: raw.match_claim
      ? {
          claimId: raw.match_claim.claim_id,
          verificationStatus: raw.match_claim.verification_status,
          confidence: raw.match_claim.confidence,
        }
      : null,
  };
}

export class HttpCatalogGateway implements CatalogGateway {
  private readonly cards = new Map<string, AgentProjectCard>();
  private readonly pendingCards = new Map<string, Promise<AgentProjectCard>>();

  constructor(
    private readonly transport: JsonTransport = new FetchJsonTransport(),
  ) {}

  private cacheCard(key: string, card: AgentProjectCard): void {
    this.cards.delete(key);
    this.cards.set(key, card);
    if (this.cards.size > MAX_CACHED_CARDS) {
      this.cards.delete(this.cards.keys().next().value!);
    }
  }

  async getCatalogContext(): Promise<CatalogContext> {
    const response = await this.transport.request<RawCatalogContext>(
      `${API_PREFIX}/catalog`,
    );
    return catalogContext(response);
  }

  async getCurrentCard(projectId: string): Promise<AgentProjectCard> {
    const card = await this.transport.request<AgentProjectCard>(
      `${API_PREFIX}/projects/${encodeOpaquePathIdentifier(projectId)}/cards/current`,
    );
    if (card.project.project_id !== projectId) {
      throw new Error("Catalog returned a card for a different project.");
    }
    this.cacheCard(JSON.stringify([projectId, card.card_version]), card);
    return card;
  }

  async getCard(
    projectId: string,
    cardVersion: number,
  ): Promise<AgentProjectCard> {
    const key = JSON.stringify([projectId, cardVersion]);
    const cached = this.cards.get(key);
    if (cached) {
      this.cacheCard(key, cached);
      return cached;
    }
    const pending = this.pendingCards.get(key);
    if (pending) return pending;
    const request = this.transport
      .request<AgentProjectCard>(
        `${API_PREFIX}/projects/${encodeOpaquePathIdentifier(projectId)}/cards/${cardVersion}`,
      )
      .then((card) => {
        if (
          card.project.project_id !== projectId ||
          card.card_version !== cardVersion
        ) {
          throw new Error(
            "Catalog returned a card that does not match its pinned reference.",
          );
        }
        this.cacheCard(key, card);
        return card;
      })
      .finally(() => this.pendingCards.delete(key));
    this.pendingCards.set(key, request);
    return request;
  }

  async searchProjects(
    query: string,
    page = 1,
    context?: AssessmentContextInput,
  ): Promise<SearchResponse> {
    const normalizedQuery = query.trim();
    const response = await this.transport.request<RawSearchResponse>(
      `${API_PREFIX}/catalog/search`,
      {
        method: "POST",
        body: JSON.stringify({
          text: normalizedQuery,
          page,
          page_size: 20,
          ...(context
            ? { assessment_context: context }
            : normalizedQuery
              ? {
                  assessment_context: {
                    use_case: normalizedQuery,
                    comparison_cohort: ["Published Agent Project Cards"],
                    requirements: [normalizedQuery],
                    organizational_constraints: ["Static evidence only"],
                  },
                }
              : {}),
        }),
      },
    );
    return {
      page: response.page,
      pageSize: response.page_size,
      total: response.total,
      query: response.query,
      assessmentContexts: response.assessment_contexts.map(assessmentContext),
      requirements: response.requirements,
      uninterpretedTerms: response.uninterpreted_terms,
      projects: response.projects.map(projectSummary),
    };
  }

  async compareProjects(
    references: CardReference[],
    context?: AssessmentContextInput,
  ): Promise<ComparisonResponse> {
    if (
      references.length < 2 ||
      references.length > 3 ||
      new Set(references.map(({ projectId }) => projectId)).size !==
        references.length
    ) {
      throw new Error("A comparison requires two or three distinct projects.");
    }
    const cards = await Promise.all(
      references.map(({ projectId, cardVersion }) =>
        this.getCard(projectId, cardVersion),
      ),
    );
    const contextual = await this.transport.request<ContextualComparison>(
      `${API_PREFIX}/catalog/compare`,
      {
        method: "POST",
        body: JSON.stringify({
          cards: references.map((ref) => ({
            project_id: ref.projectId,
            card_version: ref.cardVersion,
          })),
          assessment_context: context ?? {
            use_case: "Compare selected projects",
            comparison_cohort: references.map((ref) => ref.projectId),
            requirements: [],
            preferences: [],
            exclusions: [],
            organizational_constraints: [],
          },
        }),
      },
    );
    return {
      ...projectCardsToComparison(
        cards,
        references.map(({ projectId }) => projectId),
        "validated_catalog",
      ),
      contextual,
    };
  }

  async getClaimEvidence(
    reference: ClaimReference,
  ): Promise<ClaimEvidenceRecord> {
    const card = await this.getCard(reference.projectId, reference.cardVersion);
    const claim = card.claims.find(
      ({ claim_id }) => claim_id === reference.claimId,
    );
    if (!claim) {
      throw new Error(
        `Claim ${reference.claimId} is not present in the pinned card.`,
      );
    }

    const evidenceIds = [
      ...claim.supporting_evidence_ids,
      ...claim.conflicting_evidence_ids,
    ];
    const evidenceResponses = await Promise.all(
      evidenceIds.map(async (evidenceId) => ({
        evidenceId,
        response: await this.transport.request<RawEvidenceResponse>(
          `${API_PREFIX}/projects/${encodeOpaquePathIdentifier(card.project.project_id)}/cards/${card.card_version}/evidence/${encodeOpaquePathIdentifier(evidenceId)}`,
        ),
      })),
    );
    const sourceUrls = new Map(
      evidenceResponses.map(({ evidenceId, response }) => [
        evidenceId,
        response.source_url,
      ]),
    );
    const record = projectCardsToClaimEvidence([card], reference);
    const withCanonicalUrl = <
      T extends { id: string; sourceUrl: string | null },
    >(
      item: T,
    ): T => ({
      ...item,
      sourceUrl: sourceUrls.get(item.id) ?? null,
    });
    return {
      ...record,
      supportingEvidence: record.supportingEvidence.map(withCanonicalUrl),
      conflictingEvidence: record.conflictingEvidence.map(withCanonicalUrl),
    };
  }
}

export function createCatalogGateway(
  config: CatalogGatewayConfig = readCatalogGatewayConfig(),
  transport?: JsonTransport,
): CatalogGateway {
  return new HttpCatalogGateway(
    transport ?? new FetchJsonTransport({ baseUrl: config.apiBaseUrl }),
  );
}

export const catalogGateway: CatalogGateway = createCatalogGateway();
