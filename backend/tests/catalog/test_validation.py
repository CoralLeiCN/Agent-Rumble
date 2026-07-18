"""Contract tests for the repository-local skill validation adapter."""

from copy import deepcopy
from pathlib import Path

import pytest
import yaml

from agent_project_intelligence.catalog.validation import (
    CardValidationError,
    SkillCardValidator,
)
from agent_project_intelligence.config import REPOSITORY_ROOT


BIOAGENTS_CARD = (
    REPOSITORY_ROOT / "project-cards" / "bio-xyz--BioAgents" / "project-card.yaml"
)


def load_bioagents_card() -> dict[str, object]:
    document = yaml.safe_load(BIOAGENTS_CARD.read_text(encoding="utf-8"))
    assert isinstance(document, dict)
    return document


def test_skill_validator_accepts_card_without_transforming_it() -> None:
    document = load_bioagents_card()
    original = deepcopy(document)

    validated = SkillCardValidator().validate(document)

    assert validated.document == original
    assert validated.card_id == "card-bio-xyz-bioagents"
    assert validated.card_version == 1
    assert validated.project_id == "project-bio-xyz-bioagents"
    assert validated.schema_version == "0.2"


def test_skill_validator_reports_schema_and_semantic_findings() -> None:
    document = load_bioagents_card()
    document["project"]["project_id"] = 42  # type: ignore[index]

    with pytest.raises(CardValidationError) as caught:
        SkillCardValidator().validate(document)

    assert caught.value.errors
    assert any("/project/project_id" in error for error in caught.value.errors)


def test_skill_validator_rejects_dangling_references() -> None:
    document = load_bioagents_card()
    document["classification"]["claim_ids"].append("claim-does-not-exist")  # type: ignore[index,union-attr]

    with pytest.raises(CardValidationError) as caught:
        SkillCardValidator().validate(document)

    assert len(caught.value.errors) == 1
    assert caught.value.errors[0].startswith("/classification/claim_ids/")
    assert caught.value.errors[0].endswith(
        ": unknown claim identifier 'claim-does-not-exist'"
    )


def test_skill_validator_normalizes_surrogate_pairs_in_document_and_ids() -> None:
    document = load_bioagents_card()
    pair = "\ud83d\ude80"
    document["card_id"] = f"card-{pair}"
    document["project"]["project_id"] = f"project-{pair}"  # type: ignore[index]
    document["summary"]["one_line"] = f"Launch {pair}"  # type: ignore[index]

    validated = SkillCardValidator().validate(document)

    assert validated.card_id == "card-\U0001F680"
    assert validated.project_id == "project-\U0001F680"
    assert validated.document["summary"]["one_line"] == "Launch \U0001F680"
    assert document["card_id"] == f"card-{pair}"


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("bad-\ud83d", "lone high surrogate U+D83D"),
        ("bad-\ude80", "lone low surrogate U+DE80"),
    ],
)
def test_skill_validator_rejects_lone_surrogate_values(
    value: str,
    expected: str,
) -> None:
    document = load_bioagents_card()
    document["summary"]["one_line"] = value  # type: ignore[index]

    with pytest.raises(CardValidationError) as caught:
        SkillCardValidator().validate(document)

    assert caught.value.errors == (
        f"/summary/one_line: string value contains {expected} at string index 4",
    )


def test_skill_validator_rejects_lone_surrogate_object_key() -> None:
    document = load_bioagents_card()
    key = "bad-\ud83d"
    document["source_snapshot"]["analysis_configuration"][key] = True  # type: ignore[index]

    with pytest.raises(CardValidationError) as caught:
        SkillCardValidator().validate(document)

    assert caught.value.errors == (
        "/source_snapshot/analysis_configuration: object key "
        f"{ascii(key)} contains lone high surrogate U+D83D at string index 4",
    )


def test_skill_validator_rejects_key_collision_created_by_normalization() -> None:
    document = load_bioagents_card()
    pair_key = "\ud83d\ude80"
    literal_key = "\U0001F680"
    configuration = document["source_snapshot"]["analysis_configuration"]  # type: ignore[index]
    configuration[pair_key] = "pair"  # type: ignore[index]
    configuration[literal_key] = "literal"  # type: ignore[index]

    with pytest.raises(CardValidationError) as caught:
        SkillCardValidator().validate(document)

    assert caught.value.errors == (
        "/source_snapshot/analysis_configuration: Unicode scalar normalization causes "
        f"object key collision between {ascii(pair_key)} and {ascii(literal_key)} as "
        f"{ascii(literal_key)}",
    )


def test_skill_validator_preserves_existing_astral_scalar_exactly() -> None:
    document = load_bioagents_card()
    document["summary"]["one_line"] = "Launch \U0001F680"  # type: ignore[index]

    validated = SkillCardValidator().validate(document)

    assert validated.document["summary"]["one_line"] == "Launch \U0001F680"
