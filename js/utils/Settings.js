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
});

/**
 * Settings Manager
 * Handles user preferences and app configuration
 */
export class Settings {
  static KEY = 'mafia_god_settings';
  
  static DEFAULT = {
    language: Language.ENGLISH, // Default to English
  };

  /** Theme / accent color defaults */
  static DEFAULT_THEME = {
    accent: '#dc2626'
  };

  /** Get current settings */
  static get() {
    try {
      const stored = localStorage.getItem(Settings.KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...Settings.DEFAULT, ...Settings.DEFAULT_THEME, ...parsed };
      }
    } catch { /* ignore */ }
    return { ...Settings.DEFAULT, ...Settings.DEFAULT_THEME };
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
    return Settings.get().language || Language.ENGLISH;
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

  /** Accent color helpers */
  static getAccent() {
    return Settings.get().accent || Settings.DEFAULT_THEME.accent;
  }

  static setAccent(color) {
    const settings = Settings.get();
    settings.accent = color;
    Settings.save(settings);
  }
}
