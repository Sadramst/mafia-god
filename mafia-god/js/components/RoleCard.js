/**
 * RoleCard — Reusable role selection card for setup
 */
import { Component } from '../engine/Component.js';
import { Settings } from '../utils/Settings.js';

export class RoleCard extends Component {
  /**
   * @param {Object} props
   * @param {Object} props.role — Role definition
   * @param {number} props.count — Current selected count
   * @param {boolean} [props.disabled=false]
   * @param {Function} props.onToggle — Callback(roleId, newCount)
   * @param {Function} props.onInfo — Callback(roleId)
   * @param {string} [props.extraHTML] — Extra controls HTML (bullets, allies, etc.)
   */
  template() {
    const { role, count, disabled, extraHTML } = this.props;
    const selected = count > 0;
    return `
      <div class="role-card role-card--${role.team} ${selected ? 'selected' : ''} ${disabled ? 'role-card--disabled' : ''}"
           data-role="${role.id}">
        <button class="role-card__info-btn" data-info="${role.id}" type="button">i</button>
        <div class="role-card__icon">${role.icon}</div>
        <div class="role-card__name">${role.getLocalizedName()}</div>
        ${!role.unique ? `
          <div class="role-card__counter">
            <button class="role-card__dec" data-action="dec" data-role="${role.id}" type="button">−</button>
            <span class="role-card__val">${count}</span>
            <button class="role-card__inc" data-action="inc" data-role="${role.id}" type="button">+</button>
          </div>
        ` : ''}
        ${extraHTML || ''}
      </div>
    `;
  }

  onMount() {
    const { role, onToggle, onInfo } = this.props;

    // Click card to toggle (unique roles)
    if (role.unique) {
      this.listen('.role-card', 'click', (e) => {
        if (e.target.closest('.role-card__info-btn') || e.target.closest('.role-card__counter') || e.target.closest('button')) return;
        onToggle?.(role.id, this.props.count > 0 ? 0 : 1);
      });
    }

    // +/- for non-unique
    this.delegate('click', '[data-action="inc"]', () => {
      onToggle?.(role.id, this.props.count + 1);
    });
    this.delegate('click', '[data-action="dec"]', () => {
      if (this.props.count > 0) onToggle?.(role.id, this.props.count - 1);
    });

    // Info button
    this.delegate('click', '.role-card__info-btn', () => {
      onInfo?.(role.id);
    });
  }
}
