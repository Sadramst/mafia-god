/**
 * App.js — Main application controller
 * 
 * Single-page router connecting all views to the Game model.
 */
import { Game } from './models/Game.js';
import { Storage } from './utils/Storage.js';
import { HomeView } from './views/HomeView.js';
import { SetupView } from './views/SetupView.js';
import { RoleRevealView } from './views/RoleRevealView.js';
import { NightView } from './views/NightView.js';
import { DayView } from './views/DayView.js';
import { SummaryView } from './views/SummaryView.js';

export class App {

  constructor() {
    this.game = new Game();
    this.currentView = null;
    this.currentRoute = 'home';
    this._nightResults = null;

    // DOM references
    this.mainEl = document.getElementById('main-content');
    this.headerTitle = document.querySelector('.app-header__title');
    this.headerBadge = document.querySelector('.app-header__badge');
    this.navItems = document.querySelectorAll('.nav-item');

    // Views registry
    this.views = {
      home: new HomeView(this.mainEl, this),
      setup: new SetupView(this.mainEl, this),
      roleReveal: new RoleRevealView(this.mainEl, this),
      night: new NightView(this.mainEl, this),
      day: new DayView(this.mainEl, this),
      summary: new SummaryView(this.mainEl, this),
    };

    this._initNavigation();
    this._initWakeLock();
    this.navigate('home');
  }

  /** Navigate to a route */
  navigate(route) {
    // Destroy previous view
    if (this.currentView) {
      this.currentView.destroy?.();
    }

    this.currentRoute = route;
    this.currentView = this.views[route];

    // Update header
    this._updateHeader(route);
    this._updateNav(route);

    // Render
    if (this.currentView) {
      this.mainEl.className = 'app-main';
      this.currentView.render();
    }

    // Auto-save
    if (['night', 'day'].includes(route)) {
      this.saveGame();
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Save current game state */
  saveGame() {
    Storage.saveGame(this.game.toJSON());
  }

  // ─── Header ───
  _updateHeader(route) {
    const game = this.game;
    const isBlindDay = game.phase === 'blindDay';
    const isBlindNight = game.phase === 'blindNight';

    const titles = {
      home: 'خدای مافیا',
      setup: 'تنظیمات بازی',
      roleReveal: 'نمایش نقش‌ها',
      night: isBlindNight ? 'شب کور' : `شب ${game.round}`,
      day: isBlindDay ? 'روز کور' : `روز ${game.round}`,
      summary: 'خلاصه بازی',
    };
    if (this.headerTitle) {
      this.headerTitle.textContent = titles[route] || 'خدای مافیا';
    }

    // Badge shows phase
    if (this.headerBadge) {
      if (route === 'night') {
        this.headerBadge.textContent = isBlindNight ? '🌙 شب کور' : `🌙 شب ${game.round}`;
        this.headerBadge.style.display = '';
      } else if (route === 'day') {
        this.headerBadge.textContent = isBlindDay ? '☀️ روز کور' : `☀️ روز ${game.round}`;
        this.headerBadge.style.display = '';
      } else {
        this.headerBadge.style.display = 'none';
      }
    }
  }

  // ─── Navigation ───
  _initNavigation() {
    this.navItems.forEach(item => {
      item.addEventListener('click', () => {
        const route = item.dataset.route;
        if (!route) return;

        // Validate navigation
        if (route === 'night' && this.game.phase !== 'night' && this.game.phase !== 'blindNight') return;
        if (route === 'day' && this.game.phase !== 'day' && this.game.phase !== 'blindDay') return;

        this.navigate(route);
      });
    });
  }

  _updateNav(route) {
    this.navItems.forEach(item => {
      const navRoute = item.dataset.route;
      item.classList.toggle('active', navRoute === route);

      // Enable/disable based on game state
      if (navRoute === 'night') {
        item.classList.toggle('disabled', this.game.phase !== 'night' && this.game.phase !== 'blindNight');
      } else if (navRoute === 'day') {
        item.classList.toggle('disabled', this.game.phase !== 'day' && this.game.phase !== 'blindDay');
      } else if (navRoute === 'summary') {
        item.classList.toggle('disabled', this.game.history.length === 0);
      }
    });
  }

  // ─── Toast ───
  showToast(message, type = 'info') {
    // Remove existing toast
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

  // ─── Modal ───
  showModal(title, body, onConfirm, confirmText = 'تأیید', cancelText = 'انصراف') {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal__title">${title}</div>
        <div class="modal__body">${body}</div>
        <div class="modal__actions">
          <button class="btn btn--primary btn--block" id="modal-confirm">${confirmText}</button>
          <button class="btn btn--ghost btn--block" id="modal-cancel">${cancelText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#modal-confirm').addEventListener('click', () => {
      overlay.remove();
      onConfirm?.();
    });

    overlay.querySelector('#modal-cancel').addEventListener('click', () => {
      overlay.remove();
    });

    // Close on backdrop click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }

  // ─── Wake Lock (keep screen on during game) ───
  async _initWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        this._wakeLock = await navigator.wakeLock.request('screen');
      } catch { /* ignore */ }
    }
  }
}

// ─── Bootstrap ───
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
