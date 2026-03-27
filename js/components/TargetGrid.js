/**
 * TargetGrid — Reusable target selection grid for night actions
 */
import { Component } from '../engine/Component.js';

export class TargetGrid extends Component {
  /**
   * @param {Object} props
   * @param {Array} props.targets — [{ id, name, extra? }]
   * @param {number|null} props.selected — Currently selected target ID
   * @param {Function} props.onSelect — Callback(targetId)
   * @param {string} [props.emptyText] — Shown when no targets
   */
  template() {
    const { targets, selected, emptyText } = this.props;
    if (!targets || targets.length === 0) {
      return `<div class="empty-hint">${emptyText || '—'}</div>`;
    }
    return `
      <div class="target-grid">
        ${targets.map(t => `
          <button class="target-btn ${selected === t.id ? 'selected' : ''}"
                  data-target="${t.id}" type="button">
            ${t.name}
            ${t.extra ? `<span class="target-btn__extra">${t.extra}</span>` : ''}
          </button>
        `).join('')}
      </div>
    `;
  }

  onMount() {
    this.delegate('click', '.target-btn', (e, btn) => {
      const id = Number(btn.dataset.target);
      if (this.props.onSelect) this.props.onSelect(id);
    });
  }
}
