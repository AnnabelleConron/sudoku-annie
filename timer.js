/** @module timer */

/**
 * A simple stopwatch timer that invokes a callback each second.
 */
export class Timer {
  /**
   * @param {function(number): void} onTick - Called every second with elapsed seconds.
   */
  constructor(onTick) {
    this._onTick = onTick;
    this._elapsed = 0;
    this._interval = null;
    this._running = false;
  }

  /** @returns {number} Current elapsed seconds. */
  get elapsed() {
    return this._elapsed;
  }

  /**
   * Sets elapsed time (for restoring saved state).
   * @param {number} seconds
   */
  set elapsed(seconds) {
    this._elapsed = seconds;
  }

  /**
   * Starts or resumes the timer.
   */
  start() {
    if (this._running) return;
    this._running = true;
    this._interval = setInterval(() => {
      this._elapsed++;
      this._onTick(this._elapsed);
    }, 1000);
  }

  /** Pauses the timer without resetting elapsed time. */
  pause() {
    if (!this._running) return;
    this._running = false;
    clearInterval(this._interval);
    this._interval = null;
  }

  /** Stops the timer and resets elapsed time. */
  stop() {
    this.pause();
    this._elapsed = 0;
  }

  /** @returns {boolean} Whether the timer is currently running. */
  get running() {
    return this._running;
  }
}

/**
 * Formats elapsed seconds as MM:SS string.
 * @param {number} seconds
 * @returns {string}
 */
export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
