import { Color3, MaterialPluginBase } from '@babylonjs/core';

/**
 * Adds dirt to a standard material. A material plugin inserts a few lines of shader code
 * into Babylon's normal material, so the surface keeps all its lighting and shadows.
 *
 * The dirt texture stores one value per texel (0 = clean, 1 = extremely dirty). The shader
 * blends the clean surface color toward a dusty film, then brown grime, then black oil.
 */
export class DirtMaterialPlugin extends MaterialPluginBase {
  /**
   * @param {import('@babylonjs/core').Material} material
   * @param {import('@babylonjs/core').BaseTexture} dirtTexture
   * @param {{ light: string, grime: string, oil: string }} colors Hex colors for each stage.
   */
  constructor(material, dirtTexture, colors) {
    super(material, 'DirtMask', 200, { DIRTMASK: false });
    this.dirtTexture = dirtTexture;
    this.colorLight = Color3.FromHexString(colors.light);
    this.colorGrime = Color3.FromHexString(colors.grime);
    this.colorOil = Color3.FromHexString(colors.oil);
    this._enable(true);
  }

  getClassName() {
    return 'DirtMaterialPlugin';
  }

  /** @param {import('@babylonjs/core').MaterialDefines} defines */
  prepareDefinesBeforeAttributes(defines) {
    defines.DIRTMASK = true;
    // Ask Babylon to pass the mesh's UV coordinates to the fragment shader as vMainUV1,
    // even though the material has no ordinary textures that would need them.
    defines._needUVs = true;
    defines.MAINUV1 = true;
  }

  isReadyForSubMesh() {
    return this.dirtTexture.isReady();
  }

  /** @param {string[]} samplers */
  getSamplers(samplers) {
    samplers.push('dirtSampler');
  }

  getUniforms() {
    return {
      ubo: [
        { name: 'dirtColorLight', size: 3, type: 'vec3' },
        { name: 'dirtColorGrime', size: 3, type: 'vec3' },
        { name: 'dirtColorOil', size: 3, type: 'vec3' },
      ],
      fragment: `
        uniform vec3 dirtColorLight;
        uniform vec3 dirtColorGrime;
        uniform vec3 dirtColorOil;`,
    };
  }

  /** @param {import('@babylonjs/core').UniformBuffer} uniformBuffer */
  bindForSubMesh(uniformBuffer) {
    uniformBuffer.updateColor3('dirtColorLight', this.colorLight);
    uniformBuffer.updateColor3('dirtColorGrime', this.colorGrime);
    uniformBuffer.updateColor3('dirtColorOil', this.colorOil);
    uniformBuffer.setTexture('dirtSampler', this.dirtTexture);
  }

  /** @param {import('@babylonjs/core').BaseTexture[]} activeTextures */
  getActiveTextures(activeTextures) {
    activeTextures.push(this.dirtTexture);
  }

  /** @param {import('@babylonjs/core').BaseTexture} texture */
  hasTexture(texture) {
    return texture === this.dirtTexture;
  }

  /** @param {string} shaderType */
  getCustomCode(shaderType) {
    if (shaderType !== 'fragment') return null;
    return {
      CUSTOM_FRAGMENT_DEFINITIONS: 'uniform sampler2D dirtSampler;',
      // Runs after Babylon has worked out the surface color, before lighting is applied.
      CUSTOM_FRAGMENT_UPDATE_DIFFUSE: `
        #ifdef DIRTMASK
          float dirtRaw = texture2D(dirtSampler, vMainUV1).r;
          // Treat nearly-clean spots as fully clean, so cleaned areas look crisp and finished.
          float dirt = dirtRaw * smoothstep(0.03, 0.1, dirtRaw);
          vec3 dirtColor = mix(dirtColorLight, dirtColorGrime, smoothstep(0.3, 0.65, dirt));
          dirtColor = mix(dirtColor, dirtColorOil, smoothstep(0.7, 1.0, dirt));
          // Even a light film hides most of the clean surface; heavier dirt only gets darker.
          diffuseColor = mix(diffuseColor, dirtColor, smoothstep(0.0, 0.3, dirt));
        #endif
      `,
    };
  }
}
