/**
 * Bomb.js — Bomber's bomb mechanic (بمب‌گذار)
 *
 * One-time mafia ability:
 *   - Bomber plants a bomb on someone at night with a password (1–4).
 *   - In the morning, God announces a bomb is in front of that player.
 *   - After discussion (before voting), "خواب نیم‌روزی" begins:
 *     1. If Bodyguard is alive, they may attempt to guess the password.
 *        - Correct → bomb defused, bodyguard survives.
 *        - Incorrect → bodyguard dies instead of the bombed player.
 *        - They can also choose not to try.
 *     2. If Bodyguard skips (or is dead), the bombed player guesses the password.
 *        - Correct → bomb defused.
 *        - Incorrect → bombed player dies.
 *   - Bomb can only be used once per game.
 */
export class Bomb {

  constructor() {
    /** @type {number|null} Player ID the bomb is planted on */
    this._targetId = null;

    /** @type {number|null} Password 1–4 */
    this._password = null;

    /** @type {boolean} Whether the bomb ability has been spent */
    this._used = false;

    /**
     * Current determination phase:
     *   null       → no active bomb
     *   'planted'  → bomb placed, awaiting morning announcement
     *   'siesta'   → خواب نیم‌روزی in progress
     *   'defused'  → bomb was defused (correct guess)
     *   'exploded' → bomb exploded (wrong guess / no correct guess)
     *   'guardian_died' → bodyguard guessed wrong and died
     */
    this._phase = null;
  }

  // ── Getters ──

  get isUsed() { return this._used; }
  get isActive() { return this._phase === 'planted' || this._phase === 'siesta'; }
  get targetId() { return this._targetId; }
  get password() { return this._password; }
  get phase() { return this._phase; }

  // ── Actions ──

  /**
   * Plant the bomb on a player with a password.
   * @param {number} targetId — Player ID
   * @param {number} password — 1, 2, 3, or 4
   */
  plant(targetId, password) {
    if (this._used) return false;
    this._targetId = targetId;
    this._password = password;
    this._phase = 'planted';
    this._used = true;
    return true;
  }

  /** Transition to the siesta (خواب نیم‌روزی) determination phase */
  startSiesta() {
    if (this._phase !== 'planted') return;
    this._phase = 'siesta';
  }

  /**
   * Bodyguard attempts to guess the bomb password.
   * @param {number} guess — 1, 2, 3, or 4
   * @returns {'defused'|'wrong'} — 'defused' if correct, 'wrong' if incorrect
   */
  guardianGuess(guess) {
    if (guess === this._password) {
      this._phase = 'defused';
      return 'defused';
    }
    this._phase = 'guardian_died';
    return 'wrong';
  }

  /**
   * Bombed player attempts to guess the bomb password.
   * @param {number} guess — 1, 2, 3, or 4
   * @returns {'defused'|'exploded'} — 'defused' if correct, 'exploded' if wrong
   */
  targetGuess(guess) {
    if (guess === this._password) {
      this._phase = 'defused';
      return 'defused';
    }
    this._phase = 'exploded';
    return 'exploded';
  }

  /**
   * Bodyguard chose not to try — skip to target's guess.
   */
  guardianSkip() {
    // Phase stays 'siesta', target will guess next
  }

  /** Clear the bomb state (bomb defused or exploded — reset for next reference) */
  clear() {
    this._targetId = null;
    this._password = null;
    this._phase = null;
    // Note: _used stays true — bomb is a one-time ability
  }

  // ── Serialization ──

  toJSON() {
    return {
      targetId: this._targetId,
      password: this._password,
      used: this._used,
      phase: this._phase,
    };
  }

  static fromJSON(data) {
    const b = new Bomb();
    if (data) {
      b._targetId = data.targetId ?? null;
      b._password = data.password ?? null;
      b._used = data.used ?? false;
      b._phase = data.phase ?? null;
    }
    return b;
  }
}
