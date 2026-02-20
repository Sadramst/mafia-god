/**
 * SetupView.js — Player entry + Role selection + Assignment
 */
import { BaseView } from './BaseView.js';
import { Roles } from '../models/Roles.js';
import { t, translations as tr, toEnDigits } from '../utils/i18n.js';
import { Settings } from '../utils/Settings.js';

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
            👥 ${t(tr.setup.playersTab)} (${game.players.length})
          </button>
          <button class="tab ${this.activeTab === 'roles' ? 'active' : ''} ${game.players.length < 8 ? 'disabled' : ''}" data-tab="roles">
            🎭 ${t(tr.setup.rolesTab)} (${game.getTotalRoleCount()})
          </button>
          <button class="tab ${this.activeTab === 'assign' ? 'active' : ''} ${game.players.length < 8 ? 'disabled' : ''}" data-tab="assign">
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
        <h2 class="section__title">👥 ${t(tr.setup.playersTitle)}</h2>
        <p class="section__subtitle">${t(tr.setup.playersSubtitle)}</p>
        
        <div class="input-group">
          <input type="text" class="input" id="player-name-input" 
                 placeholder="${t(tr.setup.playerName)}" maxlength="20"
                 autocomplete="off" enterkeyhint="done">
          <button class="btn btn--primary" id="btn-add-player">
            ${t(tr.setup.addButton)}
          </button>
        </div>

        <div class="player-list" id="player-list">
          ${game.players.length === 0 ? `
            <div class="empty-state">
              <div class="empty-state__icon">👻</div>
              <div class="empty-state__text">${t(tr.setup.noPlayersYet)}</div>
            </div>
          ` : game.players.map((p, i) => `
            <div class="player-item" style="animation-delay: ${i * 50}ms">
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

    const addPlayer = () => {
      const name = input.value.trim();
      if (!name) return;
      // Check duplicates
      if (game.players.some(p => p.name === name)) {
        this.toast(t(tr.setup.playerExists), 'error');
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

    // Roles-tab desired mafia +/- handlers
    container.querySelector('#btn-mafia-dec-roles')?.addEventListener('click', () => {
      const independents = Object.entries(game.selectedRoles).filter(([id]) => Roles.get(id)?.team === 'independent').reduce((s, [, c]) => s + c, 0);
      const remaining = Math.max(0, game.players.length - independents);
      const newVal = Math.max(0, game.desiredMafia - 1);
      game.setDesiredMafia(Math.min(newVal, remaining));
      this.render();
    });
    container.querySelector('#btn-mafia-inc-roles')?.addEventListener('click', () => {
      const independents = Object.entries(game.selectedRoles).filter(([id]) => Roles.get(id)?.team === 'independent').reduce((s, [, c]) => s + c, 0);
      const remaining = Math.max(0, game.players.length - independents);
      const newVal = (game.desiredMafia || 0) + 1;
      game.setDesiredMafia(Math.min(newVal, remaining));
      this.render();
    });

    // Roles-tab desired citizen +/- handlers
    container.querySelector('#btn-citizen-dec-roles')?.addEventListener('click', () => {
      const independents = Object.entries(game.selectedRoles).filter(([id]) => Roles.get(id)?.team === 'independent').reduce((s, [, c]) => s + c, 0);
      const remaining = Math.max(0, game.players.length - independents);
      const newCitizen = Math.max(0, (game.desiredCitizen || 0) - 1);
      const newMafia = Math.max(0, remaining - newCitizen);
      game.setDesiredMafia(newMafia);
      this.render();
    });
    container.querySelector('#btn-citizen-inc-roles')?.addEventListener('click', () => {
      const independents = Object.entries(game.selectedRoles).filter(([id]) => Roles.get(id)?.team === 'independent').reduce((s, [, c]) => s + c, 0);
      const remaining = Math.max(0, game.players.length - independents);
      const newCitizen = Math.min(remaining, (game.desiredCitizen || 0) + 1);
      const newMafia = Math.max(0, remaining - newCitizen);
      game.setDesiredMafia(newMafia);
      this.render();
    });

    // Sniper buttons on role card are handled by data-action listeners further down

    // Toggle unique roles
    container.querySelectorAll('.role-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.role-card__count-btn')) return;
        if (e.target.closest('.role-card__info')) return;
        if (e.target.closest('.role-card__bullets')) return;
        if (e.target.closest('.role-card__allies')) return;
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

        // If independent-role selection changed, recompute recommended counts (force overwrite)
        if (role.team === 'independent' && game.computeRecommendedCounts) {
          game.computeRecommendedCounts(true);
        }

        this.render();
      });
    });
    container.querySelectorAll('[data-action="blank-dec"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (game.gunnerBlankMax > 0) { game.gunnerBlankMax--; this.render(); }
      });
    });
    container.querySelectorAll('[data-action="blank-inc"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (game.gunnerBlankMax < 10) { game.gunnerBlankMax++; this.render(); }
      });
    });
    container.querySelectorAll('[data-action="live-dec"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (game.gunnerLiveMax > 0) { game.gunnerLiveMax--; this.render(); }
      });
    });
    container.querySelectorAll('[data-action="live-inc"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (game.gunnerLiveMax < 10) { game.gunnerLiveMax++; this.render(); }
      });
    });

    // Freemason ally count +/- buttons on role card
    container.querySelectorAll('[data-action="ally-dec"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (game.framasonMaxMembers > 1) { game.framasonMaxMembers--; this.render(); }
      });
    });
    container.querySelectorAll('[data-action="ally-inc"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (game.framasonMaxMembers < 10) { game.framasonMaxMembers++; this.render(); }
      });
    });

    // Negotiator threshold +/- buttons on role card
    container.querySelectorAll('[data-action="neg-dec"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (game.negotiatorThreshold > 1) { game.negotiatorThreshold--; this.render(); }
      });
    });
    container.querySelectorAll('[data-action="neg-inc"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (game.negotiatorThreshold < 10) { game.negotiatorThreshold++; this.render(); }
      });
    });

    // Sniper shot count +/- buttons on role card
    container.querySelectorAll('[data-action="sniper-dec"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (game.sniperMaxShots > 1) { game.sniperMaxShots--; this.render(); }
      });
    });
    container.querySelectorAll('[data-action="sniper-inc"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (game.sniperMaxShots < 10) { game.sniperMaxShots++; this.render(); }
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
              <div class="flex items-center gap-sm">
                <button class="btn btn--ghost btn--sm" id="btn-mafia-dec">−</button>
                <button class="btn btn--ghost btn--sm" id="btn-mafia-inc">+</button>
              </div>
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

        ${game.selectedRoles['freemason'] ? `
          <div class="card mb-lg" style="border-color: rgba(239,68,68,0.4);">
            <div class="font-bold mb-sm">🔺 ${t(tr.setup.freemasonSettings)}</div>
            <div class="flex gap-sm items-center">
              <button class="btn btn--sm btn--ghost" id="btn-framason-dec">−</button>
              <span class="font-bold" style="min-width: 30px; text-align: center;">${game.framasonMaxMembers}</span>
              <button class="btn btn--sm btn--ghost" id="btn-framason-inc">+</button>
            </div>
          </div>
        ` : ''}

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

        ${game.selectedRoles['sniper'] ? `
          <div class="card mb-lg" style="border-color: rgba(99,102,241,0.4);">
            <div class="font-bold mb-sm">🎯 ${t(tr.setup.sniperShots)}</div>
            <div class="flex gap-sm items-center">
              <button class="btn btn--sm btn--ghost" id="btn-sniper-dec-assign">−</button>
              <span class="font-bold" style="min-width: 30px; text-align: center;">${game.sniperMaxShots}</span>
              <button class="btn btn--sm btn--ghost" id="btn-sniper-inc-assign">+</button>
            </div>
          </div>
        ` : ''}

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

    // Zodiac frequency selection
    container.querySelectorAll('[data-zodiac-freq]').forEach(btn => {
      btn.addEventListener('click', () => {
        game.zodiacFrequency = btn.dataset.zodiacFreq;
        this.render();
      });
    });

    // Framason max members
    container.querySelector('#btn-framason-dec')?.addEventListener('click', () => {
      if (game.framasonMaxMembers > 1) {
        game.framasonMaxMembers--;
        this.render();
      }
    });
    container.querySelector('#btn-framason-inc')?.addEventListener('click', () => {
      if (game.framasonMaxMembers < 6) {
        game.framasonMaxMembers++;
        this.render();
      }
    });

    // Desired mafia +/- controls
    container.querySelector('#btn-mafia-dec')?.addEventListener('click', () => {
      const remaining = Math.max(0, game.players.length - (Object.entries(game.selectedRoles).filter(([id]) => Roles.get(id)?.team === 'independent').reduce((s, [, c]) => s + c, 0)));
      const newVal = Math.max(0, game.desiredMafia - 1);
      game.setDesiredMafia(Math.min(newVal, remaining));
      this.render();
    });
    container.querySelector('#btn-mafia-inc')?.addEventListener('click', () => {
      const remaining = Math.max(0, game.players.length - (Object.entries(game.selectedRoles).filter(([id]) => Roles.get(id)?.team === 'independent').reduce((s, [, c]) => s + c, 0)));
      const newVal = game.desiredMafia + 1;
      game.setDesiredMafia(Math.min(newVal, remaining));
      this.render();
    });

    // Dr Watson self-heal max
    container.querySelector('#btn-watson-dec')?.addEventListener('click', () => {
      if (game.drWatsonSelfHealMax > 0) { game.drWatsonSelfHealMax--; this.render(); }
    });
    container.querySelector('#btn-watson-inc')?.addEventListener('click', () => {
      if (game.drWatsonSelfHealMax < 10) { game.drWatsonSelfHealMax++; this.render(); }
    });

    // Dr Lecter self-heal max
    container.querySelector('#btn-lecter-dec')?.addEventListener('click', () => {
      if (game.drLecterSelfHealMax > 0) { game.drLecterSelfHealMax--; this.render(); }
    });
    container.querySelector('#btn-lecter-inc')?.addEventListener('click', () => {
      if (game.drLecterSelfHealMax < 10) { game.drLecterSelfHealMax++; this.render(); }
    });

    // Jack/Zodiac morning shot immunity toggles
    container.querySelector('#btn-jack-immune')?.addEventListener('click', () => {
      game.jackMorningShotImmune = !game.jackMorningShotImmune;
      this.render();
    });
    container.querySelector('#btn-zodiac-immune')?.addEventListener('click', () => {
      game.zodiacMorningShotImmune = !game.zodiacMorningShotImmune;
      this.render();
    });

    // Sniper shots adjust in Assign tab
    container.querySelector('#btn-sniper-dec-assign')?.addEventListener('click', () => {
      if (game.sniperMaxShots > 1) { game.sniperMaxShots--; this.render(); }
    });
    container.querySelector('#btn-sniper-inc-assign')?.addEventListener('click', () => {
      if (game.sniperMaxShots < 10) { game.sniperMaxShots++; this.render(); }
    });
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
