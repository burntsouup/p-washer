import { Constants, RawTexture, Texture, Vector3, VertexBuffer } from '@babylonjs/core';
import { config } from '../config.js';
import { DIRT_TYPE, DirtMask } from './DirtMask.js';
import { DirtMaterialPlugin } from './DirtMaterialPlugin.js';
import { unionRect } from './rect.js';
import { gridSize, texelCenterInMeters, uvAxesFromTriangle, uvToTexel } from './surfaceMath.js';
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
   *   dirt: import('./dirtPatterns.js').DirtPattern,
   * }} definition Size in meters, and the starting dirt (amount and type) in meters.
   */
  constructor(scene, { mesh, width, length, dirt }) {
    this.mesh = mesh;
    this.width = width;
    this.length = length;
    this.pattern = dirt;
    this.grid = gridSize(width, length, config.cleaning.texelsPerMeter);
    this.texelsPerMeter = this.grid.width / width; // actual, after rounding to whole texels
    this.axes = worldAxesOf(mesh); // which way the texture runs, to lay the spray on it

    this.mask = new DirtMask(this.grid.width, this.grid.height);
    // Grime comes off with any spray; moss follows config (by reference, so it's live-tunable).
    this.mask.typeRules = [{ minStrength: 0, rate: 1 }, config.cleaning.moss];
    this.wetness = new WetnessMap(this.grid.width, this.grid.height);
    this.fillWithStartingDirt();

    // Four bytes per texel: red = dirt, green = wetness, blue = moss (0..255 each), alpha unused.
    // Each upload packs just the changed rectangle into this buffer (sized for the worst case).
    this.uploadBuffer = new Uint8Array(this.grid.width * this.grid.height * 4);
    this.engine = scene.getEngine();
    this.texture = new RawTexture(
      this.uploadBuffer,
      this.grid.width,
      this.grid.height,
      Constants.TEXTUREFORMAT_RGBA,
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

  /** Makes the surface as dirty (and dry) as it was at the start, for another go. */
  fillWithStartingDirt() {
    /** @param {number} x @param {number} y */
    const meters = (x, y) => texelCenterInMeters(x, y, this.grid, this.width, this.length);
    this.mask.fill(
      (x, y) => {
        const point = meters(x, y);
        return this.pattern.dirtAt(point.x, point.y);
      },
      (x, y) => {
        const point = meters(x, y);
        return this.pattern.typeAt(point.x, point.y);
      },
    );
    this.wetness.dryCompletely();
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

  /**
   * Copies dirt and wetness to the GPU, but only the rectangle that changed since last time
   * (often just the area around the spray), and nothing at all if nothing changed.
   */
  uploadIfChanged() {
    const rect = unionRect(this.mask.takeChangedRect(), this.wetness.takeChangedRect());
    const internal = this.texture.getInternalTexture();
    if (!rect || !internal) return;
    const { dirt, type } = this.mask;
    const { wetness } = this.wetness;
    const gridWidth = this.grid.width;
    const width = rect.maxX - rect.minX + 1;
    const height = rect.maxY - rect.minY + 1;
    const data = this.uploadBuffer.subarray(0, width * height * 4);
    let o = 0;
    for (let y = rect.minY; y <= rect.maxY; y++) {
      for (let i = y * gridWidth + rect.minX, end = y * gridWidth + rect.maxX; i <= end; i++) {
        // `(v * 255 + 0.5) | 0` rounds 0..1 to 0..255, a little faster than Math.round.
        data[o++] = (dirt[i] * 255 + 0.5) | 0;
        data[o++] = (wetness[i] * 255 + 0.5) | 0;
        data[o++] = type[i] === DIRT_TYPE.moss ? 255 : 0;
        data[o++] = 0;
      }
    }
    const generateMipMaps = true; // keep the smaller copies in sync, so distant dirt is right
    this.engine.updateTextureData(
      internal,
      data,
      rect.minX,
      rect.minY,
      width,
      height,
      0,
      0,
      generateMipMaps,
    );
  }
}

/**
 * The world directions of the surface's texture u and v, and its normal. Assumes the mesh is
 * flat (every cleanable surface is), so one triangle tells us everything.
 *
 * @param {import('@babylonjs/core').Mesh} mesh
 * @returns {{ uAxis: Vec3, vAxis: Vec3, normal: Vec3 }}
 */
function worldAxesOf(mesh) {
  const world = mesh.computeWorldMatrix(true);
  const positions = mesh.getVerticesData(VertexBuffer.PositionKind) ?? [];
  const uvs = mesh.getVerticesData(VertexBuffer.UVKind) ?? [];
  const indices = mesh.getIndices() ?? [0, 1, 2];
  const corners = indices.slice(0, 3).map((i) => {
    const p = Vector3.TransformCoordinates(Vector3.FromArray(positions, i * 3), world);
    return [p.x, p.y, p.z];
  });
  const cornerUvs = indices.slice(0, 3).map((i) => [uvs[i * 2], uvs[i * 2 + 1]]);
  const { u, v } = uvAxesFromTriangle(corners, cornerUvs);
  const uAxis = Vector3.FromArray(u);
  const vAxis = Vector3.FromArray(v);
  const normal = Vector3.Cross(uAxis, vAxis).normalize(); // which side doesn't matter here
  return { uAxis, vAxis, normal };
}

/** @typedef {{ x: number, y: number, z: number }} Vec3 */
