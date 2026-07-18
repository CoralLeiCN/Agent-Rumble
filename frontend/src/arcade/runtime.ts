import Phaser from "phaser";
import { ArcadeRumbleScene, type ArcadeSceneOptions } from "./ArcadeScene";
import type { ArcadeVirtualAction } from "./types";

export interface ArcadeRuntime {
  setPaused(paused: boolean): boolean;
  togglePause(): boolean;
  restart(): void;
  setVirtualAction(action: ArcadeVirtualAction, pressed: boolean): void;
  toggleFullscreen(): void;
  focus(): void;
  destroy(): void;
}

export function createArcadeRuntime(
  parent: HTMLElement,
  options: ArcadeSceneOptions,
): ArcadeRuntime {
  let sceneReady = false;
  let destroyed = false;
  const scene = new ArcadeRumbleScene({
    ...options,
    callbacks: {
      ...options.callbacks,
      onReady: () => {
        sceneReady = true;
        options.callbacks.onReady();
      },
    },
  });
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 1_280,
    height: 720,
    backgroundColor: "#07111f",
    scene,
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 1_500 },
        debug: false,
      },
    },
    render: {
      antialias: !options.reducedMotion,
      roundPixels: true,
      powerPreference: "high-performance",
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 1_280,
      height: 720,
    },
    input: {
      keyboard: true,
      touch: true,
      mouse: true,
    },
  });

  const withScene = <T,>(fallback: T, action: () => T): T => {
    if (!sceneReady || destroyed) return fallback;
    return action();
  };

  return {
    setPaused: (paused) => withScene(paused, () => scene.setPaused(paused)),
    togglePause: () => withScene(false, () => scene.togglePause()),
    restart: () => withScene(undefined, () => scene.restartMatch()),
    setVirtualAction: (action, pressed) =>
      withScene(undefined, () => scene.setVirtualAction(action, pressed)),
    toggleFullscreen: () => {
      if (destroyed) return;
      if (game.scale.isFullscreen) game.scale.stopFullscreen();
      else game.scale.startFullscreen();
    },
    focus: () => {
      const canvas = game.canvas;
      canvas.tabIndex = 0;
      canvas.focus({ preventScroll: true });
    },
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      sceneReady = false;
      game.destroy(true);
    },
  };
}

