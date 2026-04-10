/**
 * Storage.js — LocalStorage wrapper for game persistence
 */
export class Storage {
  static KEY = 'mafia_god_save';
  static HISTORY_KEY = 'mafia_god_history';
  static ROSTER_KEY = 'mafia_god_roster';

  /** Save current game state */
  static saveGame(gameData) {
    try {
      localStorage.setItem(Storage.KEY, JSON.stringify(gameData));
      return true;
    } catch {
      return false;
    }
  }

  /** Load saved game state */
  static loadGame() {
    try {
      const data = localStorage.getItem(Storage.KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  /** Delete saved game */
  static deleteSave() {
    localStorage.removeItem(Storage.KEY);
  }

  /** Check if a save exists */
  static hasSave() {
    return localStorage.getItem(Storage.KEY) !== null;
  }

  /** Save completed game to history */
  static addToHistory(gameSummary) {
    try {
      const history = Storage.getHistory();
      history.unshift(gameSummary);
      // Keep last 50 games
      if (history.length > 50) history.length = 50;
      localStorage.setItem(Storage.HISTORY_KEY, JSON.stringify(history));
    } catch { /* ignore */ }
  }

  /** Persist last used player roster (array of {id,name}) */
  static saveRoster(roster) {
    try {
      localStorage.setItem(Storage.ROSTER_KEY, JSON.stringify(roster));
      return true;
    } catch {
      return false;
    }
  }

  /** Load persisted roster */
  static loadRoster() {
    try {
      const data = localStorage.getItem(Storage.ROSTER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  /** Delete roster */
  static deleteRoster() {
    localStorage.removeItem(Storage.ROSTER_KEY);
  }

  /** Get game history */
  static getHistory() {
    try {
      const data = localStorage.getItem(Storage.HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /** Clear all data */
  static clearAll() {
    localStorage.removeItem(Storage.KEY);
    localStorage.removeItem(Storage.HISTORY_KEY);
  }
}
