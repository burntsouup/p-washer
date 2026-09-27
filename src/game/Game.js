import { Engine, Scene } from '@babylonjs/core';
import { smoothTowards } from '../audio/audioMix.js';
import { AudioSystem } from '../audio/AudioSystem.js';
import { ThirdPersonCamera } from '../camera/ThirdPersonCamera.js';
import { CleanableSurface } from '../cleaning/CleanableSurface.js';
import { CleaningSystem } from '../cleaning/CleaningSystem.js';
import { config } from '../config.js';
import { createBackyard } from '../environment/Backyard.js';
import { createLighting, createSky } from '../environment/lighting.js';
import { Player } from '../player/Player.js';
import { PressureWasher } from '../pressure-washer/PressureWasher.js';
import { DebugOverlay } from '../ui/DebugOverlay.js';
import { Hud } from '../ui/Hud.js';
import { Celebration } from './Celebration.js';
import { Input } from './Input.js';
import { Job } from './job.js';
import { toDeltaSeconds } from './time.js';

/**
 * Owns the engine, the scene, and every game system.
 *
 * Each frame: work out how much time passed, update each system in order, then render.
 */
export class Game {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {HTMLElement} hudRoot
   */
  constructor(canvas, hudRoot) {
    const adaptToDeviceRatio = true; // render at full Retina resolution
    this.engine = new Engine(canvas, config.render.antialias, {}, adaptToDeviceRatio);
    this.scene = new Scene(this.engine);
    this.input = new Input(canvas);

    const { shadows } = createLighting(this.scene);
    createSky(this.scene);
    this.level = createBackyard(this.scene, shadows);

    this.cleaning = new CleaningSystem();
    for (const definition of this.level.cleanables) {
      this.cleaning.add(new CleanableSurface(this.scene, definition));
    }

    this.player = new Player(this.scene, shadows, this.input, this.level.spawn);
    this.camera = new ThirdPersonCamera(this.scene, this.input, this.player, this.level.spawn.yaw);
    this.washer = new PressureWasher(
      this.scene,
      shadows,
      this.input,
      this.player,
      this.camera,
      this.cleaning,
      this.level.washerSpot,
    );
    this.audio = new AudioSystem();
    this.job = new Job(config.job.completeAt);
    this.celebration = new Celebration(this.scene);
    this.highlight = 0; // 0..1, eases in and out while the highlight key is held
    this.time = 0;
    this.hud = new Hud(hudRoot, this.input);
    this.debugOverlay = new DebugOverlay(this.engine, this.scene, hudRoot);

    window.addEventListener('resize', () => this.engine.resize());
  }

  start() {
    this.engine.runRenderLoop(() => {
      const dt = toDeltaSeconds(this.engine.getDeltaTime(), config.loop.maxDeltaSeconds);
      this.update(dt);
      this.input.endFrame();
      this.scene.render();
    });
  }

  /**
   * Updates every system once. Order matters: each step uses what the previous ones did.
   *
   * @param {number} dt Seconds since the previous frame.
   */
  update(dt) {
    // Move relative to where the camera looks (and face the aim while spraying).
    this.player.update(dt, this.camera.yaw, this.washer.isSpraying);
    this.camera.update(dt); // follow the player to their new position
    this.washer.update(dt); // aim from the new camera view, then spray
    this.updateJob(dt);
    this.cleaning.update(dt); // dry surfaces and send any changes to the GPU
    if (this.input.wasPressed(config.audio.muteKey)) this.audio.toggleMute();
    this.audio.update(dt, this.washer);
    this.hud.update({
      prompt: this.washer.prompt,
      hasWasher: this.washer.isEquipped,
      jobStatus: this.job.status,
      progress: this.job.displayProgress(this.cleaning.progress),
      elapsed: this.job.elapsed,
    });
    this.debugOverlay.update(dt);
  }

  /**
   * Progress, completion, the "show remaining dirt" highlight, and restarting.
   *
   * @param {number} dt
   */
  updateJob(dt) {
    this.time += dt;
    const event = this.job.update(dt, this.cleaning.progress, this.washer.isSpraying);
    if (event === 'completed') {
      this.cleaning.finishRemaining(); // leftover specks fade away
      for (const surface of this.cleaning.surfaces.values()) this.celebration.play(surface.mesh);
      this.audio.playChime();
    }

    // Hold the key to make remaining dirt glow, pulsing gently so it catches the eye.
    const held = this.input.isPointerLocked && this.input.isDown(config.job.highlightKey);
    this.highlight = smoothTowards(this.highlight, held ? 1 : 0, dt, 12);
    this.cleaning.setHighlight(this.highlight * (0.75 + 0.25 * Math.sin(this.time * 6)));

    if (this.job.isComplete && this.input.wasPressed(config.job.resetKey)) {
      this.cleaning.reset();
      this.job.reset();
    }
  }
}
