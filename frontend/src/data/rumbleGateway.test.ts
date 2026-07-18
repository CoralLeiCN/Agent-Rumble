import { describe, expect, it, vi } from "vitest";
import {
  BundledRumbleGateway,
  HttpRumbleGateway,
  ResilientRumbleGateway,
  toCatalogEvidenceRecord,
  isPreparedRumblePair,
} from "./rumbleGateway";
import { bundledRumbleDemo, projectBundledRumble } from "./rumbleFallback";
import type { RumbleGateway } from "../types/rumble";

describe("Rumble gateways", () => {
  it("uses the demo GET and projection POST contracts", async () => {
    const matchup = bundledRumbleDemo.matchups[0];
    if (!matchup) throw new Error("The bundled test matchup is missing.");
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(bundledRumbleDemo), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(projectBundledRumble(matchup.request)), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    const gateway = new HttpRumbleGateway(fetcher);

    const demo = await gateway.getDemo();
    const projection = await gateway.project(matchup);

    expect(demo.source).toBe("live_api");
    expect(projection.data.overall_result).toBe("no_universal_winner");
    expect(fetcher).toHaveBeenNthCalledWith(1, "/api/v1/rumble/demo", {
      headers: { Accept: "application/json" },
    });
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "/api/v1/rumble",
      expect.objectContaining({ method: "POST", body: JSON.stringify(matchup) }),
    );
  });

  it("recognizes only the exact prepared project pair", () => {
    expect(isPreparedRumblePair(["openai-agents-sdk", "langgraph"])).toBe(true);
    expect(isPreparedRumblePair(["langgraph", "openai-agents-sdk"])).toBe(true);
    expect(isPreparedRumblePair(["openai-agents-sdk", "crewai"])).toBe(false);
    expect(isPreparedRumblePair(["openai-agents-sdk", "langgraph", "crewai"])).toBe(false);
  });

  it("labels a bundled fallback and adapts its claim evidence for the existing drawer", async () => {
    const unavailable: RumbleGateway = {
      async getDemo() {
        throw new Error("offline");
      },
      async project() {
        throw new Error("offline");
      },
    };
    const gateway = new ResilientRumbleGateway(unavailable, new BundledRumbleGateway());
    const loaded = await gateway.getDemo();
    const matchup = loaded.data.matchups[0];
    const claim = matchup?.claims[0];
    const evidence = claim?.supporting_evidence[0];
    if (!claim || !evidence) throw new Error("The bundled evidence fixture is missing.");

    expect(loaded).toMatchObject({
      source: "bundled_fallback",
      fallbackReason: "offline",
    });
    expect(toCatalogEvidenceRecord(claim, evidence)).toMatchObject({
      id: evidence.evidence_id,
      projectId: claim.project_id,
      claim: claim.statement,
      whyItMatters: claim.why_it_matters,
      verificationStatus: "statically_confirmed",
    });
  });
});
