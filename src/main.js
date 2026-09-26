import { Engine } from '@babylonjs/core';
import { Game } from './game/Game.js';
import './style.css';

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('game-canvas'));
const hud = /** @type {HTMLElement} */ (document.getElementById('hud'));

if (Engine.IsSupported) {
  new Game(canvas, hud).start();
} else {
  hud.innerHTML =
    '<p class="fatal-error">Your browser does not support WebGL, which this game needs.</p>';
}
