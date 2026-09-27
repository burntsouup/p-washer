import { config } from '../config.js';

/**
 * Knows every cleanable surface and applies spray hits to them.
 *
 * The pressure washer raycasts into the scene and hands the hit to `spray()`. This class
 * turns that into dirt removal, continuing the stroke from last frame's hit so fast sweeps
 * leave no gaps.
 */
export class CleaningSystem {
  constructor() {
    /** @type {Map<import('@babylonjs/core').AbstractMesh, import('./CleanableSurface.js').CleanableSurface>} */
    this.surfaces = new Map();
    /** @type {{ surface: import('./CleanableSurface.js').CleanableSurface, point: { x: number, y: number } } | null} */
    this.lastHit = null;
    /** True while leftover dirt is fading away after a job completes. */
    this.isFinishing = false;
  }

  /** @param {import('./CleanableSurface.js').CleanableSurface} surface */
  add(surface) {
    this.surfaces.set(surface.mesh, surface);
  }

  /**
   * @param {import('@babylonjs/core').PickingInfo | null} hit Where the spray landed.
   * @param {number} dt Seconds since the previous frame.
   * @param {{ radius: number, strength: number }} spray Spot radius in meters; strength 0..1.
   * @returns {number} How much dirt came off this frame (0 if it missed every surface).
   */
  spray(hit, dt, { radius, strength }) {
    const surface = hit?.hit && hit.pickedMesh ? this.surfaces.get(hit.pickedMesh) : undefined;
    const uv = surface ? hit?.getTextureCoordinates() : null;
    if (!surface || !uv) {
      this.lastHit = null; // the stroke is broken; don't draw a line across the gap
      return 0;
    }

    const settings = config.cleaning;
    const point = surface.uvToTexel(uv.x, uv.y);
    const from = this.lastHit?.surface === surface ? this.lastHit.point : point;
    const brush = { radius: surface.metersToTexels(radius), hardness: settings.brushHardness };
    const amount = settings.cleanRate * strength * dt;
    const removed = surface.mask.scrubStroke(from, point, amount, brush);
    // Water spreads a little beyond where it cleans.
    surface.wetness.soakStroke(from, point, brush.radius * settings.wetSpread);
    this.lastHit = { surface, point };
    return removed;
  }

  /** Call when the spray stops, so the next spray starts a fresh stroke. */
  stopSpraying() {
    this.lastHit = null;
  }

  /**
   * Fraction of all the dirt (across every surface) that has been cleaned, 0..1. Weighted by
   * how dirty each spot started, like DirtMask.progress.
   */
  get progress() {
    let dirtyWeight = 0;
    let cleanedWeight = 0;
    let allClean = true;
    for (const { mask } of this.surfaces.values()) {
      dirtyWeight += mask.dirtyWeight;
      cleanedWeight += mask.cleanedWeight;
      if (mask.cleanedCount !== mask.dirtyCount) allClean = false;
    }
    return allClean ? 1 : cleanedWeight / dirtyWeight;
  }

  /** @param {number} dt Seconds since the previous frame. */
  update(dt) {
    if (this.isFinishing) {
      // Fade out every leftover speck together; stop once nothing is left.
      let removed = 0;
      const amount = dt / config.job.finishFadeTime;
      for (const { mask } of this.surfaces.values()) removed += mask.fadeAll(amount);
      if (removed === 0) this.isFinishing = false;
    }
    // Dry every surface a little and send any changes to the GPU.
    for (const surface of this.surfaces.values()) surface.update(dt);
  }

  /** Starts the finishing flourish: all remaining dirt fades away over a moment. */
  finishRemaining() {
    this.isFinishing = true;
  }

  /** @param {number} amount 0..1: how strongly to highlight the dirt that's left. */
  setHighlight(amount) {
    for (const surface of this.surfaces.values()) surface.plugin.highlight = amount;
  }

  /** Puts all the dirt back, for another go. */
  reset() {
    this.isFinishing = false;
    this.lastHit = null;
    for (const surface of this.surfaces.values()) surface.fillWithStartingDirt();
  }
}
