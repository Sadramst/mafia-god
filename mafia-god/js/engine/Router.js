/**
 * Router — Client-side routing with history stack & back support
 * 
 * Manages navigation between views with a proper history stack,
 * enabling back-button navigation and deep-linking.
 * 
 * Usage:
 *   const router = new Router({ onNavigate });
 *   router.push('setup');
 *   router.back(); // goes to previous route
 */
import { EventBus } from './EventBus.js';

export class Router {
  /**
   * @param {Object} opts
   * @param {Function} opts.onNavigate — Called with (route, params) on navigation
   * @param {string} [opts.defaultRoute='home'] — Starting route
   */
  constructor({ onNavigate, defaultRoute = 'home' }) {
    this._onNavigate = onNavigate;
    this._history = [];
    this._current = null;
    this._params = {};

    // Listen for browser back (popstate)
    window.addEventListener('popstate', (e) => {
      if (e.state?.route) {
        this._navigateInternal(e.state.route, e.state.params || {}, false);
      }
    });
  }

  /** Current route name */
  get current() { return this._current; }

  /** Current route params */
  get params() { return this._params; }

  /** Whether we can go back */
  get canGoBack() { return this._history.length > 0; }

  /**
   * Navigate to a new route (pushes to history)
   * @param {string} route
   * @param {Object} [params={}]
   */
  push(route, params = {}) {
    if (this._current) {
      this._history.push({ route: this._current, params: { ...this._params } });
    }
    this._navigateInternal(route, params, true);
  }

  /**
   * Replace current route without adding to history
   * @param {string} route
   * @param {Object} [params={}]
   */
  replace(route, params = {}) {
    this._navigateInternal(route, params, true);
  }

  /**
   * Go back to previous route
   * @returns {boolean} true if navigated back, false if no history
   */
  back() {
    if (this._history.length === 0) return false;
    const prev = this._history.pop();
    this._navigateInternal(prev.route, prev.params, true);
    return true;
  }

  /** Clear navigation history */
  clearHistory() {
    this._history = [];
  }

  /** @private */
  _navigateInternal(route, params, pushState) {
    const prev = this._current;
    this._current = route;
    this._params = params;

    if (pushState) {
      try { history.pushState({ route, params }, '', `#${route}`); } catch (e) { /* ignore */ }
    }

    EventBus.emit('route:change', { route, params, prev });
    this._onNavigate(route, params);
  }
}
