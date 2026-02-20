/**
 * NightView.js — Night phase: God's action dashboard + step-by-step role actions
 */
import { BaseView } from './BaseView.js';
import { Roles } from '../models/Roles.js';

export class NightView extends BaseView {

  constructor(container, app) {
    super(container, app);
    this.selectedTargets = {}; // stepIndex → playerId
    this.showDashboard = true;
    this.godfatherMode = null;  // null | 'shoot' | 'salakhi'
    this.salakhiGuessRoleId = null; // Guessed role ID for salakhi
  }

  render() {
    const game = this.app.game;
    const counts = game.getTeamCounts();

    this.container.innerHTML = `
      <div class="view">
        <!-- Phase Bar -->
        <div class="phase-bar phase-bar--night">
          <span class="phase-bar__icon">🌙</span>
          <span>شب ${game.round}</span>
          <span class="phase-bar__round">دور ${game.round}</span>
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

        <!-- God Dashboard Toggle -->
        <button class="btn btn--ghost btn--block mb-md" id="btn-toggle-dashboard">
          ${this.showDashboard ? '🙈 مخفی کردن داشبورد' : '👁️ نمایش داشبورد خدا'}
        </button>

        ${this.showDashboard ? this._renderDashboard() : ''}

        <!-- Night Steps -->
        <div class="section">
          <h2 class="section__title">🎬 اقدامات شبانه</h2>
          <div class="stepper" id="night-stepper">
            ${this._renderSteps()}
          </div>
        </div>

        <!-- Resolve / Continue -->
        <div class="mt-lg">
          ${game.isNightComplete() ? `
            <button class="btn btn--primary btn--lg btn--block" id="btn-resolve-night">
              ☀️ حل شب و رفتن به روز
            </button>
          ` : `
            <div class="text-center text-muted" style="font-size: var(--text-sm);">
              مراحل شبانه را کامل کنید
            </div>
          `}
        </div>
      </div>
    `;

    this._attachEvents();
  }

  _renderDashboard() {
    const game = this.app.game;
    return `
      <div class="god-dashboard">
        <div class="god-dashboard__title">👁️ داشبورد خدا — فقط شما می‌بینید</div>
        <div class="god-dashboard__grid">
          ${game.players.map(p => {
            const role = Roles.get(p.roleId);
            const team = role?.team || 'citizen';
            return `
              <div class="god-player god-player--${team} ${!p.isAlive ? 'god-player--dead' : ''}">
                <span class="dot ${p.isAlive ? 'dot--alive' : 'dot--dead'}"></span>
                <span class="god-player__name">${p.name}</span>
                <span class="god-player__role">${role?.icon || ''} ${role?.name || ''}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  _renderSteps() {
    const game = this.app.game;
    const steps = game.nightSteps;

    if (steps.length === 0) {
      return `<div class="empty-state"><div class="empty-state__text">هیچ نقشی با اقدام شبانه فعال نیست</div></div>`;
    }

    return steps.map((step, idx) => {
      const isActive = idx === game.currentNightStep;
      const isCompleted = step.completed;
      const isPending = idx > game.currentNightStep;
      const role = Roles.get(step.roleId);

      // Determine valid targets
      let targets = game.getAlivePlayers();

      // Filter targets based on role
      if (step.roleId === 'drLecter') {
        targets = targets.filter(p => Roles.get(p.roleId)?.team === 'mafia');
        targets = targets.filter(p => game.canDrLecterHeal(p.id));
      } else if (step.roleId === 'drWatson') {
        targets = targets.filter(p => game.canDrWatsonHeal(p.id));
      } else if (step.roleId === 'constantine') {
        targets = game.getDeadPlayers();
      } else if (step.roleId === 'godfather') {
        // Filter based on which mode is selected
        targets = targets.filter(p => !step.actors.includes(p.id));
        targets = targets.filter(p => Roles.get(p.roleId)?.team !== 'mafia');

        if (this.godfatherMode === 'shoot') {
          // Regular shoot: exclude shoot-immune roles (Jack, Zodiac)
          targets = targets.filter(p => !Roles.get(p.roleId)?.shootImmune);
        }
        // Salakhi: all non-mafia alive players (including Jack/Zodiac)
      }

      const selectedTarget = this.selectedTargets[idx];

      return `
        <div class="step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}">
          <div class="step__header">
            <span class="step__icon">${role?.icon || '❓'}</span>
            <div>
              <div class="step__title">${step.roleName} بیدار شود</div>
              <div class="step__subtitle">${this._getActionDescription(step.actionType)}</div>
            </div>
          </div>
          <div class="step__body">
            ${isCompleted ? `
              <div class="chip" style="color: var(--success);">
                ✓ ${step.targetId ? `هدف: ${game.getPlayer(step.targetId)?.name || '—'}` : 'رد شد'}
              </div>
            ` : isActive ? this._renderActiveStep(step, idx, targets, selectedTarget) : `
              <div class="text-muted" style="font-size: var(--text-sm);">در انتظار...</div>
            `}
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Render the active step body.
   * For godfather: shows mode selection (shoot vs salakhi) + target + optional role guess.
   * For other roles: shows standard target selection.
   */
  _renderActiveStep(step, idx, targets, selectedTarget) {
    // ── Godfather special UI ──
    if (step.roleId === 'godfather') {
      return this._renderGodfatherStep(idx, targets, selectedTarget);
    }

    // ── Standard step UI ──
    return `
      <div class="target-grid">
        ${targets.map(t => `
          <button class="target-btn ${selectedTarget === t.id ? 'selected' : ''}" 
                  data-step="${idx}" data-target="${t.id}">
            ${t.name}
          </button>
        `).join('')}
      </div>
      <div class="flex gap-sm mt-md">
        <button class="btn btn--primary btn--block btn--sm" 
                data-action="confirm-step" data-step="${idx}"
                ${!selectedTarget ? 'disabled' : ''}>
          ✓ تأیید
        </button>
        <button class="btn btn--ghost btn--sm" data-action="skip-step" data-step="${idx}">
          رد شدن
        </button>
      </div>
    `;
  }

  /**
   * Render Godfather's special step: choose between shoot and salakhi,
   * then target selection, and role guess (salakhi only).
   */
  _renderGodfatherStep(idx, targets, selectedTarget) {
    const game = this.app.game;

    // Step 1: Mode selection
    const modeButtons = `
      <div class="flex gap-sm mb-md">
        <button class="btn ${this.godfatherMode === 'shoot' ? 'btn--primary' : 'btn--ghost'} btn--sm btn--block"
                data-gf-mode="shoot">
          🔫 شلیک
        </button>
        <button class="btn ${this.godfatherMode === 'salakhi' ? 'btn--danger' : 'btn--ghost'} btn--sm btn--block"
                data-gf-mode="salakhi">
          🗡️ سلاخی
        </button>
      </div>
    `;

    if (!this.godfatherMode) {
      return `
        <div class="text-muted mb-sm" style="font-size: var(--text-sm);">ابتدا نوع اقدام را انتخاب کنید:</div>
        ${modeButtons}
        <button class="btn btn--ghost btn--sm" data-action="skip-step" data-step="${idx}">
          رد شدن
        </button>
      `;
    }

    // Step 2: Target selection
    const targetGrid = `
      <div class="target-grid">
        ${targets.map(t => `
          <button class="target-btn ${selectedTarget === t.id ? 'selected' : ''}" 
                  data-step="${idx}" data-target="${t.id}">
            ${t.name}
          </button>
        `).join('')}
      </div>
    `;

    // Step 3 (salakhi only): Role guess
    let roleGuessUI = '';
    if (this.godfatherMode === 'salakhi' && selectedTarget) {
      const allRoles = Object.values(Roles.ALL).filter(r => r.team !== 'mafia');
      roleGuessUI = `
        <div class="mt-md">
          <div class="text-muted mb-sm" style="font-size: var(--text-sm);">نقش حدس‌زده:</div>
          <div class="target-grid">
            ${allRoles.map(r => `
              <button class="role-guess-btn ${this.salakhiGuessRoleId === r.id ? 'selected' : ''}"
                      data-guess-role="${r.id}">
                ${r.icon} ${r.name}
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Confirm conditions
    const canConfirm = this.godfatherMode === 'shoot'
      ? !!selectedTarget
      : !!selectedTarget && !!this.salakhiGuessRoleId;

    return `
      ${modeButtons}
      ${this.godfatherMode === 'salakhi' ? `
        <div class="card mb-sm" style="background: rgba(220,38,38,0.1); border-color: var(--danger); font-size: var(--text-xs); padding: 8px 12px;">
          ⚠️ در شب سلاخی مافیا شلیک ندارد. اگر حدس درست باشد هدف حذف می‌شود (دکتر و سپر تأثیری ندارد).
        </div>
      ` : ''}
      ${targetGrid}
      ${roleGuessUI}
      <div class="flex gap-sm mt-md">
        <button class="btn btn--primary btn--block btn--sm" 
                data-action="confirm-step" data-step="${idx}"
                ${!canConfirm ? 'disabled' : ''}>
          ✓ تأیید
        </button>
        <button class="btn btn--ghost btn--sm" data-action="skip-step" data-step="${idx}">
          رد شدن
        </button>
      </div>
    `;
  }

  _getActionDescription(actionType) {
    const descriptions = {
      kill: 'شلیک یا سلاخی — نوع اقدام را انتخاب کنید',
      mafiaHeal: 'یک عضو مافیا را برای نجات انتخاب کنید',
      bomb: 'روی چه کسی بمب بگذارد؟',
      spy: 'یک بازیکن را برای جاسوسی انتخاب کنید',
      silence: 'چه کسی را سکوت کند؟',
      block: 'اقدام شبانه چه کسی را خنثی کند؟',
      heal: 'چه کسی را نجات دهد؟',
      investigate: 'چه کسی را استعلام کند؟',
      protect: 'از چه کسی محافظت کند؟',
      snipe: 'چه کسی را نشانه بگیرد؟',
      soloKill: 'چه کسی را بکشد؟',
      revive: 'چه کسی را زنده کند؟',
    };
    return descriptions[actionType] || 'یک بازیکن انتخاب کنید';
  }

  _attachEvents() {
    const game = this.app.game;

    // Toggle dashboard
    this.container.querySelector('#btn-toggle-dashboard')?.addEventListener('click', () => {
      this.showDashboard = !this.showDashboard;
      this.render();
    });

    // Target selection
    this.container.querySelectorAll('.target-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const step = Number(btn.dataset.step);
        const target = Number(btn.dataset.target);
        this.selectedTargets[step] = target;
        // Reset role guess when target changes (salakhi)
        if (this.godfatherMode === 'salakhi') {
          this.salakhiGuessRoleId = null;
        }
        this.render();
      });
    });

    // Godfather mode selection (shoot / salakhi)
    this.container.querySelectorAll('[data-gf-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        const newMode = btn.dataset.gfMode;
        this.godfatherMode = newMode;
        // Reset target and guess when switching mode
        const gfStep = game.nightSteps.findIndex(s => s.roleId === 'godfather');
        if (gfStep >= 0) {
          delete this.selectedTargets[gfStep];
        }
        this.salakhiGuessRoleId = null;
        this.render();
      });
    });

    // Salakhi role guess selection
    this.container.querySelectorAll('.role-guess-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.salakhiGuessRoleId = btn.dataset.guessRole;
        this.render();
      });
    });

    // Confirm step
    this.container.querySelectorAll('[data-action="confirm-step"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const stepIdx = Number(btn.dataset.step);
        const targetId = this.selectedTargets[stepIdx];
        if (targetId) {
          const step = game.nightSteps[stepIdx];
          // Pass extra data for godfather (mode + guessed role)
          if (step?.roleId === 'godfather' && this.godfatherMode) {
            const extra = { mode: this.godfatherMode };
            if (this.godfatherMode === 'salakhi') {
              extra.guessedRoleId = this.salakhiGuessRoleId;
            }
            game.recordNightAction(targetId, extra);
            // Reset godfather state
            this.godfatherMode = null;
            this.salakhiGuessRoleId = null;
          } else {
            game.recordNightAction(targetId);
          }
          this.render();
        }
      });
    });

    // Skip step
    this.container.querySelectorAll('[data-action="skip-step"]').forEach(btn => {
      btn.addEventListener('click', () => {
        game.skipNightAction();
        this.render();
      });
    });

    // Resolve night
    this.container.querySelector('#btn-resolve-night')?.addEventListener('click', () => {
      const results = game.resolveNight();
      game.startDay();
      this.app.saveGame();

      // Check win before going to day
      const winner = game.checkWinCondition();
      if (winner) {
        this.app.navigate('summary');
      } else {
        // Store results to show on day view
        this.app._nightResults = results;
        this.app.navigate('day');
      }
    });
  }

  destroy() {
    this.selectedTargets = {};
    this.showDashboard = true;
    this.godfatherMode = null;
    this.salakhiGuessRoleId = null;
  }
}
