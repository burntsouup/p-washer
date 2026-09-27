import { Color3, MaterialPluginBase, Vector3 } from '@babylonjs/core';
import { config } from '../config.js';

/**
 * Adds dirt and wetness to a standard material. A material plugin inserts a few lines of
 * shader code into Babylon's normal material, so the surface keeps its lighting and shadows.
 *
 * The texture's red channel is dirt (0 = clean, 1 = extremely dirty): the shader blends the
 * clean color toward a dusty film, then brown grime, then black oil. The green channel is
 * wetness: wet spots look darker and pick up a sheen of sky and glints of sun.
 */
export class DirtMaterialPlugin extends MaterialPluginBase {
  /**
   * @param {import('@babylonjs/core').Material} material
   * @param {import('@babylonjs/core').BaseTexture} dirtTexture
   */
  constructor(material, dirtTexture) {
    super(material, 'DirtMask', 200, { DIRTMASK: false });
    const { dirtColors, wetDarkening } = config.cleaning;
    this.dirtTexture = dirtTexture;
    this.colorLight = Color3.FromHexString(dirtColors.light);
    this.colorGrime = Color3.FromHexString(dirtColors.grime);
    this.colorOil = Color3.FromHexString(dirtColors.oil);
    this.wetDarkening = wetDarkening;
    this.skyColor = Color3.FromHexString(config.render.sky.horizon);
    this.sunDirection = new Vector3(...config.render.sun.direction).normalize();
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
        { name: 'wetSkyColor', size: 3, type: 'vec3' },
        { name: 'wetSunDirection', size: 3, type: 'vec3' },
        { name: 'wetDarkening', size: 1, type: 'float' },
      ],
      fragment: `
        uniform vec3 dirtColorLight;
        uniform vec3 dirtColorGrime;
        uniform vec3 dirtColorOil;
        uniform vec3 wetSkyColor;
        uniform vec3 wetSunDirection;
        uniform float wetDarkening;`,
    };
  }

  /** @param {import('@babylonjs/core').UniformBuffer} uniformBuffer */
  bindForSubMesh(uniformBuffer) {
    uniformBuffer.updateColor3('dirtColorLight', this.colorLight);
    uniformBuffer.updateColor3('dirtColorGrime', this.colorGrime);
    uniformBuffer.updateColor3('dirtColorOil', this.colorOil);
    uniformBuffer.updateColor3('wetSkyColor', this.skyColor);
    uniformBuffer.updateVector3('wetSunDirection', this.sunDirection);
    uniformBuffer.updateFloat('wetDarkening', this.wetDarkening);
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
          vec2 dirtAndWetness = texture2D(dirtSampler, vMainUV1).rg;
          // Treat nearly-clean spots as fully clean, so cleaned areas look crisp and finished.
          float dirt = dirtAndWetness.r * smoothstep(0.03, 0.1, dirtAndWetness.r);
          float surfaceWetness = dirtAndWetness.g;
          vec3 dirtColor = mix(dirtColorLight, dirtColorGrime, smoothstep(0.3, 0.65, dirt));
          dirtColor = mix(dirtColor, dirtColorOil, smoothstep(0.7, 1.0, dirt));
          // Even a light film hides most of the clean surface; heavier dirt only gets darker.
          diffuseColor = mix(diffuseColor, dirtColor, smoothstep(0.0, 0.3, dirt));
          // Wet surfaces absorb more light, so they look darker.
          diffuseColor *= mix(1.0, wetDarkening, surfaceWetness);
        #endif
      `,
      // Runs after lighting: adds the shine of a wet surface.
      CUSTOM_FRAGMENT_BEFORE_FOG: `
        #ifdef DIRTMASK
          // Looking across a wet surface at a low angle, it reflects the sky ("Fresnel").
          float facing = max(dot(normalW, viewDirectionW), 0.0);
          float skySheen = pow(1.0 - facing, 4.0) * 0.45;
          // And where the angle is just right, it catches glints of the sun.
          vec3 halfway = normalize(viewDirectionW - wetSunDirection);
          float sunGlint = pow(max(dot(normalW, halfway), 0.0), 80.0) * 0.6;
          color.rgb += surfaceWetness * (wetSkyColor * skySheen + vec3(sunGlint));
        #endif
      `,
    };
  }
}
