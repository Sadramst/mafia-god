/**
 * Shield.js — One-time shield ability
 *
 * Certain roles (e.g. Godfather, Sniper) start with a single-use shield.
 * When they would be killed by a shot, the shield absorbs it, saving their life.
 * After absorbing once, the shield is destroyed.
 *
 * Does NOT protect against:
 *   - Day voting
 *   - Salakhi (سلاخی)
 *   - Bomb explosion
 *   - Live bullet explosion (تیر جنگی منفجر شده)
 */
export class Shield {

  /** @param {boolean} active — Whether the shield starts active */
  constructor(active = false) {
    this._active = active;
  }

  /** Whether the shield can still absorb a hit */
  get isActive() {
    return this._active;
  }

  /** Activate the shield (called when role is assigned) */
  activate() {
    this._active = true;
  }

  /**
   * Causes that bypass the shield entirely.
   * Shield only protects against night-time shots.
   */
  static BYPASS_CAUSES = new Set([
    'vote',
    'salakhi',
    'bomb',
    'live_explosion',
    'sniper_miss',

  ]);

  /**
   * Attempt to absorb a lethal hit.
   * @param {string} cause — The kill cause (e.g. 'mafia', 'jack', 'zodiac', 'sniper')
   * @returns {boolean} true if the shield blocked the kill
   */
  absorb(cause) {
    if (Shield.BYPASS_CAUSES.has(cause)) return false;
    if (!this._active) return false;

    this._active = false;
    return true;
  }

  /** Serialize for storage */
  toJSON() {
    return { active: this._active };
  }

  /** Deserialize from storage */
  static fromJSON(data) {
    return new Shield(data?.active ?? false);
  }
}
