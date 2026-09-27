import { Constants, RawTexture, Texture } from '@babylonjs/core';
import { config } from '../config.js';
import { DirtMask } from './DirtMask.js';
import { DirtMaterialPlugin } from './DirtMaterialPlugin.js';
import { gridSize, texelCenterInMeters, uvToTexel } from './surfaceMath.js';
import { WetnessMap } from './WetnessMap.js';

/**
 * Connects one flat mesh (like the driveway) to its dirt and wetness: the data grids, a
 * texture the GPU can read, and the material plugin that draws them.
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
    this.wetness = new WetnessMap(this.grid.width, this.grid.height);

    // Two bytes per texel: red = dirt, green = wetness (0..255 each).
    this.pixels = new Uint8Array(this.grid.width * this.grid.height * 2);
    this.texture = new RawTexture(
      this.pixels,
      this.grid.width,
      this.grid.height,
      Constants.TEXTUREFORMAT_RG,
      scene,
      true, // mipmaps: smaller copies that keep the dirt from shimmering at a distance
      false, // row 0 of the data is v = 0, same as the grids
      Texture.TRILINEAR_SAMPLINGMODE,
      Constants.TEXTURETYPE_UNSIGNED_BYTE,
    );
    this.texture.wrapU = Texture.CLAMP_ADDRESSMODE;
    this.texture.wrapV = Texture.CLAMP_ADDRESSMODE;

    // Give this mesh its own material, so the dirt doesn't appear on anything sharing it.
    const material = /** @type {import('@babylonjs/core').Material} */ (mesh.material);
    mesh.material = material.clone(`${mesh.name}DirtMat`);
    this.plugin = new DirtMaterialPlugin(mesh.material, this.texture);

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

  /** @param {number} dt Seconds since the previous frame. */
  update(dt) {
    this.wetness.dry(dt, config.cleaning.dryTime);
    this.uploadIfChanged();
  }

  /** Copies dirt and wetness to the GPU, but only if either changed since last time. */
  uploadIfChanged() {
    const dirtChanged = this.mask.takeChanges();
    const wetChanged = this.wetness.takeChanges();
    if (!dirtChanged && !wetChanged) return;
    const { dirt } = this.mask;
    const { wetness } = this.wetness;
    const { pixels } = this;
    for (let i = 0; i < dirt.length; i++) {
      pixels[i * 2] = Math.round(dirt[i] * 255);
      pixels[i * 2 + 1] = Math.round(wetness[i] * 255);
    }
    this.texture.update(pixels);
  }
}
