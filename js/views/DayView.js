/**
 * DayView.js — Day phase: night results, discussion timer, voting
 */
import { BaseView } from './BaseView.js';
import { Roles } from '../models/Roles.js';
import { Timer } from '../utils/Timer.js';
import { t, translations as tr } from '../utils/i18n.js';
import { Settings, Language } from '../utils/Settings.js';

export class DayView extends BaseView {

  constructor(container, app) {
    super(container, app);
    this.showGodTools = false;
    this.subView = 'results'; // results | discussion | siesta | voting | defense
    this.timer = null;
    this.timerDisplay = '01:00';
    this.timerProgress = 100;
    this.votingTarget = null; // Player being voted on
    this.votedPlayers = {}; // { playerId: [voterIds] } (legacy - not used in simplified voting)
    this.voteCounts = {}; // { playerId: number } — numeric votes per player for first stage
    this.votingPhase = 'first'; // 'first' | 'second'
    this.runoffCandidates = []; // players who passed threshold
    this.runoffVoteCounts = {}; // numeric votes for runoff stage
    this.siestaStep = 'guardian'; // 'guardian' | 'guardian_guess' | 'target' | 'result'
    this.siestaGuess = null; // 1–4 password guess
    this.siestaResultData = null; // { result, guardianId?, targetId? }
    // Morning shooting state
    this.morningShootActive = false;   // Is the shooting panel open?
    this.morningShooterId = null;      // Which bullet holder is shooting?
    this.morningShootTargetId = null;  // Selected target
    this.morningShootResult = null;    // Result of the shot
    // delegated click handler bound to container to avoid missing listeners after render
    this._onContainerClick = (e) => {
      const btn = e.target.closest && e.target.closest('#btn-toggle-godtools');
      if (!btn) return;
      console.log('DayView: God Tools toggle clicked (delegated)');
      this.showGodTools = !this.showGodTools;

      // Try to toggle dashboard without re-rendering whole view to avoid blink
      const content = this.container.querySelector('#day-content');
      if (!content) {
        // not rendered yet — fallback to full render
        this.render();
        return;
      }

      let godEl = content.querySelector('#god-tools-container');
      if (godEl) {
        godEl.style.display = this.showGodTools ? '' : 'none';
        if (this.showGodTools) {
          try { godEl.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
        }
        return;
      }

      if (this.showGodTools) {
        // create and insert god tools container without re-rendering the whole view
        godEl = document.createElement('div');
        godEl.id = 'god-tools-container';
        godEl.style.outline = '2px dashed magenta';
        // insert before subview if present
        const subviewEl = content.querySelector('#day-subview');
        if (subviewEl) content.insertBefore(godEl, subviewEl);
        else content.appendChild(godEl);
        // render into the new container
        try { this._renderGodTools(godEl); } catch (err) { console.error('DayView: _renderGodTools failed', err); }
        try { godEl.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
      }
    };
    this.container?.addEventListener('click', this._onContainerClick);
  }

  render() {
    const game = this.game;
    const counts = game.getTeamCounts();
    const isBlindDay = game.phase === 'blindDay';

    // Blind day: simple timer, no tabs
    if (isBlindDay) {
      this._renderBlindDay(counts);
      return;
    }

    this.container.innerHTML = `
      <div class="view">
        <!-- Phase Bar -->
        <div class="phase-bar phase-bar--day">
          <span class="phase-bar__icon">☀️</span>
          <span>${t(tr.day.title).replace('%d', game.round)}</span>
          <span class="phase-bar__round">${t(tr.day.roundNumber).replace('%d', game.round)}</span>
        </div>

        <div class="mb-md">
          <button class="btn btn--ghost" id="btn-toggle-godtools">${t(tr.day.godTools)}</button>
        </div>

        <!-- Stats -->
        <div class="stats-row">
          <div class="stat-card stat-card--mafia">
            <div class="stat-card__value">${counts.mafia}</div>
            <div class="stat-card__label">${t(tr.teams.mafiaShort)}</div>
          </div>
          <div class="stat-card stat-card--citizen">
            <div class="stat-card__value">${counts.citizen}</div>
            <div class="stat-card__label">${t(tr.teams.citizenShort)}</div>
          </div>
          <div class="stat-card stat-card--independent">
            <div class="stat-card__value">${counts.independent}</div>
            <div class="stat-card__label">${t(tr.teams.independentShort)}</div>
          </div>
        </div>

        <!-- Sub-view tabs -->
        <div class="tabs mb-md">
          <button class="tab ${this.subView === 'results' ? 'active' : ''}" data-sub="results">${t(tr.day.resultsTab)}</button>
          <button class="tab ${this.subView === 'discussion' ? 'active' : ''}" data-sub="discussion">${t(tr.day.discussionTab)}</button>
          ${this.game.hasBombToResolve() ? `
            <button class="tab ${this.subView === 'siesta' ? 'active' : ''}" data-sub="siesta">${t(tr.day.siestaTab)}</button>
          ` : ''}
          <button class="tab ${this.subView === 'voting' ? 'active' : ''}" data-sub="voting">${t(tr.day.votingTab)}</button>
        </div>

        <div id="day-content"></div>
      </div>
    `;

    // Tab events
    this.container.querySelectorAll('.tab[data-sub]').forEach(tab => {
      tab.addEventListener('click', () => {
        this.subView = tab.dataset.sub;
        this.render();
      });
    });

    // NOTE: delegated click handler in constructor handles the toggle to avoid double-binding

    const content = this.container.querySelector('#day-content');

    // If God Tools are enabled, render the editable dashboard above subview
    if (this.showGodTools) {
      const godToolsContainer = document.createElement('div');
      godToolsContainer.id = 'god-tools-container';
      // visual debug outline so user can see the container if rendered
      godToolsContainer.style.outline = '2px dashed magenta';
      console.log('DayView: inserting god-tools-container');
      content.appendChild(godToolsContainer);
      this._renderGodTools(godToolsContainer);
      // ensure the god tools panel is visible and focused
      try {
        godToolsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const firstSel = godToolsContainer.querySelector('.god-role-select');
        if (firstSel && typeof firstSel.focus === 'function') firstSel.focus();
      } catch (err) {
        // ignore
      }
    }

    // Render the active subview into its own container so God Tools isn't overwritten
    const subviewEl = document.createElement('div');
    subviewEl.id = 'day-subview';
    content.appendChild(subviewEl);
    if (this.subView === 'results') this._renderResults(subviewEl);
    else if (this.subView === 'discussion') this._renderDiscussion(subviewEl);
    else if (this.subView === 'siesta') this._renderSiesta(subviewEl);
    else if (this.subView === 'voting') this._renderVoting(subviewEl);
  }

  // ─── Blind Day (1 minute, no challenges) ───
  _renderBlindDay(counts) {
    const game = this.game;

    this.container.innerHTML = `
      <div class="view">
        <div class="phase-bar phase-bar--day">
          <span class="phase-bar__icon">☀️</span>
          <span>${t(tr.day.blindDay)}</span>
          <span class="phase-bar__round">${t(tr.day.roundNumber).replace('%d', (game.round || 1))}</span>
        </div>

        <div class="stats-row">
          <div class="stat-card stat-card--mafia">
            <div class="stat-card__value">${counts.mafia}</div>
            <div class="stat-card__label">${t(tr.teams.mafiaShort)}</div>
          </div>
          <div class="stat-card stat-card--citizen">
            <div class="stat-card__value">${counts.citizen}</div>
            <div class="stat-card__label">${t(tr.teams.citizenShort)}</div>
          </div>
          <div class="stat-card stat-card--independent">
            <div class="stat-card__value">${counts.independent}</div>
            <div class="stat-card__label">${t(tr.teams.independentShort)}</div>
          </div>
        </div>

        <div class="section">
          <h2 class="section__title">${t(tr.day.blindDayTitle)}</h2>
          <p class="text-secondary text-center mb-lg" style="font-size: var(--text-sm);">
            ${t(tr.day.blindDayDescription)}
          </p>

          <div class="timer">
            <div class="timer__display" id="blind-timer-display">${Timer.format(game.blindDayDuration)}</div>
            <div class="timer__progress">
              <div class="timer__progress-bar" id="blind-timer-bar" style="width: 100%"></div>
            </div>
            <div class="timer__controls">
              <button class="btn btn--secondary btn--sm" id="btn-blind-start">${t(tr.day.timerStart)}</button>
              <button class="btn btn--ghost btn--sm" id="btn-blind-pause">${t(tr.day.timerPause)}</button>
              <button class="btn btn--ghost btn--sm" id="btn-blind-reset">${t(tr.day.timerReset)}</button>
            </div>
          </div>
        </div>

        <div class="mt-lg">
          <button class="btn btn--primary btn--lg btn--block" id="btn-end-blind-day">
            ${t(tr.day.endBlindDay)}
          </button>
        </div>
      </div>
    `;

    // Setup blind day timer
    const display = this.container.querySelector('#blind-timer-display');
    const bar = this.container.querySelector('#blind-timer-bar');

    if (!this._blindTimer) {
      this._blindTimer = new Timer(
        game.blindDayDuration,
        (remaining, total) => {
          if (display) display.textContent = Timer.format(remaining);
          if (bar) bar.style.width = `${(remaining / total) * 100}%`;
        },
        () => {
          this.app.showToast('⏰ وقت روز کور تمام شد!', 'info');
        }
      );
    }

    this.container.querySelector('#btn-blind-start')?.addEventListener('click', () => this._blindTimer.start());
    this.container.querySelector('#btn-blind-pause')?.addEventListener('click', () => this._blindTimer.pause());
    this.container.querySelector('#btn-blind-reset')?.addEventListener('click', () => {
      this._blindTimer.reset(game.blindDayDuration);
      if (display) display.textContent = Timer.format(game.blindDayDuration);
      if (bar) bar.style.width = '100%';
    });

    // End blind day → go to blind night
    this.container.querySelector('#btn-end-blind-day')?.addEventListener('click', () => {
      this._blindTimer?.stop();
      this._blindTimer = null;
      game.startBlindNight();
      this.app.saveGame();
      this.navigate('night');
    });
  }

  // ─── Night Results ───
  _renderResults(container) {
    const results = this.app._nightResults;
    const game = this.game;

    // Silenced player announcement
    const silencedPlayer = results?.silenced ? game.getPlayer(results.silenced) : null;

    container.innerHTML = `
      <div class="section">
        <h2 class="section__title">📢 ${t(tr.day.announceResults)}</h2>

        ${results?.salakhied?.correct ? `
          <div class="card card--mafia mb-md" style="border-color: var(--danger);">
            <div class="font-bold mb-sm" style="color: var(--danger);">${t(tr.day.salakhiLabel)}</div>
            <div class="flex items-center gap-sm">
              <span class="dot dot--dead"></span>
              <span class="font-bold">${game.getPlayer(results.salakhied.playerId)?.name || '—'}</span>
              <span>${t(tr.day.salakhied)}</span>
            </div>
          </div>
        ` : results?.salakhied && !results.salakhied.correct ? `
          <div class="card mb-md" style="border-color: var(--warning);">
            <div style="color: var(--warning); font-weight: 600;">${t(tr.day.salakhiFailed)}</div>
          </div>
        ` : ''}

        ${results?.killed?.length > 0 ? `
          <div class="card card--mafia mb-md">
            <div class="font-bold mb-sm" style="color: var(--danger);">${t(tr.day.killedLastNight)}</div>
            ${results.killed.map(id => {
              const p = game.getPlayer(id);
              const role = Roles.get(p?.roleId);
              return `<div class="flex items-center gap-sm mb-sm">
                <span class="dot dot--dead"></span>
                <span class="font-bold">${p?.name || '—'}</span>
                <span class="role-badge role-badge--${role?.team || 'citizen'}">${role?.icon || ''} ${Settings.getLanguage() === Language.ENGLISH ? `<span class="ltr-inline">${role?.getLocalizedName() || ''}</span>` : (role?.getLocalizedName() || '')}</span>
              </div>`;
            }).join('')}
          </div>
        ` : `
          <div class="card mb-md" style="border-color: var(--success);">
            <div style="color: var(--success); font-weight: 600;">${t(tr.day.noKills)}</div>
          </div>
        `}

        ${results?.shielded?.length > 0 ? `
          <div class="card mb-md" style="border-color: var(--warning);">
            <div class="font-bold mb-sm" style="color: var(--warning);">${t(tr.day.shieldActivated)}</div>
            <div class="text-secondary" style="font-size: var(--text-sm);">
              ${t(tr.day.shieldDescription)}
            </div>
          </div>
        ` : ''}

        ${results?.saved?.length > 0 ? `
          <div class="card mb-md" style="border-color: var(--success);">
            <div class="font-bold mb-sm" style="color: var(--success);">${t(tr.day.savedLabel)}</div>
            <div class="text-secondary" style="font-size: var(--text-sm);">
              ${t(tr.day.savedDescription)}
            </div>
          </div>
        ` : ''}

        ${silencedPlayer ? `
          <div class="card mb-md" style="border-color: var(--warning);">
            <div style="font-weight: 600; color: var(--warning);">
              ${t(tr.day.silencedToday).replace('%s', silencedPlayer.name)}
            </div>
          </div>
        ` : ''}

        ${results?.revived ? `
          <div class="card mb-md" style="border-color: var(--success);">
            <div style="font-weight: 600; color: var(--success);">
              ${t(tr.day.revivedAnnouncement).replace('%s', game.getPlayer(results.revived)?.name || '—')}
            </div>
          </div>
        ` : ''}

        ${results?.jackCurseTriggered ? `
          <div class="card mb-md" style="border-color: rgba(139,92,246,0.6);">
            <div style="font-weight: 600; color: rgb(139,92,246);">
              ${t(tr.day.jackCurseTriggered)}
            </div>
          </div>
        ` : ''}

        ${results?.framasonRecruit?.contaminated ? `
          <div class="card mb-md" style="border-color: var(--danger);">
            <div class="font-bold mb-sm" style="color: var(--danger);">${t(tr.day.framasonContaminated)}</div>
            <div class="text-secondary" style="font-size: var(--text-sm);">
              ${t(tr.day.framasonContaminationDesc)}
            </div>
          </div>
        ` : ''}

        ${results?.kaneReveal ? `
          <div class="card mb-md" style="border-color: var(--warning); background: rgba(234,179,8,0.08);">
            <div class="font-bold mb-sm" style="color: var(--warning);">${t(tr.day.kaneRevealLabel)}</div>
            <div style="font-size: var(--text-lg); font-weight: 700;">
              ${t(tr.day.kaneRevealNote)}
              <br>
              <strong>${results.kaneReveal.targetName}</strong>
              ${results.kaneReveal.roleIcon} <strong>${results.kaneReveal.roleName}</strong>
            </div>
            <div class="text-muted mt-sm" style="font-size: var(--text-xs);">${t(tr.day.kaneRevealNote)}</div>
          </div>
        ` : ''}

        <!-- God-only info -->
        <div class="god-dashboard mt-lg">
          <div class="god-dashboard__title">${t(tr.day.godSecretInfo)}</div>
          
          ${results?.investigated ? `
            <div class="card mb-sm" style="background: var(--bg-glass); font-size: var(--text-sm);">
              ${t(tr.day.investigationResult)} 
              <strong>${game.getPlayer(results.investigated.playerId)?.name}</strong>
              ← ${results.investigated.result === 'blocked' ? t(tr.night.blocked) : results.investigated.result === 'positive' ? '👍' : '👎'}
            </div>
          ` : ''}

          ${results?.bombed ? `
            <div class="card mb-sm" style="background: var(--bg-glass); font-size: var(--text-sm);">
              ${t(tr.day.bombPlanted)} <strong>${game.getPlayer(results.bombed)?.name}</strong>
            </div>
          ` : ''}

          ${results?.blocked ? `
            <div class="card mb-sm" style="background: var(--bg-glass); font-size: var(--text-sm);">
              ${t(tr.night.blockAction)} <strong>${game.getPlayer(results.blocked)?.name}</strong>
            </div>
          ` : ''}

          ${(() => {
            const jackP = game.players.find(p => p.isAlive && p.roleId === 'jack');
            if (jackP && jackP.curse.isActive) {
              const tTarget = game.getPlayer(jackP.curse.targetId);
              return `<div class="card mb-sm" style="background: rgba(139,92,246,0.08); font-size: var(--text-sm);">
                ${t(tr.day.jackCurseOn)} <strong>${tTarget?.name || '—'}</strong>
              </div>`;
            }
            return '';
          })()}

          ${game.framason.isActive || game.framason.isContaminated ? `
            <div class="card mb-sm" style="background: rgba(239,68,68,0.08); font-size: var(--text-sm);">
              ${t(tr.day.framasonTeamLabel)} <strong>${game.getFramasonAllianceNames().join('، ') || '—'}</strong>
              ${game.framason.isContaminated ? '<span style="color: var(--danger);"> ⚠️ '+t(tr.day.contaminated)+'</span>' : ''}
            </div>
          ` : ''}

          ${(() => {
            const bullets = game.getActiveBullets();
            if (bullets.length === 0) return '';
            return `<div class="card mb-sm" style="background: rgba(234,179,8,0.08); font-size: var(--text-sm);">
              ${t(tr.day.activeBullets)}
              ${bullets.map(b => `<div style="font-size: var(--text-xs); margin-top: 2px;">
                ${b.type === 'live' ? '🔴 '+t(tr.day.announced) : '🟡 '+t(tr.day.announced)} → <strong>${b.holderName}</strong>
              </div>`).join('')}
            </div>`;
          })()}
        </div>

        ${game.hasFramasonContamination() ? `
          <button class="btn btn--danger btn--block mt-md" id="btn-resolve-framason">
            ${t(tr.day.resolveFramason)}
          </button>
        ` : ''}

        <button class="btn btn--primary btn--block mt-lg" id="btn-go-discussion">
          ${t(tr.day.startDiscussion)}
        </button>
      </div>
    `;

    container.querySelector('#btn-go-discussion')?.addEventListener('click', () => {
      this.subView = 'discussion';
      this.render();
    });

    

    // Resolve framason contamination (button handler)
    container.querySelector('#btn-resolve-framason')?.addEventListener('click', () => {
      const { deadIds } = game.resolveFramasonContamination();
      this.app.saveGame();
      if (deadIds.length > 0) {
        const names = deadIds.map(id => game.getPlayer(id)?.name).filter(Boolean).join('، ');
        this.app.showToast(`🔺 تیم فراماسون حذف شد: ${names}`, 'info');
      }
      const winner = game.checkWinCondition();
      if (winner) {
        this.navigate('summary');
      } else {
        this.render();
      }
    });

  }

  _renderGodTools(container) {
    const game = this.game;
    // Render a read-only God dashboard (same style as NightView dashboard)
    container.innerHTML = `
      <div class="god-dashboard">
        <div class="god-dashboard__title">داشبورد خدا — فقط شما می‌بینید</div>
        <div class="god-dashboard__grid">
          ${game.players.map(p => {
            const role = Roles.get(p.roleId);
            const team = role?.team || 'citizen';
            return `
              <div class="god-player god-player--${team} ${!p.isAlive ? 'god-player--dead' : ''}">
                <span class="dot ${p.isAlive ? 'dot--alive' : 'dot--dead'}"></span>
                <span class="god-player__name">${p.name}</span>
                <span class="god-player__role">${role?.icon || ''} ${Settings.getLanguage() === Language.ENGLISH ? `<span class="ltr-inline">${role?.getLocalizedName() || ''}</span>` : (role?.getLocalizedName() || '')}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // ─── Discussion with Timer ───
  _renderDiscussion(container) {
    const game = this.game;

    container.innerHTML = `
      <div class="section">
        <h2 class="section__title">💬 ${t(tr.day.freeDiscussion)}</h2>

        <div class="timer">
          <div class="timer__display" id="timer-display">${this.timerDisplay}</div>
          <div class="timer__progress">
            <div class="timer__progress-bar" id="timer-bar" style="width: ${this.timerProgress}%"></div>
          </div>
          <div class="timer__controls">
            <button class="btn btn--secondary btn--sm" id="btn-timer-start">${t(tr.day.startTimer)}</button>
            <button class="btn btn--ghost btn--sm" id="btn-timer-pause">${t(tr.day.pauseTimer)}</button>
            <button class="btn btn--ghost btn--sm" id="btn-timer-reset">${t(tr.day.resetTimer)}</button>
          </div>
        </div>

        <!-- Alive players list -->
        <div class="card mt-lg">
          <div class="font-bold mb-sm">${t(tr.day.alivePlayers).replace('%d', game.getAlivePlayers().length)}</div>
          <div class="player-list">
            ${game.getAlivePlayers().map((p, i) => {
              const role = Roles.get(p.roleId);
              return `
                <div class="player-item">
                  <div class="player-item__number">${i + 1}</div>
                  <div class="player-item__name">
                    ${p.name}
                    ${p.silenced ? ' 🤐' : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Morning Shooting (Gunner bullets) -->
        ${(() => {
          const bullets = game.getActiveBullets();
          if (bullets.length === 0) return '';
          return `
            <div class="card mt-md" style="border-color: var(--warning);">
              <div class="font-bold mb-sm">🔫 تیر صبحگاهی</div>
              <p class="text-secondary mb-sm" style="font-size: var(--text-xs);">
                بازیکنان دارای تیر می‌توانند اعلام کنند. تیر جنگی استفاده‌نشده در شروع رأی‌گیری منفجر می‌شود!
              </p>
              <div class="god-dashboard mb-md" style="padding: 8px 12px;">
                <div class="god-dashboard__title" style="margin-bottom: 4px;">👁️ تیرها (فقط خدا)</div>
                ${bullets.map(b => `
                  <div style="font-size: var(--text-xs); margin-bottom: 2px;">
                    ${b.type === 'live' ? '🔴 جنگی' : '🟡 مشقی'} → ${b.holderName}
                  </div>
                `).join('')}
              </div>
              <div class="target-grid">
                ${bullets.filter(b => game.getPlayer(b.holderId)?.isAlive).map(b => `
                  <button class="target-btn" data-morning-shooter="${b.holderId}">
                    ${b.holderName} اعلام کرد 🔫
                  </button>
                `).join('')}
              </div>
            </div>
          `;
        })()}

        ${this.morningShootActive ? this._renderMorningShootPanel() : ''}

        ${this.morningShootResult ? this._renderMorningShootResult() : ''}

        <button class="btn btn--primary btn--block mt-lg" id="btn-go-voting">
          ${t(tr.day.startVoting)}
        </button>
      </div>
    `;

    this._setupTimer(container);
    this._setupMorningShooting(container);

    container.querySelector('#btn-go-voting')?.addEventListener('click', () => {
      this.timer?.stop();

      // Resolve live bullet expiration before voting
      const explosions = this.game.resolveLiveExpiration();
      if (explosions.length > 0) {
        this.app.saveGame();
        const names = explosions.map(e => e.holderName).join('، ');
        this.app.showToast(`💥 تیر جنگی منفجر شد: ${names}`, 'error');
        const winner = this.game.checkWinCondition();
        if (winner) {
          this.navigate('summary');
          return;
        }
      }

      if (this.game.hasBombToResolve()) {
        this.subView = 'siesta';
      } else {
        this.subView = 'voting';
      }
      this.render();
    });
  }

  // ─── Voting ───
  _renderVoting(container) {
    const game = this.game;
    const alivePlayers = game.getAlivePlayers();

    const aliveCount = alivePlayers.length;
    const threshold = Math.floor((Math.max(0, aliveCount - 1)) / 2) + 1; // 50% + 1 of (alive-1)

    // First stage: numeric votes per player
    if (this.votingPhase === 'first') {
      container.innerHTML = `
        <div class="section">
          <h2 class="section__title">🗳️ ${t(tr.day.votingTitle)}</h2>
          <p class="section__subtitle">${t(tr.day.enterVotesHelp)}</p>

          <div class="card mb-md">
            <div class="font-bold mb-sm">${t(tr.day.votingStageFirst)}</div>
            <div class="text-secondary" style="font-size: var(--text-sm);">${t(tr.day.thresholdInfo).replace('%d', threshold)}</div>
          </div>

          <div class="player-list">
                ${alivePlayers.map(p => `
                  <div class="vote-card" data-vote-player="${p.id}">
                    <div class="vote-card__info"><span class="font-bold">${p.name}</span></div>
                    <div class="vote-card__count vote-counter">
                      <button class="vote-decr" data-player-id="${p.id}">−</button>
                      <span class="vote-value" data-player-id="${p.id}">${this.voteCounts[p.id] || 0}</span>
                      <button class="vote-incr" data-player-id="${p.id}">+</button>
                      <div style="font-size: var(--text-xs); color: var(--text-muted);">${t(tr.day.vote)}</div>
                    </div>
                  </div>
                `).join('')}
              </div>

          <div class="mt-md">
            <button class="btn btn--primary btn--block" id="btn-continue-runoff" ${this._hasAnyAboveThreshold(threshold) ? '' : 'disabled'}>${t(tr.day.continueToRunoff)}</button>
            <button class="btn btn--secondary btn--block mt-sm" id="btn-no-eliminate">${t(tr.day.noElimination)}</button>
            <button class="btn btn--ghost btn--block mt-sm" id="btn-back-discussion">${t(tr.day.backToDiscussion)}</button>
          </div>
        </div>
      `;

      // wire +/- buttons
      container.querySelectorAll('.vote-incr').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = Number(btn.dataset.playerId);
          const max = Math.max(0, aliveCount - 1);
          const v = Math.min(max, (this.voteCounts[id] || 0) + 1);
          this.voteCounts[id] = v;
          container.querySelector(`.vote-value[data-player-id="${id}"]`).textContent = v;
          const cbtn = container.querySelector('#btn-continue-runoff'); if (cbtn) cbtn.disabled = !this._hasAnyAboveThreshold(threshold);
        });
      });
      container.querySelectorAll('.vote-decr').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = Number(btn.dataset.playerId);
          const v = Math.max(0, (this.voteCounts[id] || 0) - 1);
          this.voteCounts[id] = v;
          container.querySelector(`.vote-value[data-player-id="${id}"]`).textContent = v;
          const cbtn = container.querySelector('#btn-continue-runoff'); if (cbtn) cbtn.disabled = !this._hasAnyAboveThreshold(threshold);
        });
      });

      container.querySelector('#btn-continue-runoff')?.addEventListener('click', () => {
        // compute candidates
        this.runoffCandidates = alivePlayers.filter(p => (this.voteCounts[p.id] || 0) >= threshold).map(p => p.id);
        this.runoffVoteCounts = {};
        this.votingPhase = 'second';
        this.render();
      });

      container.querySelector('#btn-no-eliminate')?.addEventListener('click', () => this._goToNextNight());
      container.querySelector('#btn-back-discussion')?.addEventListener('click', () => { this.subView = 'discussion'; this.render(); });
      return;
    }

    // Second stage (runoff) — only candidates
    if (this.votingPhase === 'second') {
      const candidates = alivePlayers.filter(p => this.runoffCandidates.includes(p.id));
      container.innerHTML = `
        <div class="section">
          <h2 class="section__title">${t(tr.day.runoffTitle)}</h2>
          <p class="section__subtitle">${t(tr.day.enterVotesHelp)}</p>

          <div class="card mb-md">
            <div class="font-bold mb-sm">${t(tr.day.runoffTitle)}</div>
            <div class="text-secondary" style="font-size: var(--text-sm);">${t(tr.day.votingSubtitle)}</div>
          </div>

          <div class="player-list">
            ${candidates.map(p => `
              <div class="vote-card" data-vote-player="${p.id}">
                <div class="vote-card__info"><span class="font-bold">${p.name}</span></div>
                <div class="vote-card__count vote-counter">
                  <button class="runoff-decr" data-player-id="${p.id}">−</button>
                  <span class="runoff-value" data-player-id="${p.id}">${this.runoffVoteCounts[p.id] || 0}</span>
                  <button class="runoff-incr" data-player-id="${p.id}">+</button>
                  <div style="font-size: var(--text-xs); color: var(--text-muted);">${t(tr.day.vote)}</div>
                </div>
              </div>
            `).join('')}
          </div>

          <div class="mt-md">
            <button class="btn btn--danger btn--block" id="btn-execute-runoff">${t(tr.day.executeRunoff)}</button>
            <button class="btn btn--ghost btn--block mt-sm" id="btn-cancel-runoff">${t(tr.day.backToDiscussion)}</button>
          </div>
        </div>
      `;

      // wire +/- for runoff
      container.querySelectorAll('.runoff-incr').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = Number(btn.dataset.playerId);
          const max = Math.max(0, aliveCount - 1);
          const v = Math.min(max, (this.runoffVoteCounts[id] || 0) + 1);
          this.runoffVoteCounts[id] = v;
          container.querySelector(`.runoff-value[data-player-id="${id}"]`).textContent = v;
        });
      });
      container.querySelectorAll('.runoff-decr').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = Number(btn.dataset.playerId);
          const v = Math.max(0, (this.runoffVoteCounts[id] || 0) - 1);
          this.runoffVoteCounts[id] = v;
          container.querySelector(`.runoff-value[data-player-id="${id}"]`).textContent = v;
        });
      });

      container.querySelector('#btn-execute-runoff')?.addEventListener('click', () => this._runoffExecuteClicked(aliveCount));

      container.querySelector('#btn-cancel-runoff')?.addEventListener('click', () => {
        this.votingPhase = 'first';
        this.render();
      });
      return;
    }
  }

  _showVoteRecorder(container, playerId) {
    const game = this.game;
    const target = game.getPlayer(playerId);
    const recorder = container.querySelector('#vote-recorder');
    const nameEl = container.querySelector('#vote-target-name');
    const voterGrid = container.querySelector('#voter-grid');

    nameEl.textContent = `رأی به: ${target?.name || '—'}`;
    recorder.style.display = 'block';

    const currentVoters = this.votedPlayers[playerId] || [];
    const eligibleVoters = game.getAlivePlayers().filter(p => p.id !== playerId);

    voterGrid.innerHTML = eligibleVoters.map(v => `
      <button class="target-btn ${currentVoters.includes(v.id) ? 'selected' : ''}" 
              data-voter-id="${v.id}" data-for-player="${playerId}">
        ${v.name} ${v.roleId === 'kane' ? '(×۲)' : ''}
      </button>
    `).join('');

    voterGrid.querySelectorAll('.target-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const voterId = Number(btn.dataset.voterId);
        const forPlayer = Number(btn.dataset.forPlayer);

        if (!this.votedPlayers[forPlayer]) this.votedPlayers[forPlayer] = [];

        const idx = this.votedPlayers[forPlayer].indexOf(voterId);
        if (idx >= 0) {
          this.votedPlayers[forPlayer].splice(idx, 1);
          // Remove from other players too (one vote per person)
        } else {
          // Remove this voter from any other player
          for (const [pid, voters] of Object.entries(this.votedPlayers)) {
            const i = voters.indexOf(voterId);
            if (i >= 0) voters.splice(i, 1);
          }
          this.votedPlayers[forPlayer].push(voterId);
        }
        this.render();
      });
    });

    container.querySelector('#btn-close-voter')?.addEventListener('click', () => {
      recorder.style.display = 'none';
    });
  }

  /** Handle Last Action UI flow after a player is eliminated by vote */
  _handleLastActionFor(victimId, extra, done) {
    const game = this.game;
    const victim = game.getPlayer(victimId);
    if (!victim) { done(); return; }

    const remaining = game.lastActionManager?.remainingCount() || 0;
    if (remaining <= 0) { done(); return; }

    // helper to create a consistent overlay modal with cancel
    const createModal = (titleHtml, bodyHtml, actionsHtml = '') => {
      const o = document.createElement('div');
      o.className = 'modal-overlay';
      o.innerHTML = `
        <div class="modal">
          <div class="modal__title">${titleHtml}</div>
          <div class="modal__body">${bodyHtml}</div>
          <div class="modal__actions">${actionsHtml}<button class="btn btn--ghost" data-cancel> ${t(tr.common.cancel)} </button></div>
        </div>
      `;
      document.body.appendChild(o);
      // cancel button removes modal
      o.querySelector('[data-cancel]')?.addEventListener('click', () => o.remove());
      return o;
    };

    const overlay = createModal(
      t(tr.history.lastActionDraw).replace('%s', ''),
      `${t(tr.history.lastActionDraw).replace('%s', '')}<br>${t(tr.day.announceAloud)}<br><strong>${victim.name}</strong>`,
      Array.from({ length: remaining }).map((_, i) => `<button class="btn btn--primary" data-num="${i+1}">${i+1}</button>`).join('')
    );

    const cleanup = () => { overlay.remove(); };

    const proceed = () => { cleanup(); done && done(); };

    const handleCardResult = (card) => {
      if (!card) { proceed(); return; }
      switch (card.id) {
        case 1: {
          // Final shoot: ask to choose a target
          const alive = game.getAlivePlayers().filter(p => p.id !== victimId);
          const actions = alive.map(p => `<button class="btn" data-id="${p.id}">${p.name}</button>`).join('');
          const bodyModal = createModal(t(tr.history.lastActionFinalShoot), t(tr.day.selectTarget), actions);
          bodyModal.querySelectorAll('button[data-id]').forEach(btn => btn.addEventListener('click', () => {
            const targetId = Number(btn.dataset.id);
            const res = game.applyCard1FinalShoot(victimId, targetId);
            this.app.saveGame();
            if (!res.success) this.app.showToast(t(tr.history.lastActionFinalShootImmune).replace('%s', game.getPlayer(targetId)?.name || '—'));
            else this.app.showToast(t(tr.history.mafiaKill).replace('%s', game.getPlayer(targetId)?.name || '—'));
            bodyModal.remove();
            proceed();
          }));
          break;
        }
        case 2:
          this.app.showToast(t(tr.history.lastActionSkipNight) || 'Night skipped', 'info');
          proceed();
          break;
        case 3:
          // Reveal already handled in model history; show simple toast
          this.app.showToast(t(tr.history.lastActionReveal).replace('%s', victim.name).replace('%s', Roles.get(victim.roleId)?.getLocalizedName?.() || victim.roleId), 'info');
          proceed();
          break;
        case 4: {
          const alive = game.getAlivePlayers().filter(p => p.id !== victimId);
          const actions = alive.map(p => `<button class="btn" data-id="${p.id}">${p.name}</button>`).join('');
          const guessModal = createModal(t(tr.history.lastActionGuess), t(tr.day.guessRole), actions);
          guessModal.querySelectorAll('button[data-id]').forEach(btn => btn.addEventListener('click', () => {
            const guessedId = Number(btn.dataset.id);
            const res = game.applyCard4Guess(victimId, guessedId);
            this.app.saveGame();
            if (res.success) this.app.showToast(t(tr.history.lastActionGuessSuccess).replace('%s', game.getPlayer(guessedId)?.name || '—'));
            else this.app.showToast(t(tr.history.lastActionGuessFail).replace('%s', game.getPlayer(guessedId)?.name || '—'));
            guessModal.remove();
            proceed();
          }));
          break;
        }
        case 5: {
          const alive = game.getAlivePlayers().filter(p => p.id !== victimId);
          const actions = alive.map(p => `<button class="btn" data-id="${p.id}">${p.name}</button>`).join('');
          const faceModal = createModal(t(tr.history.lastActionFaceOff), t(tr.history.lastActionFaceOff), actions);
          faceModal.querySelectorAll('button[data-id]').forEach(btn => btn.addEventListener('click', () => {
            const chosenId = Number(btn.dataset.id);
            const res = game.applyCard5FaceOff(victimId, chosenId);
            this.app.saveGame();
            if (res.success) this.app.showToast(t(tr.history.lastActionFaceOffApplied).replace('%s', victim.name).replace('%s', game.getPlayer(chosenId)?.name || '—').replace('%s', Roles.get(victim.roleId)?.getLocalizedName?.() || victim.roleId), 'info');
            faceModal.remove();
            proceed();
          }));
          break;
        }
        default:
          proceed();
      }
    };

    // Pick a number (1..N). For RTL languages we reverse the visual order so numbers read left→right
    const numButtons = overlay.querySelectorAll('button[data-num]');
    const nums = Array.from({ length: remaining }).map((_, i) => i + 1);
    if (Settings.getLanguage() !== Language.ENGLISH) nums.reverse();
    // Reorder buttons DOM to match desired visual order
    const choicesContainer = overlay.querySelector('#lastaction-choices');
    if (choicesContainer) {
      choicesContainer.innerHTML = nums.map(n => `<button class="btn btn--primary" data-num="${n}">${n}</button>`).join('');
    }

    overlay.querySelectorAll('button[data-num]').forEach(btn => btn.addEventListener('click', () => {
      const num = Number(btn.dataset.num);
      const res = game.drawLastActionFor(victimId, num);
      this.app.saveGame();
      const card = res?.card;
      // Remove the pick modal
      overlay.remove();
      if (!card) { proceed(); return; }

      // Show reveal modal with localized card name and description
      const cardName = t(tr.lastAction?.cards?.[card.id]?.name || { fa: card.name, en: card.name });
      const cardDesc = t(tr.lastAction?.cards?.[card.id]?.desc || { fa: '', en: '' });
      const title = t(tr.history.lastActionDraw).replace('%s', cardName);
      const body = `${cardDesc}<br><br><strong>${victim.name}</strong>`;

      this.app.showModal(title, body, () => {
        // on confirm, execute card follow-up
        handleCardResult(card);
      }, t(tr.common.confirm), t(tr.common.cancel));
    }));
  }

  _hasAnyAboveThreshold(threshold) {
    for (const [pid, cnt] of Object.entries(this.voteCounts || {})) {
      if ((cnt || 0) >= threshold) return true;
    }
    return false;
  }

  /** Encapsulate elimination flow (eliminate + handle last-action/jack/skip/win) */
  _eliminateAndHandleExtra(targetId) {
    const game = this.game;
    if (game.isVoteImmune(targetId)) {
      const target = game.getPlayer(targetId);
      this.app.showToast(t(tr.day.immuneVote).replace('%s', target?.name), 'error');
      return;
    }
    const extra = game.eliminateByVote(targetId);
    this.app.saveGame();
    if (extra.lastActionAvailable) {
      this._handleLastActionFor(targetId, extra, () => {
        if (extra.jackCurseTriggered) this.app.showToast(t(tr.day.jackCurseTriggered), 'info');
        const winner = game.checkWinCondition();
        if (winner) { this.navigate('summary'); return; }
        if (game.lastActionSkipNight) { this._skipToNextMorning(); return; }
        this._goToNextNight();
      });
      return;
    }
    if (extra.jackCurseTriggered) this.app.showToast(t(tr.day.jackCurseTriggered), 'info');
    const winner = game.checkWinCondition();
    if (winner) this.navigate('summary'); else this._goToNextNight();
  }

  /** Handle click on execute-runoff button (refactored for readability) */
  _runoffExecuteClicked(aliveCount) {
    const game = this.game;
    const threshold = Math.floor((Math.max(0, aliveCount - 1)) / 2) + 1; // same threshold as first stage

    // Single-candidate runoff: require threshold
    if (this.runoffCandidates.length === 1) {
      const targetId = this.runoffCandidates[0];
      const votes = this.runoffVoteCounts[targetId] || 0;
      if (votes < threshold) {
        this.app.showToast(t(tr.day.noElimination), 'info');
        this._goToNextNight();
        return;
      }
      // confirm and eliminate
      this.confirm(t(tr.day.confirmExecution), t(tr.day.executeConfirm).replace('%s', game.getPlayer(targetId)?.name), () => {
        this._eliminateAndHandleExtra(targetId);
      });
      return;
    }

    // Multiple candidates: find highest
    let maxCount = -1;
    let winners = [];
    for (const id of Object.keys(this.runoffVoteCounts)) {
      const c = this.runoffVoteCounts[id] || 0;
      if (c > maxCount) { maxCount = c; winners = [Number(id)]; }
      else if (c === maxCount) winners.push(Number(id));
    }

    if (winners.length === 0) {
      this.app.showToast(t(tr.day.runoffTie), 'info');
      return;
    }

    if (winners.length === 2) {
      const [a, b] = winners;
      const nameA = game.getPlayer(a)?.name || '—';
      const nameB = game.getPlayer(b)?.name || '—';

      // Step 1: ask God to choose shir or khat
      const askOverlay = document.createElement('div');
      askOverlay.className = 'modal-overlay';
      askOverlay.innerHTML = `
        <div class="modal">
          <div class="modal__title">${t(tr.day.coinTossTitle)}</div>
          <div class="modal__body">${t(tr.day.coinTossChoose)}<br><strong>${nameA} ↔ ${nameB}</strong></div>
          <div class="modal__actions">
            <button class="btn btn--primary btn--block" data-choice="shir">${t(tr.day.shir)}</button>
            <button class="btn btn--ghost btn--block" data-choice="khat">${t(tr.day.khat)}</button>
            <button class="btn btn--ghost btn--block" data-cancel>${t(tr.common.cancel)}</button>
          </div>
        </div>
      `;
      document.body.appendChild(askOverlay);

      const openResultAndPick = (chosenSide) => {
        askOverlay.remove();
        const coin = Math.random() < 0.5 ? 'shir' : 'khat';
        const coinLabel = coin === 'shir' ? t(tr.day.shir) : t(tr.day.khat);

        const resOverlay = document.createElement('div');
        resOverlay.className = 'modal-overlay';
        resOverlay.innerHTML = `
          <div class="modal">
            <div class="modal__title">${t(tr.day.coinTossTitle)}</div>
            <div class="modal__body">${t(tr.day.coinTossResult).replace('%s', coinLabel)}<br><strong>${nameA} ↔ ${nameB}</strong></div>
            <div class="modal__actions">
              <div style="width:100%">${t(tr.day.coinTossPick)}</div>
              <button class="btn btn--primary btn--block" data-pick="${a}">${nameA}</button>
              <button class="btn btn--primary btn--block" data-pick="${b}">${nameB}</button>
              <button class="btn btn--ghost btn--block" data-cancel>${t(tr.common.cancel)}</button>
            </div>
          </div>
        `;
        document.body.appendChild(resOverlay);

        resOverlay.querySelectorAll('[data-pick]').forEach(but => but.addEventListener('click', (ev) => {
          const pick = Number(ev.currentTarget.dataset.pick);
          resOverlay.remove();
          this.confirm(t(tr.day.confirmExecution), t(tr.day.executeConfirm).replace('%s', game.getPlayer(pick)?.name), () => {
            this._eliminateAndHandleExtra(pick);
          });
        }));

        resOverlay.querySelector('[data-cancel]')?.addEventListener('click', () => resOverlay.remove());
      };

      askOverlay.querySelectorAll('[data-choice]')?.forEach(b => b.addEventListener('click', (ev) => openResultAndPick(ev.currentTarget.dataset.choice)));
      askOverlay.querySelector('[data-cancel]')?.addEventListener('click', () => askOverlay.remove());
      return;
    }

    // Multi-way tie (>2): ask God to pick one manually
    const tieList = winners.map(id => game.getPlayer(id)?.name).filter(Boolean).join('، ');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal__title">${t(tr.day.runoffTie)}</div>
        <div class="modal__body">${t(tr.day.runoffMultiTie).replace('%s', tieList)}</div>
        <div class="modal__actions">
          ${winners.map(id => `<button class="btn btn--primary btn--block" data-pick="${id}">${game.getPlayer(id)?.name || '—'}</button>`).join('')}
          <button class="btn btn--ghost btn--block" data-cancel>${t(tr.common.cancel)}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', (ev) => {
      const pick = Number(ev.currentTarget.dataset.pick);
      overlay.remove();
      this.confirm(t(tr.day.confirmExecution), t(tr.day.executeConfirm).replace('%s', game.getPlayer(pick)?.name), () => {
        this._eliminateAndHandleExtra(pick);
      });
    }));
    overlay.querySelector('[data-cancel]')?.addEventListener('click', () => overlay.remove());
  }

  _goToNextNight() {
    this.game.startNight();
    this.app.saveGame();
    this.votedPlayers = {};
    this.subView = 'results';
    this.navigate('night');
  }

  /** Skip the upcoming night and start the next morning immediately */
  _skipToNextMorning() {
    const game = this.game;
    // consume the skip flag
    game.lastActionSkipNight = false;
    game.startDay();
    this.app.saveGame();
    this.votedPlayers = {};
    this.subView = 'results';
    this.navigate('day');
  }

  _setupTimer(container) {
    const display = container.querySelector('#timer-display');
    const bar = container.querySelector('#timer-bar');

    if (!this.timer) {
      this.timer = new Timer(
        this.game.dayTimerDuration,
        (remaining, total) => {
          this.timerDisplay = Timer.format(remaining);
          this.timerProgress = (remaining / total) * 100;
          if (display) {
            display.textContent = this.timerDisplay;
            display.className = 'timer__display';
            if (remaining <= 30) display.classList.add('danger');
            else if (remaining <= 60) display.classList.add('warning');
          }
          if (bar) bar.style.width = `${this.timerProgress}%`;
        },
        () => {
          this.app.showToast(t(tr.day.discussionTimeUp), 'info');
        }
      );
    }

    container.querySelector('#btn-timer-start')?.addEventListener('click', () => this.timer.start());
    container.querySelector('#btn-timer-pause')?.addEventListener('click', () => this.timer.pause());
    container.querySelector('#btn-timer-reset')?.addEventListener('click', () => {
      this.timer.reset(this.game.dayTimerDuration);
      this.timerDisplay = Timer.format(this.game.dayTimerDuration);
      this.timerProgress = 100;
      if (display) {
        display.textContent = this.timerDisplay;
        display.className = 'timer__display';
      }
      if (bar) bar.style.width = '100%';
    });
  }

  _setupMorningShooting(container) {
    // Bullet holder announces → open shooting panel
    container.querySelectorAll('[data-morning-shooter]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.morningShooterId = Number(btn.dataset.morningShooter);
        this.morningShootActive = true;
        this.morningShootTargetId = null;
        this.morningShootResult = null;
        this.render();
      });
    });

    // Target selection in shooting panel
    container.querySelectorAll('[data-morning-target]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.morningShootTargetId = Number(btn.dataset.morningTarget);
        this.render();
      });
    });

    // Cancel shooting
    container.querySelector('#btn-morning-cancel')?.addEventListener('click', () => {
      this.morningShootActive = false;
      this.morningShooterId = null;
      this.morningShootTargetId = null;
      this.render();
    });

    // Confirm shoot
    container.querySelector('#btn-morning-confirm')?.addEventListener('click', () => {
      if (!this.morningShooterId || !this.morningShootTargetId) return;

      const result = this.game.resolveMorningShot(this.morningShooterId, this.morningShootTargetId);
      this.app.saveGame();

      this.morningShootResult = result;
      this.morningShootActive = false;

      const winner = this.game.checkWinCondition();
      if (winner) {
        this.navigate('summary');
        return;
      }
      this.render();
    });

    // Dismiss result
    container.querySelector('#btn-morning-result-dismiss')?.addEventListener('click', () => {
      this.morningShootResult = null;
      this.render();
    });
  }

  /** Render the shooting panel (target selection + confirm) */
  _renderMorningShootPanel() {
    const game = this.game;
    const shooter = game.getPlayer(this.morningShooterId);
    if (!shooter) return '';
    const shooterRole = shooter ? Roles.get(shooter.roleId) : null;
    // Allow self-target only if shooter is mafia
    const allowSelf = shooterRole?.team === 'mafia';
    const targets = game.getAlivePlayers().filter(p => (allowSelf ? true : p.id !== this.morningShooterId));

    return `
      <div class="card mt-md" style="border-color: rgba(234,179,8,0.6);">
        <div class="font-bold mb-sm" style="color: var(--warning);">🎯 ${shooter.name} به چه کسی شلیک می‌کند؟</div>
        <p class="text-secondary mb-sm" style="font-size: var(--text-xs);">
          هدف پس از انتخاب فرصت وصیت دارد. سپس نتیجه اعلام می‌شود.
        </p>
        <div class="target-grid">
          ${targets.map(p => `
            <button class="target-btn ${this.morningShootTargetId === p.id ? 'selected' : ''}"
                    data-morning-target="${p.id}">
              ${p.name}
            </button>
          `).join('')}
        </div>
        <div class="flex gap-sm mt-md">
          <button class="btn btn--danger btn--block btn--sm" id="btn-morning-confirm"
                  ${!this.morningShootTargetId ? 'disabled' : ''}>
            💥 شلیک (پس از وصیت)
          </button>
          <button class="btn btn--ghost btn--sm" id="btn-morning-cancel">لغو</button>
        </div>
      </div>
    `;
  }

  /** Render the shooting result card */
  _renderMorningShootResult() {
    const result = this.morningShootResult;
    if (!result) return '';

    const teamNames = { mafia: 'مافیا', citizen: 'شهروند', independent: 'مستقل' };
    const teamName = teamNames[result.targetTeam] || result.targetTeam;

    if (result.killed) {
      return `
        <div class="card mt-md" style="border-color: var(--danger);">
          <div style="font-size: var(--text-xl); text-align: center; margin-bottom: var(--space-sm);">💥</div>
          <div class="font-bold text-center" style="color: var(--danger); font-size: var(--text-lg);">
            تیر جنگی بود!
          </div>
          <p class="text-center text-secondary mt-sm">
            ${result.targetName} حذف شد — سمت: <strong>${teamName}</strong>
          </p>
          ${result.jackCurseTriggered ? `
            <p class="text-center mt-sm" style="color: rgb(139,92,246);">
              🔪 طلسم جک فعال شد — جک هم حذف شد!
            </p>
          ` : ''}
          <button class="btn btn--ghost btn--block btn--sm mt-md" id="btn-morning-result-dismiss">متوجه شدم</button>
        </div>
      `;
    } else {
      return `
        <div class="card mt-md" style="border-color: var(--success);">
          <div style="font-size: var(--text-xl); text-align: center; margin-bottom: var(--space-sm);">🟡</div>
          <div class="font-bold text-center" style="color: var(--success); font-size: var(--text-lg);">
            تیر مشقی بود!
          </div>
          <p class="text-center text-secondary mt-sm">${result.targetName} زنده ماند.</p>
          <button class="btn btn--ghost btn--block btn--sm mt-md" id="btn-morning-result-dismiss">متوجه شدم</button>
        </div>
      `;
    }
  }

  // ─── Bomb Siesta (خواب نیم‌روزی) ───
  _renderSiesta(container) {
    const game = this.game;

    // Start siesta phase if not already started
    if (game.bomb.phase === 'planted') {
      game.startBombSiesta();
      this.app.saveGame();
    }

    const bombTarget = game.getPlayer(game.bomb.targetId);
    const bodyguardAlive = game.isBodyguardAliveForBomb();

    // If bodyguard is not alive, skip guardian step
    if (!bodyguardAlive && this.siestaStep === 'guardian') {
      this.siestaStep = 'target';
    }

    let html = '';

    if (this.siestaStep === 'guardian') {
      html = `
        <div class="section">
          <h2 class="section__title">💣 خواب نیم‌روزی</h2>
          <p class="section__subtitle">همه چشم‌ها بسته! فقط محافظ بیدار است.</p>

          <div class="card mb-lg" style="border-color: var(--danger);">
            <div class="font-bold mb-sm" style="color: var(--danger);">
              💣 بمب جلوی: <strong>${bombTarget?.name || '—'}</strong>
            </div>
          </div>

          <div class="card mb-md" style="border-color: var(--warning);">
            <div class="font-bold mb-sm" style="color: var(--warning);">
              🛡️ محافظ، آیا می‌خواهید رمز بمب را حدس بزنید؟
            </div>
            <p class="text-secondary mb-md" style="font-size: var(--text-sm);">
              حدس درست → بمب خنثی | حدس غلط → محافظ حذف می‌شود
            </p>
            <div class="flex gap-sm">
              <button class="btn btn--primary btn--block" id="btn-guardian-yes">بله، حدس می‌زنم</button>
              <button class="btn btn--ghost btn--block" id="btn-guardian-skip">خیر، رد می‌کنم</button>
            </div>
          </div>
        </div>
      `;
    } else if (this.siestaStep === 'guardian_guess') {
      html = `
        <div class="section">
          <h2 class="section__title">💣 خواب نیم‌روزی</h2>
          <p class="section__subtitle">محافظ در حال حدس زدن رمز بمب...</p>

          <div class="card mb-lg" style="border-color: var(--danger);">
            <div class="font-bold" style="color: var(--danger);">
              💣 بمب جلوی: <strong>${bombTarget?.name || '—'}</strong>
            </div>
          </div>

          <div class="card" style="border-color: var(--warning);">
            <div class="font-bold mb-md" style="color: var(--warning);">🛡️ محافظ، رمز را انتخاب کنید:</div>
            <div class="target-grid">
              ${[1, 2, 3, 4].map(n => `
                <button class="target-btn ${this.siestaGuess === n ? 'selected' : ''}" data-siesta-guess="${n}" style="font-size: var(--text-lg); min-width: 60px;">
                  ${n}
                </button>
              `).join('')}
            </div>
            <button class="btn btn--primary btn--block mt-lg" id="btn-guardian-confirm" ${!this.siestaGuess ? 'disabled' : ''}>
              ✅ تأیید حدس
            </button>
          </div>
        </div>
      `;
    } else if (this.siestaStep === 'target') {
      html = `
        <div class="section">
          <h2 class="section__title">💣 خواب نیم‌روزی</h2>
          <p class="section__subtitle">${bodyguardAlive ? 'محافظ رد کرد. ' : ''}نوبت فرد بمب‌شده است.</p>

          <div class="card mb-lg" style="border-color: var(--danger);">
            <div class="font-bold" style="color: var(--danger);">
              💣 ${bombTarget?.name || '—'}، رمز بمب را حدس بزنید!
            </div>
            <p class="text-secondary mt-sm" style="font-size: var(--text-sm);">
              حدس درست → بمب خنثی | حدس غلط → حذف می‌شوید
            </p>
          </div>

          <div class="card" style="border-color: var(--warning);">
            <div class="font-bold mb-md">رمز را انتخاب کنید:</div>
            <div class="target-grid">
              ${[1, 2, 3, 4].map(n => `
                <button class="target-btn ${this.siestaGuess === n ? 'selected' : ''}" data-siesta-guess="${n}" style="font-size: var(--text-lg); min-width: 60px;">
                  ${n}
                </button>
              `).join('')}
            </div>
            <button class="btn btn--primary btn--block mt-lg" id="btn-target-confirm" ${!this.siestaGuess ? 'disabled' : ''}>
              ✅ تأیید حدس
            </button>
          </div>
        </div>
      `;
    } else if (this.siestaStep === 'result') {
      let resultCard = '';
      if (this.siestaResultData.result === 'defused') {
        resultCard = `
          <div class="card mb-lg" style="border-color: var(--success);">
            <div style="font-size: var(--text-xl); text-align: center; margin-bottom: var(--space-sm);">✅</div>
            <div class="font-bold text-center" style="color: var(--success); font-size: var(--text-lg);">
              بمب خنثی شد!
            </div>
            <p class="text-center text-secondary mt-sm">رمز درست حدس زده شد.</p>
          </div>
        `;
      } else if (this.siestaResultData.result === 'guardian_died') {
        const guardian = game.getPlayer(this.siestaResultData.guardianId);
        resultCard = `
          <div class="card mb-lg" style="border-color: var(--danger);">
            <div style="font-size: var(--text-xl); text-align: center; margin-bottom: var(--space-sm);">💥</div>
            <div class="font-bold text-center" style="color: var(--danger); font-size: var(--text-lg);">
              محافظ اشتباه زد!
            </div>
            <p class="text-center text-secondary mt-sm">
              🛡️ ${guardian?.name || '—'} (محافظ) به جای فرد بمب‌شده حذف شد.
            </p>
          </div>
        `;
      } else if (this.siestaResultData.result === 'exploded') {
        const target = game.getPlayer(this.siestaResultData.targetId);
        resultCard = `
          <div class="card mb-lg" style="border-color: var(--danger);">
            <div style="font-size: var(--text-xl); text-align: center; margin-bottom: var(--space-sm);">💥</div>
            <div class="font-bold text-center" style="color: var(--danger); font-size: var(--text-lg);">
              بمب منفجر شد!
            </div>
            <p class="text-center text-secondary mt-sm">
              💣 ${target?.name || '—'} رمز اشتباه زد و حذف شد.
            </p>
          </div>
        `;
      }

      html = `
        <div class="section">
          <h2 class="section__title">💣 نتیجه خواب نیم‌روزی</h2>
          ${resultCard}
          <button class="btn btn--primary btn--block" id="btn-siesta-continue">
            🗳️ ادامه به رأی‌گیری
          </button>
        </div>
      `;
    }

    container.innerHTML = html;

    // ── Event handlers ──

    // Guardian yes → show password grid
    container.querySelector('#btn-guardian-yes')?.addEventListener('click', () => {
      this.siestaStep = 'guardian_guess';
      this.siestaGuess = null;
      this.render();
    });

    // Guardian skip → target's turn
    container.querySelector('#btn-guardian-skip')?.addEventListener('click', () => {
      game.bombGuardianSkip();
      this.app.saveGame();
      this.siestaStep = 'target';
      this.siestaGuess = null;
      this.render();
    });

    // Password selection (both guardian and target)
    container.querySelectorAll('[data-siesta-guess]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.siestaGuess = Number(btn.dataset.siestaGuess);
        this.render();
      });
    });

    // Guardian confirms guess
    container.querySelector('#btn-guardian-confirm')?.addEventListener('click', () => {
      if (!this.siestaGuess) return;
      const res = game.bombGuardianGuess(this.siestaGuess);
      this.app.saveGame();
      this.siestaResultData = {
        result: res.result === 'wrong' ? 'guardian_died' : res.result,
        guardianId: res.guardianId
      };
      if (res.result === 'wrong') {
        const winner = game.checkWinCondition();
        if (winner) { this.navigate('summary'); return; }
      }
      this.siestaStep = 'result';
      this.siestaGuess = null;
      this.render();
    });

    // Target confirms guess
    container.querySelector('#btn-target-confirm')?.addEventListener('click', () => {
      if (!this.siestaGuess) return;
      const res = game.bombTargetGuess(this.siestaGuess);
      this.app.saveGame();
      this.siestaResultData = { result: res.result, targetId: res.targetId };
      if (res.result === 'exploded') {
        const winner = game.checkWinCondition();
        if (winner) { this.navigate('summary'); return; }
      }
      this.siestaStep = 'result';
      this.siestaGuess = null;
      this.render();
    });

    // Continue to voting
    container.querySelector('#btn-siesta-continue')?.addEventListener('click', () => {
      this.subView = 'voting';
      this.render();
    });
  }

  _hasAliveRole(roleId) {
    return this.game.players.some(p => p.isAlive && p.roleId === roleId);
  }

  destroy() {
    super.destroy();
    this.timer?.stop();
    this.timer = null;
    this._blindTimer?.stop();
    this._blindTimer = null;
    this.subView = 'results';
    this.votedPlayers = {};
    this.siestaStep = 'guardian';
    this.siestaGuess = null;
    this.siestaResultData = null;
    this.morningShootActive = false;
    this.morningShooterId = null;
    this.morningShootTargetId = null;
    this.morningShootResult = null;
  }
}
