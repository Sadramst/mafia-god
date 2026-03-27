/**
 * Component — Base class for reusable UI components
 * 
 * Provides a clean lifecycle: create → mount → update → destroy
 * Components manage their own DOM subtree and event cleanup.
 * 
 * Usage:
 *   class MyWidget extends Component {
 *     template() { return `<div>Hello</div>`; }
 *     onMount() { // attach events }
 *     onDestroy() { // cleanup }
 *   }
 */
export class Component {
  /**
   * @param {Object} [props={}] — Immutable properties passed from parent
   */
  constructor(props = {}) {
    this.props = props;
    this.el = null;
    this._mounted = false;
    this._eventCleanups = [];
  }

  /**
   * Return the HTML string for this component.
   * Override in subclasses.
   * @returns {string}
   */
  template() {
    return '';
  }

  /**
   * Mount the component into a container
   * @param {HTMLElement} container — The parent element
   * @param {string} [position='replace'] — 'replace' clears container, 'append' appends
   */
  mount(container, position = 'replace') {
    if (this._mounted) this.destroy();

    this.el = document.createElement('div');
    this.el.className = 'component';
    this.el.innerHTML = this.template();

    if (position === 'replace') {
      container.innerHTML = '';
      container.appendChild(this.el);
    } else {
      container.appendChild(this.el);
    }

    this._mounted = true;
    this.onMount();
  }

  /**
   * Re-render (update the DOM without full remount)
   */
  update() {
    if (!this._mounted || !this.el) return;
    this._cleanupEvents();
    this.el.innerHTML = this.template();
    this.onMount();
  }

  /**
   * Destroy the component, clean up events and DOM
   */
  destroy() {
    this._cleanupEvents();
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
    this._mounted = false;
    this.onDestroy();
  }

  /** Lifecycle hook: called after mount/update. Attach events here. */
  onMount() {}

  /** Lifecycle hook: called before destroy. Cleanup here. */
  onDestroy() {}

  // ─── Helpers ───

  /** Find an element within this component */
  $(selector) {
    return this.el?.querySelector(selector) ?? null;
  }

  /** Find all matching elements within this component */
  $$(selector) {
    return this.el ? [...this.el.querySelectorAll(selector)] : [];
  }

  /**
   * Add event listener with automatic cleanup on destroy
   * @param {HTMLElement|string} target — Element or CSS selector within component
   * @param {string} event — Event name
   * @param {Function} handler
   * @param {Object} [options]
   */
  listen(target, event, handler, options) {
    const el = typeof target === 'string' ? this.$(target) : target;
    if (!el) return;
    el.addEventListener(event, handler, options);
    this._eventCleanups.push(() => el.removeEventListener(event, handler, options));
  }

  /**
   * Delegate event listener (for dynamic content)
   * @param {string} event
   * @param {string} selector — CSS selector to match
   * @param {Function} handler — Receives (event, matchedElement)
   */
  delegate(event, selector, handler) {
    const delegateHandler = (e) => {
      const target = e.target.closest(selector);
      if (target && this.el.contains(target)) {
        handler(e, target);
      }
    };
    this.el.addEventListener(event, delegateHandler);
    this._eventCleanups.push(() => this.el.removeEventListener(event, delegateHandler));
  }

  /** @private — Clean up all registered event listeners */
  _cleanupEvents() {
    this._eventCleanups.forEach(fn => fn());
    this._eventCleanups = [];
  }
}
