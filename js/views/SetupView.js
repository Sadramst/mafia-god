/**
 * SetupView.js — Player entry + Role selection + Assignment
 */
import { BaseView } from './BaseView.js';
import { Roles } from '../models/Roles.js';

export class SetupView extends BaseView {

  constructor(container, app) {
    super(container, app);
    this.activeTab = 'players'; // players | roles | assign
  }

  render() {
    const game = this.app.game;

    this.container.innerHTML = `
      <div class="view">
        <!-- Tabs -->
        <div class="tabs">
          <button class="tab ${this.activeTab === 'players' ? 'active' : ''}" data-tab="players">
            👥 بازیکنان (${game.players.length})
          </button>
          <button class="tab ${this.activeTab === 'roles' ? 'active' : ''}" data-tab="roles">
            🎭 نقش‌ها (${game.getTotalRoleCount()})
          </button>
          <button class="tab ${this.activeTab === 'assign' ? 'active' : ''}" data-tab="assign">
            🎲 تخصیص
          </button>
        </div>

        <div id="tab-content"></div>
      </div>
    `;

    // Tab switching
    this.container.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.activeTab = tab.dataset.tab;
        this.render();
      });
    });

    // Render active tab content
    const content = this.container.querySelector('#tab-content');
    if (this.activeTab === 'players') this._renderPlayersTab(content);
    else if (this.activeTab === 'roles') this._renderRolesTab(content);
    else if (this.activeTab === 'assign') this._renderAssignTab(content);
  }

  // ─── Players Tab ───
  _renderPlayersTab(container) {
    const game = this.app.game;

    container.innerHTML = `
      <div class="section">
        <h2 class="section__title">👥 بازیکنان</h2>
        <p class="section__subtitle">اسم بازیکنان را اضافه کنید</p>
        
        <div class="input-group">
          <input type="text" class="input" id="player-name-input" 
                 placeholder="نام بازیکن..." maxlength="20"
                 autocomplete="off" enterkeyhint="done">
          <button class="btn btn--primary" id="btn-add-player">
            افزودن
          </button>
        </div>

        <div class="player-list" id="player-list">
          ${game.players.length === 0 ? `
            <div class="empty-state">
              <div class="empty-state__icon">👻</div>
              <div class="empty-state__text">هنوز بازیکنی اضافه نشده</div>
            </div>
          ` : game.players.map((p, i) => `
            <div class="player-item" style="animation-delay: ${i * 50}ms">
              <div class="player-item__number">${i + 1}</div>
              <div class="player-item__name">${p.name}</div>
              <button class="player-item__remove" data-id="${p.id}" title="حذف">✕</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Add player
    const input = container.querySelector('#player-name-input');
    const addBtn = container.querySelector('#btn-add-player');

    const addPlayer = () => {
      const name = input.value.trim();
      if (!name) return;
      // Check duplicates
      if (game.players.some(p => p.name === name)) {
        this.toast('این اسم قبلاً اضافه شده!', 'error');
        return;
      }
      game.addPlayer(name);
      input.value = '';
      input.focus();
      this.render();
    };

    addBtn.addEventListener('click', addPlayer);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addPlayer();
    });

    // Focus input
    setTimeout(() => input.focus(), 100);

    // Remove players
    container.querySelectorAll('.player-item__remove').forEach(btn => {
      btn.addEventListener('click', () => {
        game.removePlayer(Number(btn.dataset.id));
        this.render();
      });
    });
  }

  // ─── Roles Tab ───
  _renderRolesTab(container) {
    const game = this.app.game;
    const teams = ['mafia', 'citizen', 'independent'];
    const teamNames = { mafia: '🔴 تیم مافیا', citizen: '🔵 تیم شهروند', independent: '🟣 مستقل' };

    let html = `
      <div class="section">
        <h2 class="section__title">🎭 انتخاب نقش‌ها</h2>
        <p class="section__subtitle">
          بازیکنان: <strong>${game.players.length}</strong> نفر · 
          نقش‌های انتخاب شده: <strong id="role-count-display">${game.getTotalRoleCount()}</strong>
          ${game.getTotalRoleCount() !== game.players.length 
            ? `<span style="color: var(--danger)"> (باید ${game.players.length} باشد)</span>` 
            : '<span style="color: var(--success)"> ✓</span>'}
        </p>
    `;

    for (const team of teams) {
      const roles = Roles.getByTeam(team);
      html += `
        <div class="team-header team-header--${team}">${teamNames[team]}</div>
        <div class="role-grid mb-lg">
      `;

      for (const role of roles) {
        const count = game.selectedRoles[role.id] || 0;
        const isSelected = count > 0;

        html += `
          <div class="role-card role-card--${team} ${isSelected ? 'selected' : ''}" data-role="${role.id}">
            <button class="role-card__info" data-info="${role.id}" title="توضیحات">i</button>
            <div class="role-card__icon">${role.icon}</div>
            <div class="role-card__name">${role.name}</div>
            ${role.unique ? '' : `
              <div class="role-card__count">
                <button class="role-card__count-btn" data-action="dec" data-role="${role.id}">−</button>
                <span class="role-card__count-value">${count}</span>
                <button class="role-card__count-btn" data-action="inc" data-role="${role.id}">+</button>
              </div>
            `}
          </div>
        `;
      }
      html += `</div>`;
    }

    html += `</div>`;
    container.innerHTML = html;

    // Info buttons — show role description
    container.querySelectorAll('.role-card__info').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const roleId = btn.dataset.info;
        const role = Roles.get(roleId);
        if (role) this._showRoleDescription(role);
      });
    });

    // Toggle unique roles
    container.querySelectorAll('.role-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.role-card__count-btn')) return;
        if (e.target.closest('.role-card__info')) return;
        const roleId = card.dataset.role;
        const role = Roles.get(roleId);
        if (!role) return;

        if (role.unique) {
          if (game.selectedRoles[roleId]) {
            delete game.selectedRoles[roleId];
          } else {
            game.selectedRoles[roleId] = 1;
          }
        } else {
          if (!game.selectedRoles[roleId]) {
            game.selectedRoles[roleId] = 1;
          } else {
            delete game.selectedRoles[roleId];
          }
        }
        this.render();
      });
    });

    // +/- buttons for non-unique roles
    container.querySelectorAll('.role-card__count-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const roleId = btn.dataset.role;
        const action = btn.dataset.action;
        const role = Roles.get(roleId);
        if (!role) return;

        const current = game.selectedRoles[roleId] || 0;
        if (action === 'inc' && current < role.maxCount) {
          game.selectedRoles[roleId] = current + 1;
        } else if (action === 'dec' && current > 0) {
          game.selectedRoles[roleId] = current - 1;
          if (game.selectedRoles[roleId] === 0) delete game.selectedRoles[roleId];
        }
        this.render();
      });
    });
  }

  // ─── Assign Tab ───
  _renderAssignTab(container) {
    const game = this.app.game;
    const errors = game.validateSetup();

    container.innerHTML = `
      <div class="section">
        <h2 class="section__title">🎲 تخصیص نقش‌ها</h2>
        
        <!-- Summary -->
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-card__value">${game.players.length}</div>
            <div class="stat-card__label">بازیکن</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__value">${game.getTotalRoleCount()}</div>
            <div class="stat-card__label">نقش</div>
          </div>
          <div class="stat-card ${game.getTotalRoleCount() === game.players.length ? 'stat-card--citizen' : 'stat-card--mafia'}">
            <div class="stat-card__value">${game.getTotalRoleCount() === game.players.length ? '✓' : '✕'}</div>
            <div class="stat-card__label">تطابق</div>
          </div>
        </div>

        <!-- Selected roles summary -->
        <div class="card mb-lg">
          <div class="font-bold mb-sm">نقش‌های انتخاب‌شده:</div>
          <div class="flex" style="flex-wrap: wrap; gap: 6px;">
            ${Object.entries(game.selectedRoles).map(([roleId, count]) => {
              const role = Roles.get(roleId);
              if (!role) return '';
              return `<span class="role-badge role-badge--${role.team}">${role.icon} ${role.name}${count > 1 ? ` ×${count}` : ''}</span>`;
            }).join('')}
            ${Object.keys(game.selectedRoles).length === 0 ? '<span class="text-muted">نقشی انتخاب نشده</span>' : ''}
          </div>
        </div>

        <!-- Errors -->
        ${errors.length > 0 ? `
          <div class="card mb-lg" style="border-color: var(--danger);">
            ${errors.map(e => `<div style="color: var(--danger); font-size: var(--text-sm); margin-bottom: 4px;">⚠️ ${e}</div>`).join('')}
          </div>
        ` : ''}

        <!-- Actions -->
        <button class="btn btn--primary btn--lg btn--block mb-md" id="btn-random-assign" ${errors.length > 0 ? 'disabled' : ''}>
          🎲 تخصیص تصادفی و شروع
        </button>
        <button class="btn btn--ghost btn--block" id="btn-back-home-setup">
          ← بازگشت به خانه
        </button>
      </div>
    `;

    container.querySelector('#btn-random-assign')?.addEventListener('click', () => {
      game.assignRolesRandomly();
      this.app.navigate('roleReveal');
    });

    container.querySelector('#btn-back-home-setup')?.addEventListener('click', () => {
      this.app.navigate('home');
    });
  }

  /** Show role description popup (triggered by long press) */
  _showRoleDescription(role) {
    // Haptic feedback if available
    if (navigator.vibrate) navigator.vibrate(30);

    const teamNames = { mafia: 'تیم مافیا', citizen: 'تیم شهروند', independent: 'مستقل' };

    const overlay = document.createElement('div');
    overlay.className = 'role-tooltip-overlay';
    overlay.innerHTML = `
      <div class="role-tooltip">
        <div class="role-tooltip__icon">${role.icon}</div>
        <div class="role-tooltip__name">${role.name}</div>
        <div class="role-tooltip__team role-tooltip__team--${role.team}">${teamNames[role.team]}</div>
        <div class="role-tooltip__desc">${role.description}</div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Close on tap anywhere
    overlay.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('touchend', () => overlay.remove());
  }
}
