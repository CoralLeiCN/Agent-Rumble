import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { RumbleRound } from "../types/rumble";
import {
  ARCADE_MAX_HEALTH,
  ARCADE_RESULT_DISCLAIMER,
  ARCADE_ROUND_DURATION_SECONDS,
  ARCADE_ROUNDS_TO_WIN,
  deriveSignatureMoves,
} from "./arcadeLogic";
import type { ArcadeRuntime } from "./runtime";
import type {
  ArcadeGameProps,
  ArcadeGameResult,
  ArcadeLiveStatus,
  ArcadeVirtualAction,
} from "./types";
import "./arcade.css";

function cellValue(round: RumbleRound, corner: "entrant_a" | "entrant_b"): string {
  const cell = round[corner];
  if (cell.state !== "value") return cell.state.replaceAll("_", " ");
  return cell.value?.trim() || "No display value";
}

function playerResultLabel(result: ArcadeGameResult, solo: boolean): string {
  if (result.winner === "draw") {
    return result.reason === "double_ko"
      ? "DOUBLE KO — the exhibition is a draw"
      : "TIME UP — the exhibition is a draw";
  }
  const winner = result.fighters.find((fighter) => fighter.controller === result.winner);
  const fighterName = winner?.avatarName ?? (solo ? "CPU fighter" : "Player 2 fighter");
  if (result.reason === "ko") return `${fighterName} wins the exhibition by KO`;
  if (result.reason === "time") return `${fighterName} wins the exhibition by time decision`;
  return `${fighterName} wins the exhibition after a double-KO round`;
}

function healthPercent(health: number): number {
  return Math.max(0, Math.min(ARCADE_MAX_HEALTH, Math.round(health)));
}

function healthTone(health: number): string {
  if (health <= 25) return " is-critical";
  if (health <= 50) return " is-warn";
  return "";
}

export function ArcadeGame({
  entrants,
  rounds,
  mode = "solo",
  onExit,
  onStatusChange,
  onPhaseChange,
  onGameOver,
}: ArcadeGameProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<ArcadeRuntime | null>(null);
  const callbacksRef = useRef({ onStatusChange, onPhaseChange, onGameOver });
  callbacksRef.current = { onStatusChange, onPhaseChange, onGameOver };
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeRoundIndex, setActiveRoundIndex] = useState(0);
  const [result, setResult] = useState<ArcadeGameResult | null>(null);
  const [liveStatus, setLiveStatus] = useState<ArcadeLiveStatus>({
    message: "Loading the arcade cabinet…",
    remainingSeconds: ARCADE_ROUND_DURATION_SECONDS,
    phase: 0,
    paused: false,
    health: [ARCADE_MAX_HEALTH, ARCADE_MAX_HEALTH],
    roundsWon: [0, 0],
    roundNumber: 1,
  });
  const entrantA = entrants[0];
  const entrantB = entrants[1];
  const hasValidMatch = entrants.length === 2 && Boolean(entrantA && entrantB && rounds.length > 0);

  useEffect(() => {
    if (!hasValidMatch || !entrantA || !entrantB || !hostRef.current) return;
    let disposed = false;
    const host = hostRef.current;
    setReady(false);
    setPaused(false);
    setResult(null);
    setError(null);

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    void import("./runtime")
      .then(({ createArcadeRuntime }) => {
        if (disposed) return;
        const runtime = createArcadeRuntime(host, {
          entrants: [entrantA, entrantB],
          rounds,
          mode,
          reducedMotion: reduceMotion,
          callbacks: {
            onReady: () => {
              if (disposed) return;
              setResult(null);
              setPaused(false);
              setActiveRoundIndex(0);
              setReady(true);
              window.requestAnimationFrame(() => runtimeRef.current?.focus());
            },
            onStatusChange: (status) => {
              if (disposed) return;
              setLiveStatus(status);
              callbacksRef.current.onStatusChange?.(status);
            },
            onPhaseChange: (roundIndex) => {
              if (disposed) return;
              setActiveRoundIndex(roundIndex);
              callbacksRef.current.onPhaseChange?.(roundIndex);
            },
            onGameOver: (gameResult) => {
              if (disposed) return;
              setResult(gameResult);
              callbacksRef.current.onGameOver?.(gameResult);
            },
            onPauseChange: (isPaused) => {
              if (!disposed) setPaused(isPaused);
            },
          },
        });
        runtimeRef.current = runtime;
      })
      .catch((caught: unknown) => {
        if (disposed) return;
        setError(caught instanceof Error ? caught.message : "The arcade engine could not start.");
      });

    const pauseForVisibility = () => {
      if (document.hidden) runtimeRef.current?.setPaused(true);
    };
    const pauseForBlur = () => runtimeRef.current?.setPaused(true);
    document.addEventListener("visibilitychange", pauseForVisibility);
    window.addEventListener("blur", pauseForBlur);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", pauseForVisibility);
      window.removeEventListener("blur", pauseForBlur);
      runtimeRef.current?.destroy();
      runtimeRef.current = null;
      host.replaceChildren();
    };
  }, [entrantA, entrantB, hasValidMatch, mode, rounds]);

  const togglePause = () => {
    const nextPaused = runtimeRef.current?.togglePause() ?? paused;
    setPaused(nextPaused);
    runtimeRef.current?.focus();
  };

  const restart = () => {
    setResult(null);
    setPaused(false);
    setActiveRoundIndex(0);
    runtimeRef.current?.restart();
    runtimeRef.current?.focus();
  };

  const setVirtualAction = (action: ArcadeVirtualAction, pressed: boolean) => {
    runtimeRef.current?.setVirtualAction(action, pressed);
    runtimeRef.current?.focus();
  };

  if (!hasValidMatch || !entrantA || !entrantB) {
    return (
      <section className="arcade-game arcade-game--state" aria-labelledby="arcade-error-title">
        <span aria-hidden="true">NO CONTEST</span>
        <h2 id="arcade-error-title">The arcade cabinet needs two entrants and one prepared round.</h2>
        <p>Return to the prepared matchup, then enter Arcade Mode again.</p>
        {onExit && <button type="button" onClick={onExit}>Return to arena</button>}
      </section>
    );
  }

  const activeRound = rounds[Math.min(activeRoundIndex, rounds.length - 1)];
  const signatureMoves = deriveSignatureMoves([entrantA, entrantB], rounds);
  const leftHealth = healthPercent(liveStatus.health[0]);
  const rightHealth = healthPercent(liveStatus.health[1]);

  return (
    <section className="arcade-game arcade-game--versus" aria-label="Agent Rumble versus-fighter exhibition">
      <header className="arcade-game__toolbar">
        <div>
          <span className="arcade-game__eyebrow">Rumble Fighters · {mode === "solo" ? "Solo vs CPU" : "Local 2-player"}</span>
          <h2>{entrantA.project_name} <em>vs</em> {entrantB.project_name}</h2>
        </div>
        <div className="arcade-game__actions">
          <button type="button" disabled={!ready || Boolean(result)} onClick={togglePause}>
            {paused ? "Resume" : "Pause"} <kbd>P</kbd>/<kbd>Esc</kbd>
          </button>
          <button type="button" disabled={!ready} onClick={restart}>Restart <kbd>R</kbd></button>
          <button
            type="button"
            disabled={!ready}
            aria-label="Enter or exit fullscreen"
            onClick={() => runtimeRef.current?.toggleFullscreen()}
          >
            Enter fullscreen ⛶
          </button>
          {onExit && <button type="button" onClick={onExit}>Exit ×</button>}
        </div>
      </header>

      <div className="arcade-game__cabinet">
        <div className="arcade-fight-hud" aria-label="Live fighter health and round score">
          <div className="arcade-fight-hud__fighter arcade-fight-hud__fighter--left">
            <div className="arcade-fight-hud__name-row">
              <strong>{entrantA.project_name}</strong>
              <span aria-label={`${entrantA.project_name}: ${liveStatus.roundsWon[0]} rounds won`}>
                {Array.from({ length: ARCADE_ROUNDS_TO_WIN }, (_, index) => (
                  <i key={index} className={index < liveStatus.roundsWon[0] ? "is-won" : ""} aria-hidden="true" />
                ))}
              </span>
            </div>
            <div
              className={`arcade-fight-hud__health${healthTone(leftHealth)}`}
              role="progressbar"
              aria-label={`${entrantA.project_name} HP`}
              aria-valuemin={0}
              aria-valuemax={ARCADE_MAX_HEALTH}
              aria-valuenow={leftHealth}
              aria-valuetext={`${leftHealth} HP remaining`}
            >
              <span style={{ "--fighter-health": `${leftHealth}%` } as CSSProperties} />
            </div>
            <small>{leftHealth} HP</small>
          </div>

          <div className="arcade-fight-hud__round">
            <small>Round</small>
            <strong>{liveStatus.roundNumber}</strong>
            <time>{String(liveStatus.remainingSeconds).padStart(2, "0")}</time>
          </div>

          <div className="arcade-fight-hud__fighter arcade-fight-hud__fighter--right">
            <div className="arcade-fight-hud__name-row">
              <span aria-label={`${entrantB.project_name}: ${liveStatus.roundsWon[1]} rounds won`}>
                {Array.from({ length: ARCADE_ROUNDS_TO_WIN }, (_, index) => (
                  <i key={index} className={index < liveStatus.roundsWon[1] ? "is-won" : ""} aria-hidden="true" />
                ))}
              </span>
              <strong>{entrantB.project_name}</strong>
            </div>
            <div
              className={`arcade-fight-hud__health${healthTone(rightHealth)}`}
              role="progressbar"
              aria-label={`${entrantB.project_name} HP`}
              aria-valuemin={0}
              aria-valuemax={ARCADE_MAX_HEALTH}
              aria-valuenow={rightHealth}
              aria-valuetext={`${rightHealth} HP remaining`}
            >
              <span style={{ "--fighter-health": `${rightHealth}%` } as CSSProperties} />
            </div>
            <small>{rightHealth} HP</small>
          </div>
        </div>

        <div
          ref={hostRef}
          className="arcade-game__canvas"
          aria-label="Playable two-dimensional versus-fighter canvas"
          aria-describedby="arcade-controls arcade-distinction"
          onClick={() => runtimeRef.current?.focus()}
        />
        {!ready && !error && <div className="arcade-game__loading" role="status">INSERT RUMBLE TOKEN…</div>}
        {error && <div className="arcade-game__loading arcade-game__loading--error" role="alert">Cabinet fault: {error}</div>}

        <div className="arcade-touch" aria-label="Player 1 touch controls">
          <div className="arcade-touch__movement">
            <button
              type="button"
              aria-label="Move Player 1 left"
              onPointerDown={() => setVirtualAction("left", true)}
              onPointerUp={() => setVirtualAction("left", false)}
              onPointerCancel={() => setVirtualAction("left", false)}
              onPointerLeave={() => setVirtualAction("left", false)}
            >←</button>
            <button
              type="button"
              aria-label="Move Player 1 right"
              onPointerDown={() => setVirtualAction("right", true)}
              onPointerUp={() => setVirtualAction("right", false)}
              onPointerCancel={() => setVirtualAction("right", false)}
              onPointerLeave={() => setVirtualAction("right", false)}
            >→</button>
          </div>
          <div className="arcade-touch__moves">
            <button
              type="button"
              onPointerDown={() => setVirtualAction("jump", true)}
              onPointerUp={() => setVirtualAction("jump", false)}
              onPointerCancel={() => setVirtualAction("jump", false)}
              onPointerLeave={() => setVirtualAction("jump", false)}
            >Jump</button>
            <button
              type="button"
              onPointerDown={() => setVirtualAction("attack", true)}
              onPointerUp={() => setVirtualAction("attack", false)}
              onPointerCancel={() => setVirtualAction("attack", false)}
              onPointerLeave={() => setVirtualAction("attack", false)}
            >Jab</button>
            <button
              type="button"
              className="arcade-touch__special"
              onPointerDown={() => setVirtualAction("special", true)}
              onPointerUp={() => setVirtualAction("special", false)}
              onPointerCancel={() => setVirtualAction("special", false)}
              onPointerLeave={() => setVirtualAction("special", false)}
            >Trait</button>
            <button
              type="button"
              className="arcade-touch__guard"
              onPointerDown={() => setVirtualAction("block", true)}
              onPointerUp={() => setVirtualAction("block", false)}
              onPointerCancel={() => setVirtualAction("block", false)}
              onPointerLeave={() => setVirtualAction("block", false)}
            >Guard</button>
          </div>
        </div>
      </div>

      <div className="arcade-game__status" role="status" aria-live="polite">
        <span>R{liveStatus.roundNumber}</span>
        <p>{liveStatus.message}</p>
      </div>

      <section className="arcade-signatures" aria-labelledby="arcade-signatures-title">
        <div className="arcade-signatures__heading">
          <span>Fighter select</span>
          <h3 id="arcade-signatures-title">Contextual trait specials</h3>
          <p>Different delivery, equal damage budget. Comparison findings theme the moves; they do not make either fighter stronger.</p>
        </div>
        {signatureMoves.map((move, index) => (
          <article className={`arcade-signature arcade-signature--${index === 0 ? "left" : "right"}`} key={`${move.projectName}-${index}`}>
            <span>{move.contextualEdge ? "Contextual edge trait" : "Neutral exhibition trait"}</span>
            <h4>{move.projectName}</h4>
            <strong>{move.moveName}</strong>
            <p>{move.description}</p>
            <dl>
              <div><dt>Trait theme</dt><dd>{move.traitValue}</dd></div>
              <div><dt>Attack form</dt><dd>{move.style}</dd></div>
              <div>
                <dt>Comparison row</dt>
                <dd>{move.contextualEdge ? (rounds[move.sourceRoundIndex]?.title ?? move.sourceRoundId) : "No contextual edge used"}</dd>
              </div>
            </dl>
          </article>
        ))}
      </section>

      <div className="arcade-game__lower">
        <div className="arcade-controls" id="arcade-controls">
          <div>
            <strong>Player 1</strong>
            <span><kbd>A</kbd><kbd>D</kbd> move · <kbd>W</kbd> jump · <kbd>F</kbd> jab · <kbd>G</kbd> trait · <kbd>S</kbd> guard</span>
          </div>
          <div>
            <strong>{mode === "solo" ? "Player 2 · CPU controlled" : "Player 2"}</strong>
            <span>{mode === "solo" ? "CPU uses the same balanced jab, guard, and trait-move rules" : <><kbd>←</kbd><kbd>→</kbd> move · <kbd>↑</kbd> jump · <kbd>M</kbd> jab · <kbd>N</kbd> trait · <kbd>↓</kbd> guard</>}</span>
          </div>
        </div>

        {activeRound && (
          <aside className="arcade-evidence-round" aria-labelledby="arcade-phase-title">
            <div>
              <span>Read-only evidence round {activeRoundIndex + 1} / {rounds.length}</span>
              <h3 id="arcade-phase-title">{activeRound.title}</h3>
              <p>{activeRound.requirement}</p>
            </div>
            <dl>
              <div>
                <dt>{entrantA.project_name}</dt>
                <dd>{cellValue(activeRound, "entrant_a")}</dd>
              </div>
              <div>
                <dt>{entrantB.project_name}</dt>
                <dd>{cellValue(activeRound, "entrant_b")}</dd>
              </div>
            </dl>
            <p className="arcade-evidence-round__callout">Prepared evidence call: {activeRound.callout}</p>
          </aside>
        )}
      </div>

      <p className="arcade-game__distinction" id="arcade-distinction">
        <strong>Game state is not project judgment:</strong> HP, round score, KO, time, and the player result come only from controller/CPU actions. Prepared comparison traits supply names and distinct move forms, with an equal damage budget; the evidence projection never changes fighter power.
      </p>

      {result && (
        <div className="arcade-result" role="status" aria-live="assertive">
          <span>Player/exhibition outcome</span>
          <strong>{playerResultLabel(result, mode === "solo")}</strong>
          <p className="arcade-result__score">
            {result.fighters[0].avatarName} {result.fighters[0].roundsWon}–{result.fighters[1].roundsWon} {result.fighters[1].avatarName}
          </p>
          <p>{ARCADE_RESULT_DISCLAIMER}</p>
          <button type="button" onClick={restart}>Play again</button>
        </div>
      )}
    </section>
  );
}
