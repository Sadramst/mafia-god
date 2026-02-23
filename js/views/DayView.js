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
  }

  render() {
    const game = this.app.game;
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

        <!-- Stats -->
        <div class="stats-row">
          <div class="stat-card stat-card--mafia">
            <div class="stat-card__value">${counts.mafia}</div>
            <div class="stat-card__label">مافیا</div>
          </div>
          <div class="stat-card stat-card--citizen">
            <div class="stat-card__value">${counts.citizen}</div>
            <div class="stat-card__label">شهروند</div>
          </div>
          <div class="stat-card stat-card--independent">
            <div class="stat-card__value">${counts.independent}</div>
            <div class="stat-card__label">مستقل</div>
          </div>
        </div>

        <!-- Sub-view tabs -->
        <div class="tabs mb-md">
          <button class="tab ${this.subView === 'results' ? 'active' : ''}" data-sub="results">${t(tr.day.resultsTab)}</button>
          <button class="tab ${this.subView === 'discussion' ? 'active' : ''}" data-sub="discussion">${t(tr.day.discussionTab)}</button>
          ${this.app.game.hasBombToResolve() ? `
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

    const content = this.container.querySelector('#day-content');
    if (this.subView === 'results') this._renderResults(content);
    else if (this.subView === 'discussion') this._renderDiscussion(content);
    else if (this.subView === 'siesta') this._renderSiesta(content);
    else if (this.subView === 'voting') this._renderVoting(content);
  }

  // ─── Blind Day (1 minute, no challenges) ───
  _renderBlindDay(counts) {
    const game = this.app.game;

    this.container.innerHTML = `
      <div class="view">
        <div class="phase-bar phase-bar--day">
          <span class="phase-bar__icon">☀️</span>
          <span>روز کور</span>
          <span class="phase-bar__round">دور ۱</span>
        </div>

        <div class="stats-row">
          <div class="stat-card stat-card--mafia">
            <div class="stat-card__value">${counts.mafia}</div>
            <div class="stat-card__label">مافیا</div>
          </div>
          <div class="stat-card stat-card--citizen">
            <div class="stat-card__value">${counts.citizen}</div>
            <div class="stat-card__label">شهروند</div>
          </div>
          <div class="stat-card stat-card--independent">
            <div class="stat-card__value">${counts.independent}</div>
            <div class="stat-card__label">مستقل</div>
          </div>
        </div>

        <div class="section">
          <h2 class="section__title">☀️ روز کور — بدون چالش</h2>
          <p class="text-secondary text-center mb-lg" style="font-size: var(--text-sm);">
            بازیکنان ۱ دقیقه فرصت صحبت آزاد دارند. هیچ رأی‌گیری یا چالشی انجام نمی‌شود.
          </p>

          <div class="timer">
            <div class="timer__display" id="blind-timer-display">01:00</div>
            <div class="timer__progress">
              <div class="timer__progress-bar" id="blind-timer-bar" style="width: 100%"></div>
            </div>
            <div class="timer__controls">
              <button class="btn btn--secondary btn--sm" id="btn-blind-start">▶️ شروع</button>
              <button class="btn btn--ghost btn--sm" id="btn-blind-pause">⏸️ توقف</button>
              <button class="btn btn--ghost btn--sm" id="btn-blind-reset">🔄 ریست</button>
            </div>
          </div>
        </div>

        <div class="mt-lg">
          <button class="btn btn--primary btn--lg btn--block" id="btn-end-blind-day">
            🌙 پایان روز کور → شب کور
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
      this.app.navigate('night');
    });
  }

  // ─── Night Results ───
  _renderResults(container) {
    const results = this.app._nightResults;
    const game = this.app.game;

    // Silenced player announcement
    const silencedPlayer = results?.silenced ? game.getPlayer(results.silenced) : null;

    container.innerHTML = `
      <div class="section">
        <h2 class="section__title">📢 اعلام نتایج شب</h2>

        ${results?.salakhied?.correct ? `
          <div class="card card--mafia mb-md" style="border-color: var(--danger);">
            <div class="font-bold mb-sm" style="color: var(--danger);">🗡️ سلاخی:</div>
            <div class="flex items-center gap-sm">
              <span class="dot dot--dead"></span>
              <span class="font-bold">${game.getPlayer(results.salakhied.playerId)?.name || '—'}</span>
              <span>سلاخی شد!</span>
            </div>
          </div>
        ` : results?.salakhied && !results.salakhied.correct ? `
          <div class="card mb-md" style="border-color: var(--warning);">
            <div style="color: var(--warning); font-weight: 600;">🗡️ سلاخی انجام شد اما نادرست بود — کسی حذف نشد.</div>
          </div>
        ` : ''}

        ${results?.killed?.length > 0 ? `
          <div class="card card--mafia mb-md">
            <div class="font-bold mb-sm" style="color: var(--danger);">☠️ کشته‌شدگان شب:</div>
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
            <div style="color: var(--success); font-weight: 600;">✨ کسی در شب نمرد!</div>
          </div>
        `}

        ${results?.shielded?.length > 0 ? `
          <div class="card mb-md" style="border-color: var(--warning);">
            <div class="font-bold mb-sm" style="color: var(--warning);">🛡️ سپر فعال شد:</div>
            <div class="text-secondary" style="font-size: var(--text-sm);">
              یک نفر مورد حمله قرار گرفت اما سپرش ضربه را جذب کرد (سپر از بین رفت)
            </div>
          </div>
        ` : ''}

        ${results?.saved?.length > 0 ? `
          <div class="card mb-md" style="border-color: var(--success);">
            <div class="font-bold mb-sm" style="color: var(--success);">⚕️ نجات‌یافتگان:</div>
            <div class="text-secondary" style="font-size: var(--text-sm);">
              یک نفر مورد حمله قرار گرفت اما نجات یافت (بدون فاش کردن نام)
            </div>
          </div>
        ` : ''}

        ${silencedPlayer ? `
          <div class="card mb-md" style="border-color: var(--warning);">
            <div style="font-weight: 600; color: var(--warning);">
              🤐 ${silencedPlayer.name} امروز حق صحبت ندارد!
            </div>
          </div>
        ` : ''}

        ${results?.revived ? `
          <div class="card mb-md" style="border-color: var(--success);">
            <div style="font-weight: 600; color: var(--success);">
              ✝️ ${game.getPlayer(results.revived)?.name || '—'} زنده شد!
            </div>
          </div>
        ` : ''}

        ${results?.jackCurseTriggered ? `
          <div class="card mb-md" style="border-color: rgba(139,92,246,0.6);">
            <div style="font-weight: 600; color: rgb(139,92,246);">
              🔪 طلسم جک فعال شد — جک هم از بازی خارج شد!
            </div>
          </div>
        ` : ''}

        ${results?.framasonRecruit?.contaminated ? `
          <div class="card mb-md" style="border-color: var(--danger);">
            <div class="font-bold mb-sm" style="color: var(--danger);">🔺 تیم فراماسون آلوده شد!</div>
            <div class="text-secondary" style="font-size: var(--text-sm);">
              فراماسون یک بازیکن خطرناک را بیدار کرد — تمام اعضای تیم فراماسون حذف خواهند شد.
              <br>(دکمه «حل فراماسون» در پایین)
            </div>
          </div>
        ` : ''}

        ${results?.kaneReveal ? `
          <div class="card mb-md" style="border-color: var(--warning); background: rgba(234,179,8,0.08);">
            <div class="font-bold mb-sm" style="color: var(--warning);">🎖️ اعلام همشهری کین:</div>
            <div style="font-size: var(--text-lg); font-weight: 700;">
              به دستور همشهری کین،
              <strong>${results.kaneReveal.targetName}</strong>
              نقش ${results.kaneReveal.roleIcon} <strong>${results.kaneReveal.roleName}</strong> را داشته!
            </div>
            <div class="text-muted mt-sm" style="font-size: var(--text-xs);">هدف در بازی می‌ماند — مردم می‌توانند رأی بدهند. شب بعد همشهری کین حذف می‌شود.</div>
          </div>
        ` : ''}

        <!-- God-only info -->
        <div class="god-dashboard mt-lg">
          <div class="god-dashboard__title">👁️ اطلاعات محرمانه خدا</div>
          
          ${results?.investigated ? `
            <div class="card mb-sm" style="background: var(--bg-glass); font-size: var(--text-sm);">
              🔍 نتیجه استعلام کارآگاه: 
              <strong>${game.getPlayer(results.investigated.playerId)?.name}</strong>
              ← ${results.investigated.result === 'blocked' ? '✊ بلاک شده' : results.investigated.result === 'positive' ? '👍' : '👎'}
            </div>
          ` : ''}

          ${results?.bombed ? `
            <div class="card mb-sm" style="background: var(--bg-glass); font-size: var(--text-sm);">
              💣 بمب روی: <strong>${game.getPlayer(results.bombed)?.name}</strong>
            </div>
          ` : ''}

          ${results?.blocked ? `
            <div class="card mb-sm" style="background: var(--bg-glass); font-size: var(--text-sm);">
              🧙 اقدام خنثی‌شده: <strong>${game.getPlayer(results.blocked)?.name}</strong>
            </div>
          ` : ''}

          ${(() => {
            const jackP = game.players.find(p => p.isAlive && p.roleId === 'jack');
            if (jackP && jackP.curse.isActive) {
              const tTarget = game.getPlayer(jackP.curse.targetId);
              return `<div class="card mb-sm" style="background: rgba(139,92,246,0.08); font-size: var(--text-sm);">
                🔪 طلسم جک روی: <strong>${tTarget?.name || '—'}</strong>
              </div>`;
            }
            return '';
          })()}

          ${game.framason.isActive || game.framason.isContaminated ? `
            <div class="card mb-sm" style="background: rgba(239,68,68,0.08); font-size: var(--text-sm);">
              🔺 تیم فراماسون: <strong>${game.getFramasonAllianceNames().join('، ') || '—'}</strong>
              ${game.framason.isContaminated ? '<span style="color: var(--danger);"> ⚠️ آلوده!</span>' : ''}
            </div>
          ` : ''}

          ${(() => {
            const bullets = game.getActiveBullets();
            if (bullets.length === 0) return '';
            return `<div class="card mb-sm" style="background: rgba(234,179,8,0.08); font-size: var(--text-sm);">
              🔫 تیرهای فعال:
              ${bullets.map(b => `<div style="font-size: var(--text-xs); margin-top: 2px;">
                ${b.type === 'live' ? '🔴 جنگی' : '🟡 مشقی'} → <strong>${b.holderName}</strong>
              </div>`).join('')}
            </div>`;
          })()}
        </div>

        ${game.hasFramasonContamination() ? `
          <button class="btn btn--danger btn--block mt-md" id="btn-resolve-framason">
            🔺 حل فراماسون — حذف تیم آلوده
          </button>
        ` : ''}

        <button class="btn btn--primary btn--block mt-lg" id="btn-go-discussion">
          💬 شروع بحث روز
        </button>
      </div>
    `;

    container.querySelector('#btn-go-discussion')?.addEventListener('click', () => {
      this.subView = 'discussion';
      this.render();
    });

    container.querySelector('#btn-resolve-framason')?.addEventListener('click', () => {
      const { deadIds } = game.resolveFramasonContamination();
      this.app.saveGame();
      if (deadIds.length > 0) {
        const names = deadIds.map(id => game.getPlayer(id)?.name).filter(Boolean).join('، ');
        this.app.showToast(`🔺 تیم فراماسون حذف شد: ${names}`, 'info');
      }
      const winner = game.checkWinCondition();
      if (winner) {
        this.app.navigate('summary');
      } else {
        this.render();
      }
    });
  }

  // ─── Discussion with Timer ───
  _renderDiscussion(container) {
    const game = this.app.game;

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
          🗳️ شروع رأی‌گیری
        </button>
      </div>
    `;

    this._setupTimer(container);
    this._setupMorningShooting(container);

    container.querySelector('#btn-go-voting')?.addEventListener('click', () => {
      this.timer?.stop();

      // Resolve live bullet expiration before voting
      const explosions = this.app.game.resolveLiveExpiration();
      if (explosions.length > 0) {
        this.app.saveGame();
        const names = explosions.map(e => e.holderName).join('، ');
        this.app.showToast(`💥 تیر جنگی منفجر شد: ${names}`, 'error');
        const winner = this.app.game.checkWinCondition();
        if (winner) {
          this.app.navigate('summary');
          return;
        }
      }

      if (this.app.game.hasBombToResolve()) {
        this.subView = 'siesta';
      } else {
        this.subView = 'voting';
      }
      this.render();
    });
  }

  // ─── Voting ───
  _renderVoting(container) {
    const game = this.app.game;
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

      container.querySelector('#btn-execute-runoff')?.addEventListener('click', () => {
        // find max
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
        if (winners.length > 1) {
          // If exactly two candidates tied, offer Shir/Khat (heads/tails) to God
          if (winners.length === 2) {
            const [a, b] = winners;
            const nameA = game.getPlayer(a)?.name || '—';
            const nameB = game.getPlayer(b)?.name || '—';

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
              <div class="modal">
                <div class="modal__title">${t(tr.day.coinTossTitle)}</div>
                <div class="modal__body">${t(tr.day.coinTossChoose)}<br><strong>${nameA} ↔ ${nameB}</strong></div>
                <div class="modal__actions">
                  <button class="btn btn--primary btn--block" id="modal-shir">${t(tr.day.shir)}</button>
                  <button class="btn btn--ghost btn--block" id="modal-khat">${t(tr.day.khat)}</button>
                </div>
              </div>
            `;

            document.body.appendChild(overlay);

            const doCoin = (chosenSide) => {
              const coin = Math.random() < 0.5 ? 'shir' : 'khat';
              const pickedId = (coin === chosenSide) ? a : b;
              const pickedName = game.getPlayer(pickedId)?.name || '—';
              overlay.remove();

              const coinLabel = coin === 'shir' ? t(tr.day.shir) : t(tr.day.khat);
              const title2 = t(tr.day.coinTossTitle);
              const body2 = t(tr.day.coinTossResult).replace('%s', coinLabel).replace('%s', pickedName) + '\n\n' + t(tr.day.executeConfirm).replace('%s', pickedName);

              // Let God confirm execution — do not auto-execute
              this.confirm(title2, body2, () => {
                if (game.isVoteImmune(pickedId)) { this.app.showToast(t(tr.day.immuneVote).replace('%s', pickedName), 'error'); return; }
                const extra = game.eliminateByVote(pickedId);
                this.app.saveGame();
                if (extra.jackCurseTriggered) this.app.showToast(t(tr.day.jackCurseTriggered), 'info');
                const winner = game.checkWinCondition();
                if (winner) this.app.navigate('summary'); else this._goToNextNight();
              });
            };

            overlay.querySelector('#modal-shir')?.addEventListener('click', () => doCoin('shir'));
            overlay.querySelector('#modal-khat')?.addEventListener('click', () => doCoin('khat'));
            overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
            return;
          }

          // fallback: random pick and ask God to confirm execution
          const pick = winners[Math.floor(Math.random() * winners.length)];
          const pickName = game.getPlayer(pick)?.name || '—';
          const tieList = winners.map(id => game.getPlayer(id)?.name).filter(Boolean).join('، ');
          const title = t(tr.day.runoffTie);
          const body = `${tieList}. ${t(tr.day.executeConfirm).replace('%s', pickName)}`;
          this.confirm(title, body, () => {
            if (game.isVoteImmune(pick)) { this.app.showToast(t(tr.day.immuneVote).replace('%s', game.getPlayer(pick)?.name), 'error'); return; }
            const extra = game.eliminateByVote(pick);
            this.app.saveGame();
            if (extra.jackCurseTriggered) this.app.showToast(t(tr.day.jackCurseTriggered), 'info');
            const winner = game.checkWinCondition();
            if (winner) this.app.navigate('summary'); else this._goToNextNight();
          });
          return;
        }

        const targetId = winners[0];
        if (game.isVoteImmune(targetId)) {
          const target = game.getPlayer(targetId);
          this.app.showToast(t(tr.day.immuneVote).replace('%s', target?.name), 'error');
          return;
        }

        this.confirm(t(tr.day.confirmExecution), t(tr.day.executeConfirm).replace('%s', game.getPlayer(targetId)?.name), () => {
          const extra = game.eliminateByVote(targetId);
          this.app.saveGame();
          if (extra.jackCurseTriggered) this.app.showToast(t(tr.day.jackCurseTriggered), 'info');
          const winner = game.checkWinCondition();
          if (winner) this.app.navigate('summary');
          else this._goToNextNight();
        });
      });

      container.querySelector('#btn-cancel-runoff')?.addEventListener('click', () => {
        this.votingPhase = 'first';
        this.render();
      });
      return;
    }
  }

  _showVoteRecorder(container, playerId) {
    const game = this.app.game;
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

  _hasAnyAboveThreshold(threshold) {
    for (const [pid, cnt] of Object.entries(this.voteCounts || {})) {
      if ((cnt || 0) >= threshold) return true;
    }
    return false;
  }

  _goToNextNight() {
    this.app.game.startNight();
    this.app.saveGame();
    this.votedPlayers = {};
    this.subView = 'results';
    this.app.navigate('night');
  }

  _setupTimer(container) {
    const display = container.querySelector('#timer-display');
    const bar = container.querySelector('#timer-bar');

    if (!this.timer) {
      this.timer = new Timer(
        this.app.game.dayTimerDuration,
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
      this.timer.reset(this.app.game.dayTimerDuration);
      this.timerDisplay = Timer.format(this.app.game.dayTimerDuration);
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

      const result = this.app.game.resolveMorningShot(this.morningShooterId, this.morningShootTargetId);
      this.app.saveGame();

      this.morningShootResult = result;
      this.morningShootActive = false;

      const winner = this.app.game.checkWinCondition();
      if (winner) {
        this.app.navigate('summary');
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
    const game = this.app.game;
    const shooter = game.getPlayer(this.morningShooterId);
    if (!shooter) return '';

    const targets = game.getAlivePlayers().filter(p => p.id !== this.morningShooterId);

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
    const game = this.app.game;

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
        if (winner) { this.app.navigate('summary'); return; }
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
        if (winner) { this.app.navigate('summary'); return; }
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
    return this.app.game.players.some(p => p.isAlive && p.roleId === roleId);
  }

  destroy() {
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
