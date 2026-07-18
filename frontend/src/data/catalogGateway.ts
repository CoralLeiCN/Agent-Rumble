import { readCatalogGatewayConfig, type CatalogGatewayConfig } from "./catalogConfig";
import { FetchJsonTransport, type JsonTransport } from "./httpTransport";
import { encodeOpaquePathIdentifier } from "./opaquePathIdentifier";
import {
  projectCardToSummary,
  projectCardsToClaimEvidence,
  projectCardsToComparison,
} from "./projectCardAdapter";
import type {
  AssessmentContextView,
  CatalogGateway,
  ClaimEvidenceRecord,
  ComparisonResponse,
  ProjectSummary,
  Requirement,
  SearchResponse,
} from "../types/catalog";
import type { AgentProjectCard } from "../types/projectCard";

const API_PREFIX = "/api/v1";

export interface CatalogContext {
  catalogId: string;
  label: string;
  cohortDescription: string;
  coverage: string[];
  exclusions: string[];
  cardCount: number;
  schemaVersions: string[];
  ontologyVersions: string[];
  oldestAnalyzedAt: string | null;
  newestAnalyzedAt: string | null;
}

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
    verification_status: ProjectSummary["matchClaim"]["verificationStatus"];
    confidence: ProjectSummary["matchClaim"]["confidence"];
  } | null;
}

interface RawSearchResponse {
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

function assessmentContext(context: RawAssessmentContextView): AssessmentContextView {
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

function projectSummary(raw: RawProjectSummary, card: AgentProjectCard): ProjectSummary {
  const canonical = projectCardToSummary(card);
  return {
    ...canonical,
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
      : canonical.matchClaim,
  };
}

export class HttpCatalogGateway implements CatalogGateway {
  readonly dataSource = "http" as const;
  private readonly cards = new Map<string, AgentProjectCard>();

  constructor(private readonly transport: JsonTransport = new FetchJsonTransport()) {}

  async getCatalogContext(): Promise<CatalogContext> {
    const response = await this.transport.request<RawCatalogContext>(`${API_PREFIX}/catalog`);
    return catalogContext(response);
  }

  async getCurrentCard(projectId: string): Promise<AgentProjectCard> {
    const card = await this.transport.request<AgentProjectCard>(
      `${API_PREFIX}/projects/${encodeOpaquePathIdentifier(projectId)}/cards/current`,
    );
    this.cards.set(projectId, card);
    return card;
  }

  async getCard(projectId: string, cardVersion: number): Promise<AgentProjectCard> {
    const card = await this.transport.request<AgentProjectCard>(
      `${API_PREFIX}/projects/${encodeOpaquePathIdentifier(projectId)}/cards/${cardVersion}`,
    );
    this.cards.set(projectId, card);
    return card;
  }

  async searchProjects(query: string): Promise<SearchResponse> {
    const normalizedQuery = query.trim();
    const response = await this.transport.request<RawSearchResponse>(
      `${API_PREFIX}/catalog/search`,
      {
        method: "POST",
        body: JSON.stringify({
          text: normalizedQuery,
          page: 1,
          page_size: 100,
          ...(normalizedQuery ? {
            assessment_context: {
              use_case: normalizedQuery,
              comparison_cohort: ["Published Agent Project Cards"],
              requirements: [normalizedQuery],
              organizational_constraints: ["Static evidence only"],
            },
          } : {}),
        }),
      },
    );
    const cards = await Promise.all(response.projects.map(({ id, card_version: version }) => (
      this.getCard(id, version)
    )));
    return {
      query: response.query,
      assessmentContexts: response.assessment_contexts.map(assessmentContext),
      requirements: response.requirements,
      uninterpretedTerms: response.uninterpreted_terms,
      projects: response.projects.map((project, index) => projectSummary(project, cards[index])),
    };
  }

  async compareProjects(projectIds: string[]): Promise<ComparisonResponse> {
    const cards = await Promise.all(projectIds.map((projectId) => (
      this.cards.get(projectId) ?? this.getCurrentCard(projectId)
    )));
    return projectCardsToComparison(cards, projectIds, "validated_catalog");
  }

  async getClaimEvidence(claimId: string): Promise<ClaimEvidenceRecord> {
    const card = [...this.cards.values()].find(({ claims }) => (
      claims.some(({ claim_id: candidate }) => candidate === claimId)
    ));
    const claim = card?.claims.find(({ claim_id: candidate }) => candidate === claimId);
    if (!card || !claim) {
      throw new Error(`Claim ${claimId} is not present in the loaded catalog results.`);
    }

    const evidenceIds = [
      ...claim.supporting_evidence_ids,
      ...claim.conflicting_evidence_ids,
    ];
    const evidenceResponses = await Promise.all(evidenceIds.map(async (evidenceId) => ({
      evidenceId,
      response: await this.transport.request<RawEvidenceResponse>(
        `${API_PREFIX}/projects/${encodeOpaquePathIdentifier(card.project.project_id)}/cards/${card.card_version}/evidence/${encodeOpaquePathIdentifier(evidenceId)}`,
      ),
    })));
    const sourceUrls = new Map(evidenceResponses.map(({ evidenceId, response }) => (
      [evidenceId, response.source_url]
    )));
    const record = projectCardsToClaimEvidence([card], claimId);
    const withCanonicalUrl = <T extends { id: string; sourceUrl: string | null }>(item: T): T => ({
      ...item,
      sourceUrl: sourceUrls.get(item.id) ?? item.sourceUrl,
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
