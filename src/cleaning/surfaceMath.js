// @ts-check

/**
 * Pure conversions between a surface's real size (meters), its UV coordinates (0..1 across
 * the mesh), and its dirt grid (texels).
 */

/**
 * How many texels a surface's dirt grid needs for a given detail level.
 *
 * @param {number} widthMeters
 * @param {number} lengthMeters
 * @param {number} texelsPerMeter
 * @returns {{ width: number, height: number }} Texels across and down (at least 1 each).
 */
export function gridSize(widthMeters, lengthMeters, texelsPerMeter) {
  return {
    width: Math.max(1, Math.round(widthMeters * texelsPerMeter)),
    height: Math.max(1, Math.round(lengthMeters * texelsPerMeter)),
  };
}

/**
 * Where a UV coordinate (e.g. from a raycast hit) lands on the dirt grid.
 *
 * @param {number} u 0..1 across the surface.
 * @param {number} v 0..1 along the surface.
 * @param {{ width: number, height: number }} grid
 * @returns {{ x: number, y: number }} Texel coordinates (fractional).
 */
export function uvToTexel(u, v, grid) {
  return { x: clamp01(u) * grid.width, y: clamp01(v) * grid.height };
}

/**
 * The real-world position of a texel's center, measured from the surface's corner.
 *
 * @param {number} x Texel column.
 * @param {number} y Texel row.
 * @param {{ width: number, height: number }} grid
 * @param {number} widthMeters
 * @param {number} lengthMeters
 * @returns {{ x: number, y: number }} Meters.
 */
export function texelCenterInMeters(x, y, grid, widthMeters, lengthMeters) {
  return {
    x: ((x + 0.5) / grid.width) * widthMeters,
    y: ((y + 0.5) / grid.height) * lengthMeters,
  };
}

/** @param {number} value */
function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}
