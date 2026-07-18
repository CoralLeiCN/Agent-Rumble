from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
from pathlib import Path
from types import ModuleType

import yaml


ROOT = Path(__file__).resolve().parents[3]
SKILL = ROOT / ".agents" / "skills" / "agent-project-card"
PLUGIN = ROOT / "plugins" / "agent-project-card"
MARKETPLACE = ROOT / ".agents" / "plugins" / "marketplace.json"


def load_module(name: str, path: Path) -> ModuleType:
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


validator = load_module(
    "agent_project_card_validator",
    SKILL / "scripts" / "validate_project_card.py",
)
migrator = load_module(
    "agent_project_card_migrator",
    SKILL / "scripts" / "migrate_v01_card.py",
)


def valid_card() -> dict:
    return {
        "schema_version": "0.2",
        "card_id": "card-example",
        "card_version": 1,
        "field_states": {},
        "project": {
            "project_id": "project-example",
            "name": "Example",
            "primary_type": "agent_framework_sdk",
            "type_rationale": "Provides an SDK for agent applications.",
            "boundary": "The root package in the primary repository.",
            "repositories": [
                {
                    "source_id": "source-repository-1",
                    "url": "https://github.com/example/example",
                    "owner": "example",
                    "role": "primary",
                    "included_paths": ["src"],
                    "excluded_paths": ["vendor"],
                }
            ],
            "packages": ["example"],
            "services": [],
            "documentation_sites": [],
            "license": "Apache-2.0",
            "status": "active",
        },
        "source_snapshot": {
            "analyzed_at": "2026-07-18T12:00:00Z",
            "source_revisions": [
                {
                    "source_id": "source-repository-1",
                    "branch": "main",
                    "tag": "v1.0.0",
                    "commit": "0123456789abcdef",
                    "retrieved_at": "2026-07-18T12:00:00Z",
                    "content_digest": "sha256:example",
                }
            ],
            "release_versions": ["1.0.0"],
            "analysis_depth": "targeted",
            "analysis_configuration": {"dynamic_analysis": False},
            "analyzer_version": "agent-project-card-skill/0.1",
            "ontology_versions": {
                "classification": "0.1",
                "capabilities": "0.1",
            },
        },
        "summary": {
            "one_line": "An example SDK for building agents.",
            "purpose": "Demonstrate a valid Agent Project Card.",
            "target_users": ["Agent developers"],
            "primary_use_cases": ["Build an agent application"],
        },
        "classification": {
            "secondary_characteristics": ["library"],
            "domains": ["general purpose"],
            "delivery_forms": ["open-source library"],
            "agent_patterns": ["tool use"],
            "architecture_layers": ["agent logic"],
            "claim_ids": ["claim-001"],
        },
        "capabilities": [
            {
                "capability_id": "capability-001",
                "ontology_id": "capability:tool-calling",
                "name": "Tool calling",
                "description": "Registers and invokes typed tools.",
                "support_status": "statically_confirmed",
                "evidence_status": "confirmed",
                "scope": "Python SDK",
                "interfaces": ["Python API"],
                "prerequisites": [],
                "configuration_requirements": [],
                "limitations": [],
                "confidence": "high",
                "claim_ids": ["claim-001"],
                "evidence_refs": ["evidence-001"],
            }
        ],
        "architecture": {
            "overview": "A Python package exposing an agent SDK.",
            "languages": ["Python"],
            "frameworks_and_sdks": [],
            "model_providers": [],
            "runtime_and_orchestration": [],
            "tools_and_mcp": {"tools": [], "mcp_role": "none", "mcp_details": []},
            "skills": [],
            "memory_and_state": [],
            "retrieval_and_knowledge": [],
            "document_processing": [],
            "execution_and_sandbox": [],
            "gateways_and_routing": [],
            "storage_and_databases": [],
            "interfaces": ["Python API"],
            "deployment": [],
            "observability_and_evaluation": [],
            "security_and_permissions": [],
            "data_flows": ["User input flows to the agent runtime."],
            "control_flows": ["The runtime selects a registered tool."],
        },
        "components": [
            {
                "component_id": "component-001",
                "name": "Runtime",
                "path": "src/example/runtime.py",
                "project_type": "agent_harness_runtime",
                "purpose": "Run an agent loop.",
                "claim_ids": ["claim-001"],
            }
        ],
        "usage": {
            "installation": "Install the example package.",
            "minimal_start": "Create an agent and run it.",
            "configuration": [],
            "required_services": [],
            "extension_points": ["Registered tools"],
        },
        "assessment": {
            "contexts": [
                {
                    "context_id": "context-001",
                    "use_case": "general_project_assessment",
                    "comparison_cohort": [],
                    "requirements": [],
                    "organizational_constraints": [],
                    "assessed_at": "2026-07-18T12:00:00Z",
                }
            ],
            "maturity": "early",
            "maturity_signals": [],
            "strengths": [],
            "limitations": [],
            "risks": [],
            "best_fit": [],
            "poor_fit": [],
            "gaps": [],
        },
        "relationships": {
            "depends_on": [],
            "integrates_with": [],
            "comparable_projects": [],
        },
        "claims": [
            {
                "claim_id": "claim-001",
                "statement": "The SDK supports typed tool calling.",
                "claim_kind": "factual",
                "verification_status": "statically_confirmed",
                "confidence": "high",
                "applies_to": "project-example",
                "assessment_context_id": "context-001",
                "supporting_evidence_ids": ["evidence-001"],
                "conflicting_evidence_ids": [],
                "reasoning": "The public registration API and invocation path are present.",
                "last_verified_at": "2026-07-18T12:00:00Z",
            }
        ],
        "sources": [
            {
                "source_id": "source-repository-1",
                "source_type": "repository",
                "provenance": "first_party",
                "uri": "https://github.com/example/example",
                "revision_or_version": "0123456789abcdef",
                "retrieved_at": "2026-07-18T12:00:00Z",
                "content_digest": "sha256:example",
                "access_scope": "public",
            }
        ],
        "evidence": [
            {
                "evidence_id": "evidence-001",
                "source_id": "source-repository-1",
                "locator": {
                    "path": "src/example/tools.py",
                    "symbol_or_section": "register_tool",
                    "line_start": 10,
                    "line_end": 20,
                },
                "evidence_status": "confirmed",
                "confidence": "high",
                "excerpt_or_symbol": "register_tool",
                "note": "The function registers typed tools.",
            }
        ],
        "open_questions": [],
    }


def v01_card() -> dict:
    return {
        "schema_version": "0.1",
        "project": {
            "name": "Example",
            "primary_type": "agent_framework_sdk",
            "type_rationale": "Provides an SDK for agent applications.",
            "repository_url": "https://github.com/example/example",
            "repository_owner": "example",
            "analyzed_revision": {
                "branch": "main",
                "tag": "v1.0.0",
                "commit": "0123456789abcdef",
            },
            "analyzed_at": "2026-07-18T12:00:00Z",
            "license": "Apache-2.0",
            "status": "active",
        },
        "summary": {
            "one_line": "An example SDK for building agents.",
            "purpose": "Demonstrate migration.",
            "target_users": ["Agent developers"],
            "primary_use_cases": ["Build an agent application"],
        },
        "classification": {
            "secondary_characteristics": ["library"],
            "domains": ["general purpose"],
            "delivery_forms": ["open-source library"],
            "agent_patterns": ["tool use"],
        },
        "capabilities": [
            {
                "name": "Tool calling",
                "description": "Registers and invokes typed tools.",
                "evidence_status": "confirmed",
                "confidence": "high",
                "evidence_refs": ["E1"],
            }
        ],
        "architecture": {
            "overview": "A Python package exposing an agent SDK.",
            "languages": ["Python"],
            "frameworks_and_sdks": [],
            "model_providers": [],
            "runtime_and_orchestration": [],
            "tools_and_mcp": {"tools": [], "mcp_role": "none", "mcp_details": []},
            "skills": [],
            "memory_and_state": [],
            "retrieval_and_knowledge": [],
            "document_processing": [],
            "execution_and_sandbox": [],
            "gateways_and_routing": [],
            "storage_and_databases": [],
            "interfaces": ["Python API"],
            "deployment": [],
            "observability_and_evaluation": [],
            "security_and_permissions": [],
        },
        "components": [
            {
                "name": "Runtime",
                "path": "src/example/runtime.py",
                "project_type": "agent_harness_runtime",
                "purpose": "Run an agent loop.",
            }
        ],
        "usage": {
            "installation": "Install the example package.",
            "minimal_start": "Create an agent and run it.",
            "configuration": [],
            "required_services": [],
            "extension_points": ["Registered tools"],
        },
        "assessment": {
            "maturity": "early",
            "maturity_signals": ["The project publishes releases."],
            "strengths": [],
            "limitations": [],
            "risks": [],
            "best_fit": [],
            "poor_fit": [],
        },
        "relationships": {
            "depends_on": [],
            "integrates_with": [],
            "comparable_projects": [],
        },
        "open_questions": [],
        "evidence": [
            {
                "id": "E1",
                "claim": "The SDK supports typed tool calling.",
                "source_path": "src/example/tools.py",
                "symbol_or_section": "register_tool",
                "evidence_status": "confirmed",
                "confidence": "high",
                "note": "The public registration API is present.",
            }
        ],
    }


def test_schema_and_semantic_validation_accept_valid_card() -> None:
    card = valid_card()
    schema = json.loads(
        (SKILL / "references" / "project-card.schema.json").read_text(encoding="utf-8")
    )

    assert validator.schema_errors(card, schema) == []
    assert validator.semantic_errors(card) == []


def test_card_version_is_required_and_positive() -> None:
    schema = json.loads(
        (SKILL / "references" / "project-card.schema.json").read_text(encoding="utf-8")
    )
    missing_version = valid_card()
    missing_version.pop("card_version")
    invalid_version = valid_card()
    invalid_version["card_version"] = 0

    assert validator.schema_errors(missing_version, schema)
    assert validator.schema_errors(invalid_version, schema)


def test_skill_defines_tracked_card_version_lineage() -> None:
    skill = (SKILL / "SKILL.md").read_text(encoding="utf-8")
    contract = (SKILL / "references" / "analysis-contract.md").read_text(
        encoding="utf-8"
    )

    for required_text in (
        "`card_version: 1`",
        "preserve `card_id`",
        "next integer as `card_version`",
        "Never reuse a prior card version",
        "Keep `card_version` separate from `schema_version`",
    ):
        assert required_text in f"{skill}\n{contract}"


def test_marketplace_plugin_packages_the_repository_skill() -> None:
    manifest = json.loads(
        (PLUGIN / ".codex-plugin" / "plugin.json").read_text(encoding="utf-8")
    )
    marketplace = json.loads(MARKETPLACE.read_text(encoding="utf-8"))
    entry = next(item for item in marketplace["plugins"] if item["name"] == manifest["name"])

    assert SKILL.is_symlink()
    assert SKILL.resolve() == (PLUGIN / "skills" / "agent-project-card").resolve()
    assert manifest["name"] == "agent-project-card"
    assert manifest["version"] == "0.1.0"
    assert manifest["skills"] == "./skills/"
    assert "Local developer" not in json.dumps(manifest)
    assert entry["source"]["path"] == "./plugins/agent-project-card"
    assert entry["policy"] == {
        "installation": "AVAILABLE",
        "authentication": "ON_INSTALL",
    }


def test_skill_symlink_and_plugin_namespace_are_documented() -> None:
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    design = (ROOT / "docs" / "design-docs" / "system-design.md").read_text(
        encoding="utf-8"
    )

    for document in (readme, design):
        assert ".agents/skills/agent-project-card" in document
        assert "../../plugins/agent-project-card/skills/agent-project-card" in document
        assert "agent-project-card:agent-project-card" in document
        assert "<plugin-name>:<skill-name>" in document


def test_skill_script_commands_are_plugin_portable() -> None:
    skill = (SKILL / "SKILL.md").read_text(encoding="utf-8")
    validator_script = (SKILL / "scripts" / "validate_project_card.py").read_text(
        encoding="utf-8"
    )
    migrator_script = (SKILL / "scripts" / "migrate_v01_card.py").read_text(
        encoding="utf-8"
    )

    assert "uv run --script <skill-directory>" in skill
    assert ".agents/skills/agent-project-card/scripts" not in skill
    assert "jsonschema==4.26.0" in validator_script
    assert "pyyaml==6.0.3" in validator_script
    assert "pyyaml==6.0.3" in migrator_script


def test_semantic_validation_rejects_dangling_capability_evidence() -> None:
    card = valid_card()
    card["capabilities"][0]["evidence_refs"] = ["missing-evidence"]

    assert any("unknown evidence identifier" in error for error in validator.semantic_errors(card))


def test_v01_migration_produces_a_valid_v02_card() -> None:
    card, warnings = migrator.migrate(v01_card())
    schema = json.loads(
        (SKILL / "references" / "project-card.schema.json").read_text(encoding="utf-8")
    )

    assert warnings
    assert card["schema_version"] == "0.2"
    assert card["claims"][0]["verification_status"] == "statically_confirmed"
    assert validator.schema_errors(card, schema) == []
    assert validator.semantic_errors(card) == []


def test_migration_and_validation_cli(tmp_path: Path) -> None:
    source = tmp_path / "v01-card.yaml"
    output = tmp_path / "project-card.yaml"
    source.write_text(yaml.safe_dump(v01_card(), sort_keys=False), encoding="utf-8")

    migration = subprocess.run(
        [
            sys.executable,
            str(SKILL / "scripts" / "migrate_v01_card.py"),
            str(source),
            "--output",
            str(output),
        ],
        check=False,
        capture_output=True,
        text=True,
    )
    validation = subprocess.run(
        [
            sys.executable,
            str(SKILL / "scripts" / "validate_project_card.py"),
            str(output),
        ],
        check=False,
        capture_output=True,
        text=True,
    )

    assert migration.returncode == 0, migration.stderr
    assert validation.returncode == 0, validation.stderr


def test_card_summary_template_preserves_canonical_semantics() -> None:
    template = (SKILL / "assets" / "card-summary-template.md").read_text(encoding="utf-8")
    skill = (SKILL / "SKILL.md").read_text(encoding="utf-8")

    required_content = (
        "# Agent Project Card Summary:",
        "canonical Agent Project Card",
        "card_id",
        "card_version",
        "schema_version",
        "Project boundary",
        "Analysis depth",
        "Support status",
        "Verification",
        "Evidence status",
        "Assessment Context",
        "Limitations",
        "Risks",
        "Relationships",
        "Supporting evidence",
        "Conflicting evidence",
        "Source Index",
        "Unknown",
        "Not applicable",
        "Not analyzed",
        "No evidence found at",
    )

    assert all(content in template for content in required_content)
    assert "Confirmed / documented / inferred" not in template
    assert "assets/card-summary-template.md" in skill
    assert "project-card-summary.md" in skill
