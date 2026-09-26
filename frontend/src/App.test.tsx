import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { canonicalRumble } from "./test/FixtureRumbleGateway";
import { FixtureCatalogGateway } from "./test/FixtureCatalogGateway";
import type {
  CatalogGateway,
  ClaimEvidenceRecord,
  ComparisonResponse,
  SearchResponse,
} from "./types/catalog";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

function renderFixtureApp() {
  return render(<App gateway={new FixtureCatalogGateway()} />);
}

describe("Agent Rumble customer experience", () => {
  it.each(["success", "failure"] as const)(
    "ignores a stale search %s after reset and a new search",
    async (outcome) => {
      const user = userEvent.setup();
      const gateway = new FixtureCatalogGateway();
      const complete = await gateway.searchProjects("");
      const oldSearch = deferred<SearchResponse>();
      const newSearch = deferred<SearchResponse>();
      vi.spyOn(gateway, "searchProjects")
        .mockReturnValueOnce(oldSearch.promise)
        .mockReturnValueOnce(newSearch.promise);
      render(<App gateway={gateway} />);

      await user.click(screen.getByRole("button", { name: "Find projects" }));
      await user.click(screen.getByRole("button", { name: "Explore" }));
      expect(
        screen.getByRole("button", { name: "Find projects" }),
      ).toBeEnabled();
      await user.click(
        screen.getByRole("button", {
          name: /Browse every preprocessed project/,
        }),
      );

      await act(async () => {
        if (outcome === "success") oldSearch.resolve(complete);
        else oldSearch.reject(new Error("Obsolete search failed"));
      });
      expect(
        screen.getByRole("button", { name: "Finding projects…" }),
      ).toBeDisabled();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();

      await act(async () =>
        newSearch.resolve({
          ...complete,
          total: 1,
          projects: complete.projects.slice(0, 1),
        }),
      );
      expect(
        screen.getByRole("heading", { name: "1 project to compare" }),
      ).toBeInTheDocument();
    },
  );

  it("does not reopen a comparison after navigating to Explore", async () => {
    const user = userEvent.setup();
    const gateway = new FixtureCatalogGateway();
    const pendingComparison = deferred<ComparisonResponse>();
    const complete = await gateway.compareProjects([
      { projectId: "project-openai-openai-agents-python", cardVersion: 1 },
      { projectId: "project-langchain-ai-langgraph", cardVersion: 1 },
    ]);
    vi.spyOn(gateway, "compareProjects").mockReturnValue(
      pendingComparison.promise,
    );
    render(<App gateway={gateway} />);
    await user.click(screen.getByRole("button", { name: "Find projects" }));
    const buttons = await screen.findAllByRole("button", { name: "+ Compare" });
    await user.click(buttons[0]);
    await user.click(buttons[1]);
    await user.click(
      screen.getByRole("button", { name: "Compare projects →" }),
    );
    await user.click(screen.getByRole("button", { name: "Explore" }));

    await act(async () => pendingComparison.resolve(complete));

    expect(
      screen.getByRole("button", { name: "Find projects" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Compare 2 projects" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the latest evidence when a closed request finishes later", async () => {
    const user = userEvent.setup();
    const gateway = new FixtureCatalogGateway();
    const getEvidence = gateway.getClaimEvidence.bind(gateway);
    const oldEvidence = deferred<ClaimEvidenceRecord>();
    const newEvidence = deferred<ClaimEvidenceRecord>();
    const evidenceRequest = vi
      .spyOn(gateway, "getClaimEvidence")
      .mockReturnValueOnce(oldEvidence.promise)
      .mockReturnValueOnce(newEvidence.promise);
    render(<App gateway={gateway} />);
    await user.click(screen.getByRole("button", { name: "Find projects" }));
    const buttons = await screen.findAllByRole("button", { name: "+ Compare" });
    await user.click(buttons[0]);
    await user.click(buttons[1]);
    await user.click(
      screen.getByRole("button", { name: "Compare projects →" }),
    );
    const sources = await screen.findAllByRole("button", {
      name: /View source \d+ →/,
    });
    await user.click(sources[0]);
    await user.click(
      screen.getByRole("button", { name: "Close source details" }),
    );
    await user.click(sources[1]);
    const first = await getEvidence(evidenceRequest.mock.calls[0][0]);
    const second = await getEvidence(evidenceRequest.mock.calls[1][0]);
    expect(first.claim).not.toBe(second.claim);

    await act(async () => newEvidence.resolve(second));
    await act(async () => oldEvidence.resolve(first));

    expect(screen.getByRole("dialog")).toHaveAccessibleName(second.claim);
  });

  it("completes search, shortlist, comparison, source review, and back navigation", async () => {
    const user = userEvent.setup();
    const { container } = renderFixtureApp();

    expect(
      screen.getByText(/complete pinned, statically analyzed catalog/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/catalog \/ 03/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Find projects" }));
    expect(
      await screen.findByRole("heading", { name: "3 projects to compare" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Must")).toHaveLength(2);
    expect(screen.getAllByText("Prefer")).toHaveLength(2);
    expect(screen.getByText("Avoid")).toBeInTheDocument();
    expect(screen.queryByText("Use case")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Organizational constraints"),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("What is included")).toHaveLength(3);
    expect(screen.queryByText("Card metadata")).not.toBeInTheDocument();
    expect(screen.queryByText(/SCHEMA 0\.2/)).not.toBeInTheDocument();

    const compareButtons = screen.getAllByRole("button", { name: "+ Compare" });
    await user.click(compareButtons[0]);
    await user.click(compareButtons[1]);
    await user.click(compareButtons[2]);
    expect(screen.getByText("3 / 3 projects")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Compare projects →" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Compare 3 projects" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Project details" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Highlights" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByText("Overview", { selector: "summary strong" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Capabilities", { selector: "summary strong" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Architecture & setup", { selector: "summary strong" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Fit & trade-offs", { selector: "summary strong" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Integrations & dependencies", {
        selector: "summary strong",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/the cards decide the fields/i),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "All details" }));
    expect(screen.getByRole("button", { name: "All details" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getAllByText("Not analyzed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Unknown").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Statically confirmed").length).toBeGreaterThan(
      0,
    );

    await user.click(
      screen.getAllByRole("button", { name: /View source \d+ →/ })[0],
    );
    const dialog = await screen.findByRole("dialog", {
      name: /tool approval is represented/i,
    });
    expect(within(dialog).getByText("Confirmed in source")).toBeInTheDocument();
    expect(within(dialog).getByText("Verification")).toBeInTheDocument();
    expect(within(dialog).getAllByText("Confidence").length).toBeGreaterThan(0);
    expect(
      within(dialog).getByText(/Supporting sources \/ 1/),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Project publisher")).toBeInTheDocument();
    expect(within(dialog).getByText("Public")).toBeInTheDocument();
    expect(
      within(dialog).getByText("2026-07-15T12:00:00Z"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/src\/agents\/tool.py/),
    ).toBeInTheDocument();
    expect(within(dialog).queryByText(/sample data/i)).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole("link", { name: "View source ↗" }),
    ).toBeInTheDocument();
    expect(container.querySelector(".app-shell")).toHaveAttribute("inert");
    expect(document.body.style.overflow).toBe("hidden");

    await user.click(
      within(dialog).getByRole("button", { name: "Close source details" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(container.querySelector(".app-shell")).not.toHaveAttribute("inert");
    expect(document.body.style.overflow).toBe("");

    await user.click(
      screen.getByRole("button", { name: "← Back to search results" }),
    );
    expect(
      screen.getByRole("heading", { name: "3 projects to compare" }),
    ).toBeInTheDocument();
  });

  it("loads additional result pages and preserves the shortlist", async () => {
    const user = userEvent.setup();
    const gateway = new FixtureCatalogGateway();
    const complete = await gateway.searchProjects("");
    const search = vi
      .spyOn(gateway, "searchProjects")
      .mockImplementation(async (_query, ...args: unknown[]) => {
        const page = (args[0] as number | undefined) ?? 1;
        return {
          ...complete,
          page,
          pageSize: 2,
          total: 3,
          projects:
            page === 1
              ? complete.projects.slice(0, 2)
              : complete.projects.slice(2),
        };
      });
    render(<App gateway={gateway} />);
    await user.click(screen.getByRole("button", { name: "Find projects" }));
    await screen.findByRole("heading", { name: "3 projects to compare" });
    expect(screen.getAllByRole("button", { name: "+ Compare" })).toHaveLength(
      2,
    );
    await user.click(screen.getAllByRole("button", { name: "+ Compare" })[0]);
    await user.click(
      screen.getByRole("button", { name: "Load more projects (2 of 3)" }),
    );
    await screen.findByRole("heading", { name: complete.projects[2].name });
    expect(search).toHaveBeenLastCalledWith(
      complete.query,
      2,
      expect.objectContaining({ requirements: expect.any(Array) }),
    );
    expect(screen.getByText("1 / 3 projects")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Load more projects/ }),
    ).not.toBeInTheDocument();
  });

  it("does not reopen results when a later page arrives after navigation", async () => {
    const user = userEvent.setup();
    const gateway = new FixtureCatalogGateway();
    const complete = await gateway.searchProjects("");
    let resolvePage!: (response: typeof complete) => void;
    vi.spyOn(gateway, "searchProjects")
      .mockResolvedValueOnce({
        ...complete,
        page: 1,
        pageSize: 2,
        projects: complete.projects.slice(0, 2),
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolvePage = resolve;
          }),
      );
    render(<App gateway={gateway} />);
    await user.click(screen.getByRole("button", { name: "Find projects" }));
    await user.click(
      await screen.findByRole("button", {
        name: "Load more projects (2 of 3)",
      }),
    );
    await user.click(screen.getByRole("button", { name: "← Edit request" }));
    await act(async () =>
      resolvePage({
        ...complete,
        page: 2,
        pageSize: 2,
        projects: complete.projects.slice(2),
      }),
    );
    expect(
      screen.getByRole("button", { name: "Find projects" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "3 projects to compare" }),
    ).not.toBeInTheDocument();
  });

  it("requires at least two projects before comparison", async () => {
    const user = userEvent.setup();
    renderFixtureApp();

    await user.click(screen.getByRole("button", { name: "Find projects" }));
    await screen.findByRole("heading", { name: "3 projects to compare" });
    await user.click(screen.getAllByRole("button", { name: "+ Compare" })[0]);

    expect(
      screen.getByRole("button", { name: "Select one more" }),
    ).toBeDisabled();
  });

  it("keeps lower-priority metadata reachable inside customer-facing sections", async () => {
    const user = userEvent.setup();
    renderFixtureApp();

    await user.click(screen.getByRole("button", { name: "Find projects" }));
    await screen.findByRole("heading", { name: "3 projects to compare" });
    const compareButtons = screen.getAllByRole("button", { name: "+ Compare" });
    await user.click(compareButtons[0]);
    await user.click(compareButtons[1]);
    await user.click(
      screen.getByRole("button", { name: "Compare projects →" }),
    );
    await screen.findByRole("heading", { name: "Project details" });

    await user.type(
      screen.getByRole("searchbox", { name: "Find a detail" }),
      "Schema version",
    );
    expect(
      screen.getByText("Showing 1 details across 1 sections."),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByLabelText("Technical details comparison"),
      ).getAllByText("0.3"),
    ).toHaveLength(2);
    expect(screen.getByText("Technical details")).toBeInTheDocument();
    expect(
      screen.queryByText("Schema Version", { selector: "summary strong" }),
    ).not.toBeInTheDocument();
  });

  it("keeps every interpreted requirement label in its padded pill segment", async () => {
    const user = userEvent.setup();
    const { container } = renderFixtureApp();

    await user.click(screen.getByRole("button", { name: "Find projects" }));
    await screen.findByRole("heading", {
      name: "What matters for your search",
    });

    const requirements = Array.from(container.querySelectorAll(".requirement"));
    expect(requirements.length).toBeGreaterThan(0);
    requirements.forEach((requirement) => {
      expect(requirement.querySelector(".requirement__label")).not.toBeNull();
    });
  });
  it("enters the canonical two-project Rumble Arena from the shortlist", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(canonicalRumble), {
        headers: { "content-type": "application/json" },
      }),
    );
    const user = userEvent.setup();
    const gateway = new FixtureCatalogGateway();
    const search = gateway.searchProjects.bind(gateway);
    vi.spyOn(gateway, "searchProjects").mockImplementation(async (query) => {
      const result = await search(query);
      return {
        ...result,
        projects: result.projects.map((project) => ({
          ...project,
          cardVersion: 2,
        })),
      };
    });
    const evidence = {
      claimId: "claim-test",
      projectId: canonicalRumble.matchup.claims[0].project_id,
      claim: "Canonical claim loaded from the pinned card",
      claimKind: "assessment",
      appliesTo: "project",
      assessmentContextId: null,
      whyItMatters: "Test claim",
      verificationStatus: "conflicted" as const,
      confidence: "unknown" as const,
      supportingEvidence: [],
      conflictingEvidence: [],
    };
    const getEvidence = vi
      .spyOn(gateway, "getClaimEvidence")
      .mockResolvedValue(evidence);
    render(<App gateway={gateway} />);

    await user.click(screen.getByRole("button", { name: "Find projects" }));
    await screen.findByRole("heading", { name: "3 projects to compare" });
    const compareButtons = screen.getAllByRole("button", { name: "+ Compare" });
    await user.click(compareButtons[0]);
    await user.click(compareButtons[1]);
    await user.click(screen.getByRole("button", { name: "Enter Rumble →" }));

    expect(
      await screen.findByRole("heading", {
        name: "OpenAI Agents SDK for Python vs LangGraph",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Solo fullscreen ⛶" }),
    ).toBeEnabled();
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/catalog/rumble",
      expect.objectContaining({ method: "POST" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Guided evidence tour →" }),
    );
    await user.click(
      screen.getAllByRole("button", { name: /inspect evidence for/i })[0],
    );
    expect(getEvidence).toHaveBeenCalledWith(
      canonicalRumble.matchup.claims[0].canonical_reference,
    );
    expect(await screen.findByText(evidence.claim)).toBeInTheDocument();
    fetch.mockRestore();
  });

  it("offers a one-click path to browse the complete API catalog", async () => {
    const user = userEvent.setup();
    renderFixtureApp();

    await user.click(
      screen.getByRole("button", {
        name: "Browse every preprocessed project ↗",
      }),
    );

    expect(
      await screen.findByRole("heading", { name: "3 projects to compare" }),
    ).toBeInTheDocument();
  });

  it("shows a useful empty state for a backend query with no catalog matches", async () => {
    const user = userEvent.setup();
    const emptyGateway: CatalogGateway = {
      getCatalogContext: () => new FixtureCatalogGateway().getCatalogContext(),
      getCurrentCard: (id) => new FixtureCatalogGateway().getCurrentCard(id),
      async searchProjects(query) {
        return {
          query,
          page: 1,
          pageSize: 20,
          total: 0,
          assessmentContexts: [],
          requirements: [{ id: "requirement-1", kind: "must", label: query }],
          uninterpretedTerms: ["nonexistent"],
          projects: [],
        };
      },
      async compareProjects() {
        throw new Error("No projects to compare");
      },
      async getClaimEvidence() {
        throw new Error("No evidence to load");
      },
    };
    render(<App gateway={emptyGateway} />);

    const searchbox = screen.getByLabelText("Describe what you need");
    await user.clear(searchbox);
    await user.type(searchbox, "nonexistent capability");
    await user.click(screen.getByRole("button", { name: "Find projects" }));

    expect(
      await screen.findByRole("heading", { name: "No matching projects yet" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Try a broader search" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/project name, purpose, capability, language/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Compare projects/ }),
    ).not.toBeInTheDocument();
  });
});
