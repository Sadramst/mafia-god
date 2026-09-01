/**
 * App.js — Main application controller
 *
 * Engine-based architecture:
 *   - EventBus for decoupled communication
 *   - Router for navigation with back-button support
 *   - Layered views using Component base
 */
import { Game } from './models/Game.js';
import { Storage } from './utils/Storage.js';
import { EventBus } from './engine/EventBus.js';
import { Router } from './engine/Router.js';
import { HomeView } from './views/HomeView.js';
import { SetupView } from './views/SetupView.js';
import { RoleRevealView } from './views/RoleRevealView.js';
import { ManualAssignView } from './views/ManualAssignView.js';
import { NightView } from './views/NightView.js';
import { DayView } from './views/DayView.js';
import { SummaryView } from './views/SummaryView.js';
import { t, translations as tr, setDocumentDirection, toEnDigits } from './utils/i18n.js';
import { Settings } from './utils/Settings.js';

export class App {

  constructor() {
    // ─── Core State ───
    this.game = new Game();
    this._nightResults = null;
    this._historyPreview = null;

    // ─── Restore Saved Data ───
    this._restoreSavedState();

    // ─── DOM References ───
    this.mainEl      = document.getElementById('main-content');
    this.headerTitle = document.querySelector('.app-header__title');
    this.headerBadge = document.querySelector('.app-header__badge');
    this.backBtn     = document.getElementById('btn-back');
    this.navItems    = document.querySelectorAll('.nav-item');

    // ─── Router ───
    this.router = new Router({
      onNavigate: (route, params) => this._onRouteChange(route, params),
      defaultRoute: 'home',
    });

    // ─── Views Registry ───
    this.currentView = null;
    this.currentRoute = 'home';
    this.views = {
      home:       new HomeView(this.mainEl, this),
      setup:      new SetupView(this.mainEl, this),
      roleReveal: new RoleRevealView(this.mainEl, this),
      manualAssign: new ManualAssignView(this.mainEl, this),
      night:      new NightView(this.mainEl, this),
      day:        new DayView(this.mainEl, this),
      summary:    new SummaryView(this.mainEl, this),
    };

    // ─── Init Systems ───
    this._initBackButton();
    this._initNavigation();
    this._initTheme();
    this._initLanguage();
    setDocumentDirection(Settings.getLanguage() === 'en' ? 'en' : 'fa');
    this._updateNavLabels();
    this._initWakeLock();

    // ─── Start ───
    this.navigate('home');
  }

  // ═══════════════════════════════════
  //  NAVIGATION
  // ═══════════════════════════════════

  /** Navigate to a route (pushes history for back support) */
  navigate(route, params = {}) {
    this.router.push(route, params);
  }

  /** Go back to previous route */
  goBack() {
    if (!this.router.back()) {
      this.navigate('home');
    }
  }

  /** Internal route change handler */
  _onRouteChange(route, params) {
    // Destroy previous view
    if (this.currentView) {
      this.currentView.destroy?.();
    }

    this.currentRoute = route;
    this.currentView = this.views[route];

    // Update UI chrome
    this._updateHeader(route);
    this._updateNav(route);
    this._updateBackButton(route);

    // Render view
    if (this.currentView) {
      this.mainEl.className = 'app-main';
      this.currentView.render();
    }

    // Auto-save on game phases
    if (['night', 'day'].includes(route)) {
      this.saveGame();
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Emit navigation event
    EventBus.emit('route:changed', { route, params });
  }

  // ═══════════════════════════════════
  //  STATE MANAGEMENT
  // ═══════════════════════════════════

  /** Restore game state from storage */
  _restoreSavedState() {
    try {
      const saved = Storage.loadGame();
      if (saved) {
        this.game.loadFromJSON(saved);
      } else {
        const roster = Storage.loadRoster();
        if (roster?.length) {
          roster.forEach(r => {
            if (r.nameEn || r.nameFa) this.game.addPlayer({ en: r.nameEn || r.name, fa: r.nameFa || r.name });
            else this.game.addPlayer(r.name || r);
          });
          this._rosterLoaded = true;
        }
      }
    } catch (e) { /* ignore */ }
  }

  /** Save current game state */
  saveGame() {
    Storage.saveGame(this.game.toJSON());
  }

  // ═══════════════════════════════════
  //  BACK BUTTON
  // ═══════════════════════════════════

  _initBackButton() {
    if (this.backBtn) {
      this.backBtn.addEventListener('click', () => this.goBack());
    }
  }

  _updateBackButton(route) {
    if (!this.backBtn) return;
    // Show back button on all routes except home
    const show = route !== 'home';
    this.backBtn.classList.toggle('hidden', !show);
  }

  // ═══════════════════════════════════
  //  THEME / ACCENT COLOR
  // ═══════════════════════════════════

  _initTheme() {
    this._accents = ['#dc2626','#3b82f6','#10b981','#a855f7','#f59e0b'];
    const accent = Settings.getAccent();
    this._applyAccent(accent);

    const btn = document.getElementById('theme-toggle');
    const dot = document.getElementById('theme-toggle-dot');
    if (dot) dot.style.background = accent;
    if (btn) {
      btn.addEventListener('click', () => {
        const current = Settings.getAccent();
        const idx = this._accents.indexOf(current);
        const next = this._accents[(idx + 1) % this._accents.length];
        Settings.setAccent(next);
        this._applyAccent(next);
        if (dot) dot.style.background = next;
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', next);
      });
    }
  }

  _applyAccent(color) {
    try {
      document.documentElement.style.setProperty('--accent', color);
      const hover = this._shadeColor(color, -16);
      document.documentElement.style.setProperty('--accent-hover', hover);
    } catch (e) { /* ignore */ }
  }

  _shadeColor(col, amt) {
    const usePound = col[0] === '#';
    let c = usePound ? col.slice(1) : col;
    const num = parseInt(c, 16);
    let r = Math.max(Math.min(255, (num >> 16) + amt), 0);
    let g = Math.max(Math.min(255, ((num >> 8) & 0xFF) + amt), 0);
    let b = Math.max(Math.min(255, (num & 0xFF) + amt), 0);
    return (usePound ? '#' : '') + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  // ═══════════════════════════════════
  //  LANGUAGE
  // ═══════════════════════════════════

  _initLanguage() {
    const btn = document.getElementById('lang-toggle');
    const update = () => {
      const lang = Settings.getLanguage();
      if (!btn) return;
      btn.textContent = lang === 'en' ? 'فا' : 'EN';
      btn.classList.toggle('active', lang === 'en');
    };
    update();
    if (btn) {
      btn.addEventListener('click', () => {
        const newLang = Settings.getLanguage() === 'en' ? 'fa' : 'en';
        Settings.setLanguage(newLang);
        this.onLanguageChange();
        update();
      });
    }
  }

  onLanguageChange() {
    const lang = Settings.getLanguage();
    setDocumentDirection(lang === 'en' ? 'en' : 'fa');
    this._updateNavLabels();
    this._updateHeader(this.currentRoute);
    if (this.currentView?.render) this.currentView.render();
    EventBus.emit('language:changed', { lang });
  }

  // ═══════════════════════════════════
  //  HEADER
  // ═══════════════════════════════════

  _updateHeader(route) {
    const game = this.game;
    const isBlindDay = game.phase === 'blindDay';
    const isBlindNight = game.phase === 'blindNight';
    const lang = Settings.getLanguage();
    setDocumentDirection(lang === 'en' ? 'en' : 'fa');

    const toEn = v => toEnDigits(v);
    const titles = {
      home:       t(tr.header.home),
      setup:      t(tr.header.setup),
      roleReveal: t(tr.header.roleReveal),
      manualAssign: t(tr.header.manualAssign),
      night:      isBlindNight ? t(tr.header.blindNight) : t(tr.header.nightRound).replace('%d', toEn(game.round)),
      day:        isBlindDay ? t(tr.header.blindDay) : t(tr.header.dayRound).replace('%d', toEn(game.round)),
      summary:    t(tr.header.summary),
    };
    if (this.headerTitle) {
      this.headerTitle.textContent = titles[route] || t(tr.header.home);
    }
    if (this.headerBadge) {
      if (route === 'night') {
        this.headerBadge.textContent = `🌙 ${titles.night}`;
        this.headerBadge.style.display = '';
      } else if (route === 'day') {
        this.headerBadge.textContent = `☀️ ${titles.day}`;
        this.headerBadge.style.display = '';
      } else {
        this.headerBadge.style.display = 'none';
      }
    }
  }

  // ═══════════════════════════════════
  //  BOTTOM NAVIGATION
  // ═══════════════════════════════════

  _initNavigation() {
    this.navItems.forEach(item => {
      item.addEventListener('click', () => {
        const route = item.dataset.route;
        if (!route || item.classList.contains('disabled')) return;
        if (route === 'night' && this.game.phase !== 'night' && this.game.phase !== 'blindNight') return;
        if (route === 'day' && this.game.phase !== 'day' && this.game.phase !== 'blindDay') return;
        this.navigate(route);
      });
    });
  }

  _updateNavLabels() {
    document.querySelectorAll('[data-nav-key]').forEach(label => {
      const key = label.dataset.navKey;
      if (tr.nav[key]) label.textContent = t(tr.nav[key]);
    });
  }

  _updateNav(route) {
    this._updateNavLabels();
    this.navItems.forEach(item => {
      const navRoute = item.dataset.route;
      item.classList.toggle('active', navRoute === route);

      if (navRoute === 'night') {
        item.classList.toggle('disabled', this.game.phase !== 'night' && this.game.phase !== 'blindNight');
      } else if (navRoute === 'day') {
        item.classList.toggle('disabled', this.game.phase !== 'day' && this.game.phase !== 'blindDay');
      } else if (navRoute === 'summary') {
        item.classList.toggle('disabled', this.game.history.length === 0);
      }
    });
  }

  // ═══════════════════════════════════
  //  TOAST & MODAL
  // ═══════════════════════════════════

  showToast(message, type = 'info') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('out');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  showModal(title, body, onConfirm, confirmText = null, cancelText = null) {
    confirmText = confirmText || t(tr.common.modalConfirm);
    cancelText = cancelText || t(tr.common.modalCancel);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal__title">${title}</div>
        <div class="modal__body">${body}</div>
        <div class="modal__actions">
          ${onConfirm ? `<button class="btn btn--accent btn--block" id="modal-confirm">${confirmText}</button>` : ''}
          <button class="btn btn--ghost btn--block" id="modal-cancel">${onConfirm ? cancelText : confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.querySelector('#modal-confirm')?.addEventListener('click', () => { overlay.remove(); onConfirm?.(); });
    overlay.querySelector('#modal-cancel')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  }

  // ═══════════════════════════════════
  //  WAKE LOCK
  // ═══════════════════════════════════

  async _initWakeLock() {
    if ('wakeLock' in navigator) {
      try { this._wakeLock = await navigator.wakeLock.request('screen'); } catch { /* ignore */ }
    }
  }
}

// ─── Bootstrap ───
document.addEventListener('DOMContentLoaded', () => {
  (function preventDoubleTapZoom() {
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) e.preventDefault();
      lastTouchEnd = now;
    }, { passive: false });
  })();

  window.app = new App();
});
