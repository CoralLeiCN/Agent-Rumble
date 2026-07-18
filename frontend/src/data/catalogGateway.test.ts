import { describe, expect, it } from "vitest";
import { preparedQuery } from "./fixtures";
import { StaticCatalogGateway } from "./catalogGateway";

describe("StaticCatalogGateway", () => {
  it("keeps fixture access behind the future API seam", async () => {
    const gateway = new StaticCatalogGateway();
    const search = await gateway.searchProjects(preparedQuery);
    const comparison = await gateway.compareProjects(search.projects.map(({ id }) => id));
    const record = await gateway.getEvidence("ev-openai-approval");

    expect(search.projects).toHaveLength(3);
    expect(comparison.projectIds).toHaveLength(3);
    expect(comparison.rows.some((row) => row.cells.crewai?.state === "not_analyzed")).toBe(true);
    expect(record.revision).toBe("a94d3f2");
  });
});
