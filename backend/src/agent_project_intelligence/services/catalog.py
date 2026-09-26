"""Catalog retrieval, deterministic search, evidence, and comparison services."""

from __future__ import annotations

import re
from collections.abc import Mapping
from datetime import datetime
from typing import Any
from urllib.parse import quote, urlsplit

from agent_project_intelligence.api.errors import CatalogAPIError
from agent_project_intelligence.api.identifier_references import (
    identifiers_equal,
    normalize_scalar_identifier,
)
from agent_project_intelligence.api.models.catalog import (
    CatalogContextResponse,
    ComparisonRequest,
    ComparisonResponse,
    EvidenceResponse,
    SearchRequest,
    SearchResponse,
)
from agent_project_intelligence.catalog.models import CatalogCard, CatalogSnapshot, thaw_value
from agent_project_intelligence.services.catalog_comparison import compare_cards
from agent_project_intelligence.services.catalog_fields import (
    _at,
    _mapping,
    _normalized_instant,
    _sequence,
)
from agent_project_intelligence.services.catalog_search import CatalogSearch

_GITHUB_COMMIT = re.compile(r"^[0-9a-fA-F]{7,64}$")


class CatalogService:
    """Retrieve pinned cards and expose projections of one immutable snapshot."""

    def __init__(
        self,
        snapshot: CatalogSnapshot,
        *,
        now: datetime | None = None,
        catalog_id: str = "agent-rumble-public-catalog",
        catalog_label: str = "Development catalog",
    ) -> None:
        self._snapshot = snapshot
        self._catalog_id = catalog_id
        self._catalog_label = catalog_label
        self._search = CatalogSearch(snapshot.list_current(), now=now)

    def catalog_context(self) -> CatalogContextResponse:
        """Describe the deployed cohort and its freshness bounds."""
        documents = [card.document for card in self._snapshot.list_current()]
        analyzed_at = sorted(
            (
                value
                for document in documents
                if (value := _at(document, "source_snapshot", "analyzed_at"))
                and isinstance(value, str)
            ),
            key=lambda value: _normalized_instant(value) or "",
        )
        schema_versions = sorted({str(document.get("schema_version")) for document in documents})
        ontology_versions: set[str] = set()
        for document in documents:
            versions = _mapping(_at(document, "source_snapshot", "ontology_versions", default={}))
            for name, version in versions.items():
                if version is not None:
                    ontology_versions.add(f"{name}:{version}")

        return CatalogContextResponse(
            catalog_id=self._catalog_id,
            label=self._catalog_label,
            cohort_description=(
                "Operator-preprocessed Agent Project Cards for the public GitHub "
                "projects available in this deployment."
            ),
            coverage=[
                "Validated canonical Agent Project Card schema v0.3 artifacts",
                "Static analysis at pinned public source snapshots",
                "Python and TypeScript agent projects and supporting components",
            ],
            exclusions=[
                "User-submitted repository analysis",
                "Live repository state and continuous monitoring",
                "Runtime verification unless a card explicitly records it",
                "Universal project quality scoring",
            ],
            card_count=self._snapshot.project_count,
            schema_versions=schema_versions,
            ontology_versions=sorted(ontology_versions),
            oldest_analyzed_at=analyzed_at[0] if analyzed_at else None,
            newest_analyzed_at=analyzed_at[-1] if analyzed_at else None,
        )

    def current_card(self, project_id: str) -> dict[str, Any]:
        """Return the exact current canonical card document."""
        self._validate_identifier(project_id, "project_id")
        card = self._snapshot.get_current(project_id)
        if card is None:
            card = next(
                (
                    candidate
                    for candidate in self._snapshot.list_current()
                    if identifiers_equal(candidate.project_id, project_id)
                ),
                None,
            )
        if card is None:
            raise self._not_found(project_id)
        return card.to_document()

    def card(self, project_id: str, card_version: int) -> dict[str, Any]:
        """Return the exact pinned canonical card document."""
        self._validate_identifier(project_id, "project_id")
        card = self._get_card(project_id, card_version)
        return card.to_document()

    def evidence(
        self,
        project_id: str,
        card_version: int,
        evidence_id: str,
    ) -> EvidenceResponse:
        """Resolve Evidence to related Claims, Source, and pinned revision."""
        self._validate_identifier(project_id, "project_id")
        self._validate_identifier(evidence_id, "evidence_id")
        card = self._get_card(project_id, card_version)
        document = card.document

        evidence = next(
            (
                item
                for item in _sequence(document.get("evidence"))
                if isinstance(item, Mapping)
                and isinstance(item.get("evidence_id"), str)
                and identifiers_equal(str(item.get("evidence_id")), evidence_id)
            ),
            None,
        )
        if evidence is None:
            raise CatalogAPIError(
                404,
                "evidence_not_found",
                "The requested evidence does not exist in the pinned card.",
                details={
                    "project_id": project_id,
                    "card_version": card_version,
                    "evidence_id": evidence_id,
                },
            )

        source_id = evidence.get("source_id")
        source = next(
            (
                item
                for item in _sequence(document.get("sources"))
                if isinstance(item, Mapping) and item.get("source_id") == source_id
            ),
            None,
        )
        revision = next(
            (
                item
                for item in _sequence(_at(document, "source_snapshot", "source_revisions"))
                if isinstance(item, Mapping) and item.get("source_id") == source_id
            ),
            None,
        )
        # File/document sources carry their own immutable revision; only repository
        # roots must also appear in source_snapshot.source_revisions.
        if revision is None and source is not None and source.get("source_type") != "repository":
            source_revision = source.get("revision_or_version")
            revision = {
                "source_id": source_id,
                "commit": source_revision
                if isinstance(source_revision, str) and _GITHUB_COMMIT.fullmatch(source_revision)
                else None,
                "version": source_revision,
                "retrieved_at": source.get("retrieved_at"),
                "content_digest": source.get("content_digest"),
            }
        # Validation should make these links total. A typed server-side contract
        # error is still safer than returning a partial provenance chain.
        if source is None or revision is None:
            raise CatalogAPIError(
                500,
                "catalog_reference_error",
                "The validated card contains an unresolved evidence provenance link.",
                details={"evidence_id": evidence_id, "source_id": source_id},
            )

        resolved_evidence_id = str(evidence.get("evidence_id"))
        related_claims = [
            claim
            for claim in _sequence(document.get("claims"))
            if isinstance(claim, Mapping)
            and any(
                isinstance(candidate, str) and identifiers_equal(candidate, resolved_evidence_id)
                for candidate in (
                    list(_sequence(claim.get("supporting_evidence_ids")))
                    + list(_sequence(claim.get("conflicting_evidence_ids")))
                )
            )
        ]
        locator = _mapping(evidence.get("locator"))
        return EvidenceResponse(
            project_id=card.project_id,
            card_id=card.card_id,
            card_version=card.card_version,
            evidence=thaw_value(evidence),
            related_claims=[thaw_value(claim) for claim in related_claims],
            source=thaw_value(source),
            source_revision=thaw_value(revision),
            locator=thaw_value(locator),
            source_url=self._safe_source_url(source, revision, locator),
        )

    def _safe_source_url(
        self,
        source: Mapping[str, Any],
        revision: Mapping[str, Any],
        locator: Mapping[str, Any],
    ) -> str | None:
        if (
            source.get("source_type") not in {"repository", "repository_file"}
            or source.get("access_scope") != "public"
        ):
            return None
        uri = source.get("uri")
        commit = revision.get("commit")
        path = locator.get("path")
        if not isinstance(uri, str) or not isinstance(commit, str) or not isinstance(path, str):
            return None
        try:
            parsed = urlsplit(uri)
            port = parsed.port
        except ValueError:
            return None
        segments = [segment for segment in parsed.path.removesuffix(".git").split("/") if segment]
        if source.get("source_type") == "repository_file":
            if len(segments) < 5 or segments[2] not in {"blob", "tree"} or segments[3] != commit:
                return None
            segments = segments[:2]
        if (
            parsed.scheme != "https"
            or parsed.hostname != "github.com"
            or parsed.username is not None
            or parsed.password is not None
            or port is not None
            or parsed.query
            or parsed.fragment
            or len(segments) != 2
            or not _GITHUB_COMMIT.fullmatch(commit)
            or not self._safe_locator_path(path)
        ):
            return None
        base = f"https://github.com/{quote(segments[0], safe='')}/{quote(segments[1], safe='')}"
        url = f"{base}/blob/{commit}/{quote(path, safe='/')}"
        start = locator.get("line_start")
        end = locator.get("line_end")
        if isinstance(start, int) and start > 0:
            url += f"#L{start}"
            if isinstance(end, int) and end >= start:
                url += f"-L{end}"
        return url

    def _safe_locator_path(self, path: str) -> bool:
        if not path or path.startswith(("/", "\\")) or "\\" in path:
            return False
        if any(ord(character) < 32 for character in path):
            return False
        return all(segment not in {"", ".", ".."} for segment in path.split("/"))

    def _get_card(self, project_id: str, card_version: int) -> CatalogCard:
        self._validate_identifier(project_id, "project_id")
        if card_version < 1:
            raise CatalogAPIError(
                400,
                "invalid_card_version",
                "card_version must be a positive integer.",
                details={"card_version": card_version},
            )
        card = self._snapshot.get(project_id, card_version)
        if card is None:
            card = next(
                (
                    candidate
                    for candidate in self._snapshot.cards
                    if candidate.card_version == card_version
                    and identifiers_equal(candidate.project_id, project_id)
                ),
                None,
            )
        if card is None:
            raise self._not_found(project_id, card_version)
        return card

    def _validate_identifier(self, value: str, field: str) -> None:
        try:
            if value == "":
                raise ValueError("identifier is empty")
            normalize_scalar_identifier(value)
        except ValueError:
            raise CatalogAPIError(
                400,
                "invalid_identifier",
                f"{field} is not a valid catalog identifier.",
                details={"field": field},
            ) from None

    def _not_found(
        self,
        project_id: str,
        card_version: int | None = None,
    ) -> CatalogAPIError:
        details: dict[str, Any] = {"project_id": project_id}
        if card_version is not None:
            details["card_version"] = card_version
        return CatalogAPIError(
            404,
            "card_not_found",
            "The requested Agent Project Card was not found.",
            details=details,
        )

    def search(self, request: SearchRequest) -> SearchResponse:
        """Search the current-card index."""
        return self._search.search(request)

    def compare(self, request: ComparisonRequest) -> ComparisonResponse:
        """Compare validated pinned references in the requested context."""
        cards = [self._get_card(ref.project_id, ref.card_version) for ref in request.cards]
        return compare_cards(cards, request.assessment_context)
