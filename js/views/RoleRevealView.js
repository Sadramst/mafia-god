/**
 * RoleRevealView.js — One-by-one private role reveal with flip card
 */
import { BaseView } from './BaseView.js';
import { Roles } from '../models/Roles.js';
import { t, translations as tr } from '../utils/i18n.js';
import { Settings, Language } from '../utils/Settings.js';

export class RoleRevealView extends BaseView {

  constructor(container, app) {
    super(container, app);
    this.currentIndex = 0;
    this.isFlipped = false;
  }

  render() {
    const player = this.game.players[this.currentIndex];

    if (!player) {
      this._renderComplete();
      return;
    }

    const role = Roles.get(player.roleId);
    const teamClass = role?.team || 'citizen';

    this.container.innerHTML = `
      <div class="view">
        <div class="text-center mb-lg">
          <span class="chip">${t(tr.roleReveal.playerOfTotal).replace('%d', this.currentIndex + 1).replace('%d', this.game.players.length)}</span>
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
              <div class="reveal-card__front">
                <div class="reveal-card__front-icon">❓</div>
                <div class="reveal-card__front-text">${t(tr.roleReveal.tapCard)}</div>
              </div>
              <div class="reveal-card__back reveal-card__back--${teamClass}">
                <div class="reveal-card__back-icon">${role?.icon || '👤'}</div>
                <div class="reveal-card__back-role">${Settings.getLanguage() === Language.ENGLISH ? `<span class="ltr-inline">${role?.getLocalizedName() || '—'}</span>` : (role?.getLocalizedName() || '—')}</div>
                <div class="reveal-card__back-team">${Settings.getLanguage() === Language.ENGLISH ? `<span class="ltr-inline">${t(tr.teams[teamClass])}</span>` : t(tr.teams[teamClass])}</div>
                <div class="reveal-card__back-desc">${Settings.getLanguage() === Language.ENGLISH ? `<span class="ltr-inline">${role?.getLocalizedDescription() || ''}</span>` : (role?.getLocalizedDescription() || '')}</div>
              </div>
            </div>
          </div>

          ${this.isFlipped ? `
            <button class="btn btn--accent btn--lg" id="btn-next-reveal">
              ${this.currentIndex < this.game.players.length - 1 ? t(tr.roleReveal.nextPlayer) : t(tr.roleReveal.startGame)}
            </button>
          ` : `
            <div class="text-muted" style="font-size: var(--text-xs);">
              ${t(tr.roleReveal.onlyPlayerShouldSee).replace('%s', player.name)}
            </div>
          `}
        </div>
      </div>
    `;

    if (!this.isFlipped) {
      this.listen('#reveal-card', 'click', () => {
        this.isFlipped = true;
        this.render();
      });
    }

    this.listen('#btn-next-reveal', 'click', () => {
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
          <button class="btn btn--accent btn--lg" id="btn-start-blind-day">
            ${t(tr.roleReveal.startBlindDay)}
          </button>
        </div>
      </div>
    `;

    this.listen('#btn-start-blind-day', 'click', () => {
      this.game.startBlindDay();
      this.navigate('day');
    });
  }

  destroy() {
    super.destroy();
    this.currentIndex = 0;
    this.isFlipped = false;
  }
}
