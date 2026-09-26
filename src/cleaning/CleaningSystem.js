import { config } from '../config.js';

/**
 * Knows every cleanable surface and applies spray hits to them.
 *
 * Whatever does the spraying (the debug brush now, the pressure washer later) raycasts into
 * the scene and hands the hit to `spray()`. This class turns that into dirt removal,
 * continuing the stroke from last frame's hit so fast sweeps leave no gaps.
 */
export class CleaningSystem {
  constructor() {
    /** @type {Map<import('@babylonjs/core').AbstractMesh, import('./CleanableSurface.js').CleanableSurface>} */
    this.surfaces = new Map();
    /** @type {{ surface: import('./CleanableSurface.js').CleanableSurface, point: { x: number, y: number } } | null} */
    this.lastHit = null;
  }

  /** @param {import('./CleanableSurface.js').CleanableSurface} surface */
  add(surface) {
    this.surfaces.set(surface.mesh, surface);
  }

  /**
   * @param {import('@babylonjs/core').PickingInfo | null} hit Where the spray landed.
   * @param {number} dt Seconds since the previous frame.
   * @returns {number} How much dirt came off this frame (0 if it missed every surface).
   */
  spray(hit, dt) {
    const surface = hit?.hit && hit.pickedMesh ? this.surfaces.get(hit.pickedMesh) : undefined;
    const uv = surface ? hit?.getTextureCoordinates() : null;
    if (!surface || !uv) {
      this.lastHit = null; // the stroke is broken; don't draw a line across the gap
      return 0;
    }

    const settings = config.cleaning;
    const point = surface.uvToTexel(uv.x, uv.y);
    const from = this.lastHit?.surface === surface ? this.lastHit.point : point;
    const brush = {
      radius: surface.metersToTexels(settings.sprayRadius),
      hardness: settings.brushHardness,
    };
    const removed = surface.mask.scrubStroke(from, point, settings.cleanRate * dt, brush);
    this.lastHit = { surface, point };
    return removed;
  }

  /** Call when the spray stops, so the next spray starts a fresh stroke. */
  stopSpraying() {
    this.lastHit = null;
  }

  /** Fraction of all the dirt (across every surface) that has been cleaned, 0..1. */
  get progress() {
    let dirty = 0;
    let cleaned = 0;
    for (const { mask } of this.surfaces.values()) {
      dirty += mask.dirtyCount;
      cleaned += mask.cleanedCount;
    }
    return dirty === 0 ? 1 : cleaned / dirty;
  }

  update() {
    for (const surface of this.surfaces.values()) surface.uploadIfChanged();
  }
}
