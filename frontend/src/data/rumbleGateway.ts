import { bundledRumbleDemo, projectBundledRumble } from "./rumbleFallback";
import type { EvidenceRecord, VerificationStatus } from "../types/catalog";
import type {
  LoadedRumbleData,
  RumbleClaim,
  RumbleConfidence,
  RumbleDemoBundle,
  RumbleDemoMatchup,
  RumbleEvidence,
  RumbleGateway,
  RumbleProjectionResponse,
  RumbleVerificationStatus,
} from "../types/rumble";

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isDemoBundle(value: unknown): value is RumbleDemoBundle {
  return (
    isObject(value) &&
    typeof value.fixture_label === "string" &&
    typeof value.prepared_at === "string" &&
    typeof value.coverage_notice === "string" &&
    Array.isArray(value.matchups)
  );
}

function isProjection(value: unknown): value is RumbleProjectionResponse {
  return (
    isObject(value) &&
    value.mode === "rumble_arena" &&
    value.overall_result === "no_universal_winner" &&
    Array.isArray(value.entrants) &&
    Array.isArray(value.rounds)
  );
}

async function responseError(response: Response, operation: string) {
  let detail = "";
  try {
    const payload: unknown = await response.json();
    if (isObject(payload) && typeof payload.detail === "string") {
      detail = ` ${payload.detail}`;
    }
  } catch {
    // A status code is enough when an endpoint does not return JSON.
  }
  return new Error(`${operation} failed with HTTP ${response.status}.${detail}`.trim());
}

export class HttpRumbleGateway implements RumbleGateway {
  constructor(private readonly fetcher: Fetcher = globalThis.fetch.bind(globalThis)) {}

  async getDemo(): Promise<LoadedRumbleData<RumbleDemoBundle>> {
    const response = await this.fetcher("/api/v1/rumble/demo", {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw await responseError(response, "Loading the prepared matchup");

    const payload: unknown = await response.json();
    if (!isDemoBundle(payload)) {
      throw new Error("The prepared matchup response does not match the Rumble demo contract.");
    }
    return { data: payload, source: "live_api" };
  }

  async project(
    matchup: RumbleDemoMatchup,
  ): Promise<LoadedRumbleData<RumbleProjectionResponse>> {
    const response = await this.fetcher("/api/v1/rumble", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(matchup),
    });
    if (!response.ok) throw await responseError(response, "Preparing the arena projection");

    const payload: unknown = await response.json();
    if (!isProjection(payload)) {
      throw new Error("The arena projection response does not match the Rumble contract.");
    }
    return { data: payload, source: "live_api" };
  }
}

export class BundledRumbleGateway implements RumbleGateway {
  async getDemo(): Promise<LoadedRumbleData<RumbleDemoBundle>> {
    return { data: bundledRumbleDemo, source: "bundled_fallback" };
  }

  async project(
    matchup: RumbleDemoMatchup,
  ): Promise<LoadedRumbleData<RumbleProjectionResponse>> {
    return {
      data: projectBundledRumble(matchup.request),
      source: "bundled_fallback",
    };
  }
}

function fallbackMessage(caught: unknown) {
  return caught instanceof Error ? caught.message : "The live Rumble API was unavailable.";
}

export class ResilientRumbleGateway implements RumbleGateway {
  constructor(
    private readonly primary: RumbleGateway = new HttpRumbleGateway(),
    private readonly fallback: RumbleGateway = new BundledRumbleGateway(),
  ) {}

  async getDemo(): Promise<LoadedRumbleData<RumbleDemoBundle>> {
    try {
      return await this.primary.getDemo();
    } catch (caught) {
      const loaded = await this.fallback.getDemo();
      return { ...loaded, fallbackReason: fallbackMessage(caught) };
    }
  }

  async project(
    matchup: RumbleDemoMatchup,
  ): Promise<LoadedRumbleData<RumbleProjectionResponse>> {
    try {
      return await this.primary.project(matchup);
    } catch (caught) {
      const loaded = await this.fallback.project(matchup);
      return { ...loaded, fallbackReason: fallbackMessage(caught) };
    }
  }
}

export const preparedRumbleProjectIds = ["openai-agents-sdk", "langgraph"] as const;

export function isPreparedRumblePair(projectIds: readonly string[]) {
  if (projectIds.length !== preparedRumbleProjectIds.length) return false;
  const selected = new Set(projectIds);
  return preparedRumbleProjectIds.every((projectId) => selected.has(projectId));
}

export function findPreparedMatchup(
  bundle: RumbleDemoBundle,
  projectIds: readonly string[],
): RumbleDemoMatchup | undefined {
  if (projectIds.length !== 2 || projectIds[0] === projectIds[1]) return undefined;
  const requested = new Set(projectIds);
  return bundle.matchups.find((matchup) => {
    const entrants = matchup.request.entrants.map((entrant) => entrant.project_id);
    return entrants.length === 2 && entrants.every((projectId) => requested.has(projectId));
  });
}

function catalogVerificationStatus(
  status: RumbleVerificationStatus,
): VerificationStatus | undefined {
  if (
    status === "documented" ||
    status === "statically_confirmed" ||
    status === "runtime_verified"
  ) {
    return status;
  }
  return undefined;
}

function catalogConfidence(confidence: RumbleConfidence) {
  return confidence === "unknown" ? undefined : confidence;
}

export function toCatalogEvidenceRecord(
  claim: RumbleClaim,
  evidence: RumbleEvidence,
  relationship: "supporting" | "conflicting" = "supporting",
): EvidenceRecord | undefined {
  const verificationStatus = catalogVerificationStatus(claim.verification_status);
  const confidence = catalogConfidence(claim.confidence);
  if (!verificationStatus || !confidence) return undefined;

  return {
    id: evidence.evidence_id,
    projectId: claim.project_id,
    claim:
      relationship === "supporting"
        ? claim.statement
        : `Evidence conflicting with claim: ${claim.statement}`,
    whyItMatters:
      relationship === "supporting"
        ? claim.why_it_matters
        : `This source conflicts with the recorded claim. ${claim.why_it_matters}`,
    verificationStatus,
    confidence,
    repository: evidence.repository,
    revision: evidence.revision,
    locator: `${evidence.path} · ${evidence.locator}`,
    excerpt: evidence.excerpt,
    sourceUrl: evidence.source_url,
    relationship,
  };
}

export const rumbleGateway: RumbleGateway = new ResilientRumbleGateway();
