import { formatDuration } from '../game/job.js';
import './hud.css';

/**
 * @typedef {{
 *   prompt: string | null,
 *   hasWasher: boolean,
 *   jobStatus: 'waiting' | 'active' | 'complete',
 *   progress: number,
 *   elapsed: number,
 *   fanVertical: boolean,
 * }} HudState progress is 0..1 for display; elapsed is seconds on the job.
 */

/**
 * The HTML overlay players see:
 * - while playing: the job objective with a progress bar, a crosshair, interaction prompts,
 *   and a "Job complete!" card at the end
 * - otherwise: a "click to play" card with the controls
 */
export class Hud {
  /**
   * @param {HTMLElement} root
   * @param {import('../game/Input.js').Input} input
   */
  constructor(root, input) {
    this.input = input;

    this.crosshair = element('div', 'crosshair');
    // A thin bar through the crosshair shows which way the fan of water is turned.
    this.fanIndicator = element('div', 'fan-indicator');
    this.crosshair.append(this.fanIndicator);
    this.prompt = element('div', 'interaction-prompt');

    this.objective = element('div', 'objective');
    this.objectiveTitle = element('div', 'objective-title');
    const bar = element('div', 'progress-bar');
    this.progressFill = element('div', 'progress-fill');
    bar.append(this.progressFill);
    this.progressLabel = element('div', 'progress-label');
    this.objective.append(this.objectiveTitle, bar, this.progressLabel);

    this.completeCard = element('div', 'job-complete');
    this.completeCard.innerHTML = `
      <h2>Job complete!</h2>
      <p>Driveway cleaned in <strong class="job-time"></strong></p>
      <p class="job-complete-hint">Press R to start over</p>`;
    this.jobTime = /** @type {HTMLElement} */ (this.completeCard.querySelector('.job-time'));

    this.playPrompt = element('div', 'play-prompt');
    this.playPrompt.innerHTML = `
      <h1>p-washer</h1>
      <p class="play-prompt-action">Click to play</p>
      <dl class="controls">
        <dt>Mouse</dt><dd>Look around</dd>
        <dt>WASD</dt><dd>Move</dd>
        <dt>Shift</dt><dd>Run</dd>
        <dt>E</dt><dd>Pick up the pressure washer</dd>
        <dt>Hold click</dt><dd>Spray</dd>
        <dt>Q</dt><dd>Turn the fan of water (upright / flat)</dd>
        <dt>Hold F</dt><dd>Highlight the dirt that's left</dd>
        <dt>R</dt><dd>Start over (after the job is done)</dd>
        <dt>M</dt><dd>Mute / unmute</dd>
        <dt>T</dt><dd>Tuning panel</dd>
        <dt>Esc</dt><dd>Release the mouse</dd>
      </dl>`;

    root.append(this.objective, this.crosshair, this.prompt, this.completeCard, this.playPrompt);
    /** What's currently on screen, so we only touch the page when something changes. */
    this.shown = /** @type {Record<string, unknown>} */ ({});
  }

  /** @param {HudState} state */
  update(state) {
    const locked = this.input.isPointerLocked;
    const complete = state.jobStatus === 'complete';

    this.set('locked', locked, () => {
      this.crosshair.hidden = !locked;
      this.playPrompt.hidden = locked;
      this.objective.hidden = !locked;
    });

    this.set('fan', state.hasWasher ? (state.fanVertical ? 'upright' : 'flat') : 'none', (fan) => {
      this.fanIndicator.hidden = fan === 'none';
      this.fanIndicator.classList.toggle('is-upright', fan === 'upright');
    });

    const promptText = locked ? state.prompt : null;
    this.set('prompt', promptText, () => {
      this.prompt.textContent = promptText ?? '';
      this.prompt.hidden = !promptText;
    });

    const title = state.hasWasher ? 'Clean the driveway' : 'Pick up the pressure washer';
    this.set('title', complete ? 'Driveway clean!' : title, (text) => {
      this.objectiveTitle.textContent = /** @type {string} */ (text);
    });

    // Whole percent only reaches 100 when the job actually completes.
    const percent = Math.floor(state.progress * 100);
    this.set('percent', percent, () => {
      this.progressFill.style.width = `${percent}%`;
      this.progressLabel.textContent = `${percent}%`;
      this.objective.classList.toggle('is-complete', complete);
    });

    this.set('complete', locked && complete, (show) => {
      this.completeCard.hidden = !show;
      if (show) this.jobTime.textContent = formatDuration(state.elapsed);
    });
  }

  /**
   * Runs `apply` only when `value` differs from what's already on screen.
   *
   * @param {string} key
   * @param {unknown} value
   * @param {(value: unknown) => void} apply
   */
  set(key, value, apply) {
    if (this.shown[key] === value) return;
    this.shown[key] = value;
    apply(value);
  }
}

/**
 * @param {string} tag
 * @param {string} className
 */
function element(tag, className) {
  const el = document.createElement(tag);
  el.className = className;
  return el;
}
