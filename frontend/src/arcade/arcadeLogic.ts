import type { RumbleEntrant, RumbleRound } from "../types/rumble";
import type {
  ArcadeFighterResult,
  ArcadeFinishReason,
  ArcadeGameResult,
  ArcadeSignatureMove,
  ArcadeSignatureStyle,
} from "./types";

export const ARCADE_ROUND_DURATION_SECONDS = 45;
export const ARCADE_MAX_HEALTH = 100;
export const ARCADE_ROUNDS_TO_WIN = 2;
export const ARCADE_RESULT_DISCLAIMER =
  "Player/exhibition outcome only — not a project assessment or Rumble verdict.";

export interface ArcadeAttackProfile {
  damage: number;
  blockedDamage: number;
  cooldownMs: number;
}

export const ARCADE_LIGHT_ATTACK: ArcadeAttackProfile = {
  damage: 7,
  blockedDamage: 2,
  cooldownMs: 340,
};

/**
 * Every special has the same damage and cooldown budget. Its style only changes
 * delivery, range, and visual identity; comparison evidence never changes power.
 */
export const ARCADE_SIGNATURE_ATTACK: ArcadeAttackProfile = {
  damage: 13,
  blockedDamage: 4,
  cooldownMs: 1_250,
};

export interface HealthFrameResolution {
  health: readonly [number, number];
  knockedOut: readonly [boolean, boolean];
  doubleKnockout: boolean;
}

const SIGNATURE_STYLES: readonly ArcadeSignatureStyle[] = [
  "projectile",
  "rush",
  "uppercut",
  "pulse",
];

const STYLE_COPY: Record<ArcadeSignatureStyle, { suffix: string; description: string }> = {
  projectile: {
    suffix: "Relay",
    description: "A forward signal projectile with a visible travel window.",
  },
  rush: {
    suffix: "Rush",
    description: "A fast grounded advance that converts its wind-up into one strike.",
  },
  uppercut: {
    suffix: "Launcher",
    description: "A close anti-air launcher with a tall hit area.",
  },
  pulse: {
    suffix: "Pulse",
    description: "A short-range radial burst that can connect on either side.",
  },
};

function stableHash(value: string): number {
  let hash = 2_166_136_261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function cellTrait(round: RumbleRound, corner: "entrant_a" | "entrant_b"): string {
  const cell = round[corner];
  if (cell.state !== "value") return cell.state.replaceAll("_", " ");
  return cell.value?.trim() || round.label;
}

function selectSignatureRound(
  rounds: readonly RumbleRound[],
  corner: "entrant_a" | "entrant_b",
): { round: RumbleRound; sourceRoundIndex: number; contextualEdge: boolean } | null {
  const edgeVerdict = corner === "entrant_a" ? "entrant_a_advantage" : "entrant_b_advantage";
  const edgeIndex = rounds.findIndex((round) => {
    const cell = round[corner];
    return (
      round.verdict === edgeVerdict &&
      cell.state === "value" &&
      Boolean(cell.value?.trim()) &&
      cell.claim_ids.length > 0
    );
  });
  if (edgeIndex >= 0) {
    return {
      round: rounds[edgeIndex] as RumbleRound,
      sourceRoundIndex: edgeIndex,
      contextualEdge: true,
    };
  }
  return null;
}

function cleanTraitLabel(label: string): string {
  return label.replace(/\s+(smackdown|combo|showdown|brawl)\s*$/i, "").trim();
}

export function deriveSignatureMove(
  projectName: string,
  rounds: readonly RumbleRound[],
  corner: "entrant_a" | "entrant_b",
  styleOverride?: ArcadeSignatureStyle,
): ArcadeSignatureMove {
  const selection = selectSignatureRound(rounds, corner);
  const traitLabel = selection ? cleanTraitLabel(selection.round.label) : "RUMBLE STRIKE";
  const traitValue = selection ? cellTrait(selection.round, corner) : "Neutral exhibition style";
  const seed = `${projectName}|${traitLabel}|${traitValue}`;
  const style = styleOverride ?? SIGNATURE_STYLES[stableHash(seed) % SIGNATURE_STYLES.length] ?? "pulse";
  const copy = STYLE_COPY[style];
  const shortTrait = traitLabel.trim().slice(0, 24) || "RUMBLE STRIKE";
  return {
    projectName,
    moveName: `${shortTrait} ${copy.suffix}`,
    style,
    traitLabel,
    traitValue,
    sourceRoundId: selection?.round.round_id ?? "neutral-style",
    sourceRoundIndex: selection?.sourceRoundIndex ?? 0,
    contextualEdge: selection?.contextualEdge ?? false,
    description: `${copy.description} ${
      selection?.contextualEdge
        ? "Its theme comes from this project's contextual edge in the prepared comparison."
        : "This neutral RUMBLE STRIKE does not imply an overall edge or contextual comparison advantage."
    }`,
  };
}

/** Builds two visibly distinct, equally budgeted signature moves. */
export function deriveSignatureMoves(
  entrants: readonly [Pick<RumbleEntrant, "project_name">, Pick<RumbleEntrant, "project_name">],
  rounds: readonly RumbleRound[],
): readonly [ArcadeSignatureMove, ArcadeSignatureMove] {
  const left = deriveSignatureMove(entrants[0].project_name, rounds, "entrant_a");
  let right = deriveSignatureMove(entrants[1].project_name, rounds, "entrant_b");
  if (left.style === right.style) {
    const nextStyle = SIGNATURE_STYLES[(SIGNATURE_STYLES.indexOf(left.style) + 1) % SIGNATURE_STYLES.length];
    right = deriveSignatureMove(
      entrants[1].project_name,
      rounds,
      "entrant_b",
      nextStyle ?? "pulse",
    );
  }
  return [left, right];
}

export function damageAfterHit(
  health: number,
  attack: ArcadeAttackProfile,
  blocking: boolean,
): number {
  return Math.max(0, Math.min(ARCADE_MAX_HEALTH, health) - (blocking ? attack.blockedDamage : attack.damage));
}

/** Resolves both health changes together so a same-frame double KO is fair. */
export function resolveHealthFrame(
  health: readonly [number, number],
  incomingDamage: readonly [number, number],
): HealthFrameResolution {
  const nextHealth: [number, number] = [
    Math.max(0, health[0] - Math.max(0, incomingDamage[0])),
    Math.max(0, health[1] - Math.max(0, incomingDamage[1])),
  ];
  const knockedOut: [boolean, boolean] = [nextHealth[0] === 0, nextHealth[1] === 0];
  return {
    health: nextHealth,
    knockedOut,
    doubleKnockout: knockedOut[0] && knockedOut[1],
  };
}

function compareFighters(
  entrantA: ArcadeFighterResult,
  entrantB: ArcadeFighterResult,
): ArcadeGameResult["winner"] {
  if (entrantA.roundsWon === entrantB.roundsWon) return "draw";
  return entrantA.roundsWon > entrantB.roundsWon ? entrantA.controller : entrantB.controller;
}

export function createExhibitionResult(
  entrantA: ArcadeFighterResult,
  entrantB: ArcadeFighterResult,
  reason: ArcadeFinishReason,
): ArcadeGameResult {
  return {
    kind: "arcade_exhibition",
    winner: compareFighters(entrantA, entrantB),
    reason,
    fighters: [entrantA, entrantB],
    disclaimer: ARCADE_RESULT_DISCLAIMER,
  };
}
