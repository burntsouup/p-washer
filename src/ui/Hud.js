import './hud.css';

/**
 * The HTML overlay players see: a crosshair while playing, and a "click to play" card
 * (with controls) whenever the mouse isn't captured.
 */
export class Hud {
  /**
   * @param {HTMLElement} root
   * @param {import('../game/Input.js').Input} input
   */
  constructor(root, input) {
    this.input = input;

    this.crosshair = document.createElement('div');
    this.crosshair.className = 'crosshair';

    this.playPrompt = document.createElement('div');
    this.playPrompt.className = 'play-prompt';
    this.playPrompt.innerHTML = `
      <h1>p-washer</h1>
      <p class="play-prompt-action">Click to play</p>
      <dl class="controls">
        <dt>Mouse</dt><dd>Look around</dd>
        <dt>WASD</dt><dd>Move</dd>
        <dt>Shift</dt><dd>Run</dd>
        <dt>Hold click</dt><dd>Clean under the crosshair</dd>
        <dt>Esc</dt><dd>Release the mouse</dd>
      </dl>`;

    root.append(this.crosshair, this.playPrompt);
    /** @type {boolean | null} */
    this.shownLocked = null;
  }

  update() {
    const locked = this.input.isPointerLocked;
    if (locked === this.shownLocked) return; // only touch the page when something changed
    this.shownLocked = locked;
    this.crosshair.hidden = !locked;
    this.playPrompt.hidden = locked;
  }
}
