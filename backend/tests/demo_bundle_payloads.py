"""Reusable decoded fixture values for Rumble demo tests."""

from copy import deepcopy
from typing import Any

from .rumble_payloads import rumble_payload


def demo_bundle_payload() -> dict[str, Any]:
    """Return a complete bundle whose claims resolve to pinned evidence."""
    request = rumble_payload()
    snapshots = {
        entrant["project_id"]: entrant["source_snapshot"]["revision"]
        for entrant in request["entrants"]
    }
    claim_specs = [
        (
            "claim-a-approval",
            "project-a",
            "Approval hooks are present.",
            "statically_confirmed",
            "high",
        ),
        (
            "claim-b-approval",
            "project-b",
            "An approval workflow is documented.",
            "documented",
            "medium",
        ),
        (
            "claim-a-hosting",
            "project-a",
            "Self-hosted use is documented.",
            "documented",
            "medium",
        ),
        (
            "claim-b-hosting",
            "project-b",
            "Self-hosted use is statically confirmed.",
            "statically_confirmed",
            "high",
        ),
        (
            "claim-b-tracing",
            "project-b",
            "A trace exporter is statically confirmed.",
            "statically_confirmed",
            "high",
        ),
    ]
    claims = []
    for claim_id, project_id, statement, verification_status, confidence in claim_specs:
        evidence_id = f"evidence-{claim_id}"
        claims.append(
            {
                "claim_id": claim_id,
                "project_id": project_id,
                "statement": statement,
                "why_it_matters": "It informs this prepared comparison round.",
                "verification_status": verification_status,
                "confidence": confidence,
                "supporting_evidence": [
                    {
                        "evidence_id": evidence_id,
                        "repository": f"example/{project_id}",
                        "revision": snapshots[project_id],
                        "path": "README.md",
                        "locator": "README.md#example",
                        "excerpt": "A short first-party source fragment.",
                        "source_url": (
                            f"https://github.com/example/{project_id}/blob/"
                            f"{snapshots[project_id]}/README.md"
                        ),
                    }
                ],
                "conflicting_evidence": [],
            }
        )

    return deepcopy(
        {
            "fixture_label": "Two-project static-analysis demo",
            "prepared_at": "2026-07-18T12:00:00Z",
            "coverage_notice": (
                "Prepared evidence covers this demo context, not every project capability."
            ),
            "matchups": [
                {
                    "matchup_id": "project-a-vs-project-b",
                    "display_label": "Project Alpha vs Project Beta",
                    "request": request,
                    "claims": claims,
                }
            ],
        }
    )
