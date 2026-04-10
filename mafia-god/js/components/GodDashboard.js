/**
 * GodDashboard — God's omniscient player dashboard (reusable)
 */
import { Component } from '../engine/Component.js';
import { Roles } from '../models/Roles.js';
import { Settings, Language } from '../utils/Settings.js';
import { t, translations as tr } from '../utils/i18n.js';

export class GodDashboard extends Component {
  /**
   * @param {Object} props
   * @param {Array} props.players — Game player array
   * @param {string} props.title — Dashboard title
   * @param {boolean} [props.compact=false] — Compact mode
   * @param {function} [props.onPlayerAction] — Callback: ({ playerId, action }) => {}  action: 'kill'|'revive'
   */
  constructor(props = {}) {
    super(props);
    this._longPressTimer = null;
    this._longPressData = null;
  }

  template() {
    const { players, title, compact } = this.props;
    return `
      <div class="god-dashboard ${compact ? 'god-dashboard--compact' : ''}">
        <div class="god-dashboard__hdr">
          <span class="god-dashboard__eye">👁️</span>
          <span>${title}</span>
        </div>
        <div class="god-dashboard__grid">
          ${players.map(p => {
            const role = Roles.get(p.roleId);
            const team = role?.team || 'citizen';
            const name = Settings.getLanguage() === Language.ENGLISH
              ? `<span class="ltr-inline">${role?.getLocalizedName() || ''}</span>`
              : (role?.getLocalizedName() || '');
            const faceOffIcon = this.props.faceOffEvent && (this.props.faceOffEvent.victimId === p.id || this.props.faceOffEvent.chosenId === p.id)
              ? '<span class="god-player__event" title="Face Off happened">🎭</span>'
              : '';
            return `
              <div class="god-player god-player--${team} ${!p.isAlive ? 'god-player--dead' : ''}" data-player-id="${p.id}" data-player-name="${p.name}" data-player-alive="${p.isAlive}">
                <span class="dot ${p.isAlive ? 'dot--alive' : 'dot--dead'}"></span>
                <span class="god-player__name">${p.name}</span>
                <span class="god-player__role">${role?.icon || ''} ${name}</span>
                ${faceOffIcon}
              </div>
            `;
          }).join('')}
        </div>
        <div id="god-context-menu" class="god-context-menu hidden"></div>
      </div>
    `;
  }

  onMount() {
    // Set up long-press detection on player cards
    this.delegate('pointerdown', '[data-player-id]', (e) => {
      const card = e.target.closest('[data-player-id]');
      if (!card) return;

      const playerId = parseInt(card.dataset.playerId, 10);
      const playerName = card.dataset.playerName;
      const isAlive = card.dataset.playerAlive === 'true';

      // Start long-press timer
      this._longPressData = { playerId, playerName, isAlive, card };
      this._longPressTimer = setTimeout(() => {
        this._showContextMenu(playerId, playerName, isAlive, card);
      }, 500); // 500ms = long press
    });

    // Cancel long-press if pointer moves or ends quickly
    this.delegate('pointerup', '[data-player-id]', () => {
      if (this._longPressTimer) {
        clearTimeout(this._longPressTimer);
        this._longPressTimer = null;
        this._longPressData = null;
      }
    });

    this.delegate('pointermove', '[data-player-id]', () => {
      if (this._longPressTimer) {
        clearTimeout(this._longPressTimer);
        this._longPressTimer = null;
        this._longPressData = null;
      }
    });

    // Close context menu when clicking elsewhere
    this.listen(document, 'click', (e) => {
      const menu = this.$('#god-context-menu');
      if (menu && !menu.contains(e.target) && !e.target.closest('[data-player-id]')) {
        this._hideContextMenu();
      }
    });

    // Handle context menu button clicks
    this.delegate('click', '.god-context-btn', (e) => {
      const btn = e.target.closest('.god-context-btn');
      const action = btn.dataset.action;
      const playerId = parseInt(btn.dataset.playerId, 10);

      if (this.props.onPlayerAction) {
        this.props.onPlayerAction({ playerId, action });
      }

      this._hideContextMenu();
    });
  }

  /**
   * Show context menu for a player
   * @private
   */
  _showContextMenu(playerId, playerName, isAlive, card) {
    const menu = this.$('#god-context-menu');
    if (!menu) return;

    const rect = card.getBoundingClientRect();
    const options = [];

    if (isAlive) {
      options.push(`
        <button class="god-context-btn" data-action="kill" data-player-id="${playerId}">
          ${t(tr.godDashboard?.killPlayer ?? { fa: '❌ کشتن', en: '❌ Kill' })}
        </button>
      `);
    } else {
      options.push(`
        <button class="god-context-btn" data-action="revive" data-player-id="${playerId}">
          ${t(tr.godDashboard?.revivePlayer ?? { fa: '✅ احیا', en: '✅ Revive' })}
        </button>
      `);
    }

    menu.innerHTML = `
      <div class="god-context-menu__popup">
        <div class="god-context-menu__title">${playerName}</div>
        <div class="god-context-menu__buttons">
          ${options.join('')}
        </div>
      </div>
    `;

    menu.classList.remove('hidden');

    // Position menu near the card
    const popup = menu.querySelector('.god-context-menu__popup');
    if (popup) {
      popup.style.top = (rect.top + window.scrollY + rect.height / 2) + 'px';
      popup.style.left = (rect.left + window.scrollX + rect.width / 2) + 'px';
    }
  }

  /**
   * Hide context menu
   * @private
   */
  _hideContextMenu() {
    const menu = this.$('#god-context-menu');
    if (menu) {
      menu.classList.add('hidden');
    }
  }

  onDestroy() {
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
    }
  }
}
