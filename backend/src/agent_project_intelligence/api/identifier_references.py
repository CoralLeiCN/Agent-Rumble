"""Reversible single-segment references for canonical card identifiers.

Canonical Agent Project Card identifiers are nonempty interoperable JSON
strings composed of Unicode scalar values.
Putting those strings directly into URL paths creates delimiter ambiguity. The
HTTP transport therefore represents every official-client identifier as ``~``
followed by unpadded RFC 4648 base64url of the UTF-8 JSON string representation
(``JSON.stringify`` in JavaScript). Valid Python surrogate-pair artifacts are
normalized to their scalar value. Residual lone surrogates are rejected because
they do not have a reversible Unicode-scalar identity across JSON runtimes.

Non-prefixed, single-segment identifiers remain accepted for compatibility.
"""

from __future__ import annotations

import base64
import binascii
import json
import re

from agent_project_intelligence.api.errors import CatalogAPIError


OPAQUE_IDENTIFIER_PREFIX = "~"
_BASE64URL_PAYLOAD = re.compile(r"^[A-Za-z0-9_-]+$")


def encode_identifier_reference(identifier: str) -> str:
    """Encode one nonempty canonical identifier as an opaque path segment."""
    if not isinstance(identifier, str) or identifier == "":
        raise ValueError("identifier must be a nonempty string")
    identifier = normalize_scalar_identifier(identifier)
    serialized = json.dumps(
        identifier,
        ensure_ascii=False,
        separators=(",", ":"),
    ).encode("utf-8", errors="strict")
    payload = base64.urlsafe_b64encode(serialized).decode("ascii").rstrip("=")
    return f"{OPAQUE_IDENTIFIER_PREFIX}{payload}"


def decode_identifier_reference(reference: str, *, field: str) -> str:
    """Decode a canonical opaque reference or pass through a legacy segment."""
    if not reference.startswith(OPAQUE_IDENTIFIER_PREFIX):
        return reference

    payload = reference[len(OPAQUE_IDENTIFIER_PREFIX) :]
    try:
        if not payload or not _BASE64URL_PAYLOAD.fullmatch(payload):
            raise ValueError("invalid base64url payload")
        padding = "=" * (-len(payload) % 4)
        serialized = base64.b64decode(
            f"{payload}{padding}",
            altchars=b"-_",
            validate=True,
        ).decode("utf-8", errors="strict")
        identifier = json.loads(serialized)
        if not isinstance(identifier, str) or identifier == "":
            raise ValueError("payload must contain a nonempty JSON string")
        if encode_identifier_reference(identifier) != reference:
            raise ValueError("identifier reference is not canonical")
    except (binascii.Error, UnicodeDecodeError, json.JSONDecodeError, ValueError) as error:
        raise CatalogAPIError(
            400,
            "invalid_identifier_reference",
            f"{field} is not a valid opaque identifier reference.",
            details={"field": field},
        ) from error
    return identifier


def identifier_comparison_key(identifier: str) -> bytes:
    """Return the JavaScript/JSON UTF-16 code-unit identity of a string."""
    return identifier.encode("utf-16-be", errors="surrogatepass")


def identifiers_equal(left: str, right: str) -> bool:
    """Compare scalar and explicit-surrogate representations by JSON meaning."""
    return identifier_comparison_key(left) == identifier_comparison_key(right)


def normalize_scalar_identifier(identifier: str) -> str:
    """Normalize valid host-artifact pairs and reject every residual surrogate."""
    normalized = _normalize_surrogate_pairs(identifier)
    if any(0xD800 <= ord(character) <= 0xDFFF for character in normalized):
        raise ValueError("identifier contains a lone surrogate code point")
    return normalized


def _normalize_surrogate_pairs(identifier: str) -> str:
    """Combine valid explicit pairs while retaining every lone surrogate."""
    return identifier.encode("utf-16-le", errors="surrogatepass").decode(
        "utf-16-le",
        errors="surrogatepass",
    )
