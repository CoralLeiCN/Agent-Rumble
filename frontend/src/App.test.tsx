import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("Agent Rumble prototype", () => {
  it("completes search, shortlist, compare, evidence, and back navigation", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(
      screen.getByText(/unvalidated fixture data/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Find projects" }));
    expect(
      await screen.findByRole("heading", { name: "Three projects for review" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Must")).toHaveLength(2);
    expect(screen.getAllByText("Prefer")).toHaveLength(2);
    expect(screen.getByText("Avoid")).toBeInTheDocument();

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

    await user.click(screen.getAllByRole("button", { name: "View source evidence →" })[0]);
    const dialog = await screen.findByRole("dialog", { name: /tool execution can pause/i });
    expect(within(dialog).getByText("Confirmed in source")).toBeInTheDocument();
    expect(within(dialog).getByText(/src\/agents\/tool.py/)).toBeInTheDocument();
    expect(within(dialog).getByText(/illustrative only/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Close evidence inspector" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

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
