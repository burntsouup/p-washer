// @ts-check

/**
 * How dirty each spot of a surface is: a grid of numbers from 0 (clean) to 1 (extremely dirty).
 *
 * This is pure data and math: it knows nothing about 3D, textures, or water. Something else
 * decides where the spray lands and how strong it is, then calls `scrub` or `scrubStroke`.
 *
 * Coordinates are in texels (grid cells): x from 0 to width, y from 0 to height.
 * Texel (i, j) covers the square from (i, j) to (i + 1, j + 1).
 */

/** A texel at or below this much dirt counts as clean for progress. */
export const CLEAN_THRESHOLD = 0.05;
/** Gap between brush stamps along a stroke, as a fraction of the brush radius. */
const STAMP_SPACING = 0.35;
/** Upper limit on stamps per stroke, so a huge jump can't stall a frame. Each stamp is cheap
 * (a brush 5 texels wide touches ~120 texels), so this only matters for teleport-size jumps. */
const MAX_STAMPS_PER_STROKE = 256;

/** @typedef {{ radius: number, hardness: number }} Brush radius in texels; hardness 0..1. */
/** @typedef {{ x: number, y: number }} Point */

export class DirtMask {
  /**
   * @param {number} width Texels across.
   * @param {number} height Texels down.
   */
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.dirt = new Float32Array(width * height);
    /** Texels that started dirty (above CLEAN_THRESHOLD). */
    this.dirtyCount = 0;
    /** How many of those have been cleaned so far. */
    this.cleanedCount = 0;
    this.changed = false;
  }

  /** 0 when nothing has been cleaned yet, 1 when everything that was dirty is clean. */
  get progress() {
    return this.dirtyCount === 0 ? 1 : this.cleanedCount / this.dirtyCount;
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  get(x, y) {
    return this.dirt[y * this.width + x];
  }

  /**
   * Sets the starting dirt everywhere and resets progress.
   *
   * @param {(x: number, y: number) => number} dirtAt Called with each texel's column and row.
   */
  fill(dirtAt) {
    this.dirtyCount = 0;
    this.cleanedCount = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const value = Math.min(1, Math.max(0, dirtAt(x, y)));
        this.dirt[y * this.width + x] = value;
        if (value > CLEAN_THRESHOLD) this.dirtyCount++;
      }
    }
    this.changed = true;
  }

  /**
   * One stamp of the brush: removes up to `amount` dirt under its center, less toward its edge.
   *
   * @param {number} centerX
   * @param {number} centerY
   * @param {number} amount Dirt removed at the center (e.g. cleaning rate × dt).
   * @param {Brush} brush
   * @returns {number} Total dirt actually removed (useful for feedback like splatter).
   */
  scrub(centerX, centerY, amount, brush) {
    const { radius, hardness } = brush;
    const minX = Math.max(0, Math.floor(centerX - radius));
    const maxX = Math.min(this.width - 1, Math.ceil(centerX + radius));
    const minY = Math.max(0, Math.floor(centerY - radius));
    const maxY = Math.min(this.height - 1, Math.ceil(centerY + radius));
    const radiusSquared = radius * radius;
    let removed = 0;

    for (let y = minY; y <= maxY; y++) {
      const dy = y + 0.5 - centerY;
      for (let x = minX; x <= maxX; x++) {
        const dx = x + 0.5 - centerX;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared >= radiusSquared) continue;

        const i = y * this.width + x;
        const before = this.dirt[i];
        if (before === 0) continue;
        const strength = brushFalloff(Math.sqrt(distanceSquared) / radius, hardness);
        const after = Math.max(0, before - amount * strength);
        this.dirt[i] = after;
        removed += before - after;
        // Dirt only ever goes down, so crossing the threshold happens once per texel.
        if (before > CLEAN_THRESHOLD && after <= CLEAN_THRESHOLD) this.cleanedCount++;
      }
    }

    if (removed > 0) this.changed = true;
    return removed;
  }

  /**
   * Drags the brush from one point to another, as when the spray sweeps between frames.
   *
   * Without this, a quick sweep would only clean where the spray happened to be on each
   * frame, leaving a dotted line. The `amount` is shared across the stamps, so the total
   * cleaning depends on how long you spray, not on how fast you move.
   *
   * @param {Point} from Where the spray was last frame (already cleaned then).
   * @param {Point} to Where the spray is now.
   * @param {number} amount Dirt removed at the center over the whole stroke.
   * @param {Brush} brush
   * @returns {number} Total dirt actually removed.
   */
  scrubStroke(from, to, amount, brush) {
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const stamps = Math.min(
      MAX_STAMPS_PER_STROKE,
      Math.max(1, Math.ceil(length / (brush.radius * STAMP_SPACING))),
    );
    let removed = 0;
    for (let s = 1; s <= stamps; s++) {
      const t = s / stamps;
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t;
      removed += this.scrub(x, y, amount / stamps, brush);
    }
    return removed;
  }

  /**
   * Whether the dirt changed since the last call. The renderer uses this to re-upload the
   * texture only when needed.
   */
  takeChanges() {
    const changed = this.changed;
    this.changed = false;
    return changed;
  }
}

/**
 * Brush strength at a distance from its center: full strength out to `hardness`, then a
 * smooth fade to zero at the edge. A high hardness gives the crisp "cleaning line" look.
 *
 * @param {number} t Distance from center divided by radius, 0..1.
 * @param {number} hardness 0..1.
 */
function brushFalloff(t, hardness) {
  if (t <= hardness) return 1;
  const s = (t - hardness) / (1 - hardness);
  return 1 - s * s * (3 - 2 * s);
}
