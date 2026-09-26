import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  FixtureRumbleGateway,
  canonicalRumble,
} from "../test/FixtureRumbleGateway";
import { ArenaScreen } from "./ArenaScreen";

vi.mock("../arcade", () => ({
  ArcadeGame: ({
    mode,
    onExit,
    onPhaseChange,
  }: {
    mode: string;
    onExit?: () => void;
    onPhaseChange?: (roundIndex: number) => void;
  }) => (
    <section aria-label="Arcade game test double">
      <h2>Arcade match · {mode}</h2>
      <button type="button" onClick={() => onPhaseChange?.(1)}>
        Advance test phase
      </button>
      <button type="button" onClick={onExit}>
        Exit test arcade
      </button>
    </section>
  ),
}));

const projectIds = [
  "project-openai-openai-agents-python",
  "project-langchain-ai-langgraph",
] as const;

async function enterArena() {
  await screen.findByRole("heading", {
    name: "OpenAI Agents SDK for Python vs LangGraph",
  });
  await userEvent.click(
    screen.getByRole("button", { name: "Guided evidence tour →" }),
  );
}

describe("ArenaScreen", () => {
  it("preserves the active round when the parent recreates unchanged project IDs", async () => {
    const gateway = new FixtureRumbleGateway();
    const load = vi.spyOn(gateway, "load");
    const props = {
      projectIds,
      gateway,
      onExit: () => undefined,
      onOpenEvidence: () => undefined,
    };
    const { rerender } = render(
      <ArenaScreen {...props} projectIds={[...projectIds]} />,
    );
    await enterArena();
    await userEvent.click(screen.getByRole("button", { name: "Next round →" }));

    rerender(<ArenaScreen {...props} projectIds={[...projectIds]} />);

    expect(
      screen.getByRole("heading", {
        name: canonicalRumble.projection.rounds[1].title,
      }),
    ).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("reports a different pair instead of inventing a gameplay-only comparison", async () => {
    render(
      <ArenaScreen
        projectIds={["project-crewaiinc-crewai", "project-eigent-ai-eigent"]}
        gateway={new FixtureRumbleGateway()}
        onExit={() => undefined}
        onOpenEvidence={() => undefined}
      />,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "does not match the selected projects",
    );
    expect(
      screen.queryByRole("button", { name: "Enter solo fight →" }),
    ).not.toBeInTheDocument();
  });

  it("shows an API failure and retries the canonical comparison", async () => {
    const gateway = new FixtureRumbleGateway();
    vi.spyOn(gateway, "load").mockRejectedValueOnce(
      new Error("API unavailable"),
    );
    render(
      <ArenaScreen
        projectIds={projectIds}
        gateway={gateway}
        onExit={() => undefined}
        onOpenEvidence={() => undefined}
      />,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "API unavailable",
    );
    expect(
      screen.queryByRole("button", { name: "Enter solo fight →" }),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await enterArena();
    expect(gateway.load).toHaveBeenCalledTimes(2);
  });

  it("plays canonical rounds, opens evidence, and reaches a no-winner recap", async () => {
    const user = userEvent.setup();
    const onOpenEvidence = vi.fn();
    const onExit = vi.fn();
    render(
      <ArenaScreen
        projectIds={projectIds}
        gateway={new FixtureRumbleGateway()}
        onExit={onExit}
        onOpenEvidence={onOpenEvidence}
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "OpenAI Agents SDK for Python vs LangGraph",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Pinned canonical card comparison"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("OpenAI Agents SDK for Python, left corner"),
    ).toHaveTextContent("65886fa16dcdb482090b30b74de1d0cc80b9f4c6");
    expect(screen.getByLabelText("LangGraph, right corner")).toHaveTextContent(
      "49ae27c2ae983cfb92091b0dea9f7bc37a716479",
    );
    expect(
      screen.getByRole("button", { name: "Enter solo fight →" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Local 2-player" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Solo fullscreen ⛶" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Guided evidence tour →" }),
    ).toBeEnabled();
    expect(
      screen.getByText(/each fighter keeps its exact project name/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/equal damage and cooldown budgets/i),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Guided evidence tour →" }),
    );
    expect(
      screen.getByRole("heading", {
        name: canonicalRumble.projection.rounds[0].title,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Inconclusive")).toBeInTheDocument();

    await user.click(
      screen.getAllByRole("button", { name: /inspect evidence for/i })[0],
    );
    expect(onOpenEvidence).toHaveBeenCalledTimes(1);
    expect(onOpenEvidence.mock.calls[0]?.[0]).toEqual(
      canonicalRumble.matchup.claims[0].canonical_reference,
    );

    await user.click(screen.getByRole("button", { name: "Next round →" }));
    expect(
      screen.getByRole("heading", {
        name: canonicalRumble.projection.rounds[1].title,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Inconclusive")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next round →" }));
    expect(
      screen.getByRole("heading", {
        name: canonicalRumble.projection.rounds[2].title,
      }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "See contextual recap →" }),
    );
    expect(
      screen.getByRole("heading", {
        name: "The bell rings. The decision stays yours.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("No overall project result")).toBeInTheDocument();
    expect(screen.getByText(/the rounds are not totaled/i)).toBeInTheDocument();
    expect(screen.queryByText(/^winner$/i)).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Gather more evidence" }),
    );
    expect(
      screen.getByText("Recorded locally: Gather more evidence."),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Replay this matchup ↻" }),
    );
    expect(
      screen.getByRole("heading", {
        name: "OpenAI Agents SDK for Python vs LangGraph",
      }),
    ).toBeInTheDocument();
  });

  it("launches solo arcade play and bridges a live game phase back to evidence", async () => {
    const user = userEvent.setup();
    render(
      <ArenaScreen
        projectIds={projectIds}
        gateway={new FixtureRumbleGateway()}
        onExit={() => undefined}
        onOpenEvidence={() => undefined}
      />,
    );

    await screen.findByRole("heading", {
      name: "OpenAI Agents SDK for Python vs LangGraph",
    });
    await user.click(
      screen.getByRole("button", { name: "Enter solo fight →" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Arcade match · solo" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/entertainment state/i)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Advance test phase" }),
    );
    expect(
      screen.getByText(canonicalRumble.projection.rounds[1].title),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "End match and inspect this evidence round →",
      }),
    );
    expect(
      screen.getByRole("heading", {
        name: canonicalRumble.projection.rounds[1].title,
      }),
    ).toBeInTheDocument();
  });

  it("requests fullscreen from the mode chooser and still starts the fight", async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
      configurable: true,
      value: requestFullscreen,
    });
    const user = userEvent.setup();
    render(
      <ArenaScreen
        projectIds={projectIds}
        gateway={new FixtureRumbleGateway()}
        onExit={() => undefined}
        onOpenEvidence={() => undefined}
      />,
    );

    await screen.findByRole("heading", {
      name: "OpenAI Agents SDK for Python vs LangGraph",
    });
    await user.click(screen.getByRole("button", { name: "Solo fullscreen ⛶" }));

    expect(requestFullscreen).toHaveBeenCalledOnce();
    expect(
      await screen.findByRole("heading", { name: "Arcade match · solo" }),
    ).toBeInTheDocument();
  });

  it("keeps a no-evidence round inconclusive and does not style either project as having an edge", async () => {
    const { container } = render(
      <ArenaScreen
        projectIds={projectIds}
        gateway={new FixtureRumbleGateway()}
        onExit={() => undefined}
        onOpenEvidence={() => undefined}
      />,
    );

    await enterArena();
    await userEvent.click(screen.getByRole("button", { name: "Next round →" }));
    await userEvent.click(screen.getByRole("button", { name: "Next round →" }));

    expect(screen.getByText("Inconclusive")).toBeInTheDocument();
    expect(screen.getByText("Not analyzed")).toBeInTheDocument();
    expect(screen.getAllByText("Confidence unknown")[0]).toBeInTheDocument();
    expect(
      screen.getByText(
        /absence of evidence is not evidence that the capability is absent/i,
      ),
    ).toBeInTheDocument();
    expect(container.querySelectorAll(".round-finding--edge")).toHaveLength(0);
    expect(
      screen.getByText(
        /the recorded values or evidence do not justify a contextual edge/i,
      ),
    ).toBeInTheDocument();
  });
});
