/**
 * Settings.js — App settings management with localStorage persistence
 */

/**
 * Language Options
 * FARSI: Farsi only
 * ENGLISH: English only
 * BOTH: Both languages displayed together (default)
 */
export const Language = Object.freeze({
  FARSI: 'fa',
  ENGLISH: 'en',
  BOTH: 'both',
});

/**
 * Settings Manager
 * Handles user preferences and app configuration
 */
export class Settings {
  static KEY = 'mafia_god_settings';
  
  static DEFAULT = {
    language: Language.BOTH, // Default to Both for bilingual display
  };

  /** Get current settings */
  static get() {
    try {
      const stored = localStorage.getItem(Settings.KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...Settings.DEFAULT, ...parsed };
      }
    } catch { /* ignore */ }
    return { ...Settings.DEFAULT };
  }

  /** Save settings */
  static save(settings) {
    try {
      localStorage.setItem(Settings.KEY, JSON.stringify(settings));
      return true;
    } catch {
      return false;
    }
  }

  /** Get current language setting */
  static getLanguage() {
    return Settings.get().language || Language.BOTH;
  }

  /** Set language preference */
  static setLanguage(language) {
    const settings = Settings.get();
    settings.language = language;
    Settings.save(settings);
  }

  /** Reset to defaults */
  static reset() {
    localStorage.removeItem(Settings.KEY);
  }
}
