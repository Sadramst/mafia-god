/**
 * Framason.js — Freemason team mechanic (فراماسون)
 *
 * One player with the freemason role can recruit allies each night:
 *   - Each night (not blind), God asks if framason wants to recruit someone.
 *   - If they choose someone, God wakes the recruit and they can talk.
 *   - Alliance has a configurable max size (default: 2).
 *
 * Recruitment rules:
 *   - Citizen team or Spy (mafia) → safe, they join the alliance.
 *   - Mafia (except spy) or Independent → CONTAMINATED.
 *     Next morning, all framason alliance members (framason + prior recruits) die.
 *     The mafia/independent recruit does NOT die.
 *
 * Once contaminated, the deaths happen at the start of the next day.
 */
export class Framason {

  constructor() {
    /** @type {number|null} Player ID of the framason leader */
    this._leaderId = null;

    /** @type {number[]} Player IDs of recruited alliance members (excludes leader) */
    this._members = [];

    /** @type {number} Max recruits allowed (configurable in settings) */
    this._maxMembers = 2;

    /**
     * Contamination state — set when a mafia/independent is recruited.
     * @type {{ recruitId: number }|null}
     */
    this._contaminated = null;

    /** @type {boolean} Whether the framason feature is active this game */
    this._active = false;
  }

  // ── Getters ──

  get isActive()      { return this._active; }
  get leaderId()      { return this._leaderId; }
  get members()       { return [...this._members]; }
  get maxMembers()    { return this._maxMembers; }
  get memberCount()   { return this._members.length; }
  get isContaminated(){ return this._contaminated !== null; }
  get canRecruit()    { return this._active && !this._contaminated && this._members.length < this._maxMembers; }

  /**
   * Get all alliance player IDs (leader + members).
   * @returns {number[]}
   */
  get allianceIds() {
    if (!this._leaderId) return [];
    return [this._leaderId, ...this._members];
  }

  // ── Setup ──

  /**
   * Initialize the framason mechanic for a game.
   * @param {number} leaderId — Player ID of the framason
   * @param {number} maxMembers — Max alliance size (from settings)
   */
  init(leaderId, maxMembers = 2) {
    this._leaderId = leaderId;
    this._maxMembers = maxMembers;
    this._members = [];
    this._contaminated = null;
    this._active = true;
  }

  /** Set max members (from settings, before game starts) */
  setMaxMembers(max) {
    this._maxMembers = Math.max(1, max);
  }

  // ── Actions ──

  /**
   * Attempt to recruit a player into the alliance.
   * @param {number} recruitId — Player ID
   * @param {string} recruitRoleId — The recruit's role ID
   * @param {string} recruitTeam — 'mafia' | 'citizen' | 'independent'
   * @returns {{ safe: boolean, contaminated: boolean }}
   *   safe=true  → recruit joined safely
   *   contaminated=true → bad recruit, alliance will die next morning
   */
  recruit(recruitId, recruitRoleId, recruitTeam) {
    if (!this._active) return { safe: false, contaminated: false };

    // Spy is treated as citizen for framason purposes
    const isSafe = recruitTeam === 'citizen' || recruitRoleId === 'spy';

    if (isSafe) {
      this._members.push(recruitId);
      return { safe: true, contaminated: false };
    }

    // Mafia (non-spy) or independent → contaminated
    this._contaminated = { recruitId };
    return { safe: false, contaminated: true };
  }

  /**
   * Resolve contamination: returns IDs of alliance members who die.
   * The bad recruit does NOT die.
   * Call this during morning results.
   * @returns {number[]} Player IDs that should be killed (leader + safe members)
   */
  resolveContamination() {
    if (!this._contaminated) return [];

    const deadIds = [this._leaderId, ...this._members];
    // Clear state after contamination resolved
    this._active = false;
    this._contaminated = null;
    return deadIds;
  }

  /**
   * Handle framason leader death (from other causes).
   * Alliance becomes inactive — no more recruiting.
   */
  onLeaderDeath() {
    this._active = false;
  }

  // ── Serialization ──

  toJSON() {
    return {
      leaderId: this._leaderId,
      members: [...this._members],
      maxMembers: this._maxMembers,
      contaminated: this._contaminated,
      active: this._active,
    };
  }

  static fromJSON(data) {
    const f = new Framason();
    if (!data) return f;
    f._leaderId = data.leaderId ?? null;
    f._members = data.members ?? [];
    f._maxMembers = data.maxMembers ?? 2;
    f._contaminated = data.contaminated ?? null;
    f._active = data.active ?? false;
    return f;
  }
}
