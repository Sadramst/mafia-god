/**
 * Role.js — Base class for all game roles
 * Provides bilingual support and consistent structure
 */
import { NightAction, Team } from './Enums.js';
import { Settings, Language } from '../utils/Settings.js';

/**
 * Base Role Class
 * All roles in the game extend from this foundational class
 */
export class Role {
  /**
   * @param {Object} config - Role configuration
   * @param {string} config.id - Unique role identifier
   * @param {string} config.nameEn - English name
   * @param {string} config.nameFa - Farsi name
   * @param {string} config.team - Team (use Team enum)
   * @param {string} config.icon - Emoji icon
   * @param {string} config.descriptionEn - English description
   * @param {string} config.descriptionFa - Farsi description
   * @param {string|null} config.nightAction - Night action type (use NightAction enum)
   * @param {number} config.nightOrder - Order of night actions (lower = earlier)
   * @param {number} config.maxCount - Maximum count in a game
   * @param {boolean} config.unique - Only one allowed per game
   * @param {boolean} config.hasShield - Has a protective shield
   */
  constructor(config) {
    this.id = config.id;
    this.nameEn = config.nameEn;
    this.nameFa = config.nameFa;
    this.team = config.team;
    this.icon = config.icon;
    this.descriptionEn = config.descriptionEn;
    this.descriptionFa = config.descriptionFa;
    this.nightAction = config.nightAction ?? NightAction.NONE;
    this.nightOrder = config.nightOrder ?? 99;
    this.maxCount = config.maxCount ?? 1;
    this.unique = config.unique !== undefined ? config.unique : true;
    this.hasShield = config.hasShield ?? false;
  }

  /**
   * Get the default name (Farsi for backward compatibility)
   */
  get name() {
    return this.nameFa;
  }

  /**
   * Get bilingual name (both languages)
   */
  get nameBilingual() {
    return `${this.nameFa} / ${this.nameEn}`;
  }

  /**
   * Get the default description (Farsi for backward compatibility)
   */
  get description() {
    return this.descriptionFa;
  }

  /**
   * Get bilingual description (both languages)
   */
  get descriptionBilingual() {
    return `${this.nameBilingual}\n\n${this.descriptionFa}\n\n${this.descriptionEn}`;
  }

  /**
   * Get localized name based on current language setting
   * @returns {string} Name in selected language
   */
  getLocalizedName() {
    const lang = Settings.getLanguage();
    if (lang === Language.ENGLISH) return this.nameEn;
    if (lang === Language.BOTH) return this.nameBilingual;
    return this.nameFa; // Default to Farsi
  }

  /**
   * Get localized description based on current language setting
   * @returns {string} Description in selected language
   */
  getLocalizedDescription() {
    const lang = Settings.getLanguage();
    if (lang === Language.ENGLISH) return this.descriptionEn;
    if (lang === Language.BOTH) return this.descriptionBilingual;
    return this.descriptionFa; // Default to Farsi
  }

  /**
   * Check if role has night action
   */
  hasNightAction() {
    return this.nightAction !== null && this.nightAction !== NightAction.NONE;
  }

  /**
   * Check if role belongs to a specific team
   */
  isTeam(team) {
    return this.team === team;
  }

  /**
   * Serialize to JSON (for storage/transmission)
   */
  toJSON() {
    return {
      id: this.id,
      nameEn: this.nameEn,
      nameFa: this.nameFa,
      name: this.name, // backward compat
      team: this.team,
      icon: this.icon,
      descriptionEn: this.descriptionEn,
      descriptionFa: this.descriptionFa,
      description: this.description, // backward compat
      nightAction: this.nightAction,
      nightOrder: this.nightOrder,
      maxCount: this.maxCount,
      unique: this.unique,
      hasShield: this.hasShield,
    };
  }

  /**
   * Create Role instance from JSON data
   */
  static fromJSON(data) {
    return new Role(data);
  }
}
