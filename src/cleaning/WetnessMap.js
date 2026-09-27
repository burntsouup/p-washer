// @ts-check
import { ellipseReach, forEachTexelInEllipse, toEllipse } from './brushShape.js';

/**
 * How wet each spot of a surface is: 0 (dry) to 1 (soaked). Uses the same grid as the
 * surface's DirtMask. Spraying soaks the area under the spray; everything then dries at a
 * steady rate. Pure data and math, like DirtMask.
 */

/** Gap between soak stamps along a stroke, as a fraction of the radius. */
const STAMP_SPACING = 0.5;
const MAX_STAMPS_PER_STROKE = 128;

export class WetnessMap {
  /**
   * @param {number} width Texels across.
   * @param {number} height Texels down.
   */
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.wetness = new Float32Array(width * height);
    this.changed = false;
    // Starts fully dry, so drying has nothing to do until the first soak.
    this.secondsSinceSoak = Number.POSITIVE_INFINITY;
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  get(x, y) {
    return this.wetness[y * this.width + x];
  }

  /**
   * Soaks an area: fully wet in the middle, with a soft edge. Never makes a spot drier.
   *
   * @param {number} centerX Texels.
   * @param {number} centerY Texels.
   * @param {number | import('./brushShape.js').BrushShape} shape A radius, or a circle/ellipse.
   */
  soak(centerX, centerY, shape) {
    const ellipse = toEllipse(typeof shape === 'number' ? { radius: shape } : shape);
    const { wetness } = this;
    forEachTexelInEllipse(this.width, this.height, centerX, centerY, ellipse, (i, t) => {
      const soaked = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
      if (soaked > wetness[i]) wetness[i] = soaked;
    });
    this.changed = true;
    this.secondsSinceSoak = 0;
  }

  /**
   * Soaks along a line, so a fast sweep leaves a continuous wet trail.
   *
   * @param {{ x: number, y: number }} from
   * @param {{ x: number, y: number }} to
   * @param {number | import('./brushShape.js').BrushShape} shape A radius, or a circle/ellipse.
   */
  soakStroke(from, to, shape) {
    const ellipse = toEllipse(typeof shape === 'number' ? { radius: shape } : shape);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const reach = ellipseReach(ellipse, dx, dy);
    const stamps = Math.min(
      MAX_STAMPS_PER_STROKE,
      Math.max(1, Math.ceil(Math.hypot(dx, dy) / (reach * STAMP_SPACING))),
    );
    for (let s = 1; s <= stamps; s++) {
      const t = s / stamps;
      this.soak(from.x + dx * t, from.y + dy * t, ellipse);
    }
  }

  /**
   * Dries everything a little. A fully soaked spot is dry after `dryTime` seconds.
   *
   * @param {number} dt Seconds since the previous frame.
   * @param {number} dryTime Seconds for a soaked spot to dry completely.
   */
  dry(dt, dryTime) {
    // Everything is already dry: skip the work entirely.
    if (this.secondsSinceSoak >= dryTime) return;
    this.secondsSinceSoak += dt;
    const amount = dt / dryTime;
    const { wetness } = this;
    for (let i = 0; i < wetness.length; i++) {
      if (wetness[i] > 0) wetness[i] = Math.max(0, wetness[i] - amount);
    }
    this.changed = true;
  }

  /** Whether the wetness changed since the last call. */
  takeChanges() {
    const changed = this.changed;
    this.changed = false;
    return changed;
  }

  /** Instantly dries everything (e.g. when restarting a job). */
  dryCompletely() {
    this.wetness.fill(0);
    this.secondsSinceSoak = Number.POSITIVE_INFINITY;
    this.changed = true;
  }
}
