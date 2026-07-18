import Phaser from "phaser";
import type { RumbleEntrant, RumbleRound } from "../types/rumble";
import {
  ARCADE_LIGHT_ATTACK,
  ARCADE_MAX_HEALTH,
  ARCADE_ROUND_DURATION_SECONDS,
  ARCADE_ROUNDS_TO_WIN,
  ARCADE_SIGNATURE_ATTACK,
  createExhibitionResult,
  deriveSignatureMoves,
  resolveHealthFrame,
} from "./arcadeLogic";
import type {
  ArcadeFinishReason,
  ArcadeGameMode,
  ArcadeGameResult,
  ArcadeLiveStatus,
  ArcadeSignatureMove,
  ArcadeVirtualAction,
} from "./types";

const GAME_WIDTH = 1_280;
const GAME_HEIGHT = 720;
const FLOOR_Y = 620;
const FIGHTER_SCALE = 1.35;
const FIGHTER_SPAWN_Y = FLOOR_Y - 115;
const FIGHTER_LABEL_OFFSET_Y = 124;
const MOVE_SPEED = 275;
const BLOCK_MOVE_SPEED = 88;
const JUMP_SPEED = 650;
const INTRO_DURATION_MS = 850;
const ROUND_BREAK_MS = 1_450;
const PROJECTILE_SPEED = 520;
const BOXER_ASSET_ROOT = "/arcade/boxer";

const BOXER_FRAMES = {
  idle: ["000", "002", "004", "006", "008"],
  walk: ["000", "002", "004", "006", "008", "009"],
  jab: ["000", "001", "002", "003", "004", "005", "006", "007"],
  special: ["000", "001", "002", "003", "004", "005", "006", "007"],
  block: ["000", "002", "004", "006", "008"],
  hurt: ["000", "002", "004", "006", "007"],
  ko: ["000", "001", "002", "003", "004", "005", "006", "007"],
} as const;

type BoxerAnimation = keyof typeof BOXER_FRAMES;

type Corner = 0 | 1;

interface ArcadeSceneCallbacks {
  onReady: () => void;
  onStatusChange: (status: ArcadeLiveStatus) => void;
  onPhaseChange: (roundIndex: number) => void;
  onGameOver: (result: ArcadeGameResult) => void;
  onPauseChange: (paused: boolean) => void;
}

export interface ArcadeSceneOptions {
  entrants: readonly [RumbleEntrant, RumbleEntrant];
  rounds: readonly RumbleRound[];
  mode: ArcadeGameMode;
  reducedMotion: boolean;
  callbacks: ArcadeSceneCallbacks;
}

interface FighterState {
  corner: Corner;
  sprite: Phaser.Physics.Arcade.Sprite;
  nameLabel: Phaser.GameObjects.Text;
  name: string;
  health: number;
  roundsWon: number;
  facing: -1 | 1;
  blocking: boolean;
  lastLightAt: number;
  lastSpecialAt: number;
  signature: ArcadeSignatureMove;
  spawnX: number;
}

interface FighterIntent {
  left: boolean;
  right: boolean;
  jump: boolean;
  light: boolean;
  special: boolean;
  block: boolean;
}

interface ActiveProjectile {
  owner: Corner;
  sprite: Phaser.Physics.Arcade.Image;
}

interface ControlKeys {
  p1Left: Phaser.Input.Keyboard.Key;
  p1Right: Phaser.Input.Keyboard.Key;
  p1Jump: Phaser.Input.Keyboard.Key;
  p1Light: Phaser.Input.Keyboard.Key;
  p1Special: Phaser.Input.Keyboard.Key;
  p1Block: Phaser.Input.Keyboard.Key;
  p2Left: Phaser.Input.Keyboard.Key;
  p2Right: Phaser.Input.Keyboard.Key;
  p2Jump: Phaser.Input.Keyboard.Key;
  p2Light: Phaser.Input.Keyboard.Key;
  p2Special: Phaser.Input.Keyboard.Key;
  p2Block: Phaser.Input.Keyboard.Key;
  pause: Phaser.Input.Keyboard.Key;
  pauseAlternative: Phaser.Input.Keyboard.Key;
  restart: Phaser.Input.Keyboard.Key;
}

type VirtualControls = Record<ArcadeVirtualAction, boolean>;

function arcadeBody(sprite: Phaser.Physics.Arcade.Sprite): Phaser.Physics.Arcade.Body {
  return sprite.body as Phaser.Physics.Arcade.Body;
}

function fighterLabel(corner: Corner, mode: ArcadeGameMode): string {
  if (corner === 0) return "P1";
  return mode === "solo" ? "CPU" : "P2";
}

function verdictLabel(verdict: RumbleRound["verdict"]): string {
  switch (verdict) {
    case "entrant_a_advantage":
      return "Contextual edge: left project";
    case "entrant_b_advantage":
      return "Contextual edge: right project";
    case "trade_off":
      return "Contextual trade-off";
    case "inconclusive":
      return "Evidence inconclusive";
  }
}

function emptyVirtualControls(): VirtualControls {
  return {
    left: false,
    right: false,
    jump: false,
    attack: false,
    special: false,
    block: false,
  };
}

export class ArcadeRumbleScene extends Phaser.Scene {
  private readonly options: ArcadeSceneOptions;
  private fighters: [FighterState, FighterState] | null = null;
  private keys: ControlKeys | null = null;
  private virtualControls: VirtualControls = emptyVirtualControls();
  private ground!: Phaser.Physics.Arcade.Image;
  private evidenceText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private announcementText!: Phaser.GameObjects.Text;
  private pausedText!: Phaser.GameObjects.Text;
  private projectiles: ActiveProjectile[] = [];
  private pendingDamage: [number, number] = [0, 0];
  private roundElapsedMs = 0;
  private roundNumber = 1;
  private phaseIndex = 0;
  private lastDisplayedSecond = ARCADE_ROUND_DURATION_SECONDS;
  private isMatchPaused = false;
  private roundTransition = true;
  private gameOver = false;
  private nextAiJumpAt = 0;
  private lastStatusMessage = "Round one is loading.";

  constructor(options: ArcadeSceneOptions) {
    super({ key: "arcade-rumble" });
    this.options = options;
  }

  preload(): void {
    for (const [animation, frames] of Object.entries(BOXER_FRAMES)) {
      for (const frame of frames) {
        this.load.image(
          `boxer-${animation}-${frame}`,
          `${BOXER_ASSET_ROOT}/${animation}/${animation}-${frame}.png`,
        );
      }
    }
  }

  create(): void {
    this.roundElapsedMs = 0;
    this.roundNumber = 1;
    this.phaseIndex = 0;
    this.lastDisplayedSecond = ARCADE_ROUND_DURATION_SECONDS;
    this.isMatchPaused = false;
    this.roundTransition = true;
    this.gameOver = false;
    this.nextAiJumpAt = 0;
    this.pendingDamage = [0, 0];
    this.projectiles = [];
    this.virtualControls = emptyVirtualControls();

    this.cameras.main.setBackgroundColor("#140b12");
    this.physics.world.setBounds(54, 132, GAME_WIDTH - 108, GAME_HEIGHT - 132);
    this.createTextures();
    this.createFighterAnimations();
    this.createBackdrop();
    this.createGround();
    this.createHud();
    this.createFighters();
    this.configureInput();
    this.beginRound(true);
    this.options.callbacks.onPauseChange(false);
    this.options.callbacks.onReady();
  }

  update(_time: number, delta: number): void {
    if (!this.fighters || !this.keys) return;

    if (Phaser.Input.Keyboard.JustDown(this.keys.restart)) {
      this.restartMatch();
      return;
    }
    if (
      (Phaser.Input.Keyboard.JustDown(this.keys.pause) ||
        Phaser.Input.Keyboard.JustDown(this.keys.pauseAlternative)) &&
      !this.gameOver
    ) {
      this.togglePause();
    }
    if (this.isMatchPaused || this.gameOver || this.roundTransition) return;

    this.roundElapsedMs += Math.min(delta, 50);
    this.pendingDamage = [0, 0];

    const leftIntent = this.playerOneIntent();
    const rightIntent = this.options.mode === "local"
      ? this.playerTwoIntent()
      : this.cpuIntent(delta);

    // Both guards and movement are established before either attack is resolved.
    this.applyMovement(this.fighters[0], leftIntent);
    this.applyMovement(this.fighters[1], rightIntent);
    this.faceOpponents();
    this.updateFighterAnimation(this.fighters[0]);
    this.updateFighterAnimation(this.fighters[1]);
    this.performActions(this.fighters[0], this.fighters[1], leftIntent);
    this.performActions(this.fighters[1], this.fighters[0], rightIntent);
    this.updateProjectiles();
    this.resolveCombatFrame();
    this.updateFighterLabels();
    this.updateHud();

    if (
      !this.roundTransition &&
      this.roundElapsedMs >= ARCADE_ROUND_DURATION_SECONDS * 1_000
    ) {
      this.finishRound("time");
    }
  }

  togglePause(): boolean {
    return this.setPaused(!this.isMatchPaused);
  }

  setPaused(paused: boolean): boolean {
    if (this.gameOver || paused === this.isMatchPaused) return this.isMatchPaused;
    this.isMatchPaused = paused;
    this.time.paused = paused;
    if (paused) this.physics.world.pause();
    else this.physics.world.resume();
    this.pausedText.setVisible(paused);
    this.options.callbacks.onPauseChange(paused);
    this.emitStatus(paused ? "Exhibition paused." : "Exhibition resumed.");
    return paused;
  }

  restartMatch(): void {
    this.time.paused = false;
    this.physics.world.resume();
    this.scene.restart();
  }

  setVirtualAction(action: ArcadeVirtualAction, pressed: boolean): void {
    this.virtualControls[action] = pressed;
  }

  private createTextures(): void {
    if (this.textures.exists("versus-floor")) return;
    const graphics = this.add.graphics();

    graphics.clear();
    graphics.fillStyle(0x21161a, 1);
    graphics.fillRect(0, 0, 320, 40);
    graphics.fillStyle(0x84543f, 1);
    graphics.fillRect(0, 0, 320, 7);
    graphics.lineStyle(2, 0x513229, 1);
    for (let x = 12; x < 320; x += 38) graphics.lineBetween(x, 12, x + 18, 33);
    graphics.generateTexture("versus-floor", 320, 40);

    graphics.clear();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(18, 18, 15);
    graphics.lineStyle(4, 0xffffff, 0.55);
    graphics.strokeCircle(18, 18, 17);
    graphics.generateTexture("versus-projectile", 36, 36);

    graphics.clear();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(8, 8, 7);
    graphics.generateTexture("versus-spark", 16, 16);
    graphics.destroy();
  }

  private createFighterAnimations(): void {
    const create = (
      animation: BoxerAnimation,
      frameRate: number,
      repeat: number,
    ) => {
      const key = `boxer-${animation}`;
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: BOXER_FRAMES[animation].map((frame) => ({
          key: `boxer-${animation}-${frame}`,
        })),
        frameRate,
        repeat,
      });
    };

    create("idle", 8, -1);
    create("walk", 10, -1);
    create("jab", 18, 0);
    create("special", 16, 0);
    create("block", 8, -1);
    create("hurt", 16, 0);
    create("ko", 10, 0);
  }

  private createBackdrop(): void {
    const background = this.add.graphics().setDepth(-30);
    background.fillGradientStyle(0x190b17, 0x190b17, 0x3a1730, 0x160c16, 1);
    background.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    background.fillStyle(0xffc95d, 0.9);
    background.fillCircle(1_060, 205, 98);
    background.fillStyle(0x150d18, 0.95);
    background.fillCircle(1_025, 182, 95);

    const skyline = this.add.graphics().setDepth(-25);
    skyline.fillStyle(0x100d18, 1);
    for (let x = 0; x < GAME_WIDTH; x += 82) {
      const height = 150 + ((x / 82) % 4) * 34;
      skyline.fillRect(x, FLOOR_Y - height, 66, height);
      skyline.fillStyle(0xff4d62, 0.38);
      for (let y = FLOOR_Y - height + 25; y < FLOOR_Y - 20; y += 36) {
        skyline.fillRect(x + 13, y, 10, 7);
        skyline.fillRect(x + 39, y, 10, 7);
      }
      skyline.fillStyle(0x100d18, 1);
    }

    this.add
      .text(GAME_WIDTH / 2, 230, "AGENT RUMBLE", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "72px",
        fontStyle: "bold",
        color: "#ff3e4d",
        stroke: "#38111a",
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setAlpha(0.38)
      .setDepth(-20);
  }

  private createGround(): void {
    this.ground = this.physics.add.staticImage(GAME_WIDTH / 2, FLOOR_Y, "versus-floor");
    this.ground.setDisplaySize(GAME_WIDTH - 92, 52).refreshBody().setDepth(5);
  }

  private createHud(): void {
    const outlined: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "system-ui, sans-serif",
      fontStyle: "bold",
      color: "#fff8e8",
      stroke: "#10080d",
      strokeThickness: 6,
    };
    // The accessible React layer owns the sole visible name/HP/round/timer HUD.
    // Phaser keeps only stage-specific comparison context and announcements.
    this.evidenceText = this.add.text(GAME_WIDTH / 2, 118, "", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "14px",
      color: "#e2cad0",
      align: "center",
      wordWrap: { width: 920 },
    }).setOrigin(0.5, 0).setDepth(42);
    this.statusText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 22, "", {
      ...outlined,
      fontSize: "16px",
      align: "center",
      color: "#fff8e8",
    }).setOrigin(0.5, 1).setDepth(42);
    this.announcementText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, "", {
      ...outlined,
      fontSize: "58px",
      align: "center",
      color: "#fff8e8",
    }).setOrigin(0.5).setDepth(90);
    this.pausedText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "PAUSED\nP / ESC TO RESUME", {
      ...outlined,
      fontSize: "48px",
      align: "center",
      color: "#ffd34d",
      backgroundColor: "#10080de8",
      padding: { x: 42, y: 28 },
    }).setOrigin(0.5).setDepth(120).setVisible(false);
  }

  private createFighters(): void {
    const [entrantA, entrantB] = this.options.entrants;
    const signatures = deriveSignatureMoves([entrantA, entrantB], this.options.rounds);
    const spriteA = this.physics.add.sprite(350, FIGHTER_SPAWN_Y, "boxer-idle-000");
    const spriteB = this.physics.add.sprite(930, FIGHTER_SPAWN_Y, "boxer-idle-000");
    for (const sprite of [spriteA, spriteB]) {
      sprite
        .setOrigin(0.383, 0.5)
        .setScale(FIGHTER_SCALE)
        .setBounce(0)
        .setDragX(1_650)
        .setMaxVelocity(720, 1_100)
        .setDepth(15);
      sprite.setCollideWorldBounds(true);
      arcadeBody(sprite).setSize(65, 125).setOffset(39, 30);
      this.physics.add.collider(sprite, this.ground);
      sprite.play("boxer-idle");
    }
    this.physics.add.collider(spriteA, spriteB);
    const nameStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "system-ui, sans-serif",
      fontSize: "15px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#10080d",
      strokeThickness: 5,
      align: "center",
    };
    this.fighters = [
      {
        corner: 0,
        sprite: spriteA,
        nameLabel: this.add.text(spriteA.x, spriteA.y - FIGHTER_LABEL_OFFSET_Y, entrantA.project_name, nameStyle)
          .setOrigin(0.5).setDepth(22),
        name: entrantA.project_name,
        health: ARCADE_MAX_HEALTH,
        roundsWon: 0,
        facing: 1,
        blocking: false,
        lastLightAt: -ARCADE_LIGHT_ATTACK.cooldownMs,
        lastSpecialAt: -ARCADE_SIGNATURE_ATTACK.cooldownMs,
        signature: signatures[0],
        spawnX: 350,
      },
      {
        corner: 1,
        sprite: spriteB,
        nameLabel: this.add.text(spriteB.x, spriteB.y - FIGHTER_LABEL_OFFSET_Y, entrantB.project_name, nameStyle)
          .setOrigin(0.5).setDepth(22),
        name: entrantB.project_name,
        health: ARCADE_MAX_HEALTH,
        roundsWon: 0,
        facing: -1,
        blocking: false,
        lastLightAt: -ARCADE_LIGHT_ATTACK.cooldownMs,
        lastSpecialAt: -ARCADE_SIGNATURE_ATTACK.cooldownMs,
        signature: signatures[1],
        spawnX: 930,
      },
    ];
    this.updateFighterLabels();
    this.updateHud();
  }

  private configureInput(): void {
    if (!this.input.keyboard) return;
    this.input.keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.A,
      Phaser.Input.Keyboard.KeyCodes.D,
      Phaser.Input.Keyboard.KeyCodes.W,
      Phaser.Input.Keyboard.KeyCodes.S,
      Phaser.Input.Keyboard.KeyCodes.F,
      Phaser.Input.Keyboard.KeyCodes.G,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.M,
      Phaser.Input.Keyboard.KeyCodes.N,
      Phaser.Input.Keyboard.KeyCodes.P,
      Phaser.Input.Keyboard.KeyCodes.ESC,
      Phaser.Input.Keyboard.KeyCodes.R,
    ]);
    this.keys = this.input.keyboard.addKeys({
      p1Left: Phaser.Input.Keyboard.KeyCodes.A,
      p1Right: Phaser.Input.Keyboard.KeyCodes.D,
      p1Jump: Phaser.Input.Keyboard.KeyCodes.W,
      p1Light: Phaser.Input.Keyboard.KeyCodes.F,
      p1Special: Phaser.Input.Keyboard.KeyCodes.G,
      p1Block: Phaser.Input.Keyboard.KeyCodes.S,
      p2Left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      p2Right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      p2Jump: Phaser.Input.Keyboard.KeyCodes.UP,
      p2Light: Phaser.Input.Keyboard.KeyCodes.M,
      p2Special: Phaser.Input.Keyboard.KeyCodes.N,
      p2Block: Phaser.Input.Keyboard.KeyCodes.DOWN,
      pause: Phaser.Input.Keyboard.KeyCodes.P,
      pauseAlternative: Phaser.Input.Keyboard.KeyCodes.ESC,
      restart: Phaser.Input.Keyboard.KeyCodes.R,
    }) as unknown as ControlKeys;
  }

  private beginRound(initial = false): void {
    if (!this.fighters) return;
    this.roundTransition = true;
    this.roundElapsedMs = 0;
    this.lastDisplayedSecond = ARCADE_ROUND_DURATION_SECONDS;
    this.pendingDamage = [0, 0];
    this.clearProjectiles();
    this.phaseIndex = (this.roundNumber - 1) % this.options.rounds.length;
    this.options.callbacks.onPhaseChange(this.phaseIndex);

    for (const fighter of this.fighters) {
      fighter.health = ARCADE_MAX_HEALTH;
      fighter.blocking = false;
      fighter.lastLightAt = -ARCADE_LIGHT_ATTACK.cooldownMs;
      fighter.lastSpecialAt = -ARCADE_SIGNATURE_ATTACK.cooldownMs;
      fighter.sprite.setPosition(fighter.spawnX, FIGHTER_SPAWN_Y).setVelocity(0, 0);
      fighter.sprite.clearTint().setAlpha(1).setFlipX(fighter.corner === 0);
      fighter.sprite.play("boxer-idle", true);
    }
    this.announcementText.setText(`ROUND ${this.roundNumber}`);
    this.setEvidenceCallout();
    this.updateFighterLabels();
    this.updateHud();
    this.emitStatus(
      `Round ${this.roundNumber}: 100 HP each. First fighter to two rounds wins the exhibition.`,
    );

    this.time.delayedCall(INTRO_DURATION_MS, () => {
      if (this.gameOver) return;
      this.announcementText.setText("FIGHT!");
      this.roundTransition = false;
      this.emitStatus("Fight! Jabs, guards, and trait specials use equal combat budgets.");
      this.time.delayedCall(460, () => {
        if (!this.roundTransition && !this.gameOver) this.announcementText.setText("");
      });
    });

    if (!initial) this.feedbackBurst(GAME_WIDTH / 2, GAME_HEIGHT / 2, 0xffd34d);
  }

  private setEvidenceCallout(): void {
    const round = this.options.rounds[this.phaseIndex];
    if (!round) return;
    this.evidenceText.setText(
      `READ-ONLY COMPARISON · ${round.label} · ${verdictLabel(round.verdict)} · Combat power unchanged`,
    );
  }

  private playerOneIntent(): FighterIntent {
    if (!this.keys) return this.emptyIntent();
    return {
      left: this.keys.p1Left.isDown || this.virtualControls.left,
      right: this.keys.p1Right.isDown || this.virtualControls.right,
      jump: Phaser.Input.Keyboard.JustDown(this.keys.p1Jump) || this.consumeVirtual("jump"),
      light: Phaser.Input.Keyboard.JustDown(this.keys.p1Light) || this.consumeVirtual("attack"),
      special: Phaser.Input.Keyboard.JustDown(this.keys.p1Special) || this.consumeVirtual("special"),
      block: this.keys.p1Block.isDown || this.virtualControls.block,
    };
  }

  private playerTwoIntent(): FighterIntent {
    if (!this.keys) return this.emptyIntent();
    return {
      left: this.keys.p2Left.isDown,
      right: this.keys.p2Right.isDown,
      jump: Phaser.Input.Keyboard.JustDown(this.keys.p2Jump),
      light: Phaser.Input.Keyboard.JustDown(this.keys.p2Light),
      special: Phaser.Input.Keyboard.JustDown(this.keys.p2Special),
      block: this.keys.p2Block.isDown,
    };
  }

  private cpuIntent(delta: number): FighterIntent {
    if (!this.fighters) return this.emptyIntent();
    const cpu = this.fighters[1];
    const target = this.fighters[0];
    const dx = target.sprite.x - cpu.sprite.x;
    const distance = Math.abs(dx);
    const incomingProjectile = this.projectiles.some(
      (projectile) => projectile.owner === 0 && Math.abs(projectile.sprite.x - cpu.sprite.x) < 190,
    );
    const guarding = incomingProjectile || (
      distance < 118 && Math.floor(this.roundElapsedMs / 360) % 7 === 0
    );
    const canAct = !guarding;
    const specialRange = cpu.signature.style === "projectile" ? 430 : 150;
    const shouldSpecial = canAct &&
      this.roundElapsedMs - cpu.lastSpecialAt >= ARCADE_SIGNATURE_ATTACK.cooldownMs &&
      distance < specialRange &&
      Math.floor(this.roundElapsedMs / 420) % 4 === 0;
    const shouldJump = this.roundElapsedMs >= this.nextAiJumpAt &&
      (target.sprite.y < cpu.sprite.y - 65 || Phaser.Math.Between(0, 1_000) < delta * 0.15);
    if (shouldJump) this.nextAiJumpAt = this.roundElapsedMs + Phaser.Math.Between(850, 1_500);
    return {
      left: !guarding && dx < -84,
      right: !guarding && dx > 84,
      jump: shouldJump,
      light: canAct && !shouldSpecial && distance < 104,
      special: shouldSpecial,
      block: guarding,
    };
  }

  private emptyIntent(): FighterIntent {
    return { left: false, right: false, jump: false, light: false, special: false, block: false };
  }

  private applyMovement(fighter: FighterState, intent: FighterIntent): void {
    const body = arcadeBody(fighter.sprite);
    const grounded = body.blocked.down || body.touching.down;
    fighter.blocking = intent.block && grounded;
    fighter.sprite.setAlpha(1);

    if (intent.jump && grounded && !fighter.blocking) fighter.sprite.setVelocityY(-JUMP_SPEED);
    if (intent.left === intent.right) {
      fighter.sprite.setVelocityX(
        Phaser.Math.Linear(body.velocity.x, 0, fighter.blocking ? 0.55 : 0.3),
      );
      return;
    }
    const direction = intent.left ? -1 : 1;
    fighter.sprite.setVelocityX(direction * (fighter.blocking ? BLOCK_MOVE_SPEED : MOVE_SPEED));
  }

  private faceOpponents(): void {
    if (!this.fighters) return;
    const [left, right] = this.fighters;
    left.facing = left.sprite.x <= right.sprite.x ? 1 : -1;
    right.facing = right.sprite.x <= left.sprite.x ? 1 : -1;
    left.sprite.setFlipX(left.facing > 0);
    right.sprite.setFlipX(right.facing > 0);
  }

  private updateFighterAnimation(fighter: FighterState): void {
    const current = fighter.sprite.anims.currentAnim?.key;
    const locked = current === "boxer-jab" ||
      current === "boxer-special" ||
      current === "boxer-hurt" ||
      current === "boxer-ko";
    if (locked && fighter.sprite.anims.isPlaying) return;

    if (fighter.blocking) {
      fighter.sprite.play("boxer-block", true);
      return;
    }
    if (Math.abs(arcadeBody(fighter.sprite).velocity.x) > 35) {
      fighter.sprite.play("boxer-walk", true);
      return;
    }
    fighter.sprite.play("boxer-idle", true);
  }

  private performActions(
    attacker: FighterState,
    target: FighterState,
    intent: FighterIntent,
  ): void {
    if (attacker.blocking) return;
    if (
      intent.light &&
      this.roundElapsedMs - attacker.lastLightAt >= ARCADE_LIGHT_ATTACK.cooldownMs
    ) {
      attacker.lastLightAt = this.roundElapsedMs;
      attacker.sprite.play("boxer-jab", true);
      const hitX = attacker.sprite.x + attacker.facing * 64;
      this.showStrike(hitX, attacker.sprite.y, attacker.corner, 36);
      if (this.targetInFront(attacker, target, 108, 82)) {
        this.queueHit(attacker, target, ARCADE_LIGHT_ATTACK, "jab");
      }
    }
    if (
      intent.special &&
      this.roundElapsedMs - attacker.lastSpecialAt >= ARCADE_SIGNATURE_ATTACK.cooldownMs
    ) {
      attacker.lastSpecialAt = this.roundElapsedMs;
      attacker.sprite.play("boxer-special", true);
      this.performSignature(attacker, target);
    }
  }

  private performSignature(attacker: FighterState, target: FighterState): void {
    const color = attacker.corner === 0 ? 0x1ed9c3 : 0xffb72f;
    this.emitStatus(
      `${fighterLabel(attacker.corner, this.options.mode)} used ${attacker.signature.moveName}. Trait theme only; equal special damage.`,
    );
    switch (attacker.signature.style) {
      case "projectile": {
        const sprite = this.physics.add.image(
          attacker.sprite.x + attacker.facing * 70,
          attacker.sprite.y - 8,
          "versus-projectile",
        );
        sprite.setTint(color).setDepth(18).setVelocityX(attacker.facing * PROJECTILE_SPEED);
        (sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
        this.projectiles.push({ owner: attacker.corner, sprite });
        break;
      }
      case "rush":
        attacker.sprite.setVelocityX(attacker.facing * 670);
        this.showStrike(attacker.sprite.x + attacker.facing * 78, attacker.sprite.y, attacker.corner, 55);
        if (this.targetInFront(attacker, target, 150, 76)) {
          this.queueHit(attacker, target, ARCADE_SIGNATURE_ATTACK, "rush");
        }
        break;
      case "uppercut":
        attacker.sprite.setVelocityY(-470);
        this.showStrike(attacker.sprite.x + attacker.facing * 45, attacker.sprite.y - 45, attacker.corner, 53);
        if (this.targetInFront(attacker, target, 105, 148)) {
          this.queueHit(attacker, target, ARCADE_SIGNATURE_ATTACK, "launcher");
        }
        break;
      case "pulse":
        this.showStrike(attacker.sprite.x, attacker.sprite.y, attacker.corner, 86);
        if (Phaser.Math.Distance.Between(
          attacker.sprite.x,
          attacker.sprite.y,
          target.sprite.x,
          target.sprite.y,
        ) <= 128) {
          this.queueHit(attacker, target, ARCADE_SIGNATURE_ATTACK, "pulse");
        }
        break;
    }
  }

  private targetInFront(
    attacker: FighterState,
    target: FighterState,
    horizontalRange: number,
    verticalRange: number,
  ): boolean {
    const dx = target.sprite.x - attacker.sprite.x;
    return Math.sign(dx || attacker.facing) === attacker.facing &&
      Math.abs(dx) <= horizontalRange &&
      Math.abs(target.sprite.y - attacker.sprite.y) <= verticalRange;
  }

  private queueHit(
    attacker: FighterState,
    target: FighterState,
    profile: typeof ARCADE_LIGHT_ATTACK,
    label: string,
  ): void {
    const damage = target.blocking ? profile.blockedDamage : profile.damage;
    this.pendingDamage[target.corner] += damage;
    const direction = attacker.sprite.x <= target.sprite.x ? 1 : -1;
    target.sprite.setVelocityX(direction * (target.blocking ? 105 : 245));
    if (!target.blocking) target.sprite.setVelocityY(-105);
    this.flashHit(target, attacker.corner);
    this.emitStatus(
      `${fighterLabel(attacker.corner, this.options.mode)} landed ${label}${target.blocking ? " through guard (chip damage)" : ""}.`,
    );
  }

  private updateProjectiles(): void {
    if (!this.fighters) return;
    for (const projectile of [...this.projectiles]) {
      const target = this.fighters[projectile.owner === 0 ? 1 : 0];
      const hit = Phaser.Math.Distance.Between(
        projectile.sprite.x,
        projectile.sprite.y,
        target.sprite.x,
        target.sprite.y,
      ) < 66;
      const expired = projectile.sprite.x < 40 || projectile.sprite.x > GAME_WIDTH - 40;
      if (hit) {
        const attacker = this.fighters[projectile.owner];
        this.queueHit(attacker, target, ARCADE_SIGNATURE_ATTACK, "signal projectile");
      }
      if (hit || expired) this.destroyProjectile(projectile);
    }
  }

  private resolveCombatFrame(): void {
    if (!this.fighters || (this.pendingDamage[0] === 0 && this.pendingDamage[1] === 0)) return;
    const resolution = resolveHealthFrame(
      [this.fighters[0].health, this.fighters[1].health],
      this.pendingDamage,
    );
    this.fighters[0].health = resolution.health[0];
    this.fighters[1].health = resolution.health[1];
    this.pendingDamage = [0, 0];
    this.updateHud();
    if (resolution.doubleKnockout) this.finishRound("double_ko");
    else if (resolution.knockedOut[0] || resolution.knockedOut[1]) this.finishRound("ko");
  }

  private finishRound(reason: ArcadeFinishReason): void {
    if (!this.fighters || this.roundTransition || this.gameOver) return;
    this.roundTransition = true;
    this.clearProjectiles();
    for (const fighter of this.fighters) fighter.sprite.setVelocity(0, 0);

    const [left, right] = this.fighters;
    let winner: Corner | null = null;
    if (reason === "ko") winner = left.health <= 0 ? 1 : 0;
    else if (reason === "time" && left.health !== right.health) winner = left.health > right.health ? 0 : 1;
    if (winner !== null) this.fighters[winner].roundsWon += 1;
    for (const fighter of this.fighters) {
      if (fighter.health <= 0) fighter.sprite.play("boxer-ko", true);
      else if (winner === fighter.corner) fighter.sprite.play("boxer-special", true);
      else if (winner !== null) fighter.sprite.play("boxer-hurt", true);
      else fighter.sprite.play("boxer-idle", true);
    }

    const roundHeading = reason === "double_ko"
      ? "DOUBLE KO"
      : reason === "time"
        ? "TIME"
        : "KO";
    const roundCall = winner === null
      ? `${roundHeading}\nROUND DRAW`
      : `${roundHeading}\n${this.fighters[winner].name} TAKES ROUND ${this.roundNumber}`;
    this.announcementText.setText(roundCall);
    this.emitStatus(
      winner === null
        ? `Round ${this.roundNumber} was a draw. Same-frame damage was resolved together.`
        : `${this.fighters[winner].name} won round ${this.roundNumber} from arcade play.`,
    );
    this.updateHud();

    const matchComplete = this.fighters.some(
      (fighter) => fighter.roundsWon >= ARCADE_ROUNDS_TO_WIN,
    );
    this.time.delayedCall(ROUND_BREAK_MS, () => {
      if (matchComplete) this.finishMatch(reason);
      else {
        this.roundNumber += 1;
        this.beginRound();
      }
    });
  }

  private finishMatch(reason: ArcadeFinishReason): void {
    if (!this.fighters || this.gameOver) return;
    this.gameOver = true;
    this.physics.world.pause();
    const [left, right] = this.fighters;
    const result = createExhibitionResult(
      {
        controller: "player_1",
        avatarName: left.name,
        health: left.health,
        roundsWon: left.roundsWon,
        signatureMove: left.signature.moveName,
      },
      {
        controller: this.options.mode === "solo" ? "cpu" : "player_2",
        avatarName: right.name,
        health: right.health,
        roundsWon: right.roundsWon,
        signatureMove: right.signature.moveName,
      },
      reason,
    );
    const heading = result.winner === "draw"
      ? "EXHIBITION DRAW"
      : `${result.winner === "player_1" ? "PLAYER 1" : result.winner === "cpu" ? "CPU" : "PLAYER 2"} WINS`;
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 930, 300, 0x10080d, 0.96)
      .setStrokeStyle(4, 0xffd34d).setDepth(110);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 86, heading, {
      fontFamily: "system-ui, sans-serif",
      fontSize: "50px",
      fontStyle: "bold",
      color: "#fff8e8",
      align: "center",
    }).setOrigin(0.5).setDepth(111);
    this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      `${left.name} ${left.roundsWon} – ${right.roundsWon} ${right.name}\nFirst to ${ARCADE_ROUNDS_TO_WIN}; HP and rounds came only from arcade actions.`,
      {
        fontFamily: "system-ui, sans-serif",
        fontSize: "21px",
        color: "#e2cad0",
        align: "center",
        lineSpacing: 8,
      },
    ).setOrigin(0.5).setDepth(111);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 96, `${result.disclaimer}\nPress R or use Restart.`, {
      fontFamily: "system-ui, sans-serif",
      fontSize: "17px",
      color: "#8df6e7",
      align: "center",
    }).setOrigin(0.5).setDepth(111);
    this.lastStatusMessage = heading;
    this.options.callbacks.onGameOver(result);
    this.notifyStatus();
  }

  private updateHud(): void {
    if (!this.fighters) return;
    const remaining = Math.max(
      0,
      Math.ceil(ARCADE_ROUND_DURATION_SECONDS - this.roundElapsedMs / 1_000),
    );
    if (remaining !== this.lastDisplayedSecond) {
      this.lastDisplayedSecond = remaining;
      this.notifyStatus();
    }
  }

  private updateFighterLabels(): void {
    if (!this.fighters) return;
    for (const fighter of this.fighters) {
      fighter.nameLabel.setPosition(fighter.sprite.x, fighter.sprite.y - FIGHTER_LABEL_OFFSET_Y);
      fighter.nameLabel.setAlpha(fighter.blocking ? 0.74 : 1);
    }
  }

  private showStrike(x: number, y: number, corner: Corner, radius: number): void {
    const strike = this.add.circle(
      x,
      y,
      radius,
      corner === 0 ? 0x1ed9c3 : 0xffb72f,
      0.36,
    ).setDepth(17);
    if (this.options.reducedMotion) {
      this.time.delayedCall(80, () => strike.destroy());
      return;
    }
    this.tweens.add({
      targets: strike,
      scale: 1.42,
      alpha: 0,
      duration: 150,
      onComplete: () => strike.destroy(),
    });
  }

  private flashHit(target: FighterState, attacker: Corner): void {
    const color = attacker === 0 ? 0x8df6e7 : 0xffd34d;
    if (!target.blocking) target.sprite.play("boxer-hurt", true);
    target.sprite.setTintFill(color);
    this.time.delayedCall(80, () => {
      if (target.sprite.active) target.sprite.clearTint();
    });
    this.feedbackBurst(target.sprite.x, target.sprite.y, color);
    if (!this.options.reducedMotion) this.cameras.main.shake(65, 0.0035);
  }

  private feedbackBurst(x: number, y: number, color: number): void {
    if (this.options.reducedMotion) return;
    for (let index = 0; index < 6; index += 1) {
      const spark = this.add.image(x, y, "versus-spark").setTint(color).setDepth(26);
      const angle = (Math.PI * 2 * index) / 6;
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * 65,
        y: y + Math.sin(angle) * 65,
        alpha: 0,
        scale: 0.15,
        duration: 190,
        onComplete: () => spark.destroy(),
      });
    }
  }

  private destroyProjectile(projectile: ActiveProjectile): void {
    projectile.sprite.destroy();
    this.projectiles = this.projectiles.filter((candidate) => candidate !== projectile);
  }

  private clearProjectiles(): void {
    for (const projectile of this.projectiles) projectile.sprite.destroy();
    this.projectiles = [];
  }

  private consumeVirtual(action: "jump" | "attack" | "special"): boolean {
    if (!this.virtualControls[action]) return false;
    this.virtualControls[action] = false;
    return true;
  }

  private emitStatus(message: string): void {
    this.lastStatusMessage = message;
    this.statusText.setText(message);
    this.notifyStatus();
  }

  private notifyStatus(): void {
    if (!this.fighters) return;
    this.options.callbacks.onStatusChange({
      message: this.lastStatusMessage,
      remainingSeconds: Math.max(
        0,
        Math.ceil(ARCADE_ROUND_DURATION_SECONDS - this.roundElapsedMs / 1_000),
      ),
      phase: this.phaseIndex,
      paused: this.isMatchPaused,
      health: [this.fighters[0].health, this.fighters[1].health],
      roundsWon: [this.fighters[0].roundsWon, this.fighters[1].roundsWon],
      roundNumber: this.roundNumber,
    });
  }
}
