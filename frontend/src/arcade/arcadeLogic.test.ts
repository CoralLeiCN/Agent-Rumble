import { describe, expect, it } from "vitest";
import type { RumbleEntrant, RumbleRound, RumbleRoundVerdict } from "../types/rumble";
import {
  ARCADE_LIGHT_ATTACK,
  ARCADE_MAX_HEALTH,
  ARCADE_RESULT_DISCLAIMER,
  ARCADE_SIGNATURE_ATTACK,
  createExhibitionResult,
  damageAfterHit,
  deriveSignatureMoves,
  resolveHealthFrame,
} from "./arcadeLogic";

function round(
  roundNumber: number,
  verdict: RumbleRoundVerdict,
  label = `Dimension ${roundNumber}`,
): RumbleRound {
  return {
    round_number: roundNumber,
    round_id: `round-${roundNumber}`,
    title: `Round ${roundNumber}`,
    dimension: `dimension-${roundNumber}`,
    label,
    requirement: "Prepared requirement",
    verdict,
    callout: "Contextual comparison callout.",
    entrant_a: {
      state: "value",
      value: `Left trait ${roundNumber}`,
      alignment: "satisfies",
      verification_status: "statically_confirmed",
      confidence: "high",
      claim_ids: [`claim-left-${roundNumber}`],
    },
    entrant_b: {
      state: "value",
      value: `Right trait ${roundNumber}`,
      alignment: "satisfies",
      verification_status: "statically_confirmed",
      confidence: "high",
      claim_ids: [`claim-right-${roundNumber}`],
    },
  };
}

const entrants: [Pick<RumbleEntrant, "project_name">, Pick<RumbleEntrant, "project_name">] = [
  { project_name: "Project Alpha" },
  { project_name: "Project Beta" },
];

describe("fighter signature derivation", () => {
  it("uses each project's contextual-advantage row before a neutral row", () => {
    const moves = deriveSignatureMoves(entrants, [
      round(1, "trade_off", "Neutral breadth"),
      round(2, "entrant_b_advantage", "Durable execution"),
      round(3, "entrant_a_advantage", "Approval controls"),
    ]);

    expect(moves[0]).toMatchObject({
      projectName: "Project Alpha",
      traitLabel: "Approval controls",
      traitValue: "Left trait 3",
      sourceRoundId: "round-3",
      contextualEdge: true,
    });
    expect(moves[1]).toMatchObject({
      projectName: "Project Beta",
      traitLabel: "Durable execution",
      traitValue: "Right trait 2",
      sourceRoundId: "round-2",
      contextualEdge: true,
    });
  });

  it("creates distinct visual styles without changing the symmetric move budget", () => {
    const neutralRound = round(1, "trade_off");
    const [left, right] = deriveSignatureMoves(entrants, [neutralRound]);

    expect(left.style).not.toBe(right.style);
    expect(left.contextualEdge).toBe(false);
    expect(right.contextualEdge).toBe(false);
    expect(left.description).toContain("does not imply an overall edge");
    expect(ARCADE_SIGNATURE_ATTACK.damage).toBe(13);
    expect(ARCADE_SIGNATURE_ATTACK.cooldownMs).toBe(1_250);
  });

  it("falls back to RUMBLE STRIKE when an advantage row lacks claim grounding", () => {
    const ungrounded = round(1, "entrant_a_advantage", "Approval controls");
    ungrounded.entrant_a.claim_ids = [];

    expect(deriveSignatureMoves(entrants, [ungrounded])[0]).toMatchObject({
      traitLabel: "RUMBLE STRIKE",
      sourceRoundId: "neutral-style",
      contextualEdge: false,
    });
  });
});

describe("health combat rules", () => {
  it("applies chip damage while blocking and clamps health at zero", () => {
    expect(damageAfterHit(ARCADE_MAX_HEALTH, ARCADE_LIGHT_ATTACK, false)).toBe(93);
    expect(damageAfterHit(ARCADE_MAX_HEALTH, ARCADE_LIGHT_ATTACK, true)).toBe(98);
    expect(damageAfterHit(3, ARCADE_SIGNATURE_ATTACK, false)).toBe(0);
  });

  it("batches simultaneous damage into an unbiased double KO", () => {
    expect(resolveHealthFrame([8, 10], [8, 13])).toEqual({
      health: [0, 0],
      knockedOut: [true, true],
      doubleKnockout: true,
    });
  });

  it("never lets negative damage heal a fighter", () => {
    expect(resolveHealthFrame([45, 60], [-12, 0]).health).toEqual([45, 60]);
  });
});

describe("arcade exhibition result", () => {
  const entrantA = {
    controller: "player_1" as const,
    avatarName: "Project Alpha",
    health: 42,
    roundsWon: 2,
    signatureMove: "Approval controls Pulse",
  };

  it("uses round wins to decide the controller outcome", () => {
    const result = createExhibitionResult(
      entrantA,
      {
        controller: "player_2",
        avatarName: "Project Beta",
        health: 100,
        roundsWon: 1,
        signatureMove: "Durable execution Rush",
      },
      "ko",
    );

    expect(result.winner).toBe("player_1");
    expect(result.disclaimer).toBe(ARCADE_RESULT_DISCLAIMER);
  });

  it("allows a tied-round draw and never reports a project verdict", () => {
    const result = createExhibitionResult(
      { ...entrantA, roundsWon: 1 },
      {
        controller: "cpu",
        avatarName: "Project Beta",
        health: 42,
        roundsWon: 1,
        signatureMove: "Durable execution Rush",
      },
      "double_ko",
    );

    expect(result.winner).toBe("draw");
    expect(JSON.stringify(result)).not.toContain("project_verdict");
  });
});
