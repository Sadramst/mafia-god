/**
 * Curse.js — Jack's Curse (طلسم) mechanic
 *
 * Every night Jack places his curse on a living player.
 * The curse links Jack's fate to that player:
 *   - If the curse target dies (by any cause, night or day), Jack dies too.
 *   - Jack himself is immune to everything except the curse chain.
 *   - Jack cannot curse the same person again unless no other option.
 *
 * The curse resets each night — Jack must pick a new target.
 */
export class Curse {

  constructor() {
    /** @type {number|null} Current curse target player ID */
    this._targetId = null;
    /** @type {number[]} All previously cursed player IDs (prevents re-targeting) */
    this._previousTargetIds = [];
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
   * @param {boolean} forceRepeat — Allow repeat if all alive players were previously cursed
   * @returns {boolean} true if curse was placed
   */
  place(playerId, forceRepeat = false) {
    if (this._locked) return false;
    if (this._previousTargetIds.includes(playerId) && !forceRepeat) return false;
    this._targetId = playerId;
    return true;
  }

  /** Lock the curse so it cannot be moved again (e.g., after day shoot or vote) */
  lock() {
    this._locked = true;
  }

  /** Whether the curse has been locked (cannot be changed) */
  get isLocked() {
    return !!this._locked;
  }

  /**
   * Clear the curse (called at the start of each night).
   * Adds the current target to the previous-targets list.
   * Does nothing if the curse is locked (permanently fixed).
   */
  clear() {
    if (this._locked) return;
    if (this._targetId !== null && !this._previousTargetIds.includes(this._targetId)) {
      this._previousTargetIds.push(this._targetId);
    }
    this._targetId = null;
  }

  /** Check if a player was previously cursed */
  wasPreviousTarget(playerId) {
    return this._previousTargetIds.includes(playerId);
  }

  /** Backward-compatible getter: most recent previous target */
  get lastTargetId() {
    return this._previousTargetIds.length > 0
      ? this._previousTargetIds[this._previousTargetIds.length - 1]
      : null;
  }

  /** All previously cursed player IDs */
  get previousTargetIds() {
    return [...this._previousTargetIds];
  }

  /**
   * Check if a killed player triggers Jack's death.
   * @param {number} killedPlayerId — The player who just died
   * @returns {boolean} true if the killed player was Jack's curse target
   */
  isTriggeredBy(killedPlayerId) {
    return this._targetId === killedPlayerId;
  }

  /**
   * Move curse linkage from one player ID to another.
   * Used by Face Off when the cursed player identity shifts.
   * @param {number} fromId
   * @param {number} toId
   */
  transferPlayerLink(fromId, toId) {
    if (fromId == null || toId == null || fromId === toId) return;
    if (this._targetId === fromId) this._targetId = toId;
    this._previousTargetIds = this._previousTargetIds.map(id => (id === fromId ? toId : id));
  }

  /** Serialize for storage */
  toJSON() {
    return {
      targetId: this._targetId,
      previousTargetIds: [...this._previousTargetIds],
      lastTargetId: this.lastTargetId,
      locked: !!this._locked,
    };
  }

  /** Deserialize from storage */
  static fromJSON(data) {
    const t = new Curse();
    t._targetId = data?.targetId ?? null;
    // Backward compat: migrate _lastTargetId to array
    t._previousTargetIds = data?.previousTargetIds ?? (data?.lastTargetId ? [data.lastTargetId] : []);
    t._locked = !!data?.locked;
    return t;
  }
}
