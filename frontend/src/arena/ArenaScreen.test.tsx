import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BundledRumbleGateway } from "../data/rumbleGateway";
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
      <button type="button" onClick={() => onPhaseChange?.(1)}>Advance test phase</button>
      <button type="button" onClick={onExit}>Exit test arcade</button>
    </section>
  ),
}));

const projectIds = [
  "project-openai-openai-agents-python",
  "project-langchain-ai-langgraph",
] as const;

async function enterArena() {
  await screen.findByRole("heading", { name: "Internal support agent proof of concept" });
  await userEvent.click(screen.getByRole("button", { name: "Guided evidence tour →" }));
}

describe("ArenaScreen", () => {
  it("opens a neutral gameplay-only arena for any other catalog pair", async () => {
    render(
      <ArenaScreen
        projectIds={["project-crewaiinc-crewai", "project-eigent-ai-eigent"]}
        projectNames={["CrewAI", "Eigent"]}
        gateway={new BundledRumbleGateway()}
        onExit={() => undefined}
        onOpenEvidence={() => undefined}
      />,
    );

    expect(await screen.findByRole("heading", { name: "CrewAI vs Eigent" }))
      .toBeInTheDocument();
    expect(screen.getByText("Gameplay-only exhibition", { selector: "strong" }))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enter solo fight →" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Guided evidence tour →" }))
      .not.toBeInTheDocument();
  });

  it("plays all prepared rounds, opens evidence, and reaches a no-winner recap", async () => {
    const user = userEvent.setup();
    const onOpenEvidence = vi.fn();
    const onExit = vi.fn();
    render(
      <ArenaScreen
        projectIds={projectIds}
        gateway={new BundledRumbleGateway()}
        onExit={onExit}
        onOpenEvidence={onOpenEvidence}
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "Internal support agent proof of concept" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Bundled fallback in play")).toBeInTheDocument();
    expect(screen.getByLabelText("OpenAI Agents SDK for Python, left corner")).toHaveTextContent(
      "65886fa16dcdb482090b30b74de1d0cc80b9f4c6",
    );
    expect(screen.getByLabelText("LangGraph, right corner")).toHaveTextContent(
      "49ae27c2ae983cfb92091b0dea9f7bc37a716479",
    );
    expect(screen.getByRole("button", { name: "Enter solo fight →" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Local 2-player" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Solo fullscreen ⛶" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Guided evidence tour →" })).toBeEnabled();
    expect(screen.getByText(/each fighter keeps its exact project name/i)).toBeInTheDocument();
    expect(screen.getByText(/equally budgeted game identities/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Guided evidence tour →" }));
    expect(
      screen.getByRole("heading", { name: "Round 1: Capability Clash" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Approval Gate Smackdown")).not.toHaveLength(0);
    expect(screen.getByText("Contextual edge · left corner")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /inspect evidence for functiontool exposes an always-on/i,
      }),
    );
    expect(onOpenEvidence).toHaveBeenCalledTimes(1);
    expect(onOpenEvidence.mock.calls[0]?.[0]).toMatchObject({
      id: "evidence-openai-function-tool-needs-approval",
      projectId: "openai-agents-sdk",
      verificationStatus: "statically_confirmed",
      confidence: "high",
      repository: "openai/openai-agents-python",
    });

    await user.click(screen.getByRole("button", { name: "Next round →" }));
    expect(
      screen.getByRole("heading", { name: "Round 2: Operations Endgame" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Restart Comeback Combo")).not.toHaveLength(0);
    expect(screen.getByText("Contextual edge · right corner")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next round →" }));
    expect(
      screen.getByRole("heading", { name: "Round 3: Integration Grapple" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "See contextual recap →" }));
    expect(
      screen.getByRole("heading", { name: "The bell rings. The decision stays yours." }),
    ).toBeInTheDocument();
    expect(screen.getByText("No overall project result")).toBeInTheDocument();
    expect(screen.getByText(/the rounds are not totaled/i)).toBeInTheDocument();
    expect(screen.queryByText(/^winner$/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Gather more evidence" }));
    expect(screen.getByText("Recorded locally: Gather more evidence.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Replay this matchup ↻" }));
    expect(
      screen.getByRole("heading", { name: "Internal support agent proof of concept" }),
    ).toBeInTheDocument();
  });

  it("launches solo arcade play and bridges a live game phase back to evidence", async () => {
    const user = userEvent.setup();
    render(
      <ArenaScreen
        projectIds={projectIds}
        gateway={new BundledRumbleGateway()}
        onExit={() => undefined}
        onOpenEvidence={() => undefined}
      />,
    );

    await screen.findByRole("heading", { name: "Internal support agent proof of concept" });
    await user.click(screen.getByRole("button", { name: "Enter solo fight →" }));

    expect(
      await screen.findByRole("heading", { name: "Arcade match · solo" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/entertainment state/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Advance test phase" }));
    expect(screen.getByText("Round 2: Operations Endgame")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "End match and inspect this evidence round →",
      }),
    );
    expect(screen.getAllByText("Restart Comeback Combo").length).toBeGreaterThan(0);
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
        gateway={new BundledRumbleGateway()}
        onExit={() => undefined}
        onOpenEvidence={() => undefined}
      />,
    );

    await screen.findByRole("heading", { name: "Internal support agent proof of concept" });
    await user.click(screen.getByRole("button", { name: "Solo fullscreen ⛶" }));

    expect(requestFullscreen).toHaveBeenCalledOnce();
    expect(await screen.findByRole("heading", { name: "Arcade match · solo" }))
      .toBeInTheDocument();
  });

  it("keeps a no-evidence round inconclusive and does not style either project as having an edge", async () => {
    const { container } = render(
      <ArenaScreen
        projectIds={projectIds}
        gateway={new BundledRumbleGateway()}
        onExit={() => undefined}
        onOpenEvidence={() => undefined}
      />,
    );

    await enterArena();
    await userEvent.click(screen.getByRole("button", { name: "Next round →" }));
    await userEvent.click(screen.getByRole("button", { name: "Next round →" }));

    expect(screen.getAllByText("Audit Bell-Ringer")).not.toHaveLength(0);
    expect(screen.getByText("Inconclusive")).toBeInTheDocument();
    expect(screen.getByText("No evidence found")).toBeInTheDocument();
    expect(screen.getByText("Confidence unknown")).toBeInTheDocument();
    expect(
      screen.getByText(/absence of evidence is not evidence that the capability is absent/i),
    ).toBeInTheDocument();
    expect(container.querySelectorAll(".round-finding--edge")).toHaveLength(0);
    expect(screen.getByText(/the recorded values or evidence do not justify a contextual edge/i))
      .toBeInTheDocument();
  });
});
