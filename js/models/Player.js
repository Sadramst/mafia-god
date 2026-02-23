/**
 * Player.js — Player model
 */
import { Shield } from './Shield.js';
import { Curse } from './Curse.js';
import { Settings } from '../utils/Settings.js';

export class Player {
  static _nextId = 1;

  /**
   * @param {string|object} nameOrObj — Player display name or { en, fa }
   */
  constructor(nameOrObj) {
    this.id = Player._nextId++;
    // support either a simple string or an object with en/fa
    if (typeof nameOrObj === 'string') {
      this.nameEn = nameOrObj.trim();
      this.nameFa = nameOrObj.trim();
    } else if (nameOrObj && typeof nameOrObj === 'object') {
      this.nameEn = (nameOrObj.en || nameOrObj.name || '').toString().trim();
      this.nameFa = (nameOrObj.fa || nameOrObj.name || '').toString().trim();
    } else {
      this.nameEn = 'Player';
      this.nameFa = 'بازیکن';
    }
    this.roleId = null;      // Role key from Roles.ALL
    this.isAlive = true;
    this.deathRound = null;   // Round number when eliminated
    this.deathCause = null;   // 'mafia' | 'vote' | 'sniper' | 'jack' | 'salakhi' | etc.
    this.isRevivable = true;  // Can be revived by Constantine (false for salakhi, kane_sacrifice)
    this.silenced = false;    // Silenced by matador
    this.healed = false;      // Being healed by doctor
    this.lastHealedRound = null;
    this.notes = [];          // God's private notes
    this.shield = new Shield(false);  // One-time shield (activated based on role)
    this.curse = new Curse();          // Jack's curse (only used if role is jack)
  }

  /** Return localized display name based on Settings */
  getDisplayName(lang) {
    const language = lang || Settings.getLanguage();
    if (language === 'fa') return this.nameFa || this.nameEn || '';
    return this.nameEn || this.nameFa || '';
  }

  /** Backwards-compatible `name` getter returns localized name */
  get name() {
    return this.getDisplayName();
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
   * @param {boolean} revivable — Can be revived by Constantine (default true)
   * @returns {boolean} true if player actually died, false if shield saved them
   */
  tryKill(round, cause, revivable = true) {
    // Immunity: Jack and Zodiac cannot be killed by generic night kills
    // except when the cause is a Godfather 'salakhi' or a 'curse' chain or special sacrifices.
    if ((this.roleId === 'jack' || this.roleId === 'zodiac') && !['salakhi', 'curse', 'kane_sacrifice'].includes(cause)) {
      return false;
    }
    if (this.shield.absorb(cause)) {
      return false; // Shield absorbed the hit
    }
    this.kill(round, cause, revivable);
    return true;
  }

  /** Kill this player */
  kill(round, cause, revivable = true) {
    // Respect role-specific immunity: Jack and Zodiac are immune to generic night kills
    // unless the cause is an explicit Godfather salakhi, curse chain, or special sacrificial removal.
    if ((this.roleId === 'jack' || this.roleId === 'zodiac') && !['salakhi', 'curse', 'kane_sacrifice'].includes(cause)) {
      return false;
    }

    this.isAlive = false;
    this.deathRound = round;
    this.deathCause = cause;
    this.isRevivable = revivable;
    return true;
  }

  /** Revive this player (Constantine ability) */
  revive() {
    this.isAlive = true;
    this.deathRound = null;
    this.deathCause = null;
    this.isRevivable = true;
  }

  /** Reset per-night flags */
  resetNightFlags() {
    this.silenced = false;
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
      nameEn: this.nameEn,
      nameFa: this.nameFa,
      roleId: this.roleId,
      isAlive: this.isAlive,
      deathRound: this.deathRound,
      deathCause: this.deathCause,
      isRevivable: this.isRevivable,
      silenced: this.silenced,
      healed: this.healed,
      lastHealedRound: this.lastHealedRound,
      notes: this.notes,
      shield: this.shield.toJSON(),
      curse: this.curse.toJSON(),
    };
  }

  /** Deserialize from storage */
  static fromJSON(data) {
    const p = new Player({ en: data.nameEn || data.name, fa: data.nameFa || data.name });
    // restore id and other fields
    Object.assign(p, data);
    p.shield = Shield.fromJSON(data.shield);
    p.curse = Curse.fromJSON(data.curse ?? data.telesm);
    return p;
  }

  /** Reset ID counter (call when starting a new game) */
  static resetIdCounter() {
    Player._nextId = 1;
  }
}
