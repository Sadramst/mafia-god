/**
 * SetupView.js — Player entry + Role selection + Assignment
 */
import { BaseView } from './BaseView.js';
import { Roles } from '../models/Roles.js';
import { t, translations as tr, toEnDigits } from '../utils/i18n.js';
import { Storage } from '../utils/Storage.js';
import { Settings } from '../utils/Settings.js';

export class SetupView extends BaseView {

  constructor(container, app) {
    super(container, app);
    this.activeTab = 'players'; // players | roles | assign
    this._renderScheduled = false;
  }

  _getDragAfterElement(list, y) {
    const draggableElements = [...list.querySelectorAll('.player-item:not(.dragging)')];
    let closest = { offset: Number.NEGATIVE_INFINITY, element: null };
    for (const child of draggableElements) {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        closest = { offset, element: child };
      }
    }
    return closest.element;
  }

  /** Schedule a single render on the next animation frame and preserve input focus/selection */
  _requestRender() {
    if (this._renderScheduled) return;
    this._renderScheduled = true;
    // capture focused element id and caret position if it's the player input
    const active = document.activeElement;
    const activeId = active && active.id;
    const selectionStart = active && typeof active.selectionStart === 'number' ? active.selectionStart : null;
    requestAnimationFrame(() => {
      this._renderScheduled = false;
      this.render();
      if (activeId) {
        const el = this.container.querySelector('#' + activeId) || document.getElementById(activeId);
        if (el) {
          try { el.focus(); if (selectionStart !== null && el.setSelectionRange) el.setSelectionRange(selectionStart, selectionStart); } catch (e) {}
        }
      }
    });
  }

  /** Update players count shown in tabs and any visible subtitles/stats */
  _updatePlayersCountDisplays() {
    const game = this.app.game;
    const playersTab = this.container.querySelector('.tabs [data-tab="players"]');
    if (playersTab) playersTab.innerHTML = `👥 ${t(tr.setup.playersTab)} (${game.players.length})`;
    const roleCountEl = this.container.querySelector('#role-count-display');
    if (roleCountEl) roleCountEl.textContent = game.getTotalRoleCount();
    // remaining roles counter
    const rem = Math.max(0, game.players.length - game.getTotalRoleCount());
    const remEl = this.container.querySelector('#roles-remaining');
    if (remEl) remEl.textContent = rem > 0 ? t(tr.setup.remainingRoles).replace('%d', rem) : '';
    const statsPlayerVal = this.container.querySelector('.stat-card .stat-card__value');
    if (statsPlayerVal && statsPlayerVal.textContent) statsPlayerVal.textContent = game.players.length;
  }

  /** Update a numeric value near a clicked button inside role-card without re-rendering whole view */
  _updateSiblingValue(btn, newValue) {
    // find the nearest font-bold sibling used to show value
    const bullets = btn.closest('.role-card__bullets');
    if (!bullets) return;
    // Prefer the closest row (.flex) to the clicked button so each +/- updates its own value
    const row = btn.closest('.flex') || bullets;
    const valueEl = row.querySelector('.font-bold') || bullets.querySelector('.font-bold');
    if (valueEl) valueEl.textContent = newValue;
    // also update Assign tab values if present by matching role id
    const roleCard = btn.closest('.role-card');
    const roleId = roleCard ? roleCard.dataset.role : null;
    if (roleId) {
      // try multiple id patterns used in Assign tab
      const assignDec = this.container.querySelector(`#btn-${roleId}-dec-assign`) || this.container.querySelector(`#btn-${roleId}-dec`) || document.querySelector(`#btn-${roleId}-dec-assign`) || document.querySelector(`#btn-${roleId}-dec`);
      if (assignDec) {
        const valSpan = assignDec.parentElement.querySelector('.font-bold');
        if (valSpan) valSpan.textContent = newValue;
      }
    }
  }

  render() {
    const game = this.app.game;

    this.container.innerHTML = `
      <div class="view">
        <!-- Tabs -->
        <div class="tabs">
          <button class="tab ${this.activeTab === 'players' ? 'active' : ''}" data-tab="players">
            👥 ${t(tr.setup.playersTab)} (${game.players.length})
          </button>
          <button class="tab ${this.activeTab === 'roles' ? 'active' : ''} ${game.players.length < 8 ? 'disabled' : ''}" data-tab="roles">
            🎭 ${t(tr.setup.rolesTab)} (${game.getTotalRoleCount()})
          </button>
          <button class="tab ${this.activeTab === 'assign' ? 'active' : ''} ${(game.players.length < 8 || game.getTotalRoleCount() !== game.players.length) ? 'disabled' : ''}" data-tab="assign">
            🎲 ${t(tr.setup.assignTab)}
          </button>
        </div>

        <div id="tab-content"></div>
      </div>
    `;

    // Tab switching with minimal player guard
    this.container.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        const MIN_PLAYERS = 8;
        if ((tabName === 'roles' || tabName === 'assign') && game.players.length < MIN_PLAYERS) {
          this.toast(t(tr.setup.minPlayers).replace('%d', MIN_PLAYERS), 'error');
          return;
        }
        this.activeTab = tabName;
        this._requestRender();
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
        <h2 class="section__title">👥 ${t(tr.setup.playersTitle)}</h2>
        <p class="section__subtitle">${t(tr.setup.playersSubtitle)}</p>
        
        <div class="input-group">
          <input type="text" class="input" id="player-name-input" 
                 placeholder="${t(tr.setup.playerName)}" maxlength="20"
                 autocomplete="off" enterkeyhint="done">
          <button type="button" class="btn btn--primary" id="btn-add-player">
            ${t(tr.setup.addButton)}
          </button>
        </div>

        <!-- Suggested players (bilingual) -->
        <div class="suggested-players" style="margin-top: 10px;">
          <div style="font-size: var(--text-sm); color: var(--muted); margin-bottom:6px;">${t(tr.setup.suggestedPlayersTitle)}</div>
          <div class="flex" style="flex-wrap: wrap; gap:6px;">
            <!-- buttons inserted by script to keep translations and directionality correct -->
          </div>
        </div>

        <div class="player-list" id="player-list">
              ${game.players.length === 0 ? `
                <div class="empty-state">
                  <div class="empty-state__icon">👻</div>
                  <div class="empty-state__text">${t(tr.setup.noPlayersYet)}</div>
                </div>
              ` : game.players.map((p, i) => `
                <div class="player-item" data-id="${p.id}" draggable="true" style="animation-delay: ${i * 50}ms">
                  <button class="player-item__drag-handle" aria-label="${t(tr.setup.dragHandle)}" title="${t(tr.setup.dragHandle)}">≡</button>
                  <div class="player-item__number">${toEnDigits(i + 1)}</div>
                    <div class="player-item__name">${p.name}</div>
                    <button class="player-item__remove" data-id="${p.id}" title="${t(tr.setup.removePlayer)}">✕</button>
                </div>
              `).join('')}
        </div>
      </div>
    `;

    // Add player
    const input = container.querySelector('#player-name-input');
    const addBtn = container.querySelector('#btn-add-player');

    const addPlayer = (nameOrObj) => {
      let en = null, fa = null;
      if (!nameOrObj) {
        en = input.value.trim();
        fa = en;
      } else if (typeof nameOrObj === 'string') { en = nameOrObj.trim(); fa = en; }
      else { en = (nameOrObj.en || '').toString().trim(); fa = (nameOrObj.fa || nameOrObj.en || '').toString().trim(); }
      if (!en) return;
      // Check duplicates (either language)
      if (game.players.some(p => (p.nameEn && p.nameEn === en) || (p.nameFa && p.nameFa === fa) || p.name === en || p.name === fa)) {
        this.toast(t(tr.setup.playerExists), 'error');
        return;
      }
      const player = game.addPlayer({ en, fa });
      input.value = '';
      input.focus();
      // append DOM node instead of full re-render to reduce flicker
      const list = container.querySelector('#player-list');
      if (list) {
        // if empty state present, remove it
        const empty = list.querySelector('.empty-state');
        if (empty) empty.remove();
        const i = game.players.length - 1;
        const item = document.createElement('div');
        item.className = 'player-item';
        item.style.animationDelay = `${i * 50}ms`;
        // ensure dataset id for reorder persistence
        item.dataset.id = player.id;
        item.setAttribute('draggable', 'true');
        item.innerHTML = `
          <button class="player-item__drag-handle" aria-label="${t(tr.setup.dragHandle)}" title="${t(tr.setup.dragHandle)}">≡</button>
          <div class="player-item__number">${toEnDigits(i + 1)}</div>
          <div class="player-item__name">${player.name}</div>
          <button class="player-item__remove" data-id="${player.id}" title="${t(tr.setup.removePlayer)}">✕</button>
        `;
        list.appendChild(item);
        // attach remove handler for this item
        item.querySelector('.player-item__remove').addEventListener('click', () => {
          game.removePlayer(Number(player.id));
          item.remove();
          this._updatePlayersCountDisplays();
          try { this.app.saveGame(); } catch (e) {}
          try { Storage.saveRoster(game.players.map(p => ({ id: p.id, nameEn: p.nameEn, nameFa: p.nameFa }))); this.toast(t(tr.setup.rosterSaved), 'success'); } catch (e) {}
        });
        // enable drag for this new item (mouse/desktop)
        item.addEventListener('dragstart', (e) => {
          item.classList.add('dragging');
          try { e.dataTransfer.setData('text/plain', item.dataset.id); } catch (err) {}
        });
        item.addEventListener('dragend', () => {
          item.classList.remove('dragging');
          // persist order
          try {
            const order = Array.from(list.querySelectorAll('.player-item')).map(el => Number(el.dataset.id));
            game.players = order.map(id => game.players.find(p => p.id === id));
            Array.from(list.querySelectorAll('.player-item__number')).forEach((n, i) => n.textContent = toEnDigits(i + 1));
            try { this.app.saveGame(); } catch (e) {}
            Storage.saveRoster(game.players.map(p => ({ id: p.id, nameEn: p.nameEn, nameFa: p.nameFa }))); this.toast(t(tr.setup.rosterSaved), 'success');
          } catch (e) {}
        });

        // Touch handlers: use the visible drag-handle for touch-based reordering
        const handle = item.querySelector('.player-item__drag-handle');
        if (handle) {
          let touchDragging = false;
          const onTouchMove = (ev) => {
            if (!touchDragging) return;
            ev.preventDefault();
            const t0 = ev.touches && ev.touches[0];
            if (!t0) return;
            const afterElement = this._getDragAfterElement(list, t0.clientY);
            const dragging = list.querySelector('.dragging');
            if (!dragging) return;
            if (afterElement == null) list.appendChild(dragging);
            else list.insertBefore(dragging, afterElement);
          };

          handle.addEventListener('touchstart', (ev) => {
            ev.stopPropagation();
            touchDragging = true;
            item.classList.add('dragging');
            // prevent page from selecting text/scrolling while dragging
            document.body.style.userSelect = 'none';
            document.addEventListener('touchmove', onTouchMove, { passive: false });
          }, { passive: true });

          handle.addEventListener('touchend', (ev) => {
            if (!touchDragging) return;
            touchDragging = false;
            item.classList.remove('dragging');
            document.body.style.userSelect = '';
            document.removeEventListener('touchmove', onTouchMove);
            // persist order (same as dragend)
            try {
              const order = Array.from(list.querySelectorAll('.player-item')).map(el => Number(el.dataset.id));
              game.players = order.map(id => game.players.find(p => p.id === id));
              Array.from(list.querySelectorAll('.player-item__number')).forEach((n, i) => n.textContent = toEnDigits(i + 1));
              try { this.app.saveGame(); } catch (e) {}
              Storage.saveRoster(game.players.map(p => ({ id: p.id, nameEn: p.nameEn, nameFa: p.nameFa }))); this.toast(t(tr.setup.rosterSaved), 'success');
            } catch (e) {}
          });
        }
      }
      this._updatePlayersCountDisplays();
      try { this.app.saveGame(); } catch (e) {}
      try { Storage.saveRoster(game.players.map(p => ({ id: p.id, nameEn: p.nameEn, nameFa: p.nameFa }))); } catch (e) {}
    };

    // Attach direct listeners but also a delegated click handler on the container
    // Remove previous delegated handler if present to avoid duplicates
    if (this._setupClickHandlerRef) this.container.removeEventListener('click', this._setupClickHandlerRef);
    this._setupClickHandlerRef = (e) => {
      const target = e.target;
      if (!target) return;
      // Add button (works even if DOM was replaced)
      if (target.closest && target.closest('#btn-add-player')) {
        e.preventDefault();
        addPlayer();
        return;
      }
      // Suggested player quick-add
      const sp = target.closest && target.closest('.suggested-player');
      if (sp) {
        const en = sp.dataset.en; const fa = sp.dataset.fa;
        addPlayer({ en, fa });
        return;
      }
      // Remove player button
      if (target.closest && target.closest('.player-item__remove')) {
        const btn = target.closest('.player-item__remove');
        const id = Number(btn.dataset.id);
        if (!Number.isNaN(id)) {
          const item = this.container.querySelector(`.player-item[data-id="${id}"]`);
          if (item) item.remove();
          game.removePlayer(id);
          this._updatePlayersCountDisplays();
          try { this.app.saveGame(); } catch (e) {}
          try { Storage.saveRoster(game.players.map(p => ({ id: p.id, nameEn: p.nameEn, nameFa: p.nameFa }))); this.toast(t(tr.setup.rosterSaved), 'success'); } catch (e) {}
        }
        return;
      }
    };
    this.container.addEventListener('click', this._setupClickHandlerRef);

    if (addBtn) addBtn.addEventListener('click', addPlayer);
    if (input) input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addPlayer();
    });

    // Focus input
    setTimeout(() => input.focus(), 100);

    // Populate suggested players (English + Farsi) — clicking adds the English name
    const suggestedWrap = container.querySelector('.suggested-players .flex');
    if (suggestedWrap) {
      const suggestedPlayers = [
        { en: 'Sadra', fa: 'صدرا' },
        { en: 'Niloofar', fa: 'نیلوفر' },
        { en: 'Pooriya', fa: 'پوریا' },
        { en: 'Matin', fa: 'متین' },
        { en: 'Matineh', fa: 'متینه' },
        { en: 'Ariyan', fa: 'آریان' },
        { en: 'Arvin', fa: 'آروین' },
        { en: 'Ehsan', fa: 'احسان' },
        { en: 'Zahra', fa: 'زهرا' },
        { en: 'Meisam', fa: 'میثم' },
        { en: 'Maryam', fa: 'مریم' },
        { en: 'Mahdyar', fa: 'مهدیار' }
      ];
      const lang = Settings.getLanguage();
      suggestedPlayers.forEach(s => {
        const b = document.createElement('button');
        b.className = 'btn btn--ghost btn--xs suggested-player';
        b.dataset.en = s.en; b.dataset.fa = s.fa;
        // show only the current language to avoid bilingual duplication
        b.innerHTML = lang === 'en' ? (`<span class="ltr-inline">${s.en}</span>`) : (`<span dir="rtl">${s.fa}</span>`);
        b.addEventListener('click', () => {
          addPlayer({ en: s.en, fa: s.fa });
          try { this.toast(lang === 'en' ? s.en : s.fa, 'success'); } catch (e) {}
        });
        suggestedWrap.appendChild(b);
      });
    }

    // Remove players and enable drag on existing items
    const list = container.querySelector('#player-list');
    container.querySelectorAll('.player-item').forEach(item => {
      // remove button
      item.querySelector('.player-item__remove')?.addEventListener('click', () => {
        const id = Number(item.dataset.id);
        game.removePlayer(id);
        item.remove();
        this._updatePlayersCountDisplays();
          try { this.app.saveGame(); } catch (e) {}
          try { Storage.saveRoster(game.players.map(p => ({ id: p.id, nameEn: p.nameEn, nameFa: p.nameFa }))); this.toast(t(tr.setup.rosterSaved), 'success'); } catch (e) {}
      });

      // drag handlers
      item.setAttribute('draggable', 'true');
      item.addEventListener('dragstart', (e) => {
        item.classList.add('dragging');
        try { e.dataTransfer.setData('text/plain', item.dataset.id); } catch (err) {}
      });
      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        try {
          const order = Array.from(list.querySelectorAll('.player-item')).map(el => Number(el.dataset.id));
          game.players = order.map(id => game.players.find(p => p.id === id));
          Array.from(list.querySelectorAll('.player-item__number')).forEach((n, i) => n.textContent = toEnDigits(i + 1));
          try { this.app.saveGame(); } catch (e) {}
          Storage.saveRoster(game.players.map(p => ({ id: p.id, nameEn: p.nameEn, nameFa: p.nameFa }))); this.toast(t(tr.setup.rosterSaved), 'success');
        } catch (e) {}
      });

      // Touch handlers for existing items (use drag-handle if present)
      const handle = item.querySelector('.player-item__drag-handle');
      if (handle) {
        let touchDragging = false;
        const onTouchMove = (ev) => {
          if (!touchDragging) return;
          ev.preventDefault();
          const t0 = ev.touches && ev.touches[0];
          if (!t0) return;
          const afterElement = this._getDragAfterElement(list, t0.clientY);
          const dragging = list.querySelector('.dragging');
          if (!dragging) return;
          if (afterElement == null) list.appendChild(dragging);
          else list.insertBefore(dragging, afterElement);
        };

        handle.addEventListener('touchstart', (ev) => {
          ev.stopPropagation();
          touchDragging = true;
          item.classList.add('dragging');
          document.body.style.userSelect = 'none';
          document.addEventListener('touchmove', onTouchMove, { passive: false });
        }, { passive: true });

        handle.addEventListener('touchend', (ev) => {
          if (!touchDragging) return;
          touchDragging = false;
          item.classList.remove('dragging');
          document.body.style.userSelect = '';
          document.removeEventListener('touchmove', onTouchMove);
          try {
            const order = Array.from(list.querySelectorAll('.player-item')).map(el => Number(el.dataset.id));
            game.players = order.map(id => game.players.find(p => p.id === id));
            Array.from(list.querySelectorAll('.player-item__number')).forEach((n, i) => n.textContent = toEnDigits(i + 1));
            try { this.app.saveGame(); } catch (e) {}
            Storage.saveRoster(game.players.map(p => ({ id: p.id, nameEn: p.nameEn, nameFa: p.nameFa }))); this.toast(t(tr.setup.rosterSaved), 'success');
          } catch (e) {}
        });
      }
    });

    // dragover to reorder
    list?.addEventListener('dragover', (e) => {
      e.preventDefault();
      const afterElement = this._getDragAfterElement(list, e.clientY);
      const dragging = list.querySelector('.dragging');
      if (!dragging) return;
      if (afterElement == null) list.appendChild(dragging);
      else list.insertBefore(dragging, afterElement);
    });
  }



  // ─── Roles Tab ───
  _renderRolesTab(container) {
    const game = this.app.game;
    // show independents first as requested
    const teams = ['independent', 'mafia', 'citizen'];
    const teamNames = { mafia: `🔴 ${t(tr.setup.teamMafia)}`, citizen: `🔵 ${t(tr.setup.teamCitizen)}`, independent: `🧡 ${t(tr.setup.teamIndependent)}` };

    let html = `
      <div class="section">
        <h2 class="section__title">🎭 ${t(tr.setup.selectRolesTitle)}</h2>
        <p class="section__subtitle">
          ${t(tr.setup.playersLabel)} <strong>${game.players.length}</strong> ${t(tr.setup.person)} · 
          ${t(tr.setup.selectedRolesLabel)} <strong id="role-count-display">${game.getTotalRoleCount()}</strong>
          ${game.getTotalRoleCount() !== game.players.length 
            ? `<span style="color: var(--danger)"> ${t(tr.setup.shouldBe).replace('%d', game.players.length)}</span>` 
            : '<span style="color: var(--success)"> ✓</span>'}
          <!-- remaining roles helper -->
          <span id="roles-remaining" style="margin-left:10px; font-weight:600; color: var(--muted);">
            ${(() => {
              const rem = Math.max(0, game.players.length - game.getTotalRoleCount());
              return rem > 0 ? t(tr.setup.remainingRoles).replace('%d', rem) : '';
            })()}
          </span>
        </p>
        <!-- desired counts will appear inline on team headers -->
    `;

    // ensure desired counts initialized
    if (game.computeRecommendedCounts) game.computeRecommendedCounts();

    for (const team of teams) {
      const roles = Roles.getByTeam(team);
      html += `
        <div class="team-header team-header--${team}">
          ${teamNames[team]}
          ${team === 'mafia' || team === 'citizen' ? (`
            <span class="team-controls" style="margin-left: 12px; font-weight: normal; font-size: 0.95rem;">
              <button class="btn btn--ghost btn--xs" id="btn-${team}-dec-roles">−</button>
              <span id="desired-${team}-roles" style="margin: 0 8px;">${team === 'mafia' ? game.desiredMafia : game.desiredCitizen}</span>
              <button class="btn btn--ghost btn--xs" id="btn-${team}-inc-roles">+</button>
            </span>
          `) : ''}
        </div>
        <div class="role-grid mb-lg">
      `;

      for (const role of roles) {
        const count = game.selectedRoles[role.id] || 0;
        const isSelected = count > 0;

        html += `
          <div class="role-card role-card--${team} ${isSelected ? 'selected' : ''}" data-role="${role.id}">
            <button class="role-card__info" data-info="${role.id}" title="${t(tr.setup.roleInfoTooltip)}">i</button>
            <div class="role-card__icon">${role.icon}</div>
            <div class="role-card__name">${role.getLocalizedName()}</div>
            ${role.unique ? '' : `
              <div class="role-card__count">
                <button class="role-card__count-btn" data-action="dec" data-role="${role.id}">−</button>
                <span class="role-card__count-value">${count}</span>
                <button class="role-card__count-btn" data-action="inc" data-role="${role.id}">+</button>
              </div>
            `}
            ${role.id === 'gunner' ? `
              <div class="role-card__bullets" style="margin-top: 6px; font-size: var(--text-xs); width: 100%;">
                <div class="flex gap-sm items-center justify-center mb-sm">
                  ${Settings.getLanguage() === 'en' ? ('<span class="ltr-inline">' + t(tr.setup.gunnerBlankBullets) + '</span>') : ('<span style="min-width: 50px;">' + t(tr.setup.gunnerBlankBullets) + '</span>')}
                  <button class="btn btn--ghost btn--sm" data-action="blank-dec" style="padding: 1px 6px; font-size: var(--text-xs);">−</button>
                  <span class="font-bold" style="min-width: 20px; text-align: center;">${game.gunnerBlankMax}</span>
                  <button class="btn btn--ghost btn--sm" data-action="blank-inc" style="padding: 1px 6px; font-size: var(--text-xs);">+</button>
                </div>
                <div class="flex gap-sm items-center justify-center">
                  ${Settings.getLanguage() === 'en' ? ('<span class="ltr-inline">' + t(tr.setup.gunnerLiveBullets) + '</span>') : ('<span style="min-width: 50px;">' + t(tr.setup.gunnerLiveBullets) + '</span>')}
                  <button class="btn btn--ghost btn--sm" data-action="live-dec" style="padding: 1px 6px; font-size: var(--text-xs);">−</button>
                  <span class="font-bold" style="min-width: 20px; text-align: center;">${game.gunnerLiveMax}</span>
                  <button class="btn btn--ghost btn--sm" data-action="live-inc" style="padding: 1px 6px; font-size: var(--text-xs);">+</button>
                </div>
              </div>
            ` : ''}
            ${role.id === 'freemason' ? `
              <div class="role-card__bullets" style="margin-top: 6px; font-size: var(--text-xs); width: 100%;">
                <div class="flex gap-sm items-center justify-center">
                  ${Settings.getLanguage() === 'en' ? ('<span class="ltr-inline">' + t(tr.setup.framasonAllies) + '</span>') : ('<span style="min-width: 70px;">' + t(tr.setup.framasonAllies) + '</span>')}
                  <button class="btn btn--ghost btn--sm" data-action="ally-dec" style="padding: 1px 6px; font-size: var(--text-xs);">−</button>
                  <span class="font-bold" style="min-width: 20px; text-align: center;">${game.framasonMaxMembers}</span>
                  <button class="btn btn--ghost btn--sm" data-action="ally-inc" style="padding: 1px 6px; font-size: var(--text-xs);">+</button>
                </div>
              </div>
            ` : ''}
            ${role.id === 'negotiator' ? `
              <div class="role-card__bullets" style="margin-top: 6px; font-size: var(--text-xs); width: 100%;">
                <div class="flex gap-sm items-center justify-center">
                  ${Settings.getLanguage() === 'en' ? ('<span class="ltr-inline">' + t(tr.setup.negotiatorThreshold) + '</span>') : ('<span style="min-width: 80px;">' + t(tr.setup.negotiatorThreshold) + '</span>')}
                  <button class="btn btn--ghost btn--sm" data-action="neg-dec" style="padding: 1px 6px; font-size: var(--text-xs);">−</button>
                  <span class="font-bold" style="min-width: 20px; text-align: center;">${game.negotiatorThreshold}</span>
                  <button class="btn btn--ghost btn--sm" data-action="neg-inc" style="padding: 1px 6px; font-size: var(--text-xs);">+</button>
                </div>
              </div>
            ` : ''}
            ${role.id === 'sniper' ? `
              <div class="role-card__bullets" style="margin-top: 6px; font-size: var(--text-xs); width: 100%;">
                <div class="flex gap-sm items-center justify-center">
                  ${Settings.getLanguage() === 'en' ? ('<span class="ltr-inline">' + t(tr.setup.sniperShots) + '</span>') : ('<span style="min-width: 70px;">' + t(tr.setup.sniperShots) + '</span>')}
                  <button class="btn btn--ghost btn--sm" data-action="sniper-dec" style="padding: 1px 6px; font-size: var(--text-xs);">−</button>
                  <span class="font-bold" style="min-width: 20px; text-align: center;">${game.sniperMaxShots}</span>
                  <button class="btn btn--ghost btn--sm" data-action="sniper-inc" style="padding: 1px 6px; font-size: var(--text-xs);">+</button>
                </div>
              </div>
            ` : ''}
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

    // Roles-tab desired mafia +/- handlers (update header and assign spans in-place)
    container.querySelector('#btn-mafia-dec-roles')?.addEventListener('click', (e) => {
      const independents = Object.entries(game.selectedRoles).filter(([id]) => Roles.get(id)?.team === 'independent').reduce((s, [, c]) => s + c, 0);
      const remaining = Math.max(0, game.players.length - independents);
      const newVal = Math.max(0, game.desiredMafia - 1);
      game.setDesiredMafia(Math.min(newVal, remaining));
      const rolesSpan = this.container.querySelector('#desired-mafia-roles');
      if (rolesSpan) rolesSpan.textContent = game.desiredMafia;
      const assignSpan = this.container.querySelector('#desired-mafia');
      if (assignSpan) assignSpan.textContent = game.desiredMafia;
    });
    container.querySelector('#btn-mafia-inc-roles')?.addEventListener('click', (e) => {
      const independents = Object.entries(game.selectedRoles).filter(([id]) => Roles.get(id)?.team === 'independent').reduce((s, [, c]) => s + c, 0);
      const remaining = Math.max(0, game.players.length - independents);
      const newVal = (game.desiredMafia || 0) + 1;
      game.setDesiredMafia(Math.min(newVal, remaining));
      const rolesSpan = this.container.querySelector('#desired-mafia-roles');
      if (rolesSpan) rolesSpan.textContent = game.desiredMafia;
      const assignSpan = this.container.querySelector('#desired-mafia');
      if (assignSpan) assignSpan.textContent = game.desiredMafia;
    });

    // Roles-tab desired citizen +/- handlers (update header and assign spans in-place)
    container.querySelector('#btn-citizen-dec-roles')?.addEventListener('click', (e) => {
      const independents = Object.entries(game.selectedRoles).filter(([id]) => Roles.get(id)?.team === 'independent').reduce((s, [, c]) => s + c, 0);
      const remaining = Math.max(0, game.players.length - independents);
      const newCitizen = Math.max(0, (game.desiredCitizen || 0) - 1);
      const newMafia = Math.max(0, remaining - newCitizen);
      game.setDesiredMafia(newMafia);
      const rolesSpan = this.container.querySelector('#desired-citizen-roles');
      if (rolesSpan) rolesSpan.textContent = game.desiredCitizen;
      const assignSpan = this.container.querySelector('#desired-citizen');
      if (assignSpan) assignSpan.textContent = game.desiredCitizen;
      const mafiaRolesSpan = this.container.querySelector('#desired-mafia-roles');
      if (mafiaRolesSpan) mafiaRolesSpan.textContent = game.desiredMafia;
      const mafiaAssignSpan = this.container.querySelector('#desired-mafia');
      if (mafiaAssignSpan) mafiaAssignSpan.textContent = game.desiredMafia;
    });
    container.querySelector('#btn-citizen-inc-roles')?.addEventListener('click', (e) => {
      const independents = Object.entries(game.selectedRoles).filter(([id]) => Roles.get(id)?.team === 'independent').reduce((s, [, c]) => s + c, 0);
      const remaining = Math.max(0, game.players.length - independents);
      const newCitizen = Math.min(remaining, (game.desiredCitizen || 0) + 1);
      const newMafia = Math.max(0, remaining - newCitizen);
      game.setDesiredMafia(newMafia);
      const rolesSpan = this.container.querySelector('#desired-citizen-roles');
      if (rolesSpan) rolesSpan.textContent = game.desiredCitizen;
      const assignSpan = this.container.querySelector('#desired-citizen');
      if (assignSpan) assignSpan.textContent = game.desiredCitizen;
      const mafiaRolesSpan = this.container.querySelector('#desired-mafia-roles');
      if (mafiaRolesSpan) mafiaRolesSpan.textContent = game.desiredMafia;
      const mafiaAssignSpan = this.container.querySelector('#desired-mafia');
      if (mafiaAssignSpan) mafiaAssignSpan.textContent = game.desiredMafia;
    });

    // Sniper buttons on role card are handled by data-action listeners further down

    // Toggle unique roles — update DOM in-place to avoid full re-render
    container.querySelectorAll('.role-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.role-card__count-btn')) return;
        if (e.target.closest('.role-card__info')) return;
        if (e.target.closest('.role-card__bullets')) return;
        if (e.target.closest('.role-card__allies')) return;
        const roleId = card.dataset.role;
        const role = Roles.get(roleId);
        if (!role) return;

        // Toggle data model with limits
        const selecting = !game.selectedRoles[roleId];
        const totalSelected = game.getTotalRoleCount();
        const playersCount = game.players.length;
        if (selecting) {
          if (totalSelected >= playersCount) {
            this.toast(t(tr.setup.shouldBe).replace('%d', playersCount), 'error');
            return;
          }
          if (role.team === 'mafia') {
            const mafiaCount = Object.entries(game.selectedRoles).filter(([id]) => Roles.get(id)?.team === 'mafia').reduce((s, [, c]) => s + c, 0);
            if (mafiaCount >= game.desiredMafia) {
              this.toast(t(tr.setup.mustChooseMafia).replace('%d', game.desiredMafia), 'error');
              return;
            }
          }
          if (role.team === 'citizen') {
            const citizenCount = Object.entries(game.selectedRoles).filter(([id]) => Roles.get(id)?.team === 'citizen').reduce((s, [, c]) => s + c, 0);
            if (citizenCount >= game.desiredCitizen) {
              this.toast(t(tr.setup.mustChooseCitizen).replace('%d', game.desiredCitizen), 'error');
              return;
            }
          }
          // perform selection
          if (role.unique) game.selectedRoles[roleId] = 1;
          else game.selectedRoles[roleId] = (game.selectedRoles[roleId] || 0) + 1;
        } else {
          // Prevent removing Bodyguard while Zodiac is selected
          if (roleId === 'bodyguard' && game.selectedRoles && game.selectedRoles['zodiac']) {
            this.toast(t(tr.setup.cannotRemoveBodyguardWhenZodiac), 'error');
            return;
          }
          // deselect: remove entirely
          delete game.selectedRoles[roleId];
        }

        // Special rule: if Zodiac is selected, ensure Bodyguard (محافظ) is present
        if (selecting && roleId === 'zodiac') {
          // if bodyguard not already selected, auto-add it
          if (!game.selectedRoles['bodyguard']) {
            game.selectedRoles['bodyguard'] = 1;
            // update the bodyguard card if visible
            const bgCard = this.container.querySelector('.role-card[data-role="bodyguard"]');
            if (bgCard) {
              bgCard.classList.add('selected');
              const val = bgCard.querySelector('.role-card__count-value');
              if (val) val.textContent = 1;
            }
            // inform the user
            this.toast(t(tr.setup.zodiacRequiresBodyguard), 'info');
          }
        }

        // If independent-role selection changed, recompute recommended counts (force overwrite)
        if (role.team === 'independent' && game.computeRecommendedCounts) {
          game.computeRecommendedCounts(true);
        }

        // Update role-card visual state
        const isSelected = !!game.selectedRoles[roleId];
        card.classList.toggle('selected', isSelected);
        const countEl = card.querySelector('.role-card__count-value');
        if (countEl) countEl.textContent = isSelected ? (game.selectedRoles[roleId] || 1) : 0;

        // Update global role count display in Roles tab and Assign tab
        const roleCountDisplay = this.container.querySelector('#role-count-display');
        if (roleCountDisplay) roleCountDisplay.textContent = game.getTotalRoleCount();
        const rolesTabBtn = this.container.querySelector('.tabs [data-tab="roles"]');
        if (rolesTabBtn) rolesTabBtn.innerHTML = `🎭 ${t(tr.setup.rolesTab)} (${game.getTotalRoleCount()})`;

        // Update desired counts in Roles headers (roles tab) and Assign tab
        const desiredMafiaRoles = this.container.querySelector('#desired-mafia-roles');
        if (desiredMafiaRoles) desiredMafiaRoles.textContent = game.desiredMafia;
        const desiredCitizenRoles = this.container.querySelector('#desired-citizen-roles');
        if (desiredCitizenRoles) desiredCitizenRoles.textContent = game.desiredCitizen;
        const desiredMafiaAssign = this.container.querySelector('#desired-mafia');
        if (desiredMafiaAssign) desiredMafiaAssign.textContent = game.desiredMafia;
        const desiredCitizenAssign = this.container.querySelector('#desired-citizen');
        if (desiredCitizenAssign) desiredCitizenAssign.textContent = game.desiredCitizen;
        // refresh remaining roles / counts
        this._updatePlayersCountDisplays();
      });
    });
    // +/- buttons for non-unique roles (in-place, respecting team and total limits)
    container.querySelectorAll('.role-card__count-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const roleId = btn.dataset.role;
        const action = btn.dataset.action;
        const role = Roles.get(roleId);
        if (!role) return;

        const current = game.selectedRoles[roleId] || 0;
        const totalSelected = game.getTotalRoleCount();
        const playersCount = game.players.length;

        if (action === 'inc') {
          // total limit
          if (totalSelected >= playersCount) {
            this.toast(t(tr.setup.shouldBe).replace('%d', playersCount), 'error');
            return;
          }
          // team-specific limits based on desired counts
          if (role.team === 'mafia') {
            const mafiaCount = Object.entries(game.selectedRoles).filter(([id]) => Roles.get(id)?.team === 'mafia').reduce((s, [, c]) => s + c, 0);
            if (mafiaCount >= game.desiredMafia) {
              this.toast(t(tr.setup.mustChooseMafia).replace('%d', game.desiredMafia), 'error');
              return;
            }
          }
          if (role.team === 'citizen') {
            const citizenCount = Object.entries(game.selectedRoles).filter(([id]) => Roles.get(id)?.team === 'citizen').reduce((s, [, c]) => s + c, 0);
            if (citizenCount >= game.desiredCitizen) {
              this.toast(t(tr.setup.mustChooseCitizen).replace('%d', game.desiredCitizen), 'error');
              return;
            }
          }

          game.selectedRoles[roleId] = current + 1;
        } else if (action === 'dec') {
          if (current > 0) {
            const next = current - 1;
            if (next === 0) delete game.selectedRoles[roleId];
            else game.selectedRoles[roleId] = next;
          }
        }

        // update UI in-place
        const countEl = btn.closest('.role-card__count')?.querySelector('.role-card__count-value');
        if (countEl) countEl.textContent = game.selectedRoles[roleId] || 0;
        const roleCountDisplay = this.container.querySelector('#role-count-display');
        if (roleCountDisplay) roleCountDisplay.textContent = game.getTotalRoleCount();
        const rolesTabBtn = this.container.querySelector('.tabs [data-tab="roles"]');
        if (rolesTabBtn) rolesTabBtn.innerHTML = `🎭 ${t(tr.setup.rolesTab)} (${game.getTotalRoleCount()})`;

        // sync Assign desired counts if visible
        const desiredMafiaRoles = this.container.querySelector('#desired-mafia-roles'); if (desiredMafiaRoles) desiredMafiaRoles.textContent = game.desiredMafia;
        const desiredCitizenRoles = this.container.querySelector('#desired-citizen-roles'); if (desiredCitizenRoles) desiredCitizenRoles.textContent = game.desiredCitizen;
        const desiredMafiaAssign = this.container.querySelector('#desired-mafia'); if (desiredMafiaAssign) desiredMafiaAssign.textContent = game.desiredMafia;
        const desiredCitizenAssign = this.container.querySelector('#desired-citizen'); if (desiredCitizenAssign) desiredCitizenAssign.textContent = game.desiredCitizen;

        // enable/disable Assign tab based on totals
        const assignTab = this.container.querySelector('.tabs [data-tab="assign"]');
        if (assignTab) {
          if (game.players.length >= 8 && game.getTotalRoleCount() === game.players.length) assignTab.classList.remove('disabled');
          else assignTab.classList.add('disabled');
        }
        // refresh remaining roles / counts
        this._updatePlayersCountDisplays();
      });
    });
    container.querySelectorAll('[data-action="blank-dec"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (game.gunnerBlankMax > 0) {
          game.gunnerBlankMax--;
          this._updateSiblingValue(btn, game.gunnerBlankMax);
        }
      });
    });
    container.querySelectorAll('[data-action="blank-inc"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (game.gunnerBlankMax < 10) {
          game.gunnerBlankMax++;
          this._updateSiblingValue(btn, game.gunnerBlankMax);
        }
      });
    });
    container.querySelectorAll('[data-action="live-dec"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (game.gunnerLiveMax > 0) { game.gunnerLiveMax--; this._updateSiblingValue(btn, game.gunnerLiveMax); }
      });
    });
    container.querySelectorAll('[data-action="live-inc"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (game.gunnerLiveMax < 10) { game.gunnerLiveMax++; this._updateSiblingValue(btn, game.gunnerLiveMax); }
      });
    });

    // Freemason ally count +/- buttons on role card (update in-place)
    container.querySelectorAll('[data-action="ally-dec"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (game.framasonMaxMembers > 1) {
          game.framasonMaxMembers--;
          this._updateSiblingValue(btn, game.framasonMaxMembers);
        }
      });
    });
    container.querySelectorAll('[data-action="ally-inc"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (game.framasonMaxMembers < 10) {
          game.framasonMaxMembers++;
          this._updateSiblingValue(btn, game.framasonMaxMembers);
        }
      });
    });

    // Negotiator threshold +/- buttons on role card (update in-place)
    container.querySelectorAll('[data-action="neg-dec"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (game.negotiatorThreshold > 1) {
          game.negotiatorThreshold--;
          this._updateSiblingValue(btn, game.negotiatorThreshold);
        }
      });
    });
    container.querySelectorAll('[data-action="neg-inc"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (game.negotiatorThreshold < 10) {
          game.negotiatorThreshold++;
          this._updateSiblingValue(btn, game.negotiatorThreshold);
        }
      });
    });

    // Sniper shot count +/- buttons on role card (update in-place and sync Assign tab)
    container.querySelectorAll('[data-action="sniper-dec"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (game.sniperMaxShots > 1) {
          game.sniperMaxShots--;
          this._updateSiblingValue(btn, game.sniperMaxShots);
        }
      });
    });
    container.querySelectorAll('[data-action="sniper-inc"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (game.sniperMaxShots < 10) {
          game.sniperMaxShots++;
          this._updateSiblingValue(btn, game.sniperMaxShots);
        }
      });
    });
  }

  // ─── Assign Tab ───
  _renderAssignTab(container) {
    const game = this.app.game;
    const errors = game.validateSetup();

    container.innerHTML = `
      <div class="section">
        <h2 class="section__title">🎲 ${t(tr.setup.assignRolesTitle)}</h2>
        
        <!-- Summary -->
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-card__value">${game.players.length}</div>
            <div class="stat-card__label">${t(tr.setup.playerSingular)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__value">${game.getTotalRoleCount()}</div>
            <div class="stat-card__label">${t(tr.setup.roleSingular)}</div>
          </div>
          <div class="stat-card ${game.getTotalRoleCount() === game.players.length ? 'stat-card--citizen' : 'stat-card--mafia'}">
            <div class="stat-card__value">${game.getTotalRoleCount() === game.players.length ? '✓' : '✕'}</div>
            <div class="stat-card__label">${t(tr.setup.matchLabel)}</div>
          </div>
        </div>

        <!-- Selected roles summary -->
        <div class="card mb-lg">
          <div class="font-bold mb-sm">${t(tr.setup.selectedRoles)}:</div>
          <div class="flex" style="flex-wrap: wrap; gap: 6px;">
            ${Object.entries(game.selectedRoles).map(([roleId, count]) => {
              const role = Roles.get(roleId);
              if (!role) return '';
              return `<span class="role-badge role-badge--${role.team}">${role.icon} ${role.getLocalizedName()}${count > 1 ? ` ×${count}` : ''}</span>`;
            }).join('')}
            ${Object.keys(game.selectedRoles).length === 0 ? `<span class="text-muted">${t(tr.setup.noRoleSelected)}</span>` : ''}
          </div>
        </div>

        <!-- Recommended / Desired team counts -->
        ${(() => {
          const rec = game.computeRecommendedCounts();
          return `
          <div class="card mb-lg">
            <div class="font-bold mb-sm">${t(tr.setup.warning)}: ${t(tr.setup.shouldBe).replace('%d', game.players.length)}</div>
            <div class="flex gap-sm items-center">
              <div style="min-width: 180px;">
                ${t(tr.setup.mafia)}: <strong id="desired-mafia">${game.desiredMafia}</strong>
                <div style="font-size: var(--text-xs); color: var(--muted)">(${t(tr.setup.person)})</div>
              </div>
              <!-- removed +/- here to avoid blinking; adjust desired counts in Roles tab -->
              <div style="margin-left: 12px;">
                ${t(tr.setup.citizen)}: <strong id="desired-citizen">${game.desiredCitizen}</strong>
              </div>
              <div style="margin-left: auto; font-size: var(--text-sm); color: var(--muted);">${t(tr.setup.person)}: ${game.players.length} · ${t(tr.setup.independent)}: ${rec.independents}</div>
            </div>
            <div style="font-size: var(--text-xs); color: var(--muted); margin-top: 6px;">${t(tr.setup.shouldBe).replace('%d', game.players.length)}</div>
          </div>
          `;
        })()}

        <!-- Zodiac frequency setting (only if zodiac is selected) -->
        ${game.selectedRoles['zodiac'] ? `
          <div class="card mb-lg" style="border-color: rgba(139,92,246,0.4);">
            <div class="font-bold mb-sm">♈ ${t(tr.setup.zodiacSettings)}</div>
            <div class="flex gap-sm">
              <button class="btn btn--sm ${game.zodiacFrequency === 'every' ? 'btn--primary' : 'btn--ghost'}" data-zodiac-freq="every">${t(tr.setup.everyNight)}</button>
              <button class="btn btn--sm ${game.zodiacFrequency === 'odd' ? 'btn--primary' : 'btn--ghost'}" data-zodiac-freq="odd">${t(tr.setup.oddNights)}</button>
              <button class="btn btn--sm ${game.zodiacFrequency === 'even' ? 'btn--primary' : 'btn--ghost'}" data-zodiac-freq="even">${t(tr.setup.evenNights)}</button>
            </div>
          </div>
        ` : ''}

        ${game.selectedRoles['drWatson'] ? `
          <div class="card mb-lg" style="border-color: rgba(16,185,129,0.4);">
            <div class="font-bold mb-sm">⚕️ ${t(tr.setup.drWatsonSettings)}</div>
            <div class="flex gap-sm items-center">
              <button class="btn btn--sm btn--ghost" id="btn-watson-dec">−</button>
              <span class="font-bold" style="min-width: 30px; text-align: center;">${game.drWatsonSelfHealMax}</span>
              <button class="btn btn--sm btn--ghost" id="btn-watson-inc">+</button>
            </div>
          </div>
        ` : ''}

        ${game.selectedRoles['drLecter'] ? `
          <div class="card mb-lg" style="border-color: rgba(220,38,38,0.4);">
            <div class="font-bold mb-sm">💉 ${t(tr.setup.drLecterSettings)}</div>
            <div class="flex gap-sm items-center">
              <button class="btn btn--sm btn--ghost" id="btn-lecter-dec">−</button>
              <span class="font-bold" style="min-width: 30px; text-align: center;">${game.drLecterSelfHealMax}</span>
              <button class="btn btn--sm btn--ghost" id="btn-lecter-inc">+</button>
            </div>
          </div>
        ` : ''}

        <!-- freemason settings removed from Assign page to avoid duplication and blinking -->

        ${game.selectedRoles['gunner'] ? `
          <div class="card mb-lg" style="border-color: rgba(234,179,8,0.4);">
            <div class="font-bold mb-sm">🔫 ${t(tr.setup.gunnerSettings)}</div>
            <div class="font-bold mb-sm" style="font-size: var(--text-sm);">${t(tr.setup.morningShotImmunity)}</div>
            <div class="flex gap-sm">
              <button class="btn btn--sm ${game.jackMorningShotImmune ? 'btn--primary' : 'btn--ghost'}" id="btn-jack-immune">
                ${t(tr.setup.jackImmune)} ${game.jackMorningShotImmune ? '✓' : ''}
              </button>
              <button class="btn btn--sm ${game.zodiacMorningShotImmune ? 'btn--primary' : 'btn--ghost'}" id="btn-zodiac-immune">
                ${t(tr.setup.zodiacImmune)} ${game.zodiacMorningShotImmune ? '✓' : ''}
              </button>
            </div>
          </div>
        ` : ''}

        <!-- sniper shoots removed from Assign page to avoid duplicate controls and blinking -->

        <!-- Errors -->
        ${errors.length > 0 ? `
          <div class="card mb-lg" style="border-color: var(--danger);">
            ${errors.map(e => `<div style="color: var(--danger); font-size: var(--text-sm); margin-bottom: 4px;">⚠️ ${e}</div>`).join('')}
          </div>
        ` : ''}

        <!-- Actions -->
        <button class="btn btn--primary btn--lg btn--block mb-md" id="btn-random-assign" ${errors.length > 0 ? 'disabled' : ''}>
          🎲 ${t(tr.setup.randomAssignAndStart)}
        </button>
        <button class="btn btn--ghost btn--block" id="btn-back-home-setup">
          ← ${t(tr.setup.backHome)}
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

    // Zodiac frequency selection — update classes in-place to avoid re-render blink
    container.querySelectorAll('[data-zodiac-freq]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        game.zodiacFrequency = btn.dataset.zodiacFreq;
        const parent = btn.parentElement;
        if (parent) {
          parent.querySelectorAll('[data-zodiac-freq]').forEach(b => {
            if (b === btn) { b.classList.add('btn--primary'); b.classList.remove('btn--ghost'); }
            else { b.classList.remove('btn--primary'); b.classList.add('btn--ghost'); }
          });
        }
      });
    });

    // Framason settings removed from Assign tab (use Roles tab to configure)

    // Removed Assign-tab mafia +/- handlers (controls removed from Assign UI)

    // Dr Watson self-heal max (update display in-place)
    container.querySelector('#btn-watson-dec')?.addEventListener('click', (e) => {
      if (game.drWatsonSelfHealMax > 0) { game.drWatsonSelfHealMax--; const span = e.currentTarget.parentElement.querySelector('.font-bold'); if (span) span.textContent = game.drWatsonSelfHealMax; }
    });
    container.querySelector('#btn-watson-inc')?.addEventListener('click', (e) => {
      if (game.drWatsonSelfHealMax < 10) { game.drWatsonSelfHealMax++; const span = e.currentTarget.parentElement.querySelector('.font-bold'); if (span) span.textContent = game.drWatsonSelfHealMax; }
    });

    // Dr Lecter self-heal max (update display in-place)
    container.querySelector('#btn-lecter-dec')?.addEventListener('click', (e) => {
      if (game.drLecterSelfHealMax > 0) { game.drLecterSelfHealMax--; const span = e.currentTarget.parentElement.querySelector('.font-bold'); if (span) span.textContent = game.drLecterSelfHealMax; }
    });
    container.querySelector('#btn-lecter-inc')?.addEventListener('click', (e) => {
      if (game.drLecterSelfHealMax < 10) { game.drLecterSelfHealMax++; const span = e.currentTarget.parentElement.querySelector('.font-bold'); if (span) span.textContent = game.drLecterSelfHealMax; }
    });

    // Jack/Zodiac morning shot immunity toggles — update button state in-place
    container.querySelector('#btn-jack-immune')?.addEventListener('click', (e) => {
      game.jackMorningShotImmune = !game.jackMorningShotImmune;
      const btn = e.currentTarget;
      if (game.jackMorningShotImmune) { btn.classList.add('btn--primary'); btn.classList.remove('btn--ghost'); btn.textContent = `${t(tr.setup.jackImmune)} ✓`; }
      else { btn.classList.remove('btn--primary'); btn.classList.add('btn--ghost'); btn.textContent = `${t(tr.setup.jackImmune)}`; }
    });
    container.querySelector('#btn-zodiac-immune')?.addEventListener('click', (e) => {
      game.zodiacMorningShotImmune = !game.zodiacMorningShotImmune;
      const btn = e.currentTarget;
      if (game.zodiacMorningShotImmune) { btn.classList.add('btn--primary'); btn.classList.remove('btn--ghost'); btn.textContent = `${t(tr.setup.zodiacImmune)} ✓`; }
      else { btn.classList.remove('btn--primary'); btn.classList.add('btn--ghost'); btn.textContent = `${t(tr.setup.zodiacImmune)}`; }
    });

    // Sniper assign controls removed (sniper shoots now configured in Roles tab only)
  }

  /** Show role description popup (triggered by long press) */
  _showRoleDescription(role) {
    // Haptic feedback if available
    if (navigator.vibrate) navigator.vibrate(30);

    const teamNames = { mafia: t(tr.setup.teamMafia), citizen: t(tr.setup.teamCitizen), independent: t(tr.setup.teamIndependent) };

    const overlay = document.createElement('div');
    overlay.className = 'role-tooltip-overlay';
    overlay.innerHTML = `
      <div class="role-tooltip">
        <div class="role-tooltip__icon">${role.icon}</div>
        <div class="role-tooltip__name">${role.getLocalizedName()}</div>
        <div class="role-tooltip__team role-tooltip__team--${role.team}">${teamNames[role.team]}</div>
        <div class="role-tooltip__desc">${role.getLocalizedDescription()}</div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Close on tap anywhere
    overlay.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('touchend', () => overlay.remove());
  }
}
