import { Engine, Scene } from '@babylonjs/core';
import { ThirdPersonCamera } from '../camera/ThirdPersonCamera.js';
import { CleanableSurface } from '../cleaning/CleanableSurface.js';
import { CleaningSystem } from '../cleaning/CleaningSystem.js';
import { config } from '../config.js';
import { createBackyard } from '../environment/Backyard.js';
import { createLighting, createSky } from '../environment/lighting.js';
import { Player } from '../player/Player.js';
import { DebugOverlay } from '../ui/DebugOverlay.js';
import { Hud } from '../ui/Hud.js';
import { Input } from './Input.js';
import { toDeltaSeconds } from './time.js';

/** How far the temporary crosshair brush reaches, in meters. */
const DEBUG_BRUSH_RANGE = 25;

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
    this.player.update(dt, this.camera.yaw); // move relative to where the camera looks
    this.camera.update(dt); // then follow the player to their new position
    this.updateDebugBrush(dt);
    this.cleaning.update(); // send any changed dirt to the GPU
    this.hud.update();
    this.debugOverlay.update(dt);
  }

  /**
   * Temporary stand-in for the pressure washer (Milestone 7 replaces it): hold the left
   * mouse button to clean whatever is under the crosshair.
   *
   * @param {number} dt
   */
  updateDebugBrush(dt) {
    if (!this.input.isMouseDown(0)) {
      this.cleaning.stopSpraying();
      return;
    }
    const ray = this.camera.babylonCamera.getForwardRay(DEBUG_BRUSH_RANGE);
    const hit = this.scene.pickWithRay(ray, (mesh) => mesh.isPickable && mesh.isVisible);
    this.cleaning.spray(hit, dt);
  }
}
