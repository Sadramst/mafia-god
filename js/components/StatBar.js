/**
 * StatBar — Reusable team statistics display
 */
import { Component } from '../engine/Component.js';

export class StatBar extends Component {
  /**
   * @param {Object} props
   * @param {Array} props.stats — [{ value, label, type }] e.g. { value: 3, label: 'Mafia', type: 'mafia' }
   */
  template() {
    const { stats } = this.props;
    return `
      <div class="stat-row">
        ${stats.map(s => `
          <div class="stat-pill stat-pill--${s.type}">
            <span class="stat-pill__val">${s.value}</span>
            <span class="stat-pill__lbl">${s.label}</span>
          </div>
        `).join('')}
      </div>
    `;
  }
}
