// @ts-check

/**
 * Pure math for the pressure washer's spray. No Babylon imports, so it's easy to unit-test.
 */

/** @typedef {{ x: number, y: number, z: number }} Vec3 */

/**
 * How the spray behaves at a distance from the nozzle. Up close it's a tight, full-strength
 * spot. Further away the fan spreads wider but weakens, until it stops cleaning at maxRange.
 *
 * @param {number} distance Meters from the nozzle to where the water lands.
 * @param {{ nozzleRadius: number, spreadPerMeter: number, fullStrengthRange: number, maxRange: number }} settings
 * @returns {{ radius: number, strength: number }} Spot radius in meters; strength 0..1.
 */
export function sprayAtDistance(distance, settings) {
  const { nozzleRadius, spreadPerMeter, fullStrengthRange, maxRange } = settings;
  const d = Math.max(0, distance);
  const radius = nozzleRadius + spreadPerMeter * d;
  let strength = 1;
  if (d >= maxRange) strength = 0;
  else if (d > fullStrengthRange)
    strength = 1 - (d - fullStrengthRange) / (maxRange - fullStrengthRange);
  return { radius, strength };
}

/**
 * Which way the spray gun should point to hit what the crosshair is on.
 *
 * The crosshair ray starts at the camera, but water comes out of the gun, so we aim the gun
 * at the crosshair's target. If that target is too close to the gun, or behind it, pointing
 * at it would look wrong, so we fall back to the camera's own direction.
 *
 * @param {Vec3} from The gun's position.
 * @param {Vec3} target What the crosshair is on.
 * @param {Vec3} fallback The camera's forward direction (a unit vector).
 * @param {number} minDistance Closer targets than this use the fallback.
 * @returns {Vec3} A unit vector.
 */
export function aimDirection(from, target, fallback, minDistance) {
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const dz = target.z - from.z;
  const length = Math.hypot(dx, dy, dz);
  if (length < minDistance) return { ...fallback };
  const direction = { x: dx / length, y: dy / length, z: dz / length };
  const agreesWithCamera =
    direction.x * fallback.x + direction.y * fallback.y + direction.z * fallback.z;
  return agreesWithCamera > 0 ? direction : { ...fallback };
}

/**
 * Distance on the ground plane (ignoring height), e.g. to check if the player is in reach.
 *
 * @param {Vec3} a
 * @param {Vec3} b
 */
export function groundDistance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}
