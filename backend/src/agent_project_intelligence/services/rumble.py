"""Deterministic Rumble Arena projection service."""

import re

from agent_project_intelligence.models.rumble import (
    ComparisonState,
    RequirementAlignment,
    RoleRelationship,
    RoundVerdict,
    RumbleCell,
    RumbleProjectionRequest,
    RumbleProjectionResponse,
    RumbleRound,
)


_ALIGNMENT_RANK = {
    RequirementAlignment.DOES_NOT_SATISFY: 1,
    RequirementAlignment.PARTIALLY_SATISFIES: 2,
    RequirementAlignment.SATISFIES: 3,
}

_ROUND_NAMES = {
    "capability": "Capability Clash",
    "integration": "Integration Grapple",
    "operations": "Operations Endgame",
    "maturity": "Maturity Main Event",
    "evidence": "Evidence Check",
}


def _slug(value: str) -> str:
    """Create a stable readable round identifier."""
    normalized = re.sub(r"[^a-z0-9]+", "-", value.casefold()).strip("-")
    return normalized or "comparison"


def _can_support_advantage(cell: RumbleCell) -> bool:
    """Return whether a cell can support a contextual advantage."""
    return (
        cell.state is ComparisonState.VALUE
        and cell.alignment in _ALIGNMENT_RANK
        and bool(cell.claim_ids)
    )


def _round_verdict(entrant_a: RumbleCell, entrant_b: RumbleCell) -> RoundVerdict:
    """Compare contextual alignment without treating absent evidence as absence."""
    if not (_can_support_advantage(entrant_a) and _can_support_advantage(entrant_b)):
        return RoundVerdict.INCONCLUSIVE

    a_rank = _ALIGNMENT_RANK[entrant_a.alignment]
    b_rank = _ALIGNMENT_RANK[entrant_b.alignment]
    if a_rank == b_rank:
        return RoundVerdict.TRADE_OFF
    if a_rank > b_rank:
        return RoundVerdict.ENTRANT_A_ADVANTAGE
    return RoundVerdict.ENTRANT_B_ADVANTAGE


def _callout(
    verdict: RoundVerdict,
    entrant_a_name: str,
    entrant_b_name: str,
) -> str:
    """Explain a round result without presenting it as a universal judgment."""
    if verdict is RoundVerdict.ENTRANT_A_ADVANTAGE:
        return (
            f"Contextual edge: {entrant_a_name} aligns more closely with this "
            "round's requirement."
        )
    if verdict is RoundVerdict.ENTRANT_B_ADVANTAGE:
        return (
            f"Contextual edge: {entrant_b_name} aligns more closely with this "
            "round's requirement."
        )
    if verdict is RoundVerdict.TRADE_OFF:
        return "Trade-off round: both projects have the same stated level of contextual fit."
    return "No clean hit: the recorded values or evidence do not justify a contextual edge."


def project_rumble(request: RumbleProjectionRequest) -> RumbleProjectionResponse:
    """Project comparison rows into themed rounds without producing a total score."""
    entrant_a, entrant_b = request.entrants
    shared_roles = set(entrant_a.project_roles) & set(entrant_b.project_roles)
    if shared_roles:
        role_relationship = RoleRelationship.OVERLAPPING
        role_notice = (
            "The projects share at least one recorded role, so direct round comparisons "
            "may be meaningful within the stated Assessment Context."
        )
    else:
        role_relationship = RoleRelationship.DIFFERENT
        role_notice = (
            "The projects have different recorded roles. Treat the rounds as an "
            "adjacent-or-complementary comparison, not proof that one replaces the other."
        )

    rounds = []
    for index, row in enumerate(request.comparison_rows, start=1):
        verdict = _round_verdict(row.entrant_a, row.entrant_b)
        round_name = _ROUND_NAMES.get(row.dimension.casefold(), f"{row.label} Face-off")
        rounds.append(
            RumbleRound(
                round_number=index,
                round_id=f"round-{index}-{_slug(row.dimension)}",
                title=f"Round {index}: {round_name}",
                dimension=row.dimension,
                label=row.label,
                requirement=row.requirement,
                verdict=verdict,
                callout=_callout(verdict, entrant_a.project_name, entrant_b.project_name),
                entrant_a=row.entrant_a,
                entrant_b=row.entrant_b,
            )
        )

    return RumbleProjectionResponse(
        assessment_context=request.assessment_context,
        entrants=request.entrants,
        role_relationship=role_relationship,
        role_notice=role_notice,
        rounds=rounds,
        ring_call=(
            "No universal winner is calculated. Choose the trade-offs that fit this "
            "Assessment Context, then inspect the linked claims and evidence."
        ),
    )
