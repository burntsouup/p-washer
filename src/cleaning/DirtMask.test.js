import { describe, expect, it } from 'vitest';
import { CLEAN_THRESHOLD, DirtMask } from './DirtMask.js';

const brush = { radius: 5, hardness: 0.6 };

/** A mask where every texel starts at the same dirt value. */
function uniformMask(width, height, value) {
  const mask = new DirtMask(width, height);
  mask.fill(() => value);
  return mask;
}

describe('DirtMask basics', () => {
  it('starts clean and reports full progress when there is no dirt', () => {
    const mask = new DirtMask(8, 4);
    expect(mask.dirt.length).toBe(32);
    expect(mask.progress).toBe(1);
  });

  it('fill() sets every texel from a function of its position', () => {
    const mask = new DirtMask(4, 2);
    mask.fill((x, y) => (x + y * 4) / 10);
    expect(mask.get(3, 1)).toBeCloseTo(0.7);
  });

  it('fill() clamps values into 0..1', () => {
    const mask = new DirtMask(2, 1);
    mask.fill((x) => (x === 0 ? -1 : 5));
    expect([...mask.dirt]).toEqual([0, 1]);
  });

  it('counts dirty texels when filled, so progress starts at 0', () => {
    const mask = uniformMask(10, 10, 0.5);
    expect(mask.dirtyCount).toBe(100);
    expect(mask.progress).toBe(0);
  });

  it('does not count texels that start (almost) clean', () => {
    const mask = new DirtMask(2, 1);
    mask.fill((x) => (x === 0 ? CLEAN_THRESHOLD / 2 : 0.5));
    expect(mask.dirtyCount).toBe(1);
  });
});

describe('scrub (one brush stamp)', () => {
  it('removes dirt under the brush and nowhere else', () => {
    const mask = uniformMask(40, 40, 1);
    mask.scrub(20, 20, 0.3, brush);
    expect(mask.get(20, 20)).toBeCloseTo(0.7);
    expect(mask.get(0, 0)).toBe(1);
    expect(mask.get(30, 20)).toBe(1); // 10 texels away, outside the 5-texel radius
  });

  it('has a crisp edge: full strength in the middle, fading to nothing at the radius', () => {
    const mask = uniformMask(40, 40, 1);
    mask.scrub(20.5, 20.5, 0.5, brush); // centered exactly on texel (20, 20)
    const removedAt = (dx) => 1 - mask.get(20 + dx, 20);
    expect(removedAt(0)).toBeCloseTo(0.5); // center
    expect(removedAt(2)).toBeCloseTo(0.5); // 0.4 × radius: still inside the hard core
    expect(removedAt(4)).toBeGreaterThan(0); // 0.8 × radius: fading
    expect(removedAt(4)).toBeLessThan(0.5);
    expect(removedAt(5)).toBe(0); // at the radius: untouched
  });

  it('never goes below zero and returns how much dirt it actually removed', () => {
    const mask = uniformMask(20, 20, 0.2);
    const removed = mask.scrub(10, 10, 5, brush);
    expect(Math.min(...mask.dirt)).toBe(0);
    const total = 0.2 * 400 - mask.dirt.reduce((sum, v) => sum + v, 0);
    expect(removed).toBeCloseTo(total);
  });

  it('is linear: two half-strength stamps equal one full stamp (frame-rate independent)', () => {
    const once = uniformMask(30, 30, 1);
    const twice = uniformMask(30, 30, 1);
    once.scrub(15, 15, 0.4, brush);
    twice.scrub(15, 15, 0.2, brush);
    twice.scrub(15, 15, 0.2, brush);
    for (let i = 0; i < once.dirt.length; i++) expect(twice.dirt[i]).toBeCloseTo(once.dirt[i], 6);
  });

  it('clips at the edges of the grid without errors', () => {
    const mask = uniformMask(10, 10, 1);
    expect(() => mask.scrub(0, 0, 1, brush)).not.toThrow();
    expect(() => mask.scrub(-50, 200, 1, brush)).not.toThrow();
    expect(mask.get(0, 0)).toBe(0);
  });

  it('flags changes until they are taken', () => {
    const mask = uniformMask(10, 10, 1);
    expect(mask.takeChanges()).toBe(true); // filling counts as a change
    expect(mask.takeChanges()).toBe(false);
    mask.scrub(5, 5, 0.1, brush);
    expect(mask.takeChanges()).toBe(true);
    expect(mask.takeChanges()).toBe(false);
  });

  it('does not flag a change when scrubbing an already clean area', () => {
    const mask = uniformMask(10, 10, 0);
    mask.takeChanges();
    expect(mask.scrub(5, 5, 1, brush)).toBe(0);
    expect(mask.takeChanges()).toBe(false);
  });
});

describe('scrubStroke (brush dragged between two points)', () => {
  it('leaves no gaps on a fast sweep', () => {
    const mask = uniformMask(220, 20, 1);
    mask.scrubStroke({ x: 10, y: 10 }, { x: 210, y: 10 }, 1, brush);
    for (let x = 12; x <= 208; x++) expect(mask.get(x, 10)).toBeLessThan(1);
  });

  it('cleans evenly along the path (no beads of extra-clean spots)', () => {
    const mask = uniformMask(220, 20, 1);
    mask.scrubStroke({ x: 10, y: 10 }, { x: 210, y: 10 }, 4, brush);
    const removed = [];
    for (let x = 30; x <= 190; x++) removed.push(1 - mask.get(x, 10));
    expect(Math.min(...removed) / Math.max(...removed)).toBeGreaterThan(0.8);
  });

  it('removes about the same total dirt whether the brush moves or stands still', () => {
    // Same spray time either way, so the total amount of water (and cleaning) is the same.
    const moving = uniformMask(200, 40, 1);
    const still = uniformMask(200, 40, 1);
    const movedAway = moving.scrubStroke({ x: 50, y: 20 }, { x: 150, y: 20 }, 0.5, brush);
    const stayed = still.scrubStroke({ x: 100, y: 20 }, { x: 100, y: 20 }, 0.5, brush);
    expect(movedAway / stayed).toBeGreaterThan(0.9);
    expect(movedAway / stayed).toBeLessThan(1.1);
  });

  it('acts like a single stamp when both points are the same', () => {
    const a = uniformMask(20, 20, 1);
    const b = uniformMask(20, 20, 1);
    a.scrubStroke({ x: 10, y: 10 }, { x: 10, y: 10 }, 0.3, brush);
    b.scrub(10, 10, 0.3, brush);
    expect([...a.dirt]).toEqual([...b.dirt]);
  });
});

describe('fadeAll (finishing flourish)', () => {
  it('removes the same amount from every texel and never goes below zero', () => {
    const mask = new DirtMask(3, 1);
    mask.fill((x) => [0.1, 0.5, 1][x]);
    const removed = mask.fadeAll(0.3);
    expect(mask.get(0, 0)).toBe(0);
    expect(mask.get(1, 0)).toBeCloseTo(0.2);
    expect(mask.get(2, 0)).toBeCloseTo(0.7);
    expect(removed).toBeCloseTo(0.1 + 0.3 + 0.3);
  });

  it('brings progress to 1 once everything has faded', () => {
    const mask = uniformMask(10, 10, 0.8);
    mask.fadeAll(0.5);
    expect(mask.progress).toBe(0);
    mask.fadeAll(0.5);
    expect(mask.progress).toBe(1);
    expect(mask.fadeAll(0.5)).toBe(0);
  });
});

describe('progress', () => {
  it('rises as texels become clean and reaches 1 when everything is clean', () => {
    const mask = uniformMask(20, 20, 0.5);
    mask.scrub(10, 10, 1, brush);
    expect(mask.progress).toBeGreaterThan(0);
    expect(mask.progress).toBeLessThan(1);
    mask.scrub(10, 10, 1, { radius: 40, hardness: 1 });
    expect(mask.progress).toBe(1);
  });

  it('counts each texel only once, even if scrubbed again after it is clean', () => {
    const hardBrush = { radius: 5, hardness: 1 }; // cleans everything it touches fully
    const mask = uniformMask(20, 20, 0.5);
    mask.scrub(10, 10, 1, hardBrush);
    const cleaned = mask.cleanedCount;
    expect(cleaned).toBeGreaterThan(0);
    mask.scrub(10, 10, 1, hardBrush);
    expect(mask.cleanedCount).toBe(cleaned);
  });

  it('matches a full recount of clean texels', () => {
    const mask = uniformMask(50, 50, 0.6);
    mask.scrubStroke({ x: 5, y: 5 }, { x: 45, y: 30 }, 2, brush);
    const recount = mask.dirt.filter((v) => v <= CLEAN_THRESHOLD).length;
    expect(mask.cleanedCount).toBe(recount);
  });
});

describe('dirt-weighted progress', () => {
  /** Two texels: a light film (0.25) and an oil stain (1.0). */
  function filmAndOil() {
    const mask = new DirtMask(2, 1);
    mask.fill((x) => (x === 0 ? 0.25 : 1));
    return mask;
  }
  const hardBrush = { radius: 0.6, hardness: 1 }; // touches exactly one texel

  it('counts each spot by how dirty it started: oil is worth 4× a light film', () => {
    const cleanOil = filmAndOil();
    cleanOil.scrub(1.5, 0.5, 1, hardBrush);
    expect(cleanOil.progress).toBeCloseTo(1 / 1.25); // 80%

    const cleanFilm = filmAndOil();
    cleanFilm.scrub(0.5, 0.5, 1, hardBrush);
    expect(cleanFilm.progress).toBeCloseTo(0.25 / 1.25); // 20%
  });

  it('only counts a spot once it is fully clean', () => {
    const mask = filmAndOil();
    mask.scrub(1.5, 0.5, 0.8, hardBrush); // oil 1.0 → 0.2: much better, but not clean
    expect(mask.progress).toBe(0);
  });

  it('is exactly 1 when everything is clean, whatever order it was cleaned in', () => {
    const mask = new DirtMask(30, 30);
    mask.fill((x, y) => 0.1 + ((x * 7 + y * 13) % 10) / 11);
    mask.scrubStroke({ x: 30, y: 30 }, { x: 0, y: 0 }, 1, { radius: 40, hardness: 1 });
    expect(mask.progress).toBe(1);
  });

  it('matches a full recount of the starting dirt of every clean texel', () => {
    const mask = new DirtMask(50, 50);
    const startingDirt = (x, y) => 0.2 + ((x + y) % 5) * 0.2;
    mask.fill(startingDirt);
    mask.scrubStroke({ x: 5, y: 5 }, { x: 45, y: 30 }, 2, brush);
    let cleaned = 0;
    let total = 0;
    for (let y = 0; y < 50; y++) {
      for (let x = 0; x < 50; x++) {
        const start = Math.min(1, startingDirt(x, y));
        total += start;
        if (mask.get(x, y) <= CLEAN_THRESHOLD) cleaned += start;
      }
    }
    expect(mask.progress).toBeCloseTo(cleaned / total, 6);
  });
});
