/**
 * RoleRevealView.js — One-by-one private role reveal with flip card
 */
import { BaseView } from './BaseView.js';
import { Roles } from '../models/Roles.js';
import { t, translations as tr } from '../utils/i18n.js';

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
          <span class="chip">${t(tr.roleReveal.playerOfTotal).replace('%d', this.currentIndex + 1).replace('%d', game.players.length)}</span>
        </div>

        <div class="reveal-container">
          <h2 style="font-size: var(--text-xl); font-weight: 700;">
            ${player.name}
          </h2>
          <p class="text-secondary" style="font-size: var(--text-sm);">
            ${this.isFlipped ? t(tr.roleReveal.rememberRole) : t(tr.roleReveal.tapToReveal)}
          </p>

          <div class="reveal-card ${this.isFlipped ? 'flipped' : ''}" id="reveal-card">
            <div class="reveal-card__inner">
              <!-- Front (hidden role) -->
              <div class="reveal-card__front">
                <div class="reveal-card__front-icon">❓</div>
                <div class="reveal-card__front-text">${t(tr.roleReveal.tapCard)}</div>
              </div>
              <!-- Back (role shown) -->
              <div class="reveal-card__back reveal-card__back--${teamClass}">
                <div class="reveal-card__back-icon">${role?.icon || '👤'}</div>
                <div class="reveal-card__back-role">${role?.getLocalizedName() || '—'}</div>
                <div class="reveal-card__back-team">${Roles.getTeamName(teamClass)}</div>
                <div class="reveal-card__back-desc">${role?.getLocalizedDescription() || ''}</div>
              </div>
            </div>
          </div>

          ${this.isFlipped ? `
            <button class="btn btn--primary btn--lg" id="btn-next-reveal">
              ${this.currentIndex < game.players.length - 1 ? t(tr.roleReveal.nextPlayer) : t(tr.roleReveal.startGame)}
            </button>
          ` : `
            <div class="text-muted" style="font-size: var(--text-xs);">
              ${t(tr.roleReveal.onlyPlayerShouldSee).replace('%s', player.name)}
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
            ${t(tr.roleReveal.allRevealed)}
          </h2>
          <p class="text-secondary">${t(tr.roleReveal.readyForBlindDay)}</p>
          <button class="btn btn--primary btn--lg" id="btn-start-blind-day">
            ${t(tr.roleReveal.startBlindDay)}
          </button>
        </div>
      </div>
    `;

    this.container.querySelector('#btn-start-blind-day')?.addEventListener('click', () => {
      this.app.game.startBlindDay();
      this.app.navigate('day');
    });
  }

  destroy() {
    this.currentIndex = 0;
    this.isFlipped = false;
  }
}
