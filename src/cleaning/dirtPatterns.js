// @ts-check
import { DIRT_TYPE } from './DirtMask.js';
import { createRandom, createValueNoise, fractalNoise, smoothstep } from './noise.js';

/**
 * Procedural starting dirt. Each pattern works in METERS (not texels), so it looks the same
 * whatever texture resolution we pick, and gives two things at every point:
 * - dirtAt(x, y): how dirty it is (0..1)
 * - typeAt(x, y): what kind of dirt it is (a DIRT_TYPE, e.g. grime or moss)
 *
 * @typedef {{ dirtAt: (x: number, y: number) => number, typeAt: (x: number, y: number) => number }} DirtPattern
 */

/** The four dirt levels from the design. Cleaning time scales with the amount of dirt. */
export const DIRT_LEVELS = { light: 0.25, dirty: 0.5, heavy: 0.75, extreme: 1 };

/**
 * A neglected concrete driveway:
 * - light: a dusty film everywhere, with some darker blotches ("dirty")
 * - dirty: two tire tracks running the length of the driveway
 * - heavy: grime built up along the edges, worst in the corners
 * - extreme: a few oil stains near the garage, where the car parks
 * - moss (tough): in the expansion joint across the middle, and along the lawn edges in the
 *   shadier half near the garage
 *
 * @param {{ width: number, length: number, seed: number }} options
 *   width across, length from the street (y = 0) to the garage (y = length), in meters.
 * @returns {DirtPattern}
 */
export function drivewayDirt({ width, length, seed }) {
  const random = createRandom(seed);
  const noise = createValueNoise(seed);
  const center = width / 2;
  const { light, dirty, heavy, extreme } = DIRT_LEVELS;

  const tracks = [center - 0.8, center + 0.8]; // a car's wheels are ~1.6 m apart
  const stains = Array.from({ length: 3 }, () => ({
    x: center + (random() - 0.5) * 1.8,
    y: length - 1.2 - random() * 2.5,
    radius: 0.3 + random() * 0.3,
  }));

  const jointY = length / 2; // a control joint (a cut line in the concrete) across the middle

  /** @param {number} x @param {number} y */
  const sample = (x, y) => {
    const blotches = fractalNoise(noise, x * 0.7, y * 0.7, 4); // ~1.5 m blobs with detail
    // Fine speckle. Rotating the coordinates hides the noise's underlying square grid.
    const grain = fractalNoise(noise, (x * 0.8 - y * 0.6) * 7 + 100, (x * 0.6 + y * 0.8) * 7, 2);

    // Everywhere: a light film, varying a little, with soft darker blotches here and there.
    let dirt = light + (blotches - 0.5) * 0.16 + (grain - 0.5) * 0.1;
    dirt = Math.max(dirt, smoothstep(0.56, 0.76, blotches) * (dirty + grain * 0.08));

    // Tire tracks: wander side to side a little and fade in and out along their length.
    tracks.forEach((trackX, i) => {
      const wander = (noise(i * 40, y * 0.25) - 0.5) * 0.25;
      const onTrack = 1 - smoothstep(0.08, 0.2, Math.abs(x - trackX - wander));
      const strength = smoothstep(0.3, 0.6, fractalNoise(noise, i * 20 + x * 0.5, y * 0.6, 3));
      dirt = Math.max(dirt, onTrack * (light + 0.1 + strength * (dirty + 0.12 - light - 0.1)));
    });

    // Edge grime: an uneven band along each edge, heaviest in the corners where dirt pools.
    const band = 0.2 + 0.35 * noise(x * 1.5 + 200, y * 1.5 + 200);
    const fromEdgeX = Math.min(x, width - x);
    const fromEdgeY = Math.min(y, length - y);
    const edge = 1 - smoothstep(0, band, Math.min(fromEdgeX, fromEdgeY));
    const corner =
      (1 - smoothstep(0, band * 1.8, fromEdgeX)) * (1 - smoothstep(0, band * 1.8, fromEdgeY));
    dirt = Math.max(dirt, edge * (dirty + 0.1 + grain * 0.1), corner * (heavy + grain * 0.15));

    // Oil stains: a black core with a brownish halo where the oil has spread.
    for (const stain of stains) {
      const wobble = (noise(x * 4 + 50, y * 4 + 50) - 0.5) * stain.radius * 0.6;
      const distance = Math.hypot(x - stain.x, y - stain.y) + wobble;
      const core = 1 - smoothstep(stain.radius * 0.45, stain.radius * 0.8, distance);
      const halo = 1 - smoothstep(stain.radius * 0.7, stain.radius * 1.5, distance);
      dirt = Math.max(dirt, core * extreme, halo * (heavy - 0.05));
    }

    // The joint collects grime along its whole length.
    const inJoint = 1 - smoothstep(0.012, 0.03, Math.abs(y - jointY));
    dirt = Math.max(dirt, inJoint * (dirty + 0.15));

    // Moss: clumps growing out of the joint, and along the lawn edges in the shadier
    // garage-end half. Clumps have ragged edges (fine noise) so they read as growth.
    const ragged = 0.8 + 0.4 * noise(x * 9 + 500, y * 9 + 500);
    const nearJoint = 1 - smoothstep(0.03, 0.14 * ragged, Math.abs(y - jointY));
    const jointMoss = nearJoint * smoothstep(0.4, 0.55, noise(x * 2.5 + 300, 7));
    const edgeBand = 1 - smoothstep(0.12, 0.5 * ragged, fromEdgeX);
    const shade = smoothstep(length * 0.3, length * 0.75, y);
    const patches = smoothstep(0.4, 0.55, fractalNoise(noise, x * 2 + 400, y * 2 + 400, 3));
    const moss = Math.max(jointMoss, edgeBand * shade * patches);
    const mossDirt = moss * (0.68 + grain * 0.22);
    const isMoss = mossDirt > 0.3 && mossDirt >= dirt;
    if (isMoss) dirt = mossDirt;

    return {
      dirt: Math.min(1, Math.max(0, dirt)),
      type: isMoss ? DIRT_TYPE.moss : DIRT_TYPE.grime,
    };
  };

  // fill() asks for dirt, then type, at each point in turn, so remember the last point to
  // avoid computing everything twice.
  let lastX = NaN;
  let lastY = NaN;
  let last = { dirt: 0, type: DIRT_TYPE.grime };
  /** @param {number} x @param {number} y */
  const at = (x, y) => {
    if (x !== lastX || y !== lastY) {
      last = sample(x, y);
      lastX = x;
      lastY = y;
    }
    return last;
  };
  return { dirtAt: (x, y) => at(x, y).dirt, typeAt: (x, y) => at(x, y).type };
}
