import { useState } from "react";
import type { RumbleProjectionResponse } from "../types/rumble";
import { verdictPresentation } from "./arenaPresentation";

interface RumbleRecapProps {
  projection: RumbleProjectionResponse;
  onReplay: () => void;
  onExit: () => void;
}

export function RumbleRecap({ projection, onReplay, onExit }: RumbleRecapProps) {
  const [ringCall, setRingCall] = useState<string | null>(null);
  const entrantA = projection.entrants[0];
  const entrantB = projection.entrants[1];
  if (!entrantA || !entrantB) return null;

  const options = [
    `Prototype with ${entrantA.project_name}`,
    `Prototype with ${entrantB.project_name}`,
    "Explore a combination",
    "Gather more evidence",
  ];

  return (
    <section className="rumble-recap" aria-labelledby="rumble-recap-title">
      <div className="rumble-recap__hero">
        <span className="rumble-recap__bell" aria-hidden="true">◇</span>
        <div>
          <span>Contextual recap</span>
          <h2 id="rumble-recap-title" tabIndex={-1}>
            The bell rings. The decision stays yours.
          </h2>
          <p>{projection.ring_call}</p>
        </div>
      </div>

      <div className="rumble-recap__notice">
        <strong>No overall project result</strong>
        <p>
          The rounds are not totaled. An edge belongs only to its stated requirement and
          Assessment Context; it is not a universal project judgment.
        </p>
      </div>

      <ol className="recap-rounds" aria-label="Contextual round calls">
        {projection.rounds.map((round) => {
          const verdict = verdictPresentation[round.verdict];
          return (
            <li key={round.round_id}>
              <span className={`recap-rounds__marker recap-rounds__marker--${verdict.tone}`} aria-hidden="true">
                {verdict.symbol}
              </span>
              <div>
                <span>{round.title} · {round.label}</span>
                <strong>{verdict.label}</strong>
                <p>{round.callout}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <section className="ring-choice" aria-labelledby="ring-choice-title">
        <div>
          <span>Optional ring call</span>
          <h3 id="ring-choice-title">What would you explore next?</h3>
          <p>
            This preference stays in the interface. It does not change either canonical
            Agent Project Card.
          </p>
        </div>
        <div className="ring-choice__options">
          {options.map((option) => (
            <button
              type="button"
              key={option}
              aria-pressed={ringCall === option}
              onClick={() => setRingCall(option)}
            >
              {option}
            </button>
          ))}
        </div>
        <p className="ring-choice__status" aria-live="polite">
          {ringCall ? `Recorded locally: ${ringCall}.` : "No preference recorded."}
        </p>
      </section>

      <div className="rumble-recap__actions">
        <button className="button button--primary" type="button" onClick={onReplay}>
          Replay this matchup ↻
        </button>
        <button className="button button--quiet" type="button" onClick={onExit}>
          Return to catalog
        </button>
      </div>
    </section>
  );
}
