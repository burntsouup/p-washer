import { ArcRotateCamera, Engine, Scene, Vector3 } from '@babylonjs/core';
import { config } from '../config.js';
import { createBackyard } from '../environment/Backyard.js';
import { createLighting, createSky } from '../environment/lighting.js';
import { DebugOverlay } from '../ui/DebugOverlay.js';
import { toDeltaSeconds } from './time.js';

/**
 * Owns the engine, the scene, and every game system.
 *
 * Each frame: work out how much time passed, update each system in order, then render.
 * Systems are plain objects with an `update(dt)` method, where dt is in seconds.
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

    const { shadows } = createLighting(this.scene);
    createSky(this.scene);
    this.environment = createBackyard(this.scene, shadows);

    // Temporary orbit camera until Milestone 3 replaces it with the third-person camera.
    // Left-drag rotates, right-drag pans, scroll zooms.
    const camera = new ArcRotateCamera(
      'debugCamera',
      -1.2, // around: from the front-right, over the driveway
      1.05, // down from straight overhead
      30, // distance in meters
      new Vector3(0, 1, -1),
      this.scene,
    );
    camera.lowerRadiusLimit = 3;
    camera.upperRadiusLimit = 70;
    camera.upperBetaLimit = Math.PI / 2 - 0.05; // keep the camera above the ground
    camera.panningSensibility = 100; // lower = faster panning
    camera.attachControl(canvas, true);

    this.debugOverlay = new DebugOverlay(this.engine, this.scene, hudRoot);

    // Update order matters: later systems read what earlier ones produced this frame.
    this.systems = [this.debugOverlay];

    window.addEventListener('resize', () => this.engine.resize());
  }

  start() {
    this.engine.runRenderLoop(() => {
      const dt = toDeltaSeconds(this.engine.getDeltaTime(), config.loop.maxDeltaSeconds);
      for (const system of this.systems) system.update(dt);
      this.scene.render();
    });
  }
}
