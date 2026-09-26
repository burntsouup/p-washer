import {
  Color3,
  DirectionalLight,
  HemisphericLight,
  MeshBuilder,
  ShadowGenerator,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import { config } from '../config.js';

/**
 * Builds the level. For now: a lawn, a sun with shadows, and a 1 m crate for scale.
 * Milestone 2 turns this into the greybox backyard (house, driveway, fence).
 *
 * @param {import('@babylonjs/core').Scene} scene
 */
export function createBackyard(scene) {
  // Soft sky/ground fill light so shadowed areas aren't pitch black.
  const skyLight = new HemisphericLight('skyLight', new Vector3(0, 1, 0), scene);
  skyLight.intensity = 0.55;
  skyLight.groundColor = new Color3(0.35, 0.38, 0.32);

  const sun = new DirectionalLight('sun', new Vector3(-0.45, -1, -0.35), scene);
  sun.position = new Vector3(18, 36, 14);
  sun.intensity = 1.1;

  const shadows = new ShadowGenerator(config.render.shadowMapSize, sun);
  shadows.usePercentageCloserFiltering = true;

  const ground = MeshBuilder.CreateGround('lawn', { width: 40, height: 40 }, scene);
  ground.material = createMatteMaterial('lawnMat', new Color3(0.36, 0.52, 0.28), scene);
  ground.receiveShadows = true;

  const crate = MeshBuilder.CreateBox('scaleCrate', { size: 1 }, scene);
  crate.position.y = 0.5;
  crate.material = createMatteMaterial('crateMat', new Color3(0.72, 0.52, 0.3), scene);
  shadows.addShadowCaster(crate);

  return { ground, sun, shadows };
}

/**
 * Placeholder material without the default plastic-looking highlight.
 *
 * @param {string} name
 * @param {Color3} color
 * @param {import('@babylonjs/core').Scene} scene
 */
function createMatteMaterial(name, color, scene) {
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = color;
  material.specularColor = Color3.Black();
  return material;
}
