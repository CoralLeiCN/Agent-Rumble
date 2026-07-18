"""Reusable request payloads for Rumble Arena tests."""

from copy import deepcopy
from typing import Any


def rumble_payload() -> dict[str, Any]:
    """Return a complete evidence-backed projection request."""
    return deepcopy(
        {
            "assessment_context": {
                "title": "Internal support agent proof of concept",
                "use_case": "Build a Python support agent with approval and tracing.",
                "cohort_project_ids": ["project-a", "project-b"],
                "requirements": [
                    "Human approval support",
                    "Self-hosted operation",
                ],
                "organizational_constraints": ["No mandatory hosted control plane"],
                "assessed_at": "2026-07-18",
            },
            "entrants": [
                {
                    "project_id": "project-a",
                    "project_name": "Project Alpha",
                    "project_roles": ["agent_framework"],
                    "source_snapshot": {
                        "card_id": "card-a",
                        "card_version": 2,
                        "revision": "a1b2c3d4",
                        "analyzed_at": "2026-07-17T10:00:00Z",
                    },
                },
                {
                    "project_id": "project-b",
                    "project_name": "Project Beta",
                    "project_roles": ["agent_framework"],
                    "source_snapshot": {
                        "card_id": "card-b",
                        "card_version": 1,
                        "revision": "e5f6a7b8",
                        "analyzed_at": "2026-07-16T09:30:00Z",
                    },
                },
            ],
            "comparison_rows": [
                {
                    "dimension": "capability",
                    "label": "Human approval",
                    "requirement": "Pause tool execution for human approval.",
                    "entrant_a": {
                        "state": "value",
                        "value": "Approval hooks are statically confirmed.",
                        "alignment": "satisfies",
                        "verification_status": "statically_confirmed",
                        "confidence": "high",
                        "claim_ids": ["claim-a-approval"],
                    },
                    "entrant_b": {
                        "state": "value",
                        "value": "An approval workflow is documented with constraints.",
                        "alignment": "partially_satisfies",
                        "verification_status": "documented",
                        "confidence": "medium",
                        "claim_ids": ["claim-b-approval"],
                    },
                },
                {
                    "dimension": "operations",
                    "label": "Deployment",
                    "requirement": "Run without a mandatory hosted control plane.",
                    "entrant_a": {
                        "state": "value",
                        "value": "Self-hosted use is documented.",
                        "alignment": "satisfies",
                        "verification_status": "documented",
                        "confidence": "medium",
                        "claim_ids": ["claim-a-hosting"],
                    },
                    "entrant_b": {
                        "state": "value",
                        "value": "Self-hosted use is statically confirmed.",
                        "alignment": "satisfies",
                        "verification_status": "statically_confirmed",
                        "confidence": "high",
                        "claim_ids": ["claim-b-hosting"],
                    },
                },
                {
                    "dimension": "integration",
                    "label": "Trace export",
                    "requirement": "Export traces to the existing observability stack.",
                    "entrant_a": {
                        "state": "no_evidence_found",
                        "alignment": "unclear",
                        "verification_status": "unverified",
                        "confidence": "unknown",
                        "claim_ids": [],
                    },
                    "entrant_b": {
                        "state": "value",
                        "value": "A trace exporter is statically confirmed.",
                        "alignment": "satisfies",
                        "verification_status": "statically_confirmed",
                        "confidence": "high",
                        "claim_ids": ["claim-b-tracing"],
                    },
                },
            ],
        }
    )

