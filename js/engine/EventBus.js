/**
 * EventBus — Centralized publish/subscribe event system
 * 
 * Decouples components by allowing them to communicate via events
 * rather than direct references. Any part of the app can emit or
 * listen for events without knowing about other parts.
 * 
 * Usage:
 *   EventBus.on('player:added', handler);
 *   EventBus.emit('player:added', { player });
 *   EventBus.off('player:added', handler);
 */
class _EventBus {
  constructor() {
    this._listeners = new Map();
  }

  /**
   * Subscribe to an event
   * @param {string} event — Event name (e.g. 'game:started', 'player:added')
   * @param {Function} handler — Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, handler) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  /**
   * Subscribe to an event (fires only once, then auto-unsubscribes)
   * @param {string} event
   * @param {Function} handler
   */
  once(event, handler) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      handler(...args);
    };
    this.on(event, wrapper);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event
   * @param {Function} handler
   */
  off(event, handler) {
    const set = this._listeners.get(event);
    if (set) {
      set.delete(handler);
      if (set.size === 0) this._listeners.delete(event);
    }
  }

  /**
   * Emit an event with optional data
   * @param {string} event
   * @param {*} data — Payload passed to all listeners
   */
  emit(event, data) {
    const set = this._listeners.get(event);
    if (set) {
      for (const handler of set) {
        try { handler(data); } catch (e) { console.error(`[EventBus] Error in "${event}" handler:`, e); }
      }
    }
  }

  /** Remove all listeners (useful for testing or full reset) */
  clear() {
    this._listeners.clear();
  }
}

/** Singleton instance */
export const EventBus = new _EventBus();
