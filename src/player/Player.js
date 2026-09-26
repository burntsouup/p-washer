import { Color3, MeshBuilder, StandardMaterial, TransformNode } from '@babylonjs/core';
import { config } from '../config.js';

/**
 * The player character: a capsule with a dark visor showing which way it faces.
 * `root` sits at the player's feet; moving or turning it moves the whole body.
 * Milestone 4 adds walking.
 */
export class Player {
  /**
   * @param {import('@babylonjs/core').Scene} scene
   * @param {import('@babylonjs/core').ShadowGenerator} shadows
   * @param {{ position: number[], yaw: number }} spawn
   */
  constructor(scene, shadows, spawn) {
    const { height, radius } = config.player;

    this.root = new TransformNode('player', scene);
    this.root.position.set(spawn.position[0], spawn.position[1], spawn.position[2]);
    this.root.rotation.y = spawn.yaw;

    const body = MeshBuilder.CreateCapsule(
      'playerBody',
      { height, radius, tessellation: 16 },
      scene,
    );
    body.parent = this.root;
    body.position.y = height / 2;
    body.material = matte('playerBodyMat', '#e8923a', scene);

    // Local +z is "forward", so the visor goes on the front of the head.
    const visor = MeshBuilder.CreateBox(
      'playerVisor',
      { width: radius * 1.1, height: 0.12, depth: 0.14 },
      scene,
    );
    visor.parent = body;
    visor.position.set(0, height / 2 - 0.28, radius - 0.03);
    visor.material = matte('playerVisorMat', '#23272e', scene);

    for (const mesh of [body, visor]) {
      mesh.isPickable = false; // the camera and (later) the spray should ignore the player
      shadows.addShadowCaster(mesh);
    }
    this.meshes = [body, visor];
  }

  /** World position of the player's feet. */
  get position() {
    return this.root.position;
  }

  /** @param {number} opacity 0 (invisible) to 1 (solid). The shadow stays either way. */
  setOpacity(opacity) {
    for (const mesh of this.meshes) mesh.visibility = opacity;
  }
}

/**
 * @param {string} name
 * @param {string} hex
 * @param {import('@babylonjs/core').Scene} scene
 */
function matte(name, hex, scene) {
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = Color3.FromHexString(hex);
  material.specularColor = Color3.Black();
  return material;
}
