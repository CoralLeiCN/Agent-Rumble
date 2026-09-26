import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { App } from "./App";
import { GenerationForm } from "./GenerationForm";
import { ContextualComparison } from "./comparison/ContextualComparison";
import { FixtureCatalogGateway } from "./test/FixtureCatalogGateway";
import { HttpCatalogGateway } from "./data/catalogGateway";
import { projectCards } from "./data/fixtures";
import { developmentContext } from "./data/assessmentContext";
import { saveSession } from "./data/session";
import type { JsonTransport } from "./data/httpTransport";
import type { SearchResponse } from "./types/catalog";

afterEach(() => vi.restoreAllMocks());

it("ignores an obsolete shortlist restore failure after a successful search", async () => {
  const gateway = new FixtureCatalogGateway();
  const results = await gateway.searchProjects("");
  let rejectRestore!: (error: Error) => void;
  const restore = new Promise<SearchResponse>((_resolve, reject) => {
    rejectRestore = reject;
  });
  vi.spyOn(gateway, "searchProjects")
    .mockReturnValueOnce(restore)
    .mockResolvedValue(results);
  saveSession({
    query: "Python",
    context: developmentContext,
    shortlist: [projectCards[0].project.project_id],
  });
  const user = userEvent.setup();
  render(<App gateway={gateway} />);
  await user.click(screen.getByRole("button", { name: "Find projects" }));
  expect(
    await screen.findByRole("heading", {
      name: `${results.total} projects to compare`,
    }),
  ).toBeInTheDocument();
  await act(async () => rejectRestore(new Error("Obsolete restore failure")));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("preserves contextual uncertainty and opens the pinned canonical claim", async () => {
  const user = userEvent.setup();
  const open = vi.fn();
  render(
    <ContextualComparison
      result={{
        assessment_context: {
          ...developmentContext,
          exclusions: ["Hosted control plane"],
        },
        role_analysis: {
          compatibility: "same_role",
          explanation: "Shared role",
        },
        rows: [
          {
            id: "contextual-best-fit",
            label: "Fit",
            cells: {
              project: {
                project_id: "project",
                card_version: 2,
                state: "value",
                value: "Conditional fit",
                claim_ids: ["claim-fit"],
                claim_verification_status: "conflicted",
                confidence: "unknown",
              },
            },
          },
        ],
      }}
      projects={[]}
      onOpenEvidence={open}
    />,
  );
  expect(
    screen.getByText("Conflicted evidence · Unknown confidence"),
  ).toBeInTheDocument();
  await user.click(screen.getByText("Requirements and assessment scope"));
  expect(screen.getByText("Hosted control plane")).toBeVisible();
  await user.click(
    screen.getByRole("button", { name: "Inspect supporting claim 1" }),
  );
  expect(open).toHaveBeenCalledWith(
    { projectId: "project", cardVersion: 2, claimId: "claim-fit" },
    expect.any(HTMLButtonElement),
  );
});

it("sends edited requirement polarity into search", async () => {
  const user = userEvent.setup();
  const gateway = new FixtureCatalogGateway();
  const search = vi.spyOn(gateway, "searchProjects");
  render(<App gateway={gateway} />);
  await user.click(screen.getByText("Edit assessment context"));
  await user.type(
    screen.getByRole("textbox", { name: "Prefer" }),
    "Local persistence",
  );
  await user.type(
    screen.getByRole("textbox", { name: "Avoid" }),
    "Mandatory hosted control plane",
  );
  await user.click(screen.getByRole("button", { name: "Find projects" }));
  await waitFor(() =>
    expect(search).toHaveBeenCalledWith(
      expect.any(String),
      1,
      expect.objectContaining({
        preferences: ["Local persistence"],
        exclusions: ["Mandatory hosted control plane"],
      }),
    ),
  );
});

it("restores the shortlist using fresh current cards rather than stored card payloads", async () => {
  const gateway = new FixtureCatalogGateway();
  const current = vi.spyOn(gateway, "getCurrentCard");
  const ids = projectCards.slice(0, 2).map((card) => card.project.project_id);
  saveSession({ query: "Python", context: developmentContext, shortlist: ids });
  render(<App gateway={gateway} />);
  expect(await screen.findByText("2 / 3 projects")).toBeInTheDocument();
  expect(current).toHaveBeenCalledWith(ids[0]);
  expect(current).toHaveBeenCalledWith(ids[1]);
  expect(
    screen.getByRole("button", { name: "Compare projects →" }),
  ).toBeEnabled();
});

it("keeps exhaustive card fields and the server's shared-context assessment together", async () => {
  const context = {
    ...developmentContext,
    exclusions: ["Hosted control plane"],
  };
  const request =
    vi.fn<(path: string, init?: RequestInit) => Promise<unknown>>();
  request
    .mockResolvedValueOnce(projectCards[0])
    .mockResolvedValueOnce(projectCards[1])
    .mockResolvedValueOnce({
      assessment_context: context,
      role_analysis: {
        compatibility: "same_role",
        explanation: "Same role, different approaches.",
      },
      rows: [],
    });
  const result = await new HttpCatalogGateway({
    request,
  } as JsonTransport).compareProjects(
    projectCards.slice(0, 2).map((card) => ({
      projectId: card.project.project_id,
      cardVersion: card.card_version,
    })),
    context,
  );
  expect(result.groups.length).toBeGreaterThan(0);
  expect(result.contextual?.assessment_context).toEqual(context);
  expect(
    JSON.parse(request.mock.calls[2][1]!.body as string).assessment_context,
  ).toEqual(context);
});

it("stores and refreshes generated drafts without implying public publication", async () => {
  const user = userEvent.setup();
  const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(
    async () =>
      new Response(
        JSON.stringify({
          generation_id: "019d9bd7-6256-453b-88f5-5ad48e459999",
          card: projectCards[0],
          published: false,
        }),
        { status: 201, headers: { "content-type": "application/json" } },
      ),
  );
  render(<GenerationForm />);
  await user.click(
    screen.getByText("Generate a card from a public GitHub repository"),
  );
  await user.type(
    screen.getByLabelText("Public GitHub repository URL"),
    "https://github.com/openai/openai-agents-python",
  );
  await user.type(
    screen.getByLabelText("Project boundary"),
    "Python package and repository documentation",
  );
  await user.click(screen.getByRole("button", { name: "Generate card" }));
  expect(
    await screen.findByText(
      "Validated draft saved. It has not been published to the catalog.",
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Open stored result" }),
  ).toHaveAttribute("href", expect.stringContaining("/api/v1/generation/"));
  await user.click(
    screen.getByRole("button", { name: "Refresh from latest source" }),
  );
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  expect(fetch.mock.calls[1][0]).toMatch(/\/generation\/[^/]+\/refresh$/);
});
