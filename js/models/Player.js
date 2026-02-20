/**
 * Player.js — Player model
 */
import { Shield } from './Shield.js';
import { Telesm } from './Telesm.js';

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
    this.deathCause = null;   // 'mafia' | 'vote' | 'sniper' | 'jack' | 'salakhi' | etc.
    this.silenced = false;    // Silenced by matador
    this.protected = false;   // Being protected by bodyguard
    this.healed = false;      // Being healed by doctor
    this.lastHealedRound = null;
    this.notes = [];          // God's private notes
    this.shield = new Shield(false);  // One-time shield (activated based on role)
    this.telesm = new Telesm();       // Jack's spell (only used if role is jack)
  }

  /**
   * Initialize shield based on role definition.
   * Called after role is assigned.
   * @param {object} roleDef — Role definition from Roles.ALL
   */
  initShield(roleDef) {
    if (roleDef?.hasShield) {
      this.shield.activate();
    }
  }

  /**
   * Attempt to kill this player.
   * Shield is checked automatically — if it absorbs the hit, player survives.
   * @param {number} round — Current game round
   * @param {string} cause — Kill cause type
   * @returns {boolean} true if player actually died, false if shield saved them
   */
  tryKill(round, cause) {
    if (this.shield.absorb(cause)) {
      return false; // Shield absorbed the hit
    }
    this.kill(round, cause);
    return true;
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
      protected: this.protected,
      healed: this.healed,
      lastHealedRound: this.lastHealedRound,
      notes: this.notes,
      shield: this.shield.toJSON(),
      telesm: this.telesm.toJSON(),
    };
  }

  /** Deserialize from storage */
  static fromJSON(data) {
    const p = new Player(data.name);
    Object.assign(p, data);
    p.shield = Shield.fromJSON(data.shield);
    p.telesm = Telesm.fromJSON(data.telesm);
    return p;
  }

  /** Reset ID counter (call when starting a new game) */
  static resetIdCounter() {
    Player._nextId = 1;
  }
}
