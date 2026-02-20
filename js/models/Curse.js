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
    this._targetId = playerId;
  }

  /**
   * Clear the curse (called at the start of each night or when Jack dies).
   */
  clear() {
    this._targetId = null;
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
    return { targetId: this._targetId };
  }

  /** Deserialize from storage */
  static fromJSON(data) {
    const t = new Curse();
    t._targetId = data?.targetId ?? null;
    return t;
  }
}
