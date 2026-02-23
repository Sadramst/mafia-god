/**
 * NightView.js — Night phase: God's action dashboard + step-by-step role actions
 */
import { BaseView } from './BaseView.js';
import { Roles } from '../models/Roles.js';
import { t, translations as tr } from '../utils/i18n.js';
import { Settings, Language } from '../utils/Settings.js';

export class NightView extends BaseView {

  constructor(container, app) {
    super(container, app);
    this.selectedTargets = {}; // stepIndex → playerId
    this.showDashboard = true;
    this.godfatherMode = null;  // null | 'shoot' | 'salakhi'
    this.salakhiGuessRoleId = null; // Guessed role ID for salakhi
    this.bombPassword = null;  // 1–4 password for bomber
    this.gunnerAssignments = []; // Array of { holderId, type } for multi-bullet
    this.gunnerCurrentType = null; // 'blank' | 'live' — type being assigned
  }

  render() {
    const game = this.app.game;

    // Auto-skip reporter step if godfather didn't negotiate this night
    while (true) {
      const cur = game.getCurrentNightStep();
      if (cur && cur.roleId === 'reporter' && !cur.completed) {
        const gfAction = game.nightActions.godfather;
        if (!gfAction || gfAction.mode !== 'negotiate') {
          game.recordNightAction(null);
          continue;
        }
      }
      break;
    }

    const counts = game.getTeamCounts();
    const isBlind = game.phase === 'blindNight';

    this.container.innerHTML = `
      <div class="view">
        <!-- Phase Bar -->
        <div class="phase-bar phase-bar--night">
          <span class="phase-bar__icon">🌙</span>
          <span>${isBlind ? t(tr.night.blindNightTitle) : t(tr.night.title).replace('%d', String(game.round))}</span>
          <span class="phase-bar__round">${t(tr.night.roundNumber).replace('%d', String(game.round))}</span>
        </div>

        <!-- Stats -->
        <div class="stats-row">
          <div class="stat-card stat-card--mafia">
            <div class="stat-card__value">${counts.mafia}</div>
              <div class="stat-card__label">${t(tr.setup.mafia)}</div>
          </div>
          <div class="stat-card stat-card--citizen">
            <div class="stat-card__value">${counts.citizen}</div>
              <div class="stat-card__label">${t(tr.setup.citizen)}</div>
          </div>
          <div class="stat-card stat-card--independent">
            <div class="stat-card__value">${counts.independent}</div>
              <div class="stat-card__label">${t(tr.setup.independent)}</div>
          </div>
        </div>

        <!-- God Dashboard Toggle -->
        <button class="btn btn--ghost btn--block mb-md" id="btn-toggle-dashboard">
          ${this.showDashboard ? t(tr.night.hideDashboard) : t(tr.night.showDashboard)}
        </button>

        ${this.showDashboard ? this._renderDashboard() : ''}

        <!-- Night Steps -->
        <div class="section">
          <h2 class="section__title">${isBlind ? t(tr.night.blindNightTitle) : t(tr.night.nightActionsTitle)}</h2>
          <div class="stepper" id="night-stepper">
            ${this._renderSteps()}
          </div>
        </div>

        <!-- Resolve / Continue -->
        <div class="mt-lg">
          ${game.isNightComplete() ? `
            <button class="btn btn--primary btn--lg btn--block" id="btn-resolve-night">
              ${isBlind ? t(tr.night.endBlindNight) : t(tr.night.resolveNightGoToDay)}
            </button>
          ` : `
            <div class="text-center text-muted" style="font-size: var(--text-sm);">
              ${t(tr.night.completeSteps)}
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
        <div class="god-dashboard__title">${t(tr.night.godDashboardTitle)}</div>
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

  _renderSteps() {
    const game = this.app.game;
    const steps = game.nightSteps;

    if (steps.length === 0) {
      return `<div class="empty-state"><div class="empty-state__text">${t(tr.night.noActiveRoles)}</div></div>`;
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
        // Constantine: only allow selecting players who died in the previous night
        // (these are revivable players). Do NOT include pending targets from the
        // current night — Constantine cannot revive someone killed this same night.
        targets = game.getRevivablePlayers();
      } else if (step.roleId === 'jadoogar') {
        // Jadoogar can only target citizens and independents, not same person as last night
        targets = targets.filter(p => {
          const role = Roles.get(p.roleId);
          return (role?.team === 'citizen' || role?.team === 'independent')
            && p.id !== game._jadoogarLastBlockedId;
        });
      } else if (step.roleId === 'godfather') {
        // Godfather: allow selecting any alive player as target for shoot (including mafia and self),
        // except roles immune to night shots when in 'shoot' mode. For 'salakhi', restrict guesses
        // to non-mafia roles as before.
        if (this.godfatherMode === 'shoot') {
          // Regular shoot: allow targeting anyone except shoot-immune roles (Jack, Zodiac)
          targets = targets.filter(p => !Roles.get(p.roleId)?.shootImmune);
        } else if (this.godfatherMode === 'salakhi') {
          // Salakhi: all non-mafia alive players (including Jack/Zodiac)
          targets = targets.filter(p => Roles.get(p.roleId)?.team !== 'mafia');
        } else {
          // No mode selected yet — default to allowing all alive players as potential targets
          targets = targets;
        }
      }

      const selectedTarget = this.selectedTargets[idx];

      return `
        <div class="step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}">
          <div class="step__header">
            <span class="step__icon">${role?.icon || '❓'}</span>
            <div>
              <div class="step__title">${step.roleName} ${t(tr.night.wakeUp)}</div>
                <div class="step__subtitle">${this._getActionDescription(step.actionType)}</div>
            </div>
          </div>
          <div class="step__body">
              ${isCompleted ? `
                <div class="chip" style="color: var(--success);">
                  ${t(tr.night.targetSelected).replace('%s', step.targetId ? (game.getPlayer(step.targetId)?.name || '—') : t(tr.night.skipped))}
                </div>
              ` : isActive ? this._renderActiveStep(step, idx, targets, selectedTarget) : `
                <div class="text-muted" style="font-size: var(--text-sm);">${t(tr.night.waiting)}</div>
              `}
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Render the active step body.
   * For godfather: shows mode selection (shoot vs salakhi) + target + optional role guess.
   * For mafiaReveal: shows mafia members to each other.
   * For jack (curse): shows curse target selection.
   * For other roles: shows standard target selection.
   */
  _renderActiveStep(step, idx, targets, selectedTarget) {
    const game = this.app.game;

    // ── Mafia reveal (blind night) ──
    if (step.actionType === 'mafiaReveal') {
      const mafiaMembers = step.actors.map(id => {
        const p = game.getPlayer(id);
        const role = Roles.get(p?.roleId);
        return `<div class="flex items-center gap-sm mb-sm">
          <span>${role?.icon || '🔴'}</span>
          <span class="font-bold">${p?.name || '—'}</span>
          <span class="text-muted" style="font-size: var(--text-xs);">${Settings.getLanguage() === Language.ENGLISH ? `<span class="ltr-inline">${role?.getLocalizedName() || ''}</span>` : (role?.getLocalizedName() || '')}</span>
        </div>`;
      });
      return `
        <div class="card mb-md" style="border-color: var(--mafia); background: rgba(220,38,38,0.06);">
          <div class="font-bold mb-sm" style="color: var(--mafia);">${t(tr.night.mafiaTeamMembers)}</div>
          ${mafiaMembers.join('')}
        </div>
        <div class="text-muted mb-sm" style="font-size: var(--text-xs);">${t(tr.night.mafiaKnowEachOther)}</div>
        <button class="btn btn--primary btn--block btn--sm" data-action="confirm-step" data-step="${idx}">
          ${t(tr.night.confirmButton)}
        </button>
      `;
    }

    // ── Jack curse ──
    if (step.actionType === 'curse') {
      // Jack can target any alive player except himself and the person he targeted last night
      const jackPlayer = game.players.find(p => p.isAlive && p.roleId === 'jack');
      const lastTarget = jackPlayer?.curse?.lastTargetId ?? null;
      const curseTargets = game.getAlivePlayers().filter(p => {
        if (step.actors.includes(p.id)) return false; // exclude actor (Jack himself)
        if (lastTarget && p.id === lastTarget) return false; // exclude last night's target
        return true;
      });
      return `
        <div class="card mb-sm" style="background: rgba(139,92,246,0.08); border-color: rgba(139,92,246,0.3); font-size: var(--text-xs); padding: 8px 12px;">
          ${t(tr.night.jackCurseDescription)}
        </div>
        <div class="target-grid">
          ${curseTargets.map(t => `
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
            ${t(tr.night.confirmCurse)}
          </button>
          <button class="btn btn--ghost btn--sm" data-action="skip-step" data-step="${idx}">
            ${t(tr.night.skipAction)}
          </button>
        </div>
      `;
    }

    // ── Godfather special UI ──
    if (step.roleId === 'godfather') {
      return this._renderGodfatherStep(idx, targets, selectedTarget);
    }

    // ── Bomber special UI (target + password) ──
    if (step.roleId === 'bomber') {
      return this._renderBomberStep(idx, targets, selectedTarget);
    }

    // ── Framason special UI (recruit) ──
    if (step.roleId === 'freemason') {
      return this._renderFramasonStep(idx, targets, selectedTarget);
    }

    // ── Gunner special UI (multi-bullet assignment) ──
    if (step.roleId === 'gunner') {
      return this._renderGunnerStep(idx, targets, selectedTarget);
    }

    // ── Reporter special UI (check negotiation result) ──
    if (step.roleId === 'reporter') {
      return this._renderReporterStep(idx);
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
          ${t(tr.night.confirmButton)}
        </button>
        <button class="btn btn--ghost btn--sm" data-action="skip-step" data-step="${idx}">
          ${t(tr.night.skipAction)}
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
    const canNegotiate = game.canNegotiate();

    // Step 1: Mode selection
    const modeButtons = `
      <div class="flex gap-sm mb-md" style="flex-wrap: wrap;">
        <button class="btn ${this.godfatherMode === 'shoot' ? 'btn--primary' : 'btn--ghost'} btn--sm btn--block"
                data-gf-mode="shoot">
          ${t(tr.night.godfatherShoot)}
        </button>
        <button class="btn ${this.godfatherMode === 'salakhi' ? 'btn--danger' : 'btn--ghost'} btn--sm btn--block"
                data-gf-mode="salakhi">
          ${t(tr.night.godfatherSalakhi)}
        </button>
        ${canNegotiate ? `
          <button class="btn ${this.godfatherMode === 'negotiate' ? 'btn--warning' : 'btn--ghost'} btn--sm btn--block"
                  data-gf-mode="negotiate">
            ${t(tr.night.godfatherNegotiate)}
          </button>
        ` : ''}
      </div>
    `;

    if (!this.godfatherMode) {
      return `
        <div class="text-muted mb-sm" style="font-size: var(--text-sm);">${t(tr.night.selectActionFirst)}</div>
        ${modeButtons}
        <button class="btn btn--ghost btn--sm" data-action="skip-step" data-step="${idx}">
          ${t(tr.night.skipAction)}
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
          <div class="text-muted mb-sm" style="font-size: var(--text-sm);">${t(tr.night.guessedRole)}</div>
          <div class="target-grid">
            ${allRoles.map(r => `
              <button class="role-guess-btn ${this.salakhiGuessRoleId === r.id ? 'selected' : ''}"
                      data-guess-role="${r.id}">
                ${r.icon} ${Settings.getLanguage() === Language.ENGLISH ? `<span class="ltr-inline">${r.getLocalizedName()}</span>` : r.getLocalizedName()}
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Info card per mode
    let modeInfoCard = '';
    if (this.godfatherMode === 'salakhi') {
      modeInfoCard = `
        <div class="card mb-sm" style="background: rgba(220,38,38,0.1); border-color: var(--danger); font-size: var(--text-xs); padding: 8px 12px;">
          ${t(tr.night.salakhiWarning)}
        </div>
      `;
    } else if (this.godfatherMode === 'negotiate') {
      modeInfoCard = `
        <div class="card mb-sm" style="background: rgba(234,179,8,0.1); border-color: var(--warning); font-size: var(--text-xs); padding: 8px 12px;">
          ${t(tr.night.negotiateInfo)}
        </div>
      `;
    }

    // Confirm conditions
    let canConfirm;
    if (this.godfatherMode === 'salakhi') {
      canConfirm = !!selectedTarget && !!this.salakhiGuessRoleId;
    } else {
      canConfirm = !!selectedTarget;
    }

    return `
      ${modeButtons}
      ${modeInfoCard}
      ${targetGrid}
      ${roleGuessUI}
      <div class="flex gap-sm mt-md">
        <button class="btn btn--primary btn--block btn--sm" 
                data-action="confirm-step" data-step="${idx}"
                ${!canConfirm ? 'disabled' : ''}>
          ${t(tr.night.confirmButton)}
        </button>
        <button class="btn btn--ghost btn--sm" data-action="skip-step" data-step="${idx}">
          ${t(tr.night.skipAction)}
        </button>
      </div>
    `;
  }

  /**
   * Render Bomber's special step: target selection + password (1–4).
   */
  _renderBomberStep(idx, targets, selectedTarget) {
    return `
      <div class="card mb-sm" style="background: rgba(220,38,38,0.06); border-color: var(--danger); font-size: var(--text-xs); padding: 8px 12px;">
        ${t(tr.night.bomberDescription)}
      </div>
      <div class="target-grid">
        ${targets.map(t => `
          <button class="target-btn ${selectedTarget === t.id ? 'selected' : ''}" 
                  data-step="${idx}" data-target="${t.id}">
            ${t.name}
          </button>
        `).join('')}
      </div>
      ${selectedTarget ? `
        <div class="mt-md">
          <div class="text-muted mb-sm" style="font-size: var(--text-sm);">${t(tr.night.bombPassword)}</div>
          <div class="flex gap-sm">
            ${[1,2,3,4].map(n => `
              <button class="btn btn--sm ${this.bombPassword === n ? 'btn--danger' : 'btn--ghost'} btn--block"
                      data-bomb-pass="${n}">${n}</button>
            `).join('')}
          </div>
        </div>
      ` : ''}
      <div class="flex gap-sm mt-md">
        <button class="btn btn--primary btn--block btn--sm" 
                data-action="confirm-step" data-step="${idx}"
                ${!selectedTarget || !this.bombPassword ? 'disabled' : ''}>
          ${t(tr.night.confirmBomb)}
        </button>
        <button class="btn btn--ghost btn--sm" data-action="skip-step" data-step="${idx}">
          ${t(tr.night.skipAction)}
        </button>
      </div>
    `;
  }

  /**
   * Render Framason's special step: show alliance + recruit target selection.
   */
  _renderFramasonStep(idx, targets, selectedTarget) {
    const game = this.app.game;
    const framason = game.framason;

    // Show current alliance
    const allianceNames = game.getFramasonAllianceNames();
    const remaining = framason.maxMembers - framason.memberCount;

    // Exclude leader + current members from targets
    const excludeIds = framason.allianceIds;
    const recruitTargets = game.getAlivePlayers().filter(p => !excludeIds.includes(p.id));

    return `
      <div class="card mb-sm" style="background: rgba(239,68,68,0.06); border-color: rgba(239,68,68,0.3); font-size: var(--text-xs); padding: 8px 12px;">
        ${t(tr.night.framasonWarning)}
      </div>
      <div class="card mb-md" style="border-color: rgba(239,68,68,0.3);">
        <div class="font-bold mb-sm" style="color: var(--danger);">${t(tr.night.framasonTeam).replace('%d', String(allianceNames.length))}</div>
        <div class="text-secondary" style="font-size: var(--text-sm);">
          ${allianceNames.join('، ') || '—'}
        </div>
        <div class="text-muted mt-sm" style="font-size: var(--text-xs);">
          ${t(tr.night.framasonCapacity).replace('%d', String(remaining))}
        </div>
      </div>
      <div class="target-grid">
        ${recruitTargets.map(t => `
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
          ${t(tr.night.wakeAndAddToTeam)}
        </button>
        <button class="btn btn--ghost btn--sm" data-action="skip-step" data-step="${idx}">
          ${t(tr.night.skipRecruitment)}
        </button>
      </div>
    `;
  }

  /**
   * Render Gunner's special step: multi-bullet assignment.
   * God can assign as many bullets as available, max one per person.
   */
  _renderGunnerStep(idx, targets, selectedTarget) {
    const game = this.app.game;
    const bm = game.bulletManager;

    // Calculate remaining after pending assignments
    const pendingBlank = this.gunnerAssignments.filter(a => a.type === 'blank').length;
    const pendingLive = this.gunnerAssignments.filter(a => a.type === 'live').length;
    const blankLeft = bm.blankRemaining - pendingBlank;
    const liveLeft = bm.liveRemaining - pendingLive;
    const totalLeft = blankLeft + liveLeft;

    // Exclude self + already assigned players from targets
    const gunnerActors = game.nightSteps[idx]?.actors || [];
    const assignedIds = this.gunnerAssignments.map(a => a.holderId);
    const bulletTargets = game.getAlivePlayers().filter(p =>
      !gunnerActors.includes(p.id) && !assignedIds.includes(p.id)
    );

    // Assigned bullets summary
    const assignedList = this.gunnerAssignments.map((a, i) => {
      const p = game.getPlayer(a.holderId);
      const label = a.type === 'live'
        ? t(tr.setup.gunnerLiveBullets).replace(':', '')
        : t(tr.setup.gunnerBlankBullets).replace(':', '');
      return `<div class="flex items-center gap-sm mb-sm" style="font-size: var(--text-sm);">
        ${label} → <strong>${p?.name || '—'}</strong>
        <button class="btn btn--ghost btn--sm" data-remove-assignment="${i}" style="padding: 2px 8px; font-size: var(--text-xs);">✕</button>
      </div>`;
    }).join('');

    // Type selection for adding a new bullet
    const typeButtons = totalLeft > 0 && bulletTargets.length > 0 ? `
      <div class="text-muted mb-sm mt-md" style="font-size: var(--text-sm);">${t(tr.night.addBullet)}</div>
      <div class="flex gap-sm mb-md">
        <button class="btn ${this.gunnerCurrentType === 'blank' ? 'btn--primary' : 'btn--ghost'} btn--sm btn--block"
                data-gunner-type="blank"
                ${blankLeft <= 0 ? 'disabled' : ''}>
          ${t(tr.night.blankBullet).replace('%d', String(blankLeft))}
        </button>
        <button class="btn ${this.gunnerCurrentType === 'live' ? 'btn--danger' : 'btn--ghost'} btn--sm btn--block"
                data-gunner-type="live"
                ${liveLeft <= 0 ? 'disabled' : ''}>
          ${t(tr.night.liveBullet).replace('%d', String(liveLeft))}
        </button>
      </div>
    ` : '';

    // Target grid (only shown when a type is selected)
    const targetGrid = this.gunnerCurrentType && bulletTargets.length > 0 ? `
      <div class="target-grid">
        ${bulletTargets.map(t => `
          <button class="target-btn" data-gunner-assign="${t.id}">
            ${t.name}
          </button>
        `).join('')}
      </div>
    ` : '';

    return `
      <div class="card mb-sm" style="background: rgba(234,179,8,0.08); border-color: rgba(234,179,8,0.3); font-size: var(--text-xs); padding: 8px 12px;">
        ${t(tr.night.gunnerDescription)}
      </div>

      <div class="card mb-sm" style="font-size: var(--text-sm); padding: 8px 12px;">
        ${t(tr.night.gunnerInventory)} 🟡 <strong>${blankLeft}</strong> · 🔴 <strong>${liveLeft}</strong>
      </div>

      ${this.gunnerAssignments.length > 0 ? `
        <div class="card mb-sm" style="border-color: rgba(234,179,8,0.4); padding: 8px 12px;">
          <div class="font-bold mb-sm" style="font-size: var(--text-sm);">${t(tr.night.assignedBullets)}</div>
          ${assignedList}
        </div>
      ` : ''}

      ${typeButtons}
      ${targetGrid}

      <div class="flex gap-sm mt-md">
        <button class="btn btn--primary btn--block btn--sm"
                data-action="confirm-step" data-step="${idx}"
                ${this.gunnerAssignments.length === 0 ? 'disabled' : ''}>
          ${t(tr.night.confirmBullets).replace('%d', String(this.gunnerAssignments.length))}
        </button>
        <button class="btn btn--ghost btn--sm" data-action="skip-step" data-step="${idx}">
          ${t(tr.night.skipGunner)}
        </button>
      </div>
    `;
  }

  /**
   * Render Reporter's informational step: show whether negotiation succeeded.
   * Reads the already-recorded godfather action to determine the result.
   */
  _renderReporterStep(idx) {
    const game = this.app.game;
    const gfAction = game.nightActions.godfather;

    let negotiationSuccess = false;
    if (gfAction?.mode === 'negotiate' && gfAction?.targetId) {
      const target = game.getPlayer(gfAction.targetId);
      negotiationSuccess = target && (target.roleId === 'simpleCitizen' || target.roleId === 'suspect');
    }

    const resultIcon = negotiationSuccess ? '👍' : '👎';
    const resultText = negotiationSuccess
      ? t(tr.night.negotiationSuccess)
      : t(tr.night.negotiationFailed);
    const resultColor = negotiationSuccess ? 'var(--success)' : 'var(--danger)';

    return `
      <div class="card mb-md" style="border-color: ${resultColor}; text-align: center;">
        <div style="font-size: 48px; margin-bottom: var(--space-sm);">${resultIcon}</div>
        <div class="font-bold" style="color: ${resultColor}; font-size: var(--text-lg);">
          ${resultText}
        </div>
      </div>
      <div class="text-muted mb-sm" style="font-size: var(--text-xs);">${t(tr.night.showToReporter)}</div>
      <button class="btn btn--primary btn--block btn--sm" data-action="confirm-step" data-step="${idx}">
        ${t(tr.night.confirmButton)}
      </button>
    `;
  }

  /**
   * Show a full-screen announcement overlay for the God to read aloud
   * when mafia is negotiating (buying a player).
   */
  _showNegotiateAnnouncement() {
    const overlay = document.createElement('div');
    overlay.className = 'negotiate-overlay';
    overlay.innerHTML = `
      <div class="negotiate-overlay__content">
        <div style="font-size: 64px; margin-bottom: var(--space-md);">📢</div>
        <div class="negotiate-overlay__title">${t(tr.night.announceAloud)}</div>
        <div class="negotiate-overlay__text">${t(tr.night.mafiaIsNegotiating)}</div>
        <button class="btn btn--warning btn--lg btn--block mt-lg negotiate-overlay__dismiss">
          ${t(tr.night.announced)}
        </button>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('.negotiate-overlay__dismiss').addEventListener('click', () => {
      overlay.remove();
      this.render();
    });
  }

  _getActionDescription(actionType) {
    // Prefer translations from the shared night dictionary; fall back to a generic prompt
    const maybe = tr.night && tr.night[actionType];
    if (maybe) return t(maybe);
    return t(tr.night.selectTarget);
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

    // Bomb password selection
    this.container.querySelectorAll('[data-bomb-pass]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.bombPassword = Number(btn.dataset.bombPass);
        this.render();
      });
    });

    // Gunner bullet type selection
    this.container.querySelectorAll('[data-gunner-type]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.gunnerCurrentType = btn.dataset.gunnerType;
        this.render();
      });
    });

    // Gunner assign bullet to target
    this.container.querySelectorAll('[data-gunner-assign]').forEach(btn => {
      btn.addEventListener('click', () => {
        const holderId = Number(btn.dataset.gunnerAssign);
        if (this.gunnerCurrentType) {
          this.gunnerAssignments.push({ holderId, type: this.gunnerCurrentType });
          this.gunnerCurrentType = null; // Reset type for next assignment
          this.render();
        }
      });
    });

    // Gunner remove assignment
    this.container.querySelectorAll('[data-remove-assignment]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.removeAssignment);
        this.gunnerAssignments.splice(idx, 1);
        this.render();
      });
    });

    // Confirm step
    this.container.querySelectorAll('[data-action="confirm-step"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const stepIdx = Number(btn.dataset.step);
        const step = game.nightSteps[stepIdx];

        // mafiaReveal: no target needed, just confirm
        if (step?.actionType === 'mafiaReveal') {
          game.recordNightAction(null);
          this.render();
          return;
        }

        // Reporter: informational only, no target
        if (step?.actionType === 'checkNegotiation') {
          game.recordNightAction(null);
          this.render();
          return;
        }

        const targetId = this.selectedTargets[stepIdx];

        // Gunner: multi-bullet, no single targetId needed
        if (step?.roleId === 'gunner' && this.gunnerAssignments.length > 0) {
          game.recordNightAction(null, { bulletAssignments: [...this.gunnerAssignments] });
          this.gunnerAssignments = [];
          this.gunnerCurrentType = null;
          this.render();
          return;
        }

        if (targetId) {
          // Pass extra data for godfather (mode + guessed role)
          if (step?.roleId === 'godfather' && this.godfatherMode) {
            const extra = { mode: this.godfatherMode };
            if (this.godfatherMode === 'salakhi') {
              extra.guessedRoleId = this.salakhiGuessRoleId;
            }
            const wasNegotiate = this.godfatherMode === 'negotiate';
            game.recordNightAction(targetId, extra);
            // Reset godfather state
            this.godfatherMode = null;
            this.salakhiGuessRoleId = null;
            // Show loud announcement overlay when negotiating
            if (wasNegotiate) {
              this._showNegotiateAnnouncement();
              return; // render will happen when overlay is dismissed
            }
          } else if (step?.roleId === 'bomber' && this.bombPassword) {
            game.recordNightAction(targetId, { bombPassword: this.bombPassword });
            this.bombPassword = null;
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
      const isBlind = game.phase === 'blindNight';

      if (isBlind) {
        // Blind night: resolve curse placement only, then go to day
        const results = game.resolveNight();
        game.startDay();
        this.app.saveGame();
        this.app._nightResults = results;
        this.app.navigate('day');
        return;
      }

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
    this.bombPassword = null;
    this.gunnerAssignments = [];
    this.gunnerCurrentType = null;
  }
}
