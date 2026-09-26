import { afterEach, describe, expect, it, vi } from "vitest";
import { CanonicalRumbleGateway, isRumblePair } from "./canonicalRumbleGateway";
import { developmentContext } from "./assessmentContext";
import { canonicalRumble } from "../test/FixtureRumbleGateway";

const cards = canonicalRumble.projection.entrants.map((entrant) => ({
  projectId: entrant.project_id,
  cardVersion: entrant.source_snapshot.card_version,
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("CanonicalRumbleGateway", () => {
  it("loads one pinned comparison using the configured API host", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json(canonicalRumble));
    vi.stubEnv("VITE_CATALOG_API_BASE_URL", "https://api.example.com/");
    vi.stubGlobal("fetch", fetcher);
    const gateway = new CanonicalRumbleGateway(cards, developmentContext);
    const [first, second] = await Promise.all([gateway.load(), gateway.load()]);
    expect(first).toEqual(canonicalRumble);
    expect(second).toBe(first);
    expect(fetcher).toHaveBeenCalledExactlyOnceWith(
      "https://api.example.com/api/v1/catalog/rumble",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          cards: cards.map((card) => ({
            project_id: card.projectId,
            card_version: card.cardVersion,
          })),
          assessment_context: developmentContext,
        }),
      }),
    );
  });

  it("propagates failures and retries instead of substituting fixture data", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(Response.json(canonicalRumble));
    vi.stubGlobal("fetch", fetcher);
    const gateway = new CanonicalRumbleGateway(cards, developmentContext);
    await expect(gateway.load()).rejects.toThrow("offline");
    await expect(gateway.load()).resolves.toEqual(canonicalRumble);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("requires canonical claim references and the selected card versions", async () => {
    const missingReference = JSON.parse(JSON.stringify(canonicalRumble));
    delete missingReference.matchup.claims[0].canonical_reference;
    const wrongVersion = structuredClone(canonicalRumble);
    wrongVersion.matchup.claims[0].canonical_reference.cardVersion = 99;
    const wrongEntrant = structuredClone(canonicalRumble);
    wrongEntrant.projection.entrants[0].source_snapshot.card_version = 99;
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json(missingReference))
      .mockResolvedValueOnce(Response.json(wrongVersion))
      .mockResolvedValueOnce(Response.json(wrongEntrant));
    vi.stubGlobal("fetch", fetcher);
    const gateway = new CanonicalRumbleGateway(cards, developmentContext);
    await expect(gateway.load()).rejects.toThrow("canonical Rumble contract");
    await expect(gateway.load()).rejects.toThrow("pinned card versions");
    await expect(gateway.load()).rejects.toThrow("pinned card versions");
  });

  it("accepts exactly two distinct project IDs", () => {
    expect(isRumblePair(cards.map((card) => card.projectId))).toBe(true);
    expect(isRumblePair(["other-a", "other-b"])).toBe(true);
    expect(isRumblePair(["a", "a"])).toBe(false);
    expect(isRumblePair(["a"])).toBe(false);
    expect(isRumblePair(["a", "b", "c"])).toBe(false);
  });
});
