/**
 * HomeView.js — Welcome / Home screen
 */
import { BaseView } from './BaseView.js';
import { Storage } from '../utils/Storage.js';

export class HomeView extends BaseView {

  render() {
    const hasSave = Storage.hasSave();

    this.container.innerHTML = `
      <div class="view hero">
        <div class="hero__icon">🎭</div>
        <h1 class="hero__title">خدای مافیا</h1>
        <p class="hero__subtitle">
          ابزار حرفه‌ای مدیریت بازی مافیا
          <br>همه چیز زیر کنترل شماست
        </p>
        <div class="hero__actions">
          <button class="btn btn--primary btn--lg btn--block" id="btn-new-game">
            🎮 بازی جدید
          </button>
          ${hasSave ? `
            <button class="btn btn--secondary btn--block" id="btn-continue">
              ▶️ ادامه بازی
            </button>
          ` : ''}
          <button class="btn btn--ghost btn--block" id="btn-history">
            📊 تاریخچه بازی‌ها
          </button>
        </div>
      </div>
    `;

    // Event listeners
    this.container.querySelector('#btn-new-game')?.addEventListener('click', () => {
      if (hasSave) {
        this.confirm(
          'بازی جدید',
          'بازی ذخیره‌شده پاک خواهد شد. ادامه می‌دهید؟',
          () => {
            Storage.deleteSave();
            this.app.game.reset();
            this.app.navigate('setup');
          }
        );
      } else {
        this.app.game.reset();
        this.app.navigate('setup');
      }
    });

    this.container.querySelector('#btn-continue')?.addEventListener('click', () => {
      const saved = Storage.loadGame();
      if (saved) {
        this.app.game.loadFromJSON(saved);
        // Navigate to the appropriate phase
        const phase = this.app.game.phase;
        if (phase === 'night') this.app.navigate('night');
        else if (phase === 'day') this.app.navigate('day');
        else if (phase === 'ended') this.app.navigate('summary');
        else this.app.navigate('setup');
      }
    });

    this.container.querySelector('#btn-history')?.addEventListener('click', () => {
      this._showHistory();
    });
  }

  _showHistory() {
    const history = Storage.getHistory();

    if (history.length === 0) {
      this.container.innerHTML = `
        <div class="view">
          <button class="btn btn--ghost mb-lg" id="btn-back-home">→ بازگشت</button>
          <div class="empty-state">
            <div class="empty-state__icon">📭</div>
            <div class="empty-state__text">هنوز بازی‌ای انجام نشده است.</div>
          </div>
        </div>
      `;
    } else {
      this.container.innerHTML = `
        <div class="view">
          <button class="btn btn--ghost mb-lg" id="btn-back-home">→ بازگشت</button>
          <div class="section">
            <h2 class="section__title">📊 تاریخچه بازی‌ها</h2>
            <div class="player-list">
              ${history.map(g => `
                <div class="card mb-sm">
                  <div class="flex justify-between items-center mb-sm">
                    <span class="font-bold">${g.winner === 'mafia' ? '🔴 مافیا برد' : g.winner === 'citizen' ? '🔵 شهروند برد' : '🟣 مستقل برد'}</span>
                    <span class="text-muted text-sm">${new Date(g.date).toLocaleDateString('fa-IR')}</span>
                  </div>
                  <div class="text-secondary" style="font-size: var(--text-sm)">
                    ${g.playerCount} بازیکن · ${g.rounds} دور
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }

    this.container.querySelector('#btn-back-home')?.addEventListener('click', () => {
      this.render();
    });
  }
}
