import { describe, expect, it } from 'vitest';
import { aimDirection, groundDistance, sprayAtDistance } from './sprayMath.js';

const settings = { nozzleRadius: 0.06, spreadPerMeter: 0.07, fullStrengthRange: 1.2, maxRange: 6 };

describe('sprayAtDistance', () => {
  it('is a tight spot at the nozzle that widens with distance', () => {
    expect(sprayAtDistance(0, settings).radius).toBeCloseTo(0.06);
    expect(sprayAtDistance(2, settings).radius).toBeCloseTo(0.2);
    expect(sprayAtDistance(4, settings).radius).toBeGreaterThan(
      sprayAtDistance(2, settings).radius,
    );
  });

  it('is full strength up close, fades with distance, and stops at max range', () => {
    expect(sprayAtDistance(1, settings).strength).toBe(1);
    expect(sprayAtDistance(3.6, settings).strength).toBeCloseTo(0.5);
    expect(sprayAtDistance(6, settings).strength).toBe(0);
    expect(sprayAtDistance(10, settings).strength).toBe(0);
  });

  it('never gets stronger as you move away', () => {
    let previous = Infinity;
    for (let d = 0; d <= 7; d += 0.25) {
      const { strength } = sprayAtDistance(d, settings);
      expect(strength).toBeLessThanOrEqual(previous);
      previous = strength;
    }
  });

  it('treats negative distances as zero', () => {
    expect(sprayAtDistance(-1, settings)).toEqual(sprayAtDistance(0, settings));
  });
});

describe('aimDirection', () => {
  const forward = { x: 0, y: 0, z: 1 };

  it('points from the gun to the target as a unit vector', () => {
    const direction = aimDirection({ x: 0, y: 1, z: 0 }, { x: 3, y: 1, z: 4 }, forward, 0.5);
    expect(direction.x).toBeCloseTo(0.6);
    expect(direction.z).toBeCloseTo(0.8);
    expect(Math.hypot(direction.x, direction.y, direction.z)).toBeCloseTo(1);
  });

  it('uses the camera direction when the target is too close to the gun', () => {
    expect(aimDirection({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0.2 }, forward, 0.5)).toEqual(
      forward,
    );
  });

  it('uses the camera direction when the target is behind the gun', () => {
    expect(aimDirection({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -3 }, forward, 0.5)).toEqual(
      forward,
    );
  });
});

describe('groundDistance', () => {
  it('ignores height', () => {
    expect(groundDistance({ x: 0, y: 0, z: 0 }, { x: 3, y: 10, z: 4 })).toBe(5);
  });
});
