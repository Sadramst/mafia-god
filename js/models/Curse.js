/**
 * Curse.js — Jack's Curse (طلسم) mechanic
 *
 * Every night Jack places his curse on a living player.
 * The curse links Jack's fate to that player:
 *   - If the curse target dies (by mafia shoot or day vote), Jack dies too.
 *   - Jack himself is immune to night shoots and day votes.
 *   - The only other way to kill Jack is a correct Salakhi by Godfather.
 *
 * The curse resets each night — Jack must pick a new target.
 */
export class Curse {

  constructor() {
    /** @type {number|null} Current curse target player ID */
    this._targetId = null;
    /** @type {number|null} Last night's curse target (used to prevent re-targeting) */
    this._lastTargetId = null;
    /** @type {boolean} If true, Jack cannot change or place a new curse anymore */
    this._locked = false;
  }

  /** Whether a curse is currently active */
  get isActive() {
    return this._targetId !== null;
  }

  /** The player ID the curse is placed on */
  get targetId() {
    return this._targetId;
  }

  /**
   * Place the curse on a player.
   * @param {number} playerId — The target player ID
   */
  place(playerId) {
    if (this._locked) return; // cannot change curse once locked
    this._targetId = playerId;
  }

  /** Lock the curse so it cannot be moved again (e.g., after public reveal) */
  lock() {
    this._locked = true;
  }

  /** Whether the curse has been locked (cannot be changed) */
  get isLocked() {
    return !!this._locked;
  }

  /**
   * Clear the curse (called at the start of each night or when Jack dies).
   */
  clear() {
    // Preserve last target so Jack cannot target the same player next night
    this._lastTargetId = this._targetId;
    this._targetId = null;
  }

  /** ID of the last night's target (if any) */
  get lastTargetId() {
    return this._lastTargetId;
  }

  /**
   * Check if a killed player triggers Jack's death.
   * @param {number} killedPlayerId — The player who just died
   * @returns {boolean} true if the killed player was Jack's curse target
   */
  isTriggeredBy(killedPlayerId) {
    return this._targetId === killedPlayerId;
  }

  /** Serialize for storage */
  toJSON() {
    return { targetId: this._targetId, lastTargetId: this._lastTargetId, locked: !!this._locked };
  }

  /** Deserialize from storage */
  static fromJSON(data) {
    const t = new Curse();
    t._targetId = data?.targetId ?? null;
    t._lastTargetId = data?.lastTargetId ?? null;
    t._locked = !!data?.locked;
    return t;
  }
}
