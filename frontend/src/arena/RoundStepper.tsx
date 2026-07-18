import type { RumbleRound } from "../types/rumble";

interface RoundStepperProps {
  rounds: RumbleRound[];
  activeIndex: number;
}

export function RoundStepper({ rounds, activeIndex }: RoundStepperProps) {
  return (
    <nav className="round-stepper" aria-label="Rumble rounds">
      <ol>
        {rounds.map((round, index) => {
          const state = index < activeIndex ? "complete" : index === activeIndex ? "active" : "upcoming";
          return (
            <li className={`round-stepper__item round-stepper__item--${state}`} key={round.round_id}>
              <span className="round-stepper__number" aria-hidden="true">
                {state === "complete" ? "✓" : String(round.round_number).padStart(2, "0")}
              </span>
              <span>
                <strong>Round {round.round_number}</strong>
                <small>{round.label}</small>
              </span>
              {state === "active" && <span className="visually-hidden">Current round</span>}
              {state === "complete" && <span className="visually-hidden">Complete</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
