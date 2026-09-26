import { ArcRotateCamera, Color4, Engine, Scene, Vector3 } from '@babylonjs/core';
import { config } from '../config.js';
import { createBackyard } from '../environment/Backyard.js';
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
    this.scene.clearColor = new Color4(...config.render.skyColor, 1);

    this.environment = createBackyard(this.scene);

    // Temporary orbit camera (drag to rotate, scroll to zoom) until Milestone 3
    // replaces it with the third-person camera.
    const camera = new ArcRotateCamera(
      'debugCamera',
      -Math.PI / 2.5,
      1.1,
      12,
      Vector3.Zero(),
      this.scene,
    );
    camera.lowerRadiusLimit = 3;
    camera.upperRadiusLimit = 40;
    camera.upperBetaLimit = Math.PI / 2 - 0.05; // keep the camera above the ground
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
