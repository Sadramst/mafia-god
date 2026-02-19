/**
 * Timer.js — Countdown timer with callbacks
 */
export class Timer {
  /**
   * @param {number} duration — seconds
   * @param {Function} onTick — called every second with remaining seconds
   * @param {Function} onComplete — called when timer reaches 0
   */
  constructor(duration, onTick, onComplete) {
    this.duration = duration;
    this.remaining = duration;
    this.onTick = onTick;
    this.onComplete = onComplete;
    this._interval = null;
    this.running = false;
  }

  /** Start or resume */
  start() {
    if (this.running) return;
    this.running = true;
    this._interval = setInterval(() => {
      this.remaining--;
      this.onTick?.(this.remaining, this.duration);
      if (this.remaining <= 0) {
        this.stop();
        this.onComplete?.();
      }
    }, 1000);
  }

  /** Pause */
  pause() {
    this.running = false;
    clearInterval(this._interval);
    this._interval = null;
  }

  /** Stop and reset */
  stop() {
    this.running = false;
    clearInterval(this._interval);
    this._interval = null;
  }

  /** Reset to original duration */
  reset(newDuration) {
    this.stop();
    this.duration = newDuration ?? this.duration;
    this.remaining = this.duration;
    this.onTick?.(this.remaining, this.duration);
  }

  /** Format seconds to MM:SS */
  static format(seconds) {
    const m = Math.floor(Math.abs(seconds) / 60);
    const s = Math.abs(seconds) % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
}
