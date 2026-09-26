import type { AssessmentContextInput, CardReference } from "../types/catalog";
import type { CanonicalRumbleResult, RumbleGateway } from "../types/rumble";
import { readCatalogGatewayConfig } from "./catalogConfig";
import { FetchJsonTransport } from "./httpTransport";

export function isRumblePair(projectIds: readonly string[]) {
  return projectIds.length === 2 && new Set(projectIds).size === 2;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCanonicalResult(value: unknown): value is CanonicalRumbleResult {
  return (
    isRecord(value) &&
    isRecord(value.matchup) &&
    typeof value.matchup.display_label === "string" &&
    Array.isArray(value.matchup.claims) &&
    value.matchup.claims.every(
      (claim: unknown) =>
        isRecord(claim) &&
        isRecord(claim.canonical_reference) &&
        typeof claim.canonical_reference.projectId === "string" &&
        typeof claim.canonical_reference.claimId === "string" &&
        Number.isInteger(claim.canonical_reference.cardVersion) &&
        Array.isArray(claim.supporting_evidence) &&
        Array.isArray(claim.conflicting_evidence),
    ) &&
    isRecord(value.projection) &&
    value.projection.mode === "rumble_arena" &&
    value.projection.overall_result === "no_universal_winner" &&
    isRecord(value.projection.assessment_context) &&
    Array.isArray(value.projection.entrants) &&
    Array.isArray(value.projection.rounds)
  );
}

/** A session pins both the canonical evidence registry and the projected rounds. */
export class CanonicalRumbleGateway implements RumbleGateway {
  private result: Promise<CanonicalRumbleResult> | null = null;
  constructor(
    private readonly cards: CardReference[],
    private readonly context: AssessmentContextInput,
  ) {}

  load() {
    if (!this.result) {
      this.result = new FetchJsonTransport({
        baseUrl: readCatalogGatewayConfig().apiBaseUrl,
      })
        .request<unknown>("/api/v1/catalog/rumble", {
          method: "POST",
          body: JSON.stringify({
            cards: this.cards.map((card) => ({
              project_id: card.projectId,
              card_version: card.cardVersion,
            })),
            assessment_context: this.context,
          }),
        })
        .then((payload) => {
          if (!isCanonicalResult(payload)) {
            throw new Error(
              "The response does not match the canonical Rumble contract.",
            );
          }
          const matchesCard = (projectId: string, cardVersion: number) =>
            this.cards.some(
              (card) =>
                card.projectId === projectId &&
                card.cardVersion === cardVersion,
            );
          if (
            payload.projection.entrants.length !== 2 ||
            !isRumblePair(
              payload.projection.entrants.map((entrant) => entrant.project_id),
            ) ||
            payload.projection.entrants.some(
              (entrant) =>
                !matchesCard(
                  entrant.project_id,
                  entrant.source_snapshot?.card_version,
                ),
            ) ||
            payload.matchup.claims.some(
              (claim) =>
                !matchesCard(
                  claim.canonical_reference.projectId,
                  claim.canonical_reference.cardVersion,
                ),
            )
          ) {
            throw new Error(
              "The comparison does not match the pinned card versions.",
            );
          }
          return payload;
        })
        .catch((error: unknown) => {
          this.result = null;
          throw error;
        });
    }
    return this.result;
  }
}
