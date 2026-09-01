/**
 * ManualAssignView.js — Manual role assignment: each player privately taps
 * to claim a role from what's left in the pool, instead of a random deal.
 */
import { BaseView } from './BaseView.js';
import { Roles } from '../models/Roles.js';
import { t, translations as tr } from '../utils/i18n.js';
import { Settings, Language } from '../utils/Settings.js';

export class ManualAssignView extends BaseView {

  constructor(container, app) {
    super(container, app);
    this.pendingRoleId = null; // role tapped but not yet confirmed
    this.isBlindPick = false;  // true when pendingRoleId came from an anonymous "mystery card" tap
  }

  render() {
    const game = this.game;

    // The roster can change while this view isn't active (God navigates back to Setup and
    // edits players) — Game cancels the in-progress pick in that case by leaving 'manualAssign'.
    // Bail back to Setup rather than rendering against a stale/desynced pool.
    if (game.phase !== 'manualAssign') {
      this.navigate('setup');
      return;
    }

    if (game.isManualAssignmentComplete()) {
      this._renderComplete();
      return;
    }

    const player = game.getManualCurrentPlayer();
    if (!player) {
      this._renderComplete();
      return;
    }

    if (this.pendingRoleId) this._renderConfirm(player);
    else this._renderPicker(player);
  }

  //#region Picker
  _renderPicker(player) {
    const game = this.game;
    if (game.manualPickShowRoles) this._renderVisiblePicker(player);
    else this._renderBlindPicker(player);
  }

  /** Roles shown openly — the player deliberately taps the exact role they want */
  _renderVisiblePicker(player) {
    const game = this.game;
    const playerIndex = game.players.indexOf(player);
    const teamOrder = ['independent', 'mafia', 'citizen'];
    const remaining = game.getManualRemainingRoles()
      .map(r => ({ ...r, role: Roles.get(r.roleId) }))
      .filter(r => r.role)
      .sort((a, b) => teamOrder.indexOf(a.role.team) - teamOrder.indexOf(b.role.team));

    this.container.innerHTML = `
      <div class="view">
        <div class="text-center mb-lg">
          <span class="chip">${t(tr.roleReveal.playerOfTotal).replace('%d', playerIndex + 1).replace('%d', game.players.length)}</span>
        </div>

        <div class="reveal-container">
          <h2 style="font-size: var(--text-xl); font-weight: 700;">${player.name}</h2>
          <p class="text-secondary" style="font-size: var(--text-sm);">${t(tr.manualAssign.pickPrompt)}</p>

          <div class="role-grid mb-lg" id="manual-pick-grid">
            ${remaining.map(({ roleId, count, role }) => `
              <div class="role-card role-card--${role.team} manual-pick-card" data-role="${roleId}">
                <div class="role-card__icon">${role.icon}</div>
                <div class="role-card__name">${role.getLocalizedName()}</div>
                ${count > 1 ? `
                  <div class="role-card__count">
                    <span class="role-card__count-value">×${count}</span>
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>

          <div class="text-muted" style="font-size: var(--text-xs);">
            ${t(tr.roleReveal.onlyPlayerShouldSee).replace('%s', player.name)}
          </div>
        </div>
      </div>
    `;

    this.delegate('click', '.manual-pick-card', (_e, card) => {
      this.pendingRoleId = card.dataset.role;
      this.isBlindPick = false;
      this.render();
    });
  }

  /** Roles hidden — the player taps an anonymous card and only sees the role after picking */
  _renderBlindPicker(player) {
    const game = this.game;
    const playerIndex = game.players.indexOf(player);
    const totalRemaining = game.getManualRemainingRoles().reduce((s, r) => s + r.count, 0);
    const cardCount = Math.max(0, totalRemaining);

    this.container.innerHTML = `
      <div class="view">
        <div class="text-center mb-lg">
          <span class="chip">${t(tr.roleReveal.playerOfTotal).replace('%d', playerIndex + 1).replace('%d', game.players.length)}</span>
        </div>

        <div class="reveal-container">
          <h2 style="font-size: var(--text-xl); font-weight: 700;">${player.name}</h2>
          <p class="text-secondary" style="font-size: var(--text-sm);">${t(tr.manualAssign.blindPickPrompt)}</p>

          <div class="role-grid mb-lg" id="manual-pick-grid">
            ${Array.from({ length: cardCount }, (_, i) => `
              <div class="role-card manual-pick-card manual-pick-card--blind" data-index="${i}">
                <div class="role-card__icon">❓</div>
                <div class="role-card__name">${t(tr.manualAssign.mysteryCard).replace('%d', i + 1)}</div>
              </div>
            `).join('')}
          </div>

          <div class="text-muted" style="font-size: var(--text-xs);">
            ${t(tr.roleReveal.onlyPlayerShouldSee).replace('%s', player.name)}
          </div>
        </div>
      </div>
    `;

    this.delegate('click', '.manual-pick-card--blind', () => {
      this.pendingRoleId = game.peekManualRandomRole();
      this.isBlindPick = true;
      this.render();
    });
  }
  //#endregion

  //#region Confirm
  _renderConfirm(player) {
    const game = this.game;
    const playerIndex = game.players.indexOf(player);
    const role = Roles.get(this.pendingRoleId);
    const teamClass = role?.team || 'citizen';
    const isEnglish = Settings.getLanguage() === Language.ENGLISH;

    this.container.innerHTML = `
      <div class="view">
        <div class="text-center mb-lg">
          <span class="chip">${t(tr.roleReveal.playerOfTotal).replace('%d', playerIndex + 1).replace('%d', game.players.length)}</span>
        </div>

        <div class="reveal-container">
          <h2 style="font-size: var(--text-xl); font-weight: 700;">${player.name}</h2>
          <p class="text-secondary" style="font-size: var(--text-sm);">${t(tr.manualAssign.confirmPrompt)}</p>

          <div class="reveal-card flipped">
            <div class="reveal-card__inner">
              <div class="reveal-card__front">
                <div class="reveal-card__front-icon">❓</div>
                <div class="reveal-card__front-text">${t(tr.roleReveal.tapCard)}</div>
              </div>
              <div class="reveal-card__back reveal-card__back--${teamClass}">
                <div class="reveal-card__back-icon">${role?.icon || '👤'}</div>
                <div class="reveal-card__back-role">${isEnglish ? `<span class="ltr-inline">${role?.getLocalizedName() || '—'}</span>` : (role?.getLocalizedName() || '—')}</div>
                <div class="reveal-card__back-team">${isEnglish ? `<span class="ltr-inline">${t(tr.teams[teamClass])}</span>` : t(tr.teams[teamClass])}</div>
                <div class="reveal-card__back-desc">${isEnglish ? `<span class="ltr-inline">${role?.getLocalizedDescription() || ''}</span>` : (role?.getLocalizedDescription() || '')}</div>
              </div>
            </div>
          </div>

          <button class="btn btn--accent btn--lg" id="btn-confirm-manual-role">
            ${t(tr.manualAssign.confirmAndContinue)}
          </button>
          ${!this.isBlindPick ? `
            <button class="btn btn--ghost" id="btn-change-manual-role">
              ${t(tr.manualAssign.pickDifferent)}
            </button>
          ` : ''}
        </div>
      </div>
    `;

    this.listen('#btn-confirm-manual-role', 'click', () => {
      const roleId = this.pendingRoleId;
      this.pendingRoleId = null;
      this.isBlindPick = false;
      game.assignManualRole(roleId);
      this.render();
    });

    // "Pick a different role" only exists in visible mode — a blind-pick result can't be
    // rerolled, or the player could just keep tapping cards until they like the outcome.
    this.listen('#btn-change-manual-role', 'click', () => {
      this.pendingRoleId = null;
      this.render();
    });
  }
  //#endregion

  //#region Complete
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
  //#endregion

  destroy() {
    super.destroy();
    this.pendingRoleId = null;
    this.isBlindPick = false;
  }
}
