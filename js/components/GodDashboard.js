/**
 * GodDashboard — God's omniscient player dashboard (reusable)
 */
import { Component } from '../engine/Component.js';
import { Roles } from '../models/Roles.js';
import { Settings, Language } from '../utils/Settings.js';

export class GodDashboard extends Component {
  /**
   * @param {Object} props
   * @param {Array} props.players — Game player array
   * @param {string} props.title — Dashboard title
   * @param {boolean} [props.compact=false] — Compact mode
   */
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
              <div class="god-player god-player--${team} ${!p.isAlive ? 'god-player--dead' : ''}">
                <span class="dot ${p.isAlive ? 'dot--alive' : 'dot--dead'}"></span>
                <span class="god-player__name">${p.name}</span>
                <span class="god-player__role">${role?.icon || ''} ${name}</span>
                ${faceOffIcon}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
}
