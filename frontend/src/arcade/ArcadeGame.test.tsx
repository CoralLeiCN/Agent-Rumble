import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ArcadeSceneOptions } from "./ArcadeScene";
import type { ArcadeRuntime } from "./runtime";
import type { RumbleEntrant, RumbleRound } from "../types/rumble";

const runtimeMocks = vi.hoisted(() => ({
  create: vi.fn(),
  destroy: vi.fn(),
  setPaused: vi.fn(),
  setVirtualAction: vi.fn(),
  toggleFullscreen: vi.fn(),
}));

vi.mock("./runtime", () => ({
  createArcadeRuntime: runtimeMocks.create,
}));

import { ArcadeGame } from "./ArcadeGame";

const entrants: [RumbleEntrant, RumbleEntrant] = [
  {
    project_id: "project-a",
    project_name: "Project A",
    project_roles: ["framework"],
    source_snapshot: {
      card_id: "card-a",
      card_version: 1,
      revision: "abc",
      analyzed_at: "2026-07-18T00:00:00Z",
    },
  },
  {
    project_id: "project-b",
    project_name: "Project B",
    project_roles: ["framework"],
    source_snapshot: {
      card_id: "card-b",
      card_version: 1,
      revision: "def",
      analyzed_at: "2026-07-18T00:00:00Z",
    },
  },
];

const rounds: RumbleRound[] = [
  {
    round_number: 1,
    round_id: "approval",
    title: "Approval gate",
    dimension: "approval",
    label: "Approval gates",
    requirement: "A person can approve a sensitive action.",
    verdict: "entrant_a_advantage",
    callout: "The left project has the contextual edge here.",
    entrant_a: {
      state: "value",
      value: "Tool approval",
      alignment: "satisfies",
      verification_status: "statically_confirmed",
      confidence: "high",
      claim_ids: ["claim-a"],
    },
    entrant_b: {
      state: "value",
      value: "Interrupt approval",
      alignment: "satisfies",
      verification_status: "statically_confirmed",
      confidence: "high",
      claim_ids: ["claim-b"],
    },
  },
  {
    round_number: 2,
    round_id: "restart",
    title: "Durable restart",
    dimension: "operations",
    label: "Restart comeback combo",
    requirement: "The application can recover durable work.",
    verdict: "entrant_b_advantage",
    callout: "The right project has the contextual edge here.",
    entrant_a: {
      state: "value",
      value: "Application-managed recovery",
      alignment: "partially_satisfies",
      verification_status: "documented",
      confidence: "medium",
      claim_ids: ["claim-restart-a"],
    },
    entrant_b: {
      state: "value",
      value: "Checkpoint restart",
      alignment: "satisfies",
      verification_status: "statically_confirmed",
      confidence: "high",
      claim_ids: ["claim-restart-b"],
    },
  },
];

let capturedOptions: ArcadeSceneOptions | null = null;

function fakeRuntime(): ArcadeRuntime {
  return {
    setPaused: runtimeMocks.setPaused.mockReturnValue(true),
    togglePause: vi.fn(() => true),
    restart: vi.fn(),
    setVirtualAction: runtimeMocks.setVirtualAction,
    toggleFullscreen: runtimeMocks.toggleFullscreen,
    focus: vi.fn(),
    destroy: runtimeMocks.destroy,
  };
}

describe("ArcadeGame lifecycle", () => {
  beforeEach(() => {
    runtimeMocks.create.mockReset();
    runtimeMocks.destroy.mockReset();
    runtimeMocks.setPaused.mockReset();
    runtimeMocks.setVirtualAction.mockReset();
    runtimeMocks.toggleFullscreen.mockReset();
    runtimeMocks.create.mockImplementation((_host: HTMLElement, options: ArcadeSceneOptions) => {
      capturedOptions = options;
      const runtime = fakeRuntime();
      options.callbacks.onPhaseChange(0);
      options.callbacks.onStatusChange({
        message: "Fight!",
        remainingSeconds: 45,
        phase: 0,
        paused: false,
        health: [82, 37],
        roundsWon: [1, 0],
        roundNumber: 2,
      });
      options.callbacks.onReady();
      return runtime;
    });
  });

  it("lazy-starts Phaser, exposes accessible fighter HP and trait specials, and destroys it", async () => {
    const onPhaseChange = vi.fn();
    const { unmount } = render(
      <ArcadeGame entrants={entrants} rounds={rounds} onPhaseChange={onPhaseChange} />,
    );

    await waitFor(() => expect(runtimeMocks.create).toHaveBeenCalledOnce());
    expect(screen.getByRole("heading", { name: "Approval gate" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Project A HP" })).toHaveAttribute("aria-valuenow", "82");
    expect(screen.getByRole("progressbar", { name: "Project B HP" })).toHaveAttribute("aria-valuenow", "37");
    expect(screen.getByLabelText("Project A: 1 rounds won")).toBeInTheDocument();
    expect(screen.getAllByText("Contextual edge trait")).toHaveLength(2);
    expect(screen.getByText(/HP, round score, KO, time/i)).toBeInTheDocument();
    expect(onPhaseChange).toHaveBeenCalledWith(0);
    fireEvent.click(screen.getByRole("button", { name: "Enter or exit fullscreen" }));
    expect(runtimeMocks.toggleFullscreen).toHaveBeenCalledOnce();

    unmount();
    expect(runtimeMocks.destroy).toHaveBeenCalledOnce();
  });

  it("pauses transient gameplay when the window loses focus", async () => {
    render(<ArcadeGame entrants={entrants} rounds={rounds} />);
    await waitFor(() => expect(runtimeMocks.create).toHaveBeenCalledOnce());

    window.dispatchEvent(new Event("blur"));

    expect(runtimeMocks.setPaused).toHaveBeenCalledWith(true);
  });

  it("does not load Phaser for an invalid matchup", async () => {
    render(<ArcadeGame entrants={[entrants[0]]} rounds={rounds} />);

    expect(screen.getByText(/needs two entrants/i)).toBeInTheDocument();
    expect(runtimeMocks.create).not.toHaveBeenCalled();
  });

  it("clears a finished result when the scene restarts from the R key", async () => {
    render(<ArcadeGame entrants={entrants} rounds={rounds} />);
    await waitFor(() => expect(runtimeMocks.create).toHaveBeenCalledOnce());
    if (!capturedOptions) throw new Error("The arcade runtime options were not captured.");

    act(() => {
      capturedOptions?.callbacks.onGameOver({
        kind: "arcade_exhibition",
        winner: "player_1",
        reason: "ko",
        fighters: [
          {
            controller: "player_1",
            avatarName: "Project A",
            health: 42,
            roundsWon: 2,
            signatureMove: "Approval Gate Relay",
          },
          {
            controller: "cpu",
            avatarName: "Project B",
            health: 0,
            roundsWon: 0,
            signatureMove: "Restart Comeback Rush",
          },
        ],
        disclaimer: "Player/exhibition outcome only — not a project assessment or Rumble verdict.",
      });
    });
    expect(screen.getByText("Project A wins the exhibition by KO")).toBeInTheDocument();
    expect(screen.getByText("Project A 2–0 Project B")).toBeInTheDocument();

    act(() => capturedOptions?.callbacks.onReady());

    expect(screen.queryByText("Project A wins the exhibition by KO")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Pause/i })).toBeEnabled();

    act(() => {
      capturedOptions?.callbacks.onGameOver({
        kind: "arcade_exhibition",
        winner: "cpu",
        reason: "time",
        fighters: [
          {
            controller: "player_1",
            avatarName: "Project A",
            health: 16,
            roundsWon: 1,
            signatureMove: "Approval Gate Relay",
          },
          {
            controller: "cpu",
            avatarName: "Project B",
            health: 28,
            roundsWon: 2,
            signatureMove: "Restart Comeback Rush",
          },
        ],
        disclaimer: "Player/exhibition outcome only — not a project assessment or Rumble verdict.",
      });
    });
    expect(screen.getByText("Project B wins the exhibition by time decision")).toBeInTheDocument();
  });

  it("maps touch buttons to jab, trait special, and held guard actions", async () => {
    render(<ArcadeGame entrants={entrants} rounds={rounds} />);
    await waitFor(() => expect(runtimeMocks.create).toHaveBeenCalledOnce());

    const jab = screen.getByRole("button", { name: "Jab", hidden: true });
    const trait = screen.getByRole("button", { name: "Trait", hidden: true });
    const guard = screen.getByRole("button", { name: "Guard", hidden: true });

    fireEvent.pointerDown(jab);
    fireEvent.pointerDown(trait);
    fireEvent.pointerDown(guard);
    fireEvent.pointerUp(guard);

    expect(runtimeMocks.setVirtualAction).toHaveBeenCalledWith("attack", true);
    expect(runtimeMocks.setVirtualAction).toHaveBeenCalledWith("special", true);
    expect(runtimeMocks.setVirtualAction).toHaveBeenCalledWith("block", true);
    expect(runtimeMocks.setVirtualAction).toHaveBeenCalledWith("block", false);
  });
});
