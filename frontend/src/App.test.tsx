import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("Agent Rumble customer experience", () => {
  it("completes search, shortlist, comparison, source review, and back navigation", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    expect(screen.getByText(/project details and source references are illustrative/i)).toBeInTheDocument();
    expect(screen.queryByText(/project intelligence/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/catalog \/ 03/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Find projects" }));
    expect(await screen.findByRole("heading", { name: "3 projects to compare" })).toBeInTheDocument();
    expect(screen.getAllByText("Must")).toHaveLength(2);
    expect(screen.getAllByText("Prefer")).toHaveLength(2);
    expect(screen.getByText("Avoid")).toBeInTheDocument();
    expect(screen.queryByText("Use case")).not.toBeInTheDocument();
    expect(screen.queryByText("Organizational constraints")).not.toBeInTheDocument();
    expect(screen.getAllByText("What is included")).toHaveLength(3);
    expect(screen.queryByText("Card metadata")).not.toBeInTheDocument();
    expect(screen.queryByText(/SCHEMA 0\.2/)).not.toBeInTheDocument();

    const compareButtons = screen.getAllByRole("button", { name: "+ Compare" });
    await user.click(compareButtons[0]);
    await user.click(compareButtons[1]);
    await user.click(compareButtons[2]);
    expect(screen.getByText("3 / 3 projects")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Compare projects →" }));
    expect(await screen.findByRole("heading", { name: "Compare 3 projects" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Project details" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Highlights" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Overview", { selector: "summary strong" })).toBeInTheDocument();
    expect(screen.getByText("Capabilities", { selector: "summary strong" })).toBeInTheDocument();
    expect(screen.getByText("Architecture & setup", { selector: "summary strong" })).toBeInTheDocument();
    expect(screen.getByText("Fit & trade-offs", { selector: "summary strong" })).toBeInTheDocument();
    expect(screen.getByText("Integrations & dependencies", { selector: "summary strong" })).toBeInTheDocument();
    expect(screen.queryByText(/the cards decide the fields/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "All details" }));
    expect(screen.getByRole("button", { name: "All details" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText("Not analyzed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Unknown").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Statically confirmed").length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole("button", { name: /View source \d+ →/ })[0]);
    const dialog = await screen.findByRole("dialog", { name: /tool approval is represented/i });
    expect(within(dialog).getByText("Confirmed in source")).toBeInTheDocument();
    expect(within(dialog).getByText("Confirmed evidence")).toBeInTheDocument();
    expect(within(dialog).getByText("Verification")).toBeInTheDocument();
    expect(within(dialog).getAllByText("Confidence").length).toBeGreaterThan(0);
    expect(within(dialog).getByText("Source status")).toBeInTheDocument();
    expect(within(dialog).getByText(/Supporting sources \/ 1/)).toBeInTheDocument();
    expect(within(dialog).getByText("Project publisher")).toBeInTheDocument();
    expect(within(dialog).getByText("Public")).toBeInTheDocument();
    expect(within(dialog).getByText("2026-07-15T12:00:00Z")).toBeInTheDocument();
    expect(within(dialog).getByText(/src\/agents\/tool.py/)).toBeInTheDocument();
    expect(within(dialog).getByText(/sample data/i)).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "View source ↗" })).toBeInTheDocument();
    expect(container.querySelector(".app-shell")).toHaveAttribute("inert");
    expect(document.body.style.overflow).toBe("hidden");

    await user.click(within(dialog).getByRole("button", { name: "Close source details" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(container.querySelector(".app-shell")).not.toHaveAttribute("inert");
    expect(document.body.style.overflow).toBe("");

    await user.click(screen.getByRole("button", { name: "← Back to search results" }));
    expect(screen.getByRole("heading", { name: "3 projects to compare" })).toBeInTheDocument();
  });

  it("requires at least two projects before comparison", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Find projects" }));
    await screen.findByRole("heading", { name: "3 projects to compare" });
    await user.click(screen.getAllByRole("button", { name: "+ Compare" })[0]);

    expect(screen.getByRole("button", { name: "Select one more" })).toBeDisabled();
  });

  it("keeps lower-priority metadata reachable inside customer-facing sections", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Find projects" }));
    await screen.findByRole("heading", { name: "3 projects to compare" });
    const compareButtons = screen.getAllByRole("button", { name: "+ Compare" });
    await user.click(compareButtons[0]);
    await user.click(compareButtons[1]);
    await user.click(screen.getByRole("button", { name: "Compare projects →" }));
    await screen.findByRole("heading", { name: "Project details" });

    await user.type(screen.getByRole("searchbox", { name: "Find a detail" }), "Schema version");
    expect(screen.getByText("Showing 1 details across 1 sections.")).toBeInTheDocument();
    expect(
      within(screen.getByLabelText("Technical details comparison")).getAllByText("0.2"),
    ).toHaveLength(2);
    expect(screen.getByText("Technical details")).toBeInTheDocument();
    expect(screen.queryByText("Schema Version", { selector: "summary strong" })).not.toBeInTheDocument();
  });

  it("keeps every interpreted requirement label in its padded pill segment", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(screen.getByRole("button", { name: "Find projects" }));
    await screen.findByRole("heading", { name: "What matters for your search" });

    const requirements = Array.from(container.querySelectorAll(".requirement"));
    expect(requirements.length).toBeGreaterThan(0);
    requirements.forEach((requirement) => {
      expect(requirement.querySelector(".requirement__label")).not.toBeNull();
    });
  });

  it("enters the prepared two-project Rumble Arena from the shortlist", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Find projects" }));
    await screen.findByRole("heading", { name: "3 projects to compare" });
    const compareButtons = screen.getAllByRole("button", { name: "+ Compare" });
    await user.click(compareButtons[0]);
    await user.click(compareButtons[1]);
    await user.click(screen.getByRole("button", { name: "Enter Rumble →" }));

    expect(
      await screen.findByRole("heading", { name: "Internal support agent proof of concept" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Solo fullscreen ⛶" })).toBeEnabled();
  });
});
