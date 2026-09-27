// @ts-check

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
   * Soaks a round area: fully wet in the middle, with a soft edge. Never makes a spot drier.
   *
   * @param {number} centerX Texels.
   * @param {number} centerY Texels.
   * @param {number} radius Texels.
   */
  soak(centerX, centerY, radius) {
    const minX = Math.max(0, Math.floor(centerX - radius));
    const maxX = Math.min(this.width - 1, Math.ceil(centerX + radius));
    const minY = Math.max(0, Math.floor(centerY - radius));
    const maxY = Math.min(this.height - 1, Math.ceil(centerY + radius));
    for (let y = minY; y <= maxY; y++) {
      const dy = y + 0.5 - centerY;
      for (let x = minX; x <= maxX; x++) {
        const dx = x + 0.5 - centerX;
        const t = Math.sqrt(dx * dx + dy * dy) / radius;
        if (t >= 1) continue;
        const soaked = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
        const i = y * this.width + x;
        if (soaked > this.wetness[i]) this.wetness[i] = soaked;
      }
    }
    this.changed = true;
    this.secondsSinceSoak = 0;
  }

  /**
   * Soaks along a line, so a fast sweep leaves a continuous wet trail.
   *
   * @param {{ x: number, y: number }} from
   * @param {{ x: number, y: number }} to
   * @param {number} radius Texels.
   */
  soakStroke(from, to, radius) {
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const stamps = Math.min(
      MAX_STAMPS_PER_STROKE,
      Math.max(1, Math.ceil(length / (radius * STAMP_SPACING))),
    );
    for (let s = 1; s <= stamps; s++) {
      const t = s / stamps;
      this.soak(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, radius);
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
}
