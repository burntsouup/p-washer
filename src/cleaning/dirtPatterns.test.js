import { describe, expect, it } from 'vitest';
import { DIRT_TYPE } from './DirtMask.js';
import { DIRT_LEVELS, drivewayDirt } from './dirtPatterns.js';
import { createRandom, createValueNoise, fractalNoise, smoothstep } from './noise.js';

describe('createRandom', () => {
  it('gives the same sequence for the same seed', () => {
    const a = createRandom(42);
    const b = createRandom(42);
    for (let i = 0; i < 5; i++) expect(a()).toBe(b());
  });

  it('gives different sequences for different seeds, always in [0, 1)', () => {
    const a = createRandom(1);
    const b = createRandom(2);
    const values = Array.from({ length: 1000 }, a);
    expect(values[0]).not.toBe(b());
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThan(1);
  });
});

describe('createValueNoise', () => {
  const noise = createValueNoise(7);

  it('stays in [0, 1], including negative coordinates', () => {
    for (let i = 0; i < 500; i++) {
      const value = noise(i * 0.37 - 90, i * -0.61 + 20);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('is smooth: nearby points have nearby values', () => {
    expect(Math.abs(noise(3.2, 4.7) - noise(3.21, 4.7))).toBeLessThan(0.05);
  });

  it('fractal noise also stays in [0, 1]', () => {
    for (let i = 0; i < 200; i++) {
      const value = fractalNoise(noise, i * 0.9, i * 0.4, 4);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});

describe('smoothstep', () => {
  it('is 0 below, 1 above, and 0.5 halfway', () => {
    expect(smoothstep(1, 2, 0)).toBe(0);
    expect(smoothstep(1, 2, 3)).toBe(1);
    expect(smoothstep(1, 2, 1.5)).toBeCloseTo(0.5);
  });
});

describe('drivewayDirt', () => {
  const width = 5;
  const length = 10;
  const step = 0.05; // sample every 5 cm

  /** Samples the pattern on a grid and returns [{ x, y, dirt, type }]. */
  function sample(seed) {
    const { dirtAt, typeAt } = drivewayDirt({ width, length, seed });
    const samples = [];
    for (let y = step / 2; y < length; y += step) {
      for (let x = step / 2; x < width; x += step) {
        samples.push({ x, y, dirt: dirtAt(x, y), type: typeAt(x, y) });
      }
    }
    return samples;
  }
  const samples = sample(1);
  const average = (list) => list.reduce((sum, s) => sum + s.dirt, 0) / list.length;

  it('is the same every time for the same seed, and different for another seed', () => {
    const again = sample(1);
    const other = sample(2);
    expect(again.map((s) => s.dirt)).toEqual(samples.map((s) => s.dirt));
    expect(other.map((s) => s.dirt)).not.toEqual(samples.map((s) => s.dirt));
  });

  it('stays in 0..1 and leaves no spot already clean', () => {
    const values = samples.map((s) => s.dirt);
    expect(Math.min(...values)).toBeGreaterThan(0.1);
    expect(Math.max(...values)).toBeLessThanOrEqual(1);
  });

  it('contains all four dirt levels', () => {
    const near = (level, tolerance) =>
      samples.filter((s) => Math.abs(s.dirt - level) <= tolerance).length;
    expect(near(DIRT_LEVELS.light, 0.1)).toBeGreaterThan(samples.length * 0.3); // most of it
    expect(near(DIRT_LEVELS.dirty, 0.1)).toBeGreaterThan(100);
    expect(near(DIRT_LEVELS.heavy, 0.1)).toBeGreaterThan(20);
    expect(near(DIRT_LEVELS.extreme, 0.05)).toBeGreaterThan(20);
  });

  it('is grimier along the edges than in the middle, and grimiest in the corners', () => {
    const corners = samples.filter(
      (s) => Math.min(s.x, width - s.x) < 0.2 && Math.min(s.y, length - s.y) < 0.2,
    );
    const edges = samples.filter(
      (s) => Math.min(s.x, width - s.x) < 0.1 && Math.min(s.y, length - s.y) > 1,
    );
    const middle = samples.filter((s) => Math.abs(s.x - 1.2) < 0.2 && Math.abs(s.y - 5) < 2);
    expect(average(edges)).toBeGreaterThan(average(middle));
    expect(average(corners)).toBeGreaterThan(average(edges));
  });

  it('puts the oil stains (the extreme dirt) near the garage end', () => {
    const extreme = samples.filter((s) => s.dirt > 0.95);
    expect(extreme.length).toBeGreaterThan(0);
    for (const s of extreme) expect(s.y).toBeGreaterThan(length / 2);
  });

  it('grows some moss, but only a small part of the driveway', () => {
    const moss = samples.filter((s) => s.type === DIRT_TYPE.moss);
    expect(moss.length).toBeGreaterThan(20);
    expect(moss.length).toBeLessThan(samples.length * 0.1);
  });

  it('grows moss only around the middle joint or along the edges in the garage-end half', () => {
    for (const s of samples.filter((s) => s.type === DIRT_TYPE.moss)) {
      const nearJoint = Math.abs(s.y - length / 2) < 0.2;
      const onShadyEdge = Math.min(s.x, width - s.x) < 0.65 && s.y > length * 0.3;
      expect(nearJoint || onShadyEdge).toBe(true);
    }
  });

  it('makes moss thick (it is tough and worth a lot)', () => {
    for (const s of samples.filter((s) => s.type === DIRT_TYPE.moss)) {
      expect(s.dirt).toBeGreaterThan(0.3);
    }
  });
});
