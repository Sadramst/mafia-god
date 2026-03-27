/**
 * HomeView.js — Welcome / Home screen
 */
import { BaseView } from './BaseView.js';
import { Roles } from '../models/Roles.js';
import { Storage } from '../utils/Storage.js';
import { Settings, Language } from '../utils/Settings.js';
import { t, translations as tr, toEnDigits } from '../utils/i18n.js';

export class HomeView extends BaseView {

  render() {
    const hasSave = Storage.hasSave();

    this.container.innerHTML = `
      <div class="view hero">
        <div class="hero__icon">🎭</div>
        <h1 class="hero__title">${t(tr.home.title)}</h1>
        <p class="hero__subtitle">
          ${t(tr.home.subtitle)}
          <br>${t(tr.home.subtitle2)}
        </p>
        <div class="hero__actions">
          <button class="btn btn--accent btn--lg btn--block" id="btn-new-game">
            🎮 ${t(tr.home.newGame)}
          </button>
          ${hasSave ? `
            <button class="btn btn--secondary btn--block" id="btn-continue">
              ▶️ ${t(tr.home.continueGame)}
            </button>
          ` : ''}
          <button class="btn btn--ghost btn--block" id="btn-history">
            📊 ${t(tr.home.history)}
          </button>
          <button class="btn btn--ghost btn--block" id="btn-settings">
            ⚙️ ${t(tr.home.settings)}
          </button>
        </div>
      </div>
    `;

    this.listen('#btn-new-game', 'click', () => this._startNewGame(hasSave));
    this.listen('#btn-continue', 'click', () => this._continueGame());
    this.listen('#btn-history', 'click', () => this._showHistory());
    this.listen('#btn-settings', 'click', () => this._showSettings());

    if (this.app && this.app._rosterLoaded && this.game.players.length > 0) {
      this.toast(t(tr.setup.rosterLoaded).replace('%d', this.game.players.length), 'info');
      this.app._rosterLoaded = false;
    }
  }

  _startNewGame(hasSave) {
    const start = () => {
      this.game.reset();
      this._loadRoster();
      this.navigate('setup');
    };
    if (hasSave) {
      this.confirm(t(tr.home.newGameConfirm), t(tr.home.newGameMessage), () => { Storage.deleteSave(); start(); });
    } else {
      start();
    }
  }

  _loadRoster() {
    const roster = Storage.loadRoster();
    if (!roster?.length) return;
    roster.forEach(r => {
      if (r.nameEn || r.nameFa) this.game.addPlayer({ en: r.nameEn || r.name, fa: r.nameFa || r.name });
      else this.game.addPlayer(r.name || r);
    });
  }

  _continueGame() {
    const saved = Storage.loadGame();
    if (!saved) return;
    this.game.loadFromJSON(saved);
    const phase = this.game.phase;
    if (phase === 'night') this.navigate('night');
    else if (phase === 'day') this.navigate('day');
    else if (phase === 'ended') this.navigate('summary');
    else this.navigate('setup');
  }

  _showHistory() {
    const history = Storage.getHistory();

    if (history.length === 0) {
      this.container.innerHTML = `
        <div class="view">
          <button class="btn btn--ghost mb-lg" id="btn-back-home">→ ${t(tr.common.back)}</button>
          <div class="empty-state">
            <div class="empty-state__icon">📭</div>
            <div class="empty-state__text">${t(tr.home.noHistory)}</div>
          </div>
        </div>
      `;
    } else {
      this.container.innerHTML = `
        <div class="view">
          <button class="btn btn--ghost mb-lg" id="btn-back-home">→ ${t(tr.common.back)}</button>
          <div class="section">
            <h2 class="section__title">📊 ${t(tr.home.historyTitle)}</h2>
            <div class="player-list">
              ${history.map((g, idx) => `
                <div class="card mb-sm history-item" data-history-index="${idx}" role="button" tabindex="0">
                  <div class="flex justify-between items-center mb-sm">
                    <span class="font-bold">${g.winner === 'mafia' ? `🔴 ${t(tr.home.mafiaWon)}` : g.winner === 'citizen' ? `🔵 ${t(tr.home.citizenWon)}` : `🟣 ${t(tr.home.independentWon)}`}</span>
                    <span class="text-muted text-sm">${new Date(g.date).toLocaleString()}</span>
                  </div>
                  <div class="text-secondary" style="font-size: var(--text-sm)">
                    ${toEnDigits(g.playerCount)} ${t(tr.home.players)} · ${toEnDigits(g.rounds)} ${t(tr.home.rounds)}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }

    this.listen('#btn-back-home', 'click', () => this.render());
    this.delegate('click', '.history-item', (_e, el) => {
      this._showHistoryDetail(Number(el.dataset.historyIndex));
    });
  }

  /** Show detailed timeline for a selected history snapshot */
  _showHistoryDetail(index) {
    const history = Storage.getHistory();
    const g = history[index];
    if (!g) return;

    // Build timeline HTML from saved snapshot (use saved history array if present)
    const events = g.history || [];
    const players = g.players || [];

    // Helper to safely escape HTML when injecting raw JSON into modal
    const escapeHtml = (s) => String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const title = `📜 ${t(tr.home.historyTitle)} — ${new Date(g.date).toLocaleString()}`;

    const playersHtml = players.map((p, idx) => {
      const role = Roles.get(p.roleId);
      const roleName = role ? role.getLocalizedName() : p.roleId || '—';
      const roleIcon = role?.icon || '';
      const roleDesc = role ? role.getLocalizedDescription() : '';
      return `
        <div class="player-item ${p.isAlive ? '' : 'player-item--dead'}" style="display:flex; align-items:flex-start; gap:12px; padding:8px 0;">
          <span style="width:10px; height:10px; border-radius:50%; background:${p.isAlive ? 'var(--success)' : 'var(--text-muted)'}; display:inline-block; margin-top:6px;"></span>
          <div style="flex:1;">
            <div style="font-weight:700; display:flex; justify-content:space-between; align-items:center; gap:8px;">
              <div>${p.name}</div>
              <button class="btn btn--ghost btn--sm btn-toggle-role" data-player-idx="${idx}">${t(tr.summary.viewRole)}</button>
            </div>
            <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:6px;">${roleIcon} ${roleName}</div>
            <div class="role-desc" data-player-idx="${idx}" style="display:none; margin-top:8px; color:var(--text); font-size:0.9rem; white-space:pre-wrap;">${roleDesc}</div>
          </div>
        </div>
      `;
    }).join('');

    // Format an individual saved history event into readable text.
    const formatEvent = (h) => {
      if (!h) return '';
      if (h.text && h.text.length) return h.text;

      // Try to use translation template if available
      const key = h.type;
      const tmpl = tr.history && tr.history[key];
      if (tmpl) {
        let s = t(tmpl);
        // Collect possible replacement values in a sensible order
        const replacements = [];
        if (Array.isArray(h.params)) replacements.push(...h.params);
        ['actor','target','name','role','reason','code','count','who'].forEach(k => { if (h[k] !== undefined && h[k] !== null) replacements.push(h[k]); });
        // Replace %s and %d sequentially
        let i = 0;
        s = s.replace(/%[sd]/g, () => {
          const val = replacements[i++];
          return val !== undefined ? String(val) : '—';
        });
        return s;
      }

      // Generic structured fallback
      const parts = [];
      if (h.type) parts.push(`${t(tr.summary.eventType)}: ${h.type}`);
      if (h.actor) parts.push(`${t(tr.summary.actor)}: ${h.actor}`);
      if (h.target) parts.push(`${t(tr.summary.target)}: ${h.target}`);
      if (h.extra) parts.push(JSON.stringify(h.extra));
      return parts.join(' — ') || JSON.stringify(h);
    };

    const eventsHtml = events.map(h => {
      const when = h.timestamp ? new Date(h.timestamp).toLocaleString() : '';
      const phaseLabel = h.phase ? ` (${h.phase})` : '';
      const text = formatEvent(h);
      return `
      <div style="margin-bottom:10px;">
        <div style="font-weight:700;">${t(tr.summary.roundInTimeline).replace('%d', h.round)}${phaseLabel} <span style="font-weight:400; color:var(--text-secondary);">${when}</span></div>
        <div style="color:var(--text-secondary);">${text}</div>
      </div>
    `;
    }).join('');

    const body = `
      <div style="max-height:70vh; overflow:auto; text-align: left;">
        <div style="display:flex; gap:16px; margin-bottom:12px; align-items:center; justify-content:space-between;">
          <div style="font-weight:700;">${g.winner === 'mafia' ? `🔴 ${t(tr.home.mafiaWon)}` : g.winner === 'citizen' ? `🔵 ${t(tr.home.citizenWon)}` : `🟣 ${t(tr.home.independentWon)}`}</div>
          <div style="color:var(--text-secondary);">${new Date(g.date).toLocaleString()}</div>
        </div>
        <div style="margin-bottom:12px; font-weight:600;">${t(tr.home.players)}: ${toEnDigits(g.playerCount)} · ${t(tr.home.rounds)}: ${toEnDigits(g.rounds)}</div>

        <div style="margin-bottom:16px;">
          <h3 style="margin-bottom:8px; font-size:1rem;">👥 ${t(tr.summary.finalPlayerStatus)}</h3>
          <div>${playersHtml}</div>
        </div>

        <div>
          <h3 style="margin-bottom:8px; font-size:1rem;">📜 ${t(tr.summary.timeline)}</h3>
          <div>${eventsHtml || `<div class="text-secondary" style="font-size:0.95rem; margin-bottom:8px;">${t(tr.summary.noEvents)}</div>`}</div>
          <div style="margin-top:12px; display:flex; gap:8px; align-items:center;">
            <button class="btn btn--ghost btn--sm" id="btn-show-raw">📁 ${t(tr.summary.viewRaw)}</button>
            <button class="btn btn--ghost btn--sm" id="btn-open-snapshot">📂 ${t(tr.home.openSnapshot)}</button>
          </div>
          <pre id="history-raw" style="display:none; margin-top:8px; background:var(--panel); padding:12px; border-radius:8px; overflow:auto; white-space:pre-wrap;">${escapeHtml(JSON.stringify(g, null, 2))}</pre>
        </div>
      </div>
    `;

    this.app.showModal(title, body, null, t(tr.common.close));

    // Bind toggle handlers for role description expand/collapse inside modal
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) {
      overlay.querySelectorAll('.btn-toggle-role').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = btn.dataset.playerIdx;
          const desc = overlay.querySelector(`.role-desc[data-player-idx="${idx}"]`);
          if (!desc) return;
          const isHidden = desc.style.display === 'none' || !desc.style.display;
          desc.style.display = isHidden ? 'block' : 'none';
          btn.textContent = isHidden ? t(tr.summary.hideRole) : t(tr.summary.viewRole);
        });
      });
    }

    // Bind raw JSON toggle
    const rawBtn = document.querySelector('.modal-overlay #btn-show-raw');
    if (rawBtn) {
        rawBtn.addEventListener('click', () => {
        const pre = document.querySelector('.modal-overlay #history-raw');
        if (!pre) return;
        pre.style.display = pre.style.display === 'none' || !pre.style.display ? 'block' : 'none';
        rawBtn.textContent = pre.style.display === 'block' ? `📁 ${t(tr.summary.hideRaw)}` : `📁 ${t(tr.summary.viewRaw)}`;
      });
    }

    // Bind open snapshot button (renders full summary view from saved snapshot)
    const openBtn = document.querySelector('.modal-overlay #btn-open-snapshot');
    if (openBtn) {
      openBtn.addEventListener('click', () => {
        this.confirm(t(tr.home.openSnapshot), t(tr.home.openSnapshotConfirm), () => {
          // Set app preview and navigate to summary; SummaryView will render preview if present
          this.app._historyPreview = g;
          this.app.navigate('summary');
        }, t(tr.common.confirm), t(tr.common.cancel));
      });
    }
  }

  _showSettings() {
    const currentLang = Settings.getLanguage();

    this.container.innerHTML = `
      <div class="view">
        <button class="btn btn--ghost mb-lg" id="btn-back-home">→ ${t(tr.common.back)}</button>
        <div class="section">
          <h2 class="section__title">⚙️ ${t(tr.settings.title)}</h2>
          
          <div class="card mb-md">
            <h3 class="mb-sm" style="font-size: var(--text-md); font-weight: 600;">🌐 ${t(tr.settings.languageTitle)}</h3>
            <p class="text-muted mb-md" style="font-size: var(--text-sm);">
              ${t(tr.settings.languageDescription)}
            </p>
            
            <div class="radio-group">
              <label class="radio-option ${currentLang === Language.FARSI ? 'radio-option--active' : ''}">
                <input type="radio" name="language" value="${Language.FARSI}" ${currentLang === Language.FARSI ? 'checked' : ''}>
                <span class="radio-option__label">
                  <span class="radio-option__title">🇮🇷 ${t(tr.settings.farsi)}</span>
                  <span class="radio-option__desc">${t(tr.settings.farsiDesc)}</span>
                </span>
              </label>
              
              <label class="radio-option ${currentLang === Language.ENGLISH ? 'radio-option--active' : ''}">
                <input type="radio" name="language" value="${Language.ENGLISH}" ${currentLang === Language.ENGLISH ? 'checked' : ''}>
                <span class="radio-option__label">
                  <span class="radio-option__title">🇬🇧 ${t(tr.settings.english)}</span>
                  <span class="radio-option__desc">${t(tr.settings.englishDesc)}</span>
                </span>
              </label>
              
              <!-- BOTH option removed; default is English -->
            </div>
          </div>

          <button class="btn btn--primary btn--block" id="btn-save-settings">✓ ${t(tr.settings.save)}</button>

          <button class="btn btn--accent btn--block mt-md" id="btn-rulebook">${t(tr.rulebook.btnLabel)}</button>
        </div>
      </div>
    `;

    this.listen('#btn-back-home', 'click', () => this.render());
    this.listen('#btn-rulebook', 'click', () => this._showRulebook());

    this.delegate('change', 'input[name="language"]', (e) => {
      this.$$('.radio-option').forEach(opt => opt.classList.remove('radio-option--active'));
      e.target.closest('.radio-option')?.classList.add('radio-option--active');
    });

    this.listen('#btn-save-settings', 'click', () => {
      const selected = this.$('input[name="language"]:checked')?.value;
      if (selected) {
        Settings.setLanguage(selected);
        if (typeof this.app.onLanguageChange === 'function') this.app.onLanguageChange();
        this.toast(t(tr.settings.saved), 'success');
        this.render();
      }
    });

    // Clear roster control
    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn btn--ghost btn--block mt-md';
    clearBtn.textContent = t(tr.setup.clearRosterConfirm);
    const section = this.container.querySelector('.section');
    if (section) section.appendChild(clearBtn);
    clearBtn.addEventListener('click', () => {
      this.confirm(t(tr.setup.clearRosterConfirm), '', () => {
        Storage.deleteRoster();
        this.toast(t(tr.setup.clearRosterCleared), 'success');
      });
    });
  }

  _showRulebook() {
    const rb = tr.rulebook;
    const sectionKeys = ['overview', 'victory', 'phases', 'nightOrder', 'dayRules', 'mafiaRoles', 'citizenRoles', 'independentRoles', 'specialMechanics', 'lastActionCards', 'setupRules'];

    const tocHtml = sectionKeys.map((key, i) => {
      const sec = rb[key];
      return `<a class="rulebook-toc__item" href="#rb-${key}">${t(sec.title)}</a>`;
    }).join('');

    const sectionsHtml = sectionKeys.map(key => {
      const sec = rb[key];
      const body = t(sec.body).replace(/\n/g, '<br>');
      return `
        <div class="rulebook-section" id="rb-${key}">
          <h3 class="rulebook-section__title">${t(sec.title)}</h3>
          <div class="rulebook-section__body">${body}</div>
        </div>`;
    }).join('');

    this.container.innerHTML = `
      <div class="view rulebook-view">
        <button class="btn btn--ghost mb-md" id="btn-back-settings">→ ${t(tr.common.back)}</button>
        <h2 class="rulebook-header">${t(rb.title)}</h2>
        <nav class="rulebook-toc">${tocHtml}</nav>
        ${sectionsHtml}
        <button class="btn btn--ghost btn--block mt-lg" id="btn-back-settings-bottom">→ ${t(tr.common.back)}</button>
      </div>
    `;

    this.listen('#btn-back-settings', 'click', () => this._showSettings());
    this.listen('#btn-back-settings-bottom', 'click', () => this._showSettings());

    // Smooth scroll for TOC links
    this.delegate('click', '.rulebook-toc__item', (e) => {
      e.preventDefault();
      const targetId = e.target.getAttribute('href')?.slice(1);
      if (targetId) {
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }
}
