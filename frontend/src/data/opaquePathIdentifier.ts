/**
 * Encode a canonical JSON string as one unambiguous URL path segment.
 *
 * Canonical identifiers are Unicode scalar strings. JavaScript represents an
 * astral scalar as a valid UTF-16 surrogate pair; any residual lone surrogate
 * is rejected before TextEncoder could silently replace it with U+FFFD.
 */
export function encodeOpaquePathIdentifier(identifier: string): string {
  for (let index = 0; index < identifier.length; index += 1) {
    const codeUnit = identifier.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = identifier.charCodeAt(index + 1);
      if (index + 1 >= identifier.length || next < 0xdc00 || next > 0xdfff) {
        throw new TypeError(
          "Opaque path identifiers must not contain lone UTF-16 surrogates.",
        );
      }
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      throw new TypeError(
        "Opaque path identifiers must not contain lone UTF-16 surrogates.",
      );
    }
  }

  const payload = JSON.stringify(identifier);
  const bytes = new TextEncoder().encode(payload);
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + chunkSize),
    );
  }
  return `~${btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}
