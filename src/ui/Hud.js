import './hud.css';

/**
 * The HTML overlay players see: a crosshair and interaction prompts while playing, and a
 * "click to play" card (with controls) whenever the mouse isn't captured.
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

    this.prompt = document.createElement('div');
    this.prompt.className = 'interaction-prompt';

    this.playPrompt = document.createElement('div');
    this.playPrompt.className = 'play-prompt';
    this.playPrompt.innerHTML = `
      <h1>p-washer</h1>
      <p class="play-prompt-action">Click to play</p>
      <dl class="controls">
        <dt>Mouse</dt><dd>Look around</dd>
        <dt>WASD</dt><dd>Move</dd>
        <dt>Shift</dt><dd>Run</dd>
        <dt>E</dt><dd>Pick up the pressure washer</dd>
        <dt>Hold click</dt><dd>Spray</dd>
        <dt>M</dt><dd>Mute / unmute</dd>
        <dt>Esc</dt><dd>Release the mouse</dd>
      </dl>`;

    root.append(this.crosshair, this.prompt, this.playPrompt);
    /** @type {boolean | null} */
    this.shownLocked = null;
    /** @type {string | null | undefined} */
    this.shownPrompt = undefined;
  }

  /** @param {string | null} promptText Interaction hint to show while playing, if any. */
  update(promptText) {
    // Only touch the page when something changed.
    const locked = this.input.isPointerLocked;
    if (locked !== this.shownLocked) {
      this.shownLocked = locked;
      this.crosshair.hidden = !locked;
      this.playPrompt.hidden = locked;
    }
    const text = locked ? promptText : null;
    if (text !== this.shownPrompt) {
      this.shownPrompt = text;
      this.prompt.textContent = text ?? '';
      this.prompt.hidden = !text;
    }
  }
}
