import { Constants, RawTexture, Texture } from '@babylonjs/core';
import { config } from '../config.js';
import { DirtMask } from './DirtMask.js';
import { DirtMaterialPlugin } from './DirtMaterialPlugin.js';
import { gridSize, texelCenterInMeters, uvToTexel } from './surfaceMath.js';

/**
 * Connects one flat mesh (like the driveway) to its dirt: the DirtMask data, a texture the
 * GPU can read, and the material plugin that draws the dirt.
 */
export class CleanableSurface {
  /**
   * @param {import('@babylonjs/core').Scene} scene
   * @param {{
   *   mesh: import('@babylonjs/core').Mesh,
   *   width: number,
   *   length: number,
   *   dirtAt: (x: number, y: number) => number,
   * }} definition Size in meters, and the starting dirt at a point in meters.
   */
  constructor(scene, { mesh, width, length, dirtAt }) {
    this.mesh = mesh;
    this.grid = gridSize(width, length, config.cleaning.texelsPerMeter);
    this.texelsPerMeter = this.grid.width / width; // actual, after rounding to whole texels

    this.mask = new DirtMask(this.grid.width, this.grid.height);
    this.mask.fill((x, y) => {
      const point = texelCenterInMeters(x, y, this.grid, width, length);
      return dirtAt(point.x, point.y);
    });

    // One byte per texel (0..255) is plenty of precision for drawing.
    this.pixels = new Uint8Array(this.grid.width * this.grid.height);
    this.texture = RawTexture.CreateRTexture(
      this.pixels,
      this.grid.width,
      this.grid.height,
      scene,
      true, // mipmaps: smaller copies that keep the dirt from shimmering at a distance
      false, // row 0 of the data is v = 0, same as the mask
      Texture.TRILINEAR_SAMPLINGMODE,
      Constants.TEXTURETYPE_UNSIGNED_BYTE, // one byte per texel (the default would be floats)
    );
    this.texture.wrapU = Texture.CLAMP_ADDRESSMODE;
    this.texture.wrapV = Texture.CLAMP_ADDRESSMODE;

    // Give this mesh its own material, so the dirt doesn't appear on anything sharing it.
    const material = /** @type {import('@babylonjs/core').Material} */ (mesh.material);
    mesh.material = material.clone(`${mesh.name}DirtMat`);
    this.plugin = new DirtMaterialPlugin(mesh.material, this.texture, config.cleaning.dirtColors);

    this.uploadIfChanged();
  }

  /**
   * @param {number} u
   * @param {number} v
   */
  uvToTexel(u, v) {
    return uvToTexel(u, v, this.grid);
  }

  /** @param {number} meters */
  metersToTexels(meters) {
    return meters * this.texelsPerMeter;
  }

  /** Copies the dirt to the GPU, but only if it changed since last time. */
  uploadIfChanged() {
    if (!this.mask.takeChanges()) return;
    const { dirt } = this.mask;
    for (let i = 0; i < dirt.length; i++) this.pixels[i] = Math.round(dirt[i] * 255);
    this.texture.update(this.pixels);
  }
}
