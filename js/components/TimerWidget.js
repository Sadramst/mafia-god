/**
 * TimerWidget — Reusable countdown timer UI
 */
import { Component } from '../engine/Component.js';
import { Timer } from '../utils/Timer.js';
import { t, translations as tr } from '../utils/i18n.js';

export class TimerWidget extends Component {
  /**
   * @param {Object} props
   * @param {number} props.duration — Seconds
   * @param {Function} [props.onComplete] — Callback when timer ends
   * @param {string} [props.label] — Optional label above timer
   */
  constructor(props) {
    super(props);
    this._timer = null;
    this._display = null;
    this._bar = null;
  }

  template() {
    const { duration, label } = this.props;
    return `
      ${label ? `<div class="timer__label">${label}</div>` : ''}
      <div class="timer">
        <div class="timer__display">${Timer.format(duration)}</div>
        <div class="timer__track">
          <div class="timer__fill" style="width: 100%"></div>
        </div>
        <div class="timer__controls">
          <button class="btn btn--sm btn--accent" data-timer="start">${t(tr.day.timerStart)}</button>
          <button class="btn btn--sm btn--ghost" data-timer="pause">${t(tr.day.timerPause)}</button>
          <button class="btn btn--sm btn--ghost" data-timer="reset">${t(tr.day.timerReset)}</button>
        </div>
      </div>
    `;
  }

  onMount() {
    this._display = this.$('.timer__display');
    this._bar = this.$('.timer__fill');

    if (!this._timer) {
      this._timer = new Timer(
        this.props.duration,
        (remaining, total) => {
          if (this._display) this._display.textContent = Timer.format(remaining);
          if (this._bar) this._bar.style.width = `${(remaining / total) * 100}%`;
        },
        () => { this.props.onComplete?.(); }
      );
    }

    this.listen('[data-timer="start"]', 'click', () => this._timer.start());
    this.listen('[data-timer="pause"]', 'click', () => this._timer.pause());
    this.listen('[data-timer="reset"]', 'click', () => {
      this._timer.reset(this.props.duration);
      if (this._display) this._display.textContent = Timer.format(this.props.duration);
      if (this._bar) this._bar.style.width = '100%';
    });
  }

  onDestroy() {
    this._timer?.stop();
    this._timer = null;
  }

  /** External access to start/stop */
  start() { this._timer?.start(); }
  stop() { this._timer?.stop(); }
  reset(dur) { this._timer?.reset(dur ?? this.props.duration); }
}
