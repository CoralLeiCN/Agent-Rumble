import type { RumbleEntrant, RumbleRound } from "../types/rumble";

export type ArcadeGameMode = "solo" | "local";

export type ArcadeWinner = "player_1" | "player_2" | "cpu" | "draw";

export type ArcadeFinishReason = "ko" | "double_ko" | "time";

export type ArcadeSignatureStyle = "projectile" | "rush" | "uppercut" | "pulse";

export interface ArcadeSignatureMove {
  projectName: string;
  moveName: string;
  style: ArcadeSignatureStyle;
  traitLabel: string;
  traitValue: string;
  sourceRoundId: string;
  sourceRoundIndex: number;
  contextualEdge: boolean;
  description: string;
}

export interface ArcadeFighterResult {
  controller: "player_1" | "player_2" | "cpu";
  avatarName: string;
  health: number;
  roundsWon: number;
  signatureMove: string;
}

/**
 * A result from player input and the arcade simulation. It is deliberately not
 * an assessment, comparison verdict, or statement about either project.
 */
export interface ArcadeGameResult {
  kind: "arcade_exhibition";
  winner: ArcadeWinner;
  reason: ArcadeFinishReason;
  fighters: readonly [ArcadeFighterResult, ArcadeFighterResult];
  disclaimer: string;
}

export interface ArcadeLiveStatus {
  message: string;
  remainingSeconds: number;
  phase: number;
  paused: boolean;
  health: readonly [number, number];
  roundsWon: readonly [number, number];
  roundNumber: number;
}

export interface ArcadeGameProps {
  /** Exactly two card-derived entrants are required to start a match. */
  entrants: readonly RumbleEntrant[];
  /** Prepared comparison rows theme signature moves but never change move power. */
  rounds: readonly RumbleRound[];
  mode?: ArcadeGameMode;
  onExit?: () => void;
  onStatusChange?: (status: ArcadeLiveStatus) => void;
  /** Zero-based index of the prepared evidence round currently shown by the stage. */
  onPhaseChange?: (roundIndex: number) => void;
  onGameOver?: (result: ArcadeGameResult) => void;
}

export type ArcadeVirtualAction =
  | "left"
  | "right"
  | "jump"
  | "attack"
  | "special"
  | "block";
