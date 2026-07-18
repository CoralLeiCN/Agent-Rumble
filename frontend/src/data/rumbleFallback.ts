import rumbleDemoBundle from "./rumbleDemoBundle.json";
import type {
  RumbleCell,
  RumbleDemoBundle,
  RumbleProjectionRequest,
  RumbleProjectionResponse,
  RumbleRequirementAlignment,
  RumbleRoundVerdict,
} from "../types/rumble";

export const bundledRumbleDemo = rumbleDemoBundle as RumbleDemoBundle;

const alignmentRank: Partial<Record<RumbleRequirementAlignment, number>> = {
  does_not_satisfy: 1,
  partially_satisfies: 2,
  satisfies: 3,
};

const roundTitles: Record<string, string> = {
  capability: "Capability Clash",
  integration: "Integration Grapple",
  operations: "Operations Endgame",
  maturity: "Maturity Main Event",
  evidence: "Evidence Check",
};

function canSupportAdvantage(cell: RumbleCell) {
  return (
    cell.state === "value" &&
    alignmentRank[cell.alignment] !== undefined &&
    cell.claim_ids.length > 0
  );
}

function verdictFor(entrantA: RumbleCell, entrantB: RumbleCell): RumbleRoundVerdict {
  if (!canSupportAdvantage(entrantA) || !canSupportAdvantage(entrantB)) {
    return "inconclusive";
  }

  const aRank = alignmentRank[entrantA.alignment] as number;
  const bRank = alignmentRank[entrantB.alignment] as number;
  if (aRank === bRank) return "trade_off";
  return aRank > bRank ? "entrant_a_advantage" : "entrant_b_advantage";
}

function calloutFor(
  verdict: RumbleRoundVerdict,
  entrantAName: string,
  entrantBName: string,
) {
  if (verdict === "entrant_a_advantage") {
    return `Contextual edge: ${entrantAName} aligns more closely with this round's requirement.`;
  }
  if (verdict === "entrant_b_advantage") {
    return `Contextual edge: ${entrantBName} aligns more closely with this round's requirement.`;
  }
  if (verdict === "trade_off") {
    return "Trade-off round: both projects have the same stated level of contextual fit.";
  }
  return "No clean hit: the recorded values or evidence do not justify a contextual edge.";
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "comparison";
}

export function projectBundledRumble(
  projectionRequest: RumbleProjectionRequest,
): RumbleProjectionResponse {
  const [entrantA, entrantB] = projectionRequest.entrants;
  if (!entrantA || !entrantB) {
    throw new Error("A Rumble projection requires exactly two projects.");
  }
  const sharedRole = entrantA.project_roles.some((role) => entrantB.project_roles.includes(role));

  return {
    mode: "rumble_arena",
    assessment_context: projectionRequest.assessment_context,
    entrants: projectionRequest.entrants,
    role_relationship: sharedRole ? "overlapping" : "different",
    role_notice: sharedRole
      ? "The projects share at least one recorded role, so direct round comparisons may be meaningful within the stated Assessment Context."
      : "The projects have different recorded roles. Treat the rounds as an adjacent-or-complementary comparison, not proof that one replaces the other.",
    rounds: projectionRequest.comparison_rows.map((row, index) => {
      const verdict = verdictFor(row.entrant_a, row.entrant_b);
      const roundNumber = index + 1;
      return {
        ...row,
        round_number: roundNumber,
        round_id: `round-${roundNumber}-${slug(row.dimension)}`,
        title: `Round ${roundNumber}: ${roundTitles[row.dimension.toLowerCase()] ?? `${row.label} Face-off`}`,
        verdict,
        callout: calloutFor(verdict, entrantA.project_name, entrantB.project_name),
      };
    }),
    overall_result: "no_universal_winner",
    ring_call:
      "No universal winner is calculated. Choose the trade-offs that fit this Assessment Context, then inspect the linked claims and evidence.",
  };
}
