import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("Agent Rumble prototype", () => {
  it("completes search, shortlist, compare, evidence, and back navigation", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    expect(
      screen.getByText(/schema-valid draft v0\.2 fixture cards/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Find projects" }));
    expect(
      await screen.findByRole("heading", { name: "Three projects for review" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Must")).toHaveLength(2);
    expect(screen.getAllByText("Prefer")).toHaveLength(2);
    expect(screen.getByText("Avoid")).toBeInTheDocument();
    expect(screen.getByText("customer-support agent prototype")).toBeInTheDocument();
    expect(screen.getByText("Two-week prototype · Self-hosted preferred")).toBeInTheDocument();
    expect(screen.getByText(/2026-07-15 · 2026-07-14/)).toBeInTheDocument();
    expect(screen.getAllByText("Project boundary")).toHaveLength(3);
    expect(screen.getAllByText(/CARD card-.* \/ v1/)).toHaveLength(3);
    expect(screen.getAllByText("SCHEMA 0.2")).toHaveLength(3);
    expect(screen.getAllByText("TYPE agent_framework_sdk")).toHaveLength(3);
    expect(screen.getAllByText("DEPTH targeted")).toHaveLength(3);
    expect(screen.getAllByText("Card metadata")).toHaveLength(3);

    const compareButtons = screen.getAllByRole("button", { name: "+ Compare" });
    await user.click(compareButtons[0]);
    await user.click(compareButtons[1]);
    await user.click(compareButtons[2]);
    expect(screen.getByText("3 / 3 projects")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Compare projects →" }));
    expect(
      await screen.findByRole("heading", { name: "Three approaches, one explicit context." }),
    ).toBeInTheDocument();
    expect(screen.getByText("Material differences")).toBeInTheDocument();
    expect(screen.getByText("Not analyzed")).toBeInTheDocument();
    expect(screen.getByText("Unknown")).toBeInTheDocument();
    expect(screen.getAllByText("Statically confirmed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Confirmed evidence").length).toBeGreaterThan(0);
    expect(screen.getByText(/12 shared attributes are omitted/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /shared attributes/i })).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "View source evidence →" })[0]);
    const dialog = await screen.findByRole("dialog", { name: /tool approval is represented/i });
    expect(within(dialog).getByText("Confirmed in source")).toBeInTheDocument();
    expect(within(dialog).getByText("Confirmed evidence")).toBeInTheDocument();
    expect(within(dialog).getByText("Claim verification")).toBeInTheDocument();
    expect(within(dialog).getByText("Claim confidence")).toBeInTheDocument();
    expect(within(dialog).getByText("Evidence status")).toBeInTheDocument();
    expect(within(dialog).getByText("Evidence confidence")).toBeInTheDocument();
    expect(within(dialog).getByText(/Supporting evidence \/ 1/)).toBeInTheDocument();
    expect(within(dialog).getByText("factual")).toBeInTheDocument();
    expect(within(dialog).getByText("context-openai-agents-sdk")).toBeInTheDocument();
    expect(within(dialog).getByText("first_party")).toBeInTheDocument();
    expect(within(dialog).getByText("public")).toBeInTheDocument();
    expect(within(dialog).getByText("2026-07-15T12:00:00Z")).toBeInTheDocument();
    expect(within(dialog).getByText(/src\/agents\/tool.py/)).toBeInTheDocument();
    expect(within(dialog).getByText(/contract-valid fixture shape/i)).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Open pinned public source ↗" })).toBeInTheDocument();
    expect(container.querySelector(".app-shell")).toHaveAttribute("inert");
    expect(document.body.style.overflow).toBe("hidden");

    await user.click(within(dialog).getByRole("button", { name: "Close evidence inspector" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(container.querySelector(".app-shell")).not.toHaveAttribute("inert");
    expect(document.body.style.overflow).toBe("");

    await user.click(screen.getByRole("button", { name: "← Back to search results" }));
    expect(
      screen.getByRole("heading", { name: "Three projects for review" }),
    ).toBeInTheDocument();
  });

  it("requires at least two projects before comparison", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Find projects" }));
    await screen.findByRole("heading", { name: "Three projects for review" });
    await user.click(screen.getAllByRole("button", { name: "+ Compare" })[0]);

    expect(screen.getByRole("button", { name: "Select one more" })).toBeDisabled();
  });

  it("keeps every interpreted requirement label in its padded pill segment", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(screen.getByRole("button", { name: "Find projects" }));
    await screen.findByRole("heading", { name: "How we read your request" });

    const requirements = Array.from(container.querySelectorAll(".requirement"));
    expect(requirements.length).toBeGreaterThan(0);
    requirements.forEach((requirement) => {
      expect(requirement.querySelector(".requirement__label")).not.toBeNull();
    });
  });
});
