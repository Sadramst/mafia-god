/**
 * BaseView.js — Base class for all views
 * Provides common rendering helpers and lifecycle
 */
import { t, translations as tr } from '../utils/i18n.js';

export class BaseView {
  /**
   * @param {HTMLElement} container — The main content container
   * @param {object} app — Reference to the App instance
   */
  constructor(container, app) {
    this.container = container;
    this.app = app;
  }

  /** Render this view — override in subclasses */
  render() {
    this.container.innerHTML = '';
  }

  /** Destroy / cleanup — override if needed */
  destroy() {}

  /** Create an element with classes and optional attributes */
  el(tag, classes = '', attrs = {}) {
    const element = document.createElement(tag);
    if (classes) {
      classes.split(' ').filter(Boolean).forEach(c => element.classList.add(c));
    }
    for (const [key, val] of Object.entries(attrs)) {
      if (key === 'text') {
        element.textContent = val;
      } else if (key === 'html') {
        element.innerHTML = val;
      } else {
        element.setAttribute(key, val);
      }
    }
    return element;
  }

  /** Show a toast notification */
  toast(message, type = 'info') {
    this.app.showToast(message, type);
  }

  /** Show a confirmation modal */
  confirm(title, body, onConfirm, confirmText = t(tr.common.confirm), cancelText = t(tr.common.cancel)) {
    this.app.showModal(title, body, onConfirm, confirmText, cancelText);
  }
}
