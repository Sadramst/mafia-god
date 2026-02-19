/**
 * Player.js — Player model
 */
export class Player {
  static _nextId = 1;

  /**
   * @param {string} name — Player display name
   */
  constructor(name) {
    this.id = Player._nextId++;
    this.name = name.trim();
    this.roleId = null;      // Role key from Roles.ALL
    this.isAlive = true;
    this.deathRound = null;   // Round number when eliminated
    this.deathCause = null;   // 'mafia' | 'vote' | 'sniper' | 'jack' | etc.
    this.silenced = false;    // Silenced by matador
    this.bombed = false;      // Has bomb planted
    this.protected = false;   // Being protected by bodyguard
    this.healed = false;      // Being healed by doctor
    this.lastHealedRound = null;
    this.notes = [];          // God's private notes
  }

  /** Kill this player */
  kill(round, cause) {
    this.isAlive = false;
    this.deathRound = round;
    this.deathCause = cause;
  }

  /** Revive this player (Constantine ability) */
  revive() {
    this.isAlive = true;
    this.deathRound = null;
    this.deathCause = null;
  }

  /** Reset per-night flags */
  resetNightFlags() {
    this.silenced = false;
    this.protected = false;
    this.healed = false;
  }

  /** Add a note from God */
  addNote(text) {
    this.notes.push({
      text,
      timestamp: Date.now(),
    });
  }

  /** Serialize for storage */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      roleId: this.roleId,
      isAlive: this.isAlive,
      deathRound: this.deathRound,
      deathCause: this.deathCause,
      silenced: this.silenced,
      bombed: this.bombed,
      protected: this.protected,
      healed: this.healed,
      lastHealedRound: this.lastHealedRound,
      notes: this.notes,
    };
  }

  /** Deserialize from storage */
  static fromJSON(data) {
    const p = new Player(data.name);
    Object.assign(p, data);
    return p;
  }

  /** Reset ID counter (call when starting a new game) */
  static resetIdCounter() {
    Player._nextId = 1;
  }
}
