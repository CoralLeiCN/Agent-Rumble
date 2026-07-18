import { describe, expect, it } from "vitest";
import { encodeOpaquePathIdentifier } from "./opaquePathIdentifier";

describe("encodeOpaquePathIdentifier", () => {
  it.each([
    ["simple-id", "~InNpbXBsZS1pZCI"],
    ["项目/δοκιμή", "~Iumhueebri_OtM6_zrrOuc68zq4i"],
    [" ", "~IiAi"],
    [" leading and trailing ", "~IiBsZWFkaW5nIGFuZCB0cmFpbGluZyAi"],
    ["ctl:\u0000\n", "~ImN0bDpcdTAwMDBcbiI"],
    ["project/cards/2/evidence/value", "~InByb2plY3QvY2FyZHMvMi9ldmlkZW5jZS92YWx1ZSI"],
    ["evidence/cards/2/evidence/", "~ImV2aWRlbmNlL2NhcmRzLzIvZXZpZGVuY2UvIg"],
    ["~InNpbXBsZS1pZCI", "~In5Jbk5wYlhCc1pTMXBaQ0ki"],
    ["\uD83D\uDE00", "~IvCfmIAi"],
  ])("encodes %j to the canonical opaque path reference", (identifier, expected) => {
    expect(encodeOpaquePathIdentifier(identifier)).toBe(expected);
  });

  it("does not impose the former 2,048-character identifier ceiling", () => {
    const identifier = "a".repeat(2_050);
    // JSON payload bytes are: quote + 2,050 × "a" + quote. This fixed
    // grouping independently describes its unpadded base64url vector.
    const expected = `~ImFh${"YWFh".repeat(682)}YWEi`;

    expect(encodeOpaquePathIdentifier(identifier)).toBe(expected);
  });

  it.each([
    ["lone high", "\uD800"],
    ["lone low", "\uDC00"],
  ])("rejects a %s surrogate before UTF-8 encoding", (_label, identifier) => {
    expect(() => encodeOpaquePathIdentifier(identifier)).toThrow(
      new TypeError("Opaque path identifiers must not contain lone UTF-16 surrogates."),
    );
  });
});
