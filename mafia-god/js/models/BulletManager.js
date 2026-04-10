/**
 * BulletManager.js — Gunner bullet management
 *
 * The Gunner (تفنگدار) distributes bullets at night:
 *   - Blank (مشقی) — blank bullet, always harmless
 *   - Live (جنگی) — live bullet, kills unless saved
 *
 * Each night the gunner can give as many bullets as he has remaining,
 * but at most one bullet per person per night.
 *
 * Day flow:
 *   1. Holder announces they have a bullet
 *   2. God confirms
 *   3. Holder picks a target to shoot
 *   4. Target gives وصیت (last words)
 *   5. God resolves:
 *      - Blank → "تیر مشقی بود" — target lives
 *      - Live + saved (healed/shield/blocked) → "تیر مشقی بود"
 *      - Live + not saved → "تیر جنگی بود" — target dies, side revealed
 *
 * Expiration: unused live bullets explode at voting start → holder dies
 */
export class BulletManager {

  constructor() {
    this._blankMax = 2;
    this._liveMax = 2;
    this._blankRemaining = 2;
    this._liveRemaining = 2;
    /** @type {{ holderId: number, type: 'blank'|'live', givenRound: number }[]} */
    this._activeBullets = [];
    this._active = false; // becomes true after role assignment
  }

  // ── Getters ──

  get isActive()          { return this._active; }
  get blankRemaining()    { return this._blankRemaining; }
  get liveRemaining()     { return this._liveRemaining; }
  get hasBullets()        { return this._active && (this._blankRemaining > 0 || this._liveRemaining > 0); }
  get activeBullets()     { return [...this._activeBullets]; }
  get totalRemaining()    { return this._blankRemaining + this._liveRemaining; }

  // ── Initialization ──

  /**
   * Initialize after role assignment.
   * @param {number} blankMax
   * @param {number} liveMax
   */
  init(blankMax = 2, liveMax = 2) {
    this._blankMax = blankMax;
    this._liveMax = liveMax;
    this._blankRemaining = blankMax;
    this._liveRemaining = liveMax;
    this._activeBullets = [];
    this._active = true;
  }

  // ── Night: distribute bullets ──

  /**
   * Give a bullet to a player.
   * @param {number} holderId
   * @param {'blank'|'live'} type
   * @param {number} round — current game round
   * @returns {boolean} success
   */
  giveBullet(holderId, type, round) {
    if (type === 'blank' && this._blankRemaining <= 0) return false;
    if (type === 'live'  && this._liveRemaining  <= 0) return false;

    if (type === 'blank') this._blankRemaining--;
    else                   this._liveRemaining--;

    this._activeBullets.push({ holderId, type, givenRound: round });
    return true;
  }

  /**
   * Return a bullet (e.g. target was dead).
   * @param {'blank'|'live'} type
   */
  returnBullet(type) {
    if (type === 'blank') this._blankRemaining++;
    else                   this._liveRemaining++;
  }

  // ── Day: use / resolve bullets ──

  /**
   * Get the bullet a specific holder has (latest first).
   * @param {number} holderId
   * @returns {{ holderId: number, type: string, givenRound: number } | null}
   */
  getPlayerBullet(holderId) {
    return this._activeBullets.find(b => b.holderId === holderId) || null;
  }

  /**
   * Use (consume) a holder's bullet.
   * @param {number} holderId
   * @returns {'blank'|'live'|null} bullet type, or null if none
   */
  useBullet(holderId) {
    const idx = this._activeBullets.findIndex(b => b.holderId === holderId);
    if (idx < 0) return null;
    const type = this._activeBullets[idx].type;
    this._activeBullets.splice(idx, 1);
    return type;
  }

  /**
   * Get all unused live bullets (for expiration check at voting start).
   * @returns {{ holderId: number, givenRound: number }[]}
   */
  getUnusedLiveBullets() {
    return this._activeBullets
      .filter(b => b.type === 'live')
      .map(b => ({ holderId: b.holderId, givenRound: b.givenRound }));
  }

  /**
   * Clear all active bullets (called after day resolution).
   * Typically called after live expiration + blank discard.
   */
  clearDayBullets() {
    this._activeBullets = [];
  }

  /**
   * Remove a specific holder's bullet (e.g. after live explosion).
   * @param {number} holderId
   */
  removeBullet(holderId) {
    this._activeBullets = this._activeBullets.filter(b => b.holderId !== holderId);
  }

  /**
   * Deactivate (e.g. gunner dies).
   * Active bullets remain — holders still hold them.
   */
  onGunnerDeath() {
    // Bullets already distributed remain active until used or expired.
    // No new bullets can be given.
  }

  // ── Serialization ──

  toJSON() {
    return {
      blankMax: this._blankMax,
      liveMax: this._liveMax,
      blankRemaining: this._blankRemaining,
      liveRemaining: this._liveRemaining,
      activeBullets: this._activeBullets,
      active: this._active,
    };
  }

  static fromJSON(data) {
    if (!data) return new BulletManager();
    const t = new BulletManager();
    t._blankMax       = data.blankMax       ?? data.mashghiMax       ?? 2;
    t._liveMax        = data.liveMax        ?? data.jangiMax         ?? 2;
    t._blankRemaining = data.blankRemaining ?? data.mashghiRemaining ?? data.blankMax ?? data.mashghiMax ?? 2;
    t._liveRemaining  = data.liveRemaining  ?? data.jangiRemaining   ?? data.liveMax  ?? data.jangiMax   ?? 2;
    // Map old bullet type names to new ones
    t._activeBullets  = (data.activeBullets || []).map(b => ({
      ...b,
      type: b.type === 'mashghi' ? 'blank' : b.type === 'jangi' ? 'live' : b.type,
    }));
    t._active         = data.active         ?? false;
    return t;
  }
}
