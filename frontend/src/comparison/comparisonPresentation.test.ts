import { describe, expect, it } from "vitest";
import { projectCards } from "../data/fixtures";
import { projectCardsToComparison } from "../data/projectCardAdapter";
import {
  buildComparisonPresentation,
  HIGHLIGHT_ROW_LIMIT,
} from "./comparisonPresentation";

function comparisonForFixtures() {
  return projectCardsToComparison(
    projectCards,
    projectCards.map(({ project }) => project.project_id),
    "fixture",
  );
}

describe("buildComparisonPresentation", () => {
  it("partitions every dynamic row and schema-only field exactly once", () => {
    const comparison = comparisonForFixtures();
    const presentation = buildComparisonPresentation(comparison.groups);
    const sourceRows = comparison.groups.flatMap(({ rows }) => rows).map(({ id }) => id).sort();
    const presentedRows = presentation.flatMap(({ highlights, details }) => (
      [...highlights, ...details].map(({ id }) => id)
    )).sort();
    const sourceContractFields = comparison.groups.flatMap(({ id, contractOnlyFields }) => (
      contractOnlyFields.map(({ fieldPattern }) => `${id}:${fieldPattern}`)
    )).sort();
    const presentedContractFields = presentation.flatMap(({ contractOnlyFields }) => (
      contractOnlyFields.map(({ sourceGroupId, fieldPattern }) => `${sourceGroupId}:${fieldPattern}`)
    )).sort();

    expect(presentedRows).toEqual(sourceRows);
    expect(new Set(presentedRows).size).toBe(presentedRows.length);
    expect(presentedContractFields).toEqual(sourceContractFields);
    expect(new Set(presentedContractFields).size).toBe(presentedContractFields.length);
  });

  it("caps primary highlights and keeps metadata in collapsed technical details", () => {
    const presentation = buildComparisonPresentation(comparisonForFixtures().groups);
    const technical = presentation.find(({ id }) => id === "technical-details");

    expect(presentation.filter(({ priority }) => priority === "primary").every(
      ({ highlights }) => highlights.length <= HIGHLIGHT_ROW_LIMIT,
    )).toBe(true);
    expect(technical?.highlights).toEqual([]);
    expect(technical?.details.some(({ fieldPattern }) => fieldPattern === "/schema_version"))
      .toBe(true);
    expect(presentation.some(({ id }) => id === "schema_version")).toBe(false);
  });

  it("keeps a future top-level data group reachable in technical details", () => {
    const first = structuredClone(projectCards[0]);
    const second = structuredClone(projectCards[1]);
    (first as unknown as Record<string, unknown>).future_contract = {
      policy: { enabled: true },
    };
    const comparison = projectCardsToComparison(
      [first, second],
      [first.project.project_id, second.project.project_id],
      "fixture",
    );
    const technical = buildComparisonPresentation(comparison.groups).find(
      ({ id }) => id === "technical-details",
    );

    expect(technical?.details.some(({ fieldPattern }) => (
      fieldPattern === "/future_contract/policy/enabled"
    ))).toBe(true);
  });
});
