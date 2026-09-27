import { DynamicTexture, Texture } from '@babylonjs/core';
import { createRandom } from '../cleaning/noise.js';

/**
 * Surface detail textures drawn in code with the 2D canvas API (no image files yet). They're
 * neutral greys: the material's color tints them, and dirt blends over them.
 */

/**
 * Vertical fence boards with dark gaps between them, wood grain, and the odd knot. One tile
 * covers `boardsPerTile` boards; repeat it along the fence with `uScale`.
 *
 * @param {import('@babylonjs/core').Scene} scene
 * @param {{ boardWidth: number, gap: number, boardsPerTile: number, seed: number }} layout
 *   Board and gap widths in meters (the same numbers the dirt pattern uses).
 */
export function createBoardTexture(scene, { boardWidth, gap, boardsPerTile, seed }) {
  if (!(boardWidth > 0 && gap >= 0 && boardsPerTile > 0)) {
    throw new Error(`createBoardTexture: bad layout ${JSON.stringify({ boardWidth, gap })}`);
  }
  const width = 512;
  const height = 512;
  const texture = new DynamicTexture('boardTexture', { width, height }, scene, true);
  const context = texture.getContext();
  const random = createRandom(seed);
  const pixelsPerMeter = width / (boardWidth * boardsPerTile);
  const gapPixels = Math.max(2, Math.round(gap * pixelsPerMeter));
  const boardPixels = boardWidth * pixelsPerMeter;

  context.fillStyle = 'rgb(70, 70, 70)'; // the gaps (seen between boards)
  context.fillRect(0, 0, width, height);
  for (let b = 0; b < boardsPerTile; b++) {
    const left = Math.round(b * boardPixels) + gapPixels;
    const right = Math.round((b + 1) * boardPixels);
    const shade = 200 + Math.floor(random() * 40); // boards vary a little
    context.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
    context.fillRect(left, 0, right - left, height);
    // Grain: faint lines running up the board.
    for (let g = 0; g < 14; g++) {
      const x = left + random() * (right - left);
      context.fillStyle = `rgba(0, 0, 0, ${0.04 + random() * 0.06})`;
      context.fillRect(x, 0, 1 + random() * 1.5, height);
    }
    // Now and then, a knot.
    if (random() < 0.5) {
      context.fillStyle = 'rgba(0, 0, 0, 0.18)';
      context.beginPath();
      context.ellipse(
        left + (right - left) * (0.3 + random() * 0.4),
        random() * height,
        3 + random() * 3,
        6 + random() * 6,
        0,
        0,
        Math.PI * 2,
      );
      context.fill();
    }
  }
  texture.wrapU = Texture.WRAP_ADDRESSMODE;
  texture.wrapV = Texture.WRAP_ADDRESSMODE;
  texture.update();
  return texture;
}
