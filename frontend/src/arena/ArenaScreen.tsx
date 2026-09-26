import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { ArcadeGameMode } from "../arcade/types";
import type { ClaimReference } from "../types/catalog";
import type { CanonicalRumbleResult, RumbleGateway } from "../types/rumble";
import { FighterPanel } from "./FighterPanel";
import { RoundCard } from "./RoundCard";
import { RoundStepper } from "./RoundStepper";
import { RumbleRecap } from "./RumbleRecap";
import { shortDate } from "./arenaPresentation";
import "../styles/arena.css";

const ArcadeGame = lazy(() =>
  import("../arcade").then((module) => ({ default: module.ArcadeGame })),
);

type ArenaStage = "loading" | "intro" | "arcade" | "round" | "recap" | "error";

export interface ArenaScreenProps {
  projectIds: readonly string[];
  onExit: () => void;
  onOpenEvidence: (
    reference: ClaimReference,
    trigger: HTMLButtonElement,
  ) => void;
  gateway: RumbleGateway;
}

export function ArenaScreen({
  projectIds,
  onExit,
  onOpenEvidence,
  gateway,
}: ArenaScreenProps) {
  const [stage, setStage] = useState<ArenaStage>("loading");
  const [session, setSession] = useState<CanonicalRumbleResult | null>(null);
  const [activeRound, setActiveRound] = useState(0);
  const [arcadeMode, setArcadeMode] = useState<ArcadeGameMode>("solo");
  const [arcadePhase, setArcadePhase] = useState(0);
  const [arcadeStatus, setArcadeStatus] = useState("Arcade match ready.");
  const [error, setError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const projectAId = projectIds[0];
  const projectBId = projectIds[1];

  useEffect(() => {
    let cancelled = false;

    async function loadArena() {
      setStage("loading");
      setSession(null);
      setError(null);
      setActiveRound(0);

      if (
        !projectAId ||
        !projectBId ||
        projectAId === projectBId ||
        projectIds.length !== 2
      ) {
        setError(
          "Choose two different catalog projects to enter Rumble Arena.",
        );
        setStage("error");
        return;
      }

      try {
        const result = await gateway.load();
        const entrants = result.projection.entrants.map(
          (entrant) => entrant.project_id,
        );
        if (
          entrants.length !== 2 ||
          new Set(entrants).size !== 2 ||
          !entrants.includes(projectAId) ||
          !entrants.includes(projectBId)
        ) {
          throw new Error(
            "The comparison does not match the selected projects.",
          );
        }
        if (result.projection.rounds.length === 0) {
          throw new Error(
            "The comparison does not contain any playable rounds.",
          );
        }
        if (!cancelled) {
          setSession(result);
          setStage("intro");
        }
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Rumble Arena could not be prepared.",
          );
          setStage("error");
        }
      }
    }

    void loadArena();
    return () => {
      cancelled = true;
    };
  }, [gateway, loadAttempt, projectAId, projectBId, projectIds.length]);

  useEffect(() => {
    if (stage === "loading") return;
    window.requestAnimationFrame(() => stageRef.current?.focus());
  }, [activeRound, stage]);

  const startRumble = () => {
    setActiveRound(0);
    setStage("round");
  };

  const startArcade = (mode: ArcadeGameMode, fullscreen = false) => {
    if (fullscreen) {
      const fullscreenTarget = stageRef.current;
      if (!fullscreenTarget?.requestFullscreen) {
        setArcadeStatus(
          "Fullscreen is unavailable in this browser. The fight still started.",
        );
      } else {
        void fullscreenTarget.requestFullscreen().catch(() => {
          setArcadeStatus(
            "Fullscreen was blocked. Use Enter fullscreen in the cabinet toolbar.",
          );
        });
      }
    }
    setArcadeMode(mode);
    setArcadePhase(0);
    if (!fullscreen) {
      setArcadeStatus(
        mode === "solo" ? "Solo match loading." : "Local match loading.",
      );
    }
    setStage("arcade");
  };

  const advanceRound = () => {
    if (!session) return;
    if (activeRound >= session.projection.rounds.length - 1) {
      setStage("recap");
      return;
    }
    setActiveRound((current) => current + 1);
  };

  const replay = () => {
    setActiveRound(0);
    setStage("intro");
  };

  if (stage === "loading") {
    return (
      <section
        className="arena-screen arena-screen--state"
        aria-labelledby="arena-loading-title"
      >
        <div className="arena-loader" aria-hidden="true">
          <span>A</span>
          <span>VS</span>
          <span>B</span>
        </div>
        <h1 id="arena-loading-title">Preparing the evidence ring…</h1>
        <p role="status">
          Loading the pinned card comparison and its contextual rounds.
        </p>
        <button className="button button--quiet" type="button" onClick={onExit}>
          Cancel
        </button>
      </section>
    );
  }

  if (stage === "error" || !session) {
    return (
      <section
        className="arena-screen arena-screen--state arena-screen--error"
        aria-labelledby="arena-error-title"
      >
        <span className="arena-state-mark" aria-hidden="true">
          !
        </span>
        <h1 id="arena-error-title">This matchup missed the bell.</h1>
        <p role="alert">{error ?? "Rumble Arena could not be prepared."}</p>
        <div className="arena-state-actions">
          <button
            className="button button--primary"
            type="button"
            onClick={() => setLoadAttempt((value) => value + 1)}
          >
            Try again
          </button>
          <button
            className="button button--quiet"
            type="button"
            onClick={onExit}
          >
            Return to catalog
          </button>
        </div>
      </section>
    );
  }

  const projection = session.projection;
  const entrantA = projection.entrants[0];
  const entrantB = projection.entrants[1];
  const round = projection.rounds[activeRound];
  if (!entrantA || !entrantB || !round) {
    return null;
  }
  const arcadeRound = projection.rounds[arcadePhase] ?? projection.rounds[0];

  return (
    <section className="arena-screen" aria-label="Rumble Arena">
      <header className="arena-toolbar">
        <div>
          <span>Rumble Arena</span>
          <strong>{session.matchup.display_label}</strong>
        </div>
        <button className="arena-toolbar__exit" type="button" onClick={onExit}>
          Exit arena ×
        </button>
      </header>

      <div className="arena-source" role="note">
        <strong>Pinned canonical card comparison</strong>
        <span>
          Assessment Context ·{" "}
          {shortDate(projection.assessment_context.assessed_at)}
        </span>
      </div>

      <div
        className="arena-stage"
        ref={stageRef}
        tabIndex={-1}
        aria-live={stage === "arcade" ? "off" : "polite"}
      >
        {stage === "intro" && (
          <div className="arena-intro">
            <div className="arena-intro__heading">
              <span>Canonical comparison · no power scores</span>
              <h1>{projection.assessment_context.title}</h1>
              <p>{projection.assessment_context.use_case}</p>
            </div>

            <div className="fighter-select" aria-label="Rumble entrants">
              <FighterPanel entrant={entrantA} corner="left" />
              <div className="fighter-select__versus" aria-hidden="true">
                <span>VS</span>
                <small>context only</small>
              </div>
              <FighterPanel entrant={entrantB} corner="right" />
            </div>

            <div className="arena-context">
              <div>
                <span>Assessment Context</span>
                <h2>What the bell is judging</h2>
                <p>{projection.role_notice}</p>
              </div>
              <ul>
                {projection.assessment_context.requirements.map(
                  (requirement) => (
                    <li key={requirement}>{requirement}</li>
                  ),
                )}
              </ul>
              {projection.assessment_context.organizational_constraints.length >
                0 && (
                <div className="arena-context__constraints">
                  <strong>Constraints</strong>
                  {projection.assessment_context.organizational_constraints.join(
                    " · ",
                  )}
                </div>
              )}
            </div>

            <section
              className="arcade-launch"
              aria-labelledby="arcade-launch-title"
            >
              <div>
                <span>Classic 2D versus-fighter mode</span>
                <h2 id="arcade-launch-title">Choose your project fighter.</h2>
                <p>
                  Each fighter keeps its exact project name. Guard, jab, and use
                  a signature attack; take two rounds by depleting the
                  opponent's HP. Inconclusive comparisons use neutral move
                  themes.
                </p>
              </div>
              <div className="arcade-launch__actions">
                <button
                  className="button button--primary arena-start"
                  type="button"
                  onClick={() => startArcade("solo")}
                >
                  Enter solo fight →
                </button>
                <button
                  className="button button--arcade-secondary"
                  type="button"
                  onClick={() => startArcade("local")}
                >
                  Local 2-player
                </button>
                <button
                  className="button button--arcade-secondary"
                  type="button"
                  onClick={() => startArcade("solo", true)}
                >
                  Solo fullscreen ⛶
                </button>
                <button
                  className="button button--quiet"
                  type="button"
                  onClick={startRumble}
                >
                  Guided evidence tour →
                </button>
              </div>
              <p className="arcade-launch__boundary">
                Signature attacks have equal damage and cooldown budgets. HP,
                round score, KO, and the player result remain entertainment
                state—not project evidence, fit, or a universal project winner.
              </p>
            </section>
          </div>
        )}

        {stage === "arcade" && (
          <div className="arena-arcade">
            <p className="arena-arcade__boundary" role="note">
              HP and round result = entertainment state. Project conclusions
              come only from the pinned comparison and its evidence.
            </p>
            <Suspense
              fallback={
                <div className="arena-arcade__loading" role="status">
                  Powering up the arcade cabinet…
                </div>
              }
            >
              <ArcadeGame
                entrants={projection.entrants}
                rounds={projection.rounds}
                mode={arcadeMode}
                onExit={() => setStage("intro")}
                onPhaseChange={setArcadePhase}
                onStatusChange={(status) => setArcadeStatus(status.message)}
              />
            </Suspense>
            {arcadeRound && (
              <aside
                className="arcade-evidence-bridge"
                aria-labelledby="arcade-evidence-title"
              >
                <div>
                  <span>
                    Read-only comparison phase {arcadePhase + 1} of{" "}
                    {projection.rounds.length}
                  </span>
                  <h2 id="arcade-evidence-title">{arcadeRound.title}</h2>
                  <p>{arcadeRound.requirement}</p>
                </div>
                <button
                  className="button button--quiet"
                  type="button"
                  onClick={() => {
                    setActiveRound(arcadePhase);
                    setStage("round");
                  }}
                >
                  End match and inspect this evidence round →
                </button>
              </aside>
            )}
            <p className="visually-hidden" aria-live="polite">
              {arcadeStatus}
            </p>
          </div>
        )}

        {stage === "round" && (
          <div className="arena-round">
            <RoundStepper
              rounds={projection.rounds}
              activeIndex={activeRound}
            />
            <RoundCard
              key={round.round_id}
              round={round}
              entrants={projection.entrants}
              claims={session.matchup.claims}
              isFinalRound={activeRound === projection.rounds.length - 1}
              onAdvance={advanceRound}
              onOpenEvidence={onOpenEvidence}
            />
          </div>
        )}

        {stage === "recap" && (
          <RumbleRecap
            projection={projection}
            onReplay={replay}
            onExit={onExit}
          />
        )}
      </div>

      <footer className="arena-coverage">
        <strong>Coverage notice</strong>
        <p>
          Up to twelve rows from the same canonical comparison. Textual facts
          alone do not establish a contextual advantage. Inspect the full
          comparison for all fields and recorded assessment contexts.
        </p>
      </footer>
    </section>
  );
}
