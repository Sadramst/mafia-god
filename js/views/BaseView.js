/**
 * BaseView — Foundation for all view classes
 *
 * Provides common rendering helpers, lifecycle management,
 * event cleanup, and utility methods. All views extend this.
 */
import { t, translations as tr } from '../utils/i18n.js';
import { EventBus } from '../engine/EventBus.js';

export class BaseView {
  /**
   * @param {HTMLElement} container — The main content container
   * @param {Object} app — Reference to the App instance
   */
  constructor(container, app) {
    this.container = container;
    this.app = app;
    this._cleanups = [];
  }

  // ─── Lifecycle ───

  /** Render this view — override in subclasses */
  render() {
    this.container.innerHTML = '';
  }

  /** Destroy / cleanup — always call super.destroy() in subclasses */
  destroy() {
    this._cleanups.forEach(fn => fn());
    this._cleanups = [];
  }

  // ─── DOM Helpers ───

  /** Shortcut to query inside container */
  $(selector) {
    return this.container.querySelector(selector);
  }

  /** Shortcut to queryAll inside container */
  $$(selector) {
    return [...this.container.querySelectorAll(selector)];
  }

  /** Create an element with classes and attributes */
  el(tag, classes = '', attrs = {}) {
    const element = document.createElement(tag);
    if (classes) classes.split(' ').filter(Boolean).forEach(c => element.classList.add(c));
    for (const [key, val] of Object.entries(attrs)) {
      if (key === 'text') element.textContent = val;
      else if (key === 'html') element.innerHTML = val;
      else element.setAttribute(key, val);
    }
    return element;
  }

  // ─── Event Helpers ───

  /** Add event listener with automatic cleanup */
  listen(selectorOrEl, event, handler, options) {
    const el = typeof selectorOrEl === 'string' ? this.$(selectorOrEl) : selectorOrEl;
    if (!el) return;
    el.addEventListener(event, handler, options);
    this._cleanups.push(() => el.removeEventListener(event, handler, options));
  }

  /** Delegate event within container */
  delegate(event, selector, handler) {
    const delegateHandler = (e) => {
      const target = e.target.closest(selector);
      if (target && this.container.contains(target)) handler(e, target);
    };
    this.container.addEventListener(event, delegateHandler);
    this._cleanups.push(() => this.container.removeEventListener(event, delegateHandler));
  }

  /** Subscribe to EventBus with automatic cleanup */
  on(event, handler) {
    const unsub = EventBus.on(event, handler);
    this._cleanups.push(unsub);
  }

  // ─── UI Helpers ───

  /** Show toast notification */
  toast(message, type = 'info') {
    this.app.showToast(message, type);
  }

  /** Show confirmation modal */
  confirm(title, body, onConfirm, confirmText, cancelText) {
    this.app.showModal(
      title, body, onConfirm,
      confirmText || t(tr.common.confirm),
      cancelText || t(tr.common.cancel)
    );
  }

  /** Navigate to a route */
  navigate(route, params) {
    this.app.navigate(route, params);
  }

  /** Navigate back */
  goBack() {
    this.app.goBack();
  }

  /** Get the game instance */
  get game() {
    return this.app.game;
  }
}
