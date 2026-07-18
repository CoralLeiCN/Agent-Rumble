import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { findPreparedMatchup, rumbleGateway } from "../data/rumbleGateway";
import type { ArcadeGameMode } from "../arcade/types";
import type { EvidenceRecord } from "../types/catalog";
import type {
  LoadedRumbleData,
  RumbleDemoBundle,
  RumbleDemoMatchup,
  RumbleGateway,
  RumbleProjectionResponse,
} from "../types/rumble";
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

interface ArenaSession {
  bundle: LoadedRumbleData<RumbleDemoBundle>;
  matchup: RumbleDemoMatchup;
  projection: LoadedRumbleData<RumbleProjectionResponse>;
}

export interface ArenaScreenProps {
  projectIds: readonly string[];
  onExit: () => void;
  onOpenEvidence: (evidence: EvidenceRecord, trigger: HTMLButtonElement) => void;
  gateway?: RumbleGateway;
}

export function ArenaScreen({
  projectIds,
  onExit,
  onOpenEvidence,
  gateway = rumbleGateway,
}: ArenaScreenProps) {
  const [stage, setStage] = useState<ArenaStage>("loading");
  const [session, setSession] = useState<ArenaSession | null>(null);
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

      if (!projectAId || !projectBId || projectAId === projectBId || projectIds.length !== 2) {
        setError("Choose two different prepared catalog projects to enter Rumble Arena.");
        setStage("error");
        return;
      }

      try {
        const bundle = await gateway.getDemo();
        const matchup = findPreparedMatchup(bundle.data, [projectAId, projectBId]);
        if (!matchup) {
          throw new Error("This pair does not have a prepared evidence-backed matchup yet.");
        }
        const projection = await gateway.project(matchup);
        if (projection.data.rounds.length === 0) {
          throw new Error("The prepared matchup does not contain any playable rounds.");
        }
        if (!cancelled) {
          setSession({ bundle, matchup, projection });
          setStage("intro");
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Rumble Arena could not be prepared.");
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
        setArcadeStatus("Fullscreen is unavailable in this browser. The fight still started.");
      } else {
        void fullscreenTarget.requestFullscreen().catch(() => {
          setArcadeStatus("Fullscreen was blocked. Use Enter fullscreen in the cabinet toolbar.");
        });
      }
    }
    setArcadeMode(mode);
    setArcadePhase(0);
    if (!fullscreen) {
      setArcadeStatus(mode === "solo" ? "Solo match loading." : "Local match loading.");
    }
    setStage("arcade");
  };

  const advanceRound = () => {
    if (!session) return;
    if (activeRound >= session.projection.data.rounds.length - 1) {
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
      <section className="arena-screen arena-screen--state" aria-labelledby="arena-loading-title">
        <div className="arena-loader" aria-hidden="true"><span>A</span><span>VS</span><span>B</span></div>
        <h1 id="arena-loading-title">Preparing the evidence ring…</h1>
        <p role="status">Resolving the prepared matchup and projecting contextual rounds.</p>
        <button className="button button--quiet" type="button" onClick={onExit}>Cancel</button>
      </section>
    );
  }

  if (stage === "error" || !session) {
    return (
      <section
        className="arena-screen arena-screen--state arena-screen--error"
        aria-labelledby="arena-error-title"
      >
        <span className="arena-state-mark" aria-hidden="true">!</span>
        <h1 id="arena-error-title">This matchup missed the bell.</h1>
        <p role="alert">{error ?? "Rumble Arena could not be prepared."}</p>
        <div className="arena-state-actions">
          <button className="button button--primary" type="button" onClick={() => setLoadAttempt((value) => value + 1)}>
            Try again
          </button>
          <button className="button button--quiet" type="button" onClick={onExit}>Return to catalog</button>
        </div>
      </section>
    );
  }

  const projection = session.projection.data;
  const entrantA = projection.entrants[0];
  const entrantB = projection.entrants[1];
  const round = projection.rounds[activeRound];
  if (!entrantA || !entrantB || !round) {
    return null;
  }
  const usingFallback =
    session.bundle.source === "bundled_fallback" ||
    session.projection.source === "bundled_fallback";
  const fallbackReason =
    session.bundle.fallbackReason ?? session.projection.fallbackReason;
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

      <div
        className={`arena-source${usingFallback ? " arena-source--fallback" : ""}`}
        role="note"
      >
        <strong>{usingFallback ? "Bundled fallback in play" : "Prepared API matchup"}</strong>
        <span>
          {usingFallback
            ? "The live API was unavailable for part of this session. Results use the clearly labelled bundled snapshot."
            : `${session.bundle.data.fixture_label} · prepared ${shortDate(session.bundle.data.prepared_at)}`}
        </span>
        {usingFallback && fallbackReason && <small title={fallbackReason}>API fallback active</small>}
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
              <span>Prepared exhibition · no power scores</span>
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
                {projection.assessment_context.requirements.map((requirement) => (
                  <li key={requirement}>{requirement}</li>
                ))}
              </ul>
              {projection.assessment_context.organizational_constraints.length > 0 && (
                <div className="arena-context__constraints">
                  <strong>Constraints</strong>
                  {projection.assessment_context.organizational_constraints.join(" · ")}
                </div>
              )}
            </div>

            <section className="arcade-launch" aria-labelledby="arcade-launch-title">
              <div>
                <span>Classic 2D versus-fighter mode</span>
                <h2 id="arcade-launch-title">Choose your project fighter.</h2>
                <p>
                  Each fighter keeps its exact project name. Guard, jab, and unleash
                  a distinct signature attack themed from its contextual comparison edge;
                  take two rounds by depleting the opponent&apos;s HP.
                </p>
              </div>
              <div className="arcade-launch__actions">
                <button className="button button--primary arena-start" type="button" onClick={() => startArcade("solo")}>
                  Enter solo fight →
                </button>
                <button className="button button--arcade-secondary" type="button" onClick={() => startArcade("local")}>
                  Local 2-player
                </button>
                <button className="button button--arcade-secondary" type="button" onClick={() => startArcade("solo", true)}>
                  Solo fullscreen ⛶
                </button>
                <button className="button button--quiet" type="button" onClick={startRumble}>
                  Guided evidence tour →
                </button>
              </div>
              <p className="arcade-launch__boundary">
                Trait specials translate contextual comparison findings into different,
                equally budgeted game identities. HP, round score, KO, and the player
                result remain entertainment state—not project evidence, fit, or a
                universal project winner.
              </p>
            </section>
          </div>
        )}

        {stage === "arcade" && (
          <div className="arena-arcade">
            <p className="arena-arcade__boundary" role="note">
              HP and round result = entertainment state. Move themes come from the
              prepared comparison; project conclusions still come only from its evidence.
            </p>
            <Suspense
              fallback={(
                <div className="arena-arcade__loading" role="status">
                  Powering up the arcade cabinet…
                </div>
              )}
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
              <aside className="arcade-evidence-bridge" aria-labelledby="arcade-evidence-title">
                <div>
                  <span>Read-only comparison phase {arcadePhase + 1} of {projection.rounds.length}</span>
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
            <p className="visually-hidden" aria-live="polite">{arcadeStatus}</p>
          </div>
        )}

        {stage === "round" && (
          <div className="arena-round">
            <RoundStepper rounds={projection.rounds} activeIndex={activeRound} />
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
          <RumbleRecap projection={projection} onReplay={replay} onExit={onExit} />
        )}
      </div>

      <footer className="arena-coverage">
        <strong>Coverage notice</strong>
        <p>{session.bundle.data.coverage_notice}</p>
      </footer>
    </section>
  );
}
