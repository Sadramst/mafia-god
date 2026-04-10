/**
 * PlayerList — Reusable player list with drag-to-reorder and remove
 */
import { Component } from '../engine/Component.js';
import { t, translations as tr, toEnDigits } from '../utils/i18n.js';

export class PlayerList extends Component {
  /**
   * @param {Object} props
   * @param {Array} props.players — Array of player objects
   * @param {boolean} [props.editable=false] — Show remove buttons and drag handles
   * @param {boolean} [props.showRole=false] — Show role badge
   * @param {Function} [props.onRemove] — Callback(playerId)
   * @param {Function} [props.onReorder] — Callback(newOrderIds)
   * @param {Function} [props.getRoleBadge] — Callback(player) → HTML string
   */
  template() {
    const { players, editable, showRole, getRoleBadge } = this.props;
    if (!players || players.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state__icon">👻</div>
          <div class="empty-state__text">${t(tr.setup.noPlayersYet)}</div>
        </div>
      `;
    }
    return `
      <div class="player-list" data-component="player-list">
        ${players.map((p, i) => `
          <div class="player-item ${!p.isAlive ? 'player-item--dead' : ''}"
               data-id="${p.id}" ${editable ? 'draggable="true"' : ''}>
            ${editable ? `<button class="player-item__grip" aria-label="${t(tr.setup.dragHandle)}">⠿</button>` : ''}
            <div class="player-item__num">${toEnDigits(i + 1)}</div>
            <div class="player-item__name">${p.name}</div>
            ${showRole && getRoleBadge ? getRoleBadge(p) : ''}
            ${editable ? `
              <button class="player-item__del" data-remove="${p.id}" type="button">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
              </button>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  onMount() {
    const { editable, onRemove, onReorder } = this.props;
    if (!editable) return;

    // Remove buttons
    if (onRemove) {
      this.delegate('click', '[data-remove]', (e, btn) => {
        const id = Number(btn.dataset.remove);
        onRemove(id);
      });
    }

    // Drag reorder (desktop)
    const list = this.$('[data-component="player-list"]');
    if (!list || !onReorder) return;

    this.delegate('dragstart', '.player-item', (e, item) => {
      item.classList.add('dragging');
      e.dataTransfer.setData('text/plain', item.dataset.id);
    });

    this.delegate('dragend', '.player-item', (e, item) => {
      item.classList.remove('dragging');
      this._emitOrder(list);
    });

    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      const after = this._getDragAfter(list, e.clientY);
      const dragging = list.querySelector('.dragging');
      if (!dragging) return;
      if (after) list.insertBefore(dragging, after);
      else list.appendChild(dragging);
    });

    // Touch reorder via grip handle
    this.$$('.player-item__grip').forEach(grip => {
      let dragging = false;
      const item = grip.closest('.player-item');

      const onTouchMove = (ev) => {
        if (!dragging) return;
        ev.preventDefault();
        const t0 = ev.touches[0];
        if (!t0) return;
        const after = this._getDragAfter(list, t0.clientY);
        const d = list.querySelector('.dragging');
        if (!d) return;
        if (after) list.insertBefore(d, after);
        else list.appendChild(d);
      };

      grip.addEventListener('touchstart', (ev) => {
        ev.stopPropagation();
        dragging = true;
        item.classList.add('dragging');
        document.body.style.userSelect = 'none';
        document.addEventListener('touchmove', onTouchMove, { passive: false });
      }, { passive: true });

      grip.addEventListener('touchend', () => {
        if (!dragging) return;
        dragging = false;
        item.classList.remove('dragging');
        document.body.style.userSelect = '';
        document.removeEventListener('touchmove', onTouchMove);
        this._emitOrder(list);
      });
    });
  }

  _emitOrder(list) {
    const ids = [...list.querySelectorAll('.player-item')].map(el => Number(el.dataset.id));
    this.props.onReorder?.(ids);
    // Renumber
    [...list.querySelectorAll('.player-item__num')].forEach((n, i) => n.textContent = toEnDigits(i + 1));
  }

  _getDragAfter(list, y) {
    const items = [...list.querySelectorAll('.player-item:not(.dragging)')];
    let closest = { offset: Number.NEGATIVE_INFINITY, el: null };
    for (const child of items) {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        closest = { offset, el: child };
      }
    }
    return closest.el;
  }
}
