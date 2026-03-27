/**
 * PhaseBar — Reusable phase indicator bar (Night/Day/Blind)
 */
import { Component } from '../engine/Component.js';

export class PhaseBar extends Component {
  /**
   * @param {Object} props
   * @param {string} props.phase — 'night' | 'day' | 'blindDay' | 'blindNight'
   * @param {string} props.icon — Emoji
   * @param {string} props.title — Main text
   * @param {string} props.subtitle — Round or extra info
   */
  template() {
    const { phase, icon, title, subtitle } = this.props;
    const cls = phase.includes('night') ? 'phase-bar--night' : 'phase-bar--day';
    return `
      <div class="phase-bar ${cls}">
        <span class="phase-bar__icon">${icon}</span>
        <span class="phase-bar__title">${title}</span>
        ${subtitle ? `<span class="phase-bar__sub">${subtitle}</span>` : ''}
      </div>
    `;
  }
}
