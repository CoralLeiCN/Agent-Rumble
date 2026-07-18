"""Load and validate the committed Rumble Arena demo bundle."""

import json
from pathlib import Path
from typing import Any

from agent_project_intelligence.models.rumble_demo import RumbleDemoBundle


REPOSITORY_ROOT = Path(__file__).resolve().parents[4]
DEFAULT_DEMO_BUNDLE_PATH = REPOSITORY_ROOT / "fixtures" / "rumble" / "demo_bundle.json"


def _reject_score_and_winner_fields(value: Any, location: str = "$") -> None:
    """Reject fields that could turn the demo into a universal ranking."""
    if isinstance(value, dict):
        for key, nested_value in value.items():
            normalized_key = str(key).casefold()
            if "score" in normalized_key or "winner" in normalized_key:
                raise ValueError(
                    f"demo bundle field '{location}.{key}' is not allowed; "
                    "score and winner fields must be absent"
                )
            _reject_score_and_winner_fields(nested_value, f"{location}.{key}")
    elif isinstance(value, list):
        for index, nested_value in enumerate(value):
            _reject_score_and_winner_fields(nested_value, f"{location}[{index}]")


def parse_demo_bundle(value: Any) -> RumbleDemoBundle:
    """Validate a decoded fixture value as the exact public demo contract."""
    _reject_score_and_winner_fields(value)
    return RumbleDemoBundle.model_validate(value)


def load_demo_bundle(path: Path = DEFAULT_DEMO_BUNDLE_PATH) -> RumbleDemoBundle:
    """Load the repository-root fixture without executing analyzed source code."""
    with path.open(encoding="utf-8") as fixture_file:
        value = json.load(fixture_file)
    return parse_demo_bundle(value)
