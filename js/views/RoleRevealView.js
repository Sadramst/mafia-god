/**
 * RoleRevealView.js — One-by-one private role reveal with flip card
 */
import { BaseView } from './BaseView.js';
import { Roles } from '../models/Roles.js';

export class RoleRevealView extends BaseView {

  constructor(container, app) {
    super(container, app);
    this.currentIndex = 0;
    this.isFlipped = false;
  }

  render() {
    const game = this.app.game;
    const player = game.players[this.currentIndex];

    if (!player) {
      // All revealed — go to first night
      this._renderComplete();
      return;
    }

    const role = Roles.get(player.roleId);
    const teamClass = role?.team || 'citizen';

    this.container.innerHTML = `
      <div class="view">
        <div class="text-center mb-lg">
          <span class="chip">بازیکن ${this.currentIndex + 1} از ${game.players.length}</span>
        </div>

        <div class="reveal-container">
          <h2 style="font-size: var(--text-xl); font-weight: 700;">
            ${player.name}
          </h2>
          <p class="text-secondary" style="font-size: var(--text-sm);">
            ${this.isFlipped ? 'نقش خود را به خاطر بسپارید' : 'برای دیدن نقش، کارت را لمس کنید'}
          </p>

          <div class="reveal-card ${this.isFlipped ? 'flipped' : ''}" id="reveal-card">
            <div class="reveal-card__inner">
              <!-- Front (hidden role) -->
              <div class="reveal-card__front">
                <div class="reveal-card__front-icon">❓</div>
                <div class="reveal-card__front-text">لمس کنید</div>
              </div>
              <!-- Back (role shown) -->
              <div class="reveal-card__back reveal-card__back--${teamClass}">
                <div class="reveal-card__back-icon">${role?.icon || '👤'}</div>
                <div class="reveal-card__back-role">${role?.name || '—'}</div>
                <div class="reveal-card__back-team">${Roles.getTeamName(teamClass)}</div>
                <div class="reveal-card__back-desc">${role?.description || ''}</div>
              </div>
            </div>
          </div>

          ${this.isFlipped ? `
            <button class="btn btn--primary btn--lg" id="btn-next-reveal">
              ${this.currentIndex < game.players.length - 1 ? 'بازیکن بعدی ←' : '🎮 شروع بازی'}
            </button>
          ` : `
            <div class="text-muted" style="font-size: var(--text-xs);">
              فقط ${player.name} باید صفحه را ببیند
            </div>
          `}
        </div>
      </div>
    `;

    // Flip card
    const card = this.container.querySelector('#reveal-card');
    if (!this.isFlipped) {
      card.addEventListener('click', () => {
        this.isFlipped = true;
        this.render();
      });
    }

    // Next player
    this.container.querySelector('#btn-next-reveal')?.addEventListener('click', () => {
      this.currentIndex++;
      this.isFlipped = false;
      this.render();
    });
  }

  _renderComplete() {
    this.container.innerHTML = `
      <div class="view">
        <div class="reveal-container">
          <div style="font-size: 64px;">🌙</div>
          <h2 style="font-size: var(--text-2xl); font-weight: 800;">
            همه نقش‌ها مشخص شد
          </h2>
          <p class="text-secondary">آماده‌اید برای اولین شب؟</p>
          <button class="btn btn--primary btn--lg" id="btn-start-night">
            🌙 شروع شب اول
          </button>
        </div>
      </div>
    `;

    this.container.querySelector('#btn-start-night')?.addEventListener('click', () => {
      this.app.game.startNight();
      this.app.navigate('night');
    });
  }

  destroy() {
    this.currentIndex = 0;
    this.isFlipped = false;
  }
}
