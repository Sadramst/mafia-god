/**
 * Game.js — Core game state machine
 *
 * Phases: setup → roleReveal → night ↔ day → ended
 */
import { Player } from './Player.js';
import { Roles } from './Roles.js';

export class Game {

  constructor() {
    this.reset();
  }

  /** Reset everything for a new game */
  reset() {
    Player.resetIdCounter();
    this.players = [];
    this.round = 0;
    this.phase = 'setup'; // setup | roleReveal | blindDay | blindNight | night | day | ended
    this.winner = null;    // 'mafia' | 'citizen' | 'independent' | null
    this.history = [];     // Array of round events
    this.nightActions = {}; // { roleId: { actorId, targetId } }
    this.votes = {};       // { voterId: targetId }
    this.selectedRoles = {}; // { roleId: count }
    this.currentNightStep = 0;
    this.nightSteps = [];
    this.dayTimerDuration = 180; // seconds
    this.defenseTimerDuration = 60;
    this.blindDayDuration = 60;  // 1 minute for blind day
    this.constantineUsed = false;
    this.gunnerUsed = false;
    this._lastDrWatsonTarget = null;
    this._lastDrLecterTarget = null;
    this.zodiacFrequency = 'every'; // 'every' | 'odd' | 'even'
  }

  // ──────────────────────────────────
  //  SETUP PHASE
  // ──────────────────────────────────

  /** Add a player by name */
  addPlayer(name) {
    if (!name || !name.trim()) return null;
    const player = new Player(name);
    this.players.push(player);
    return player;
  }

  /** Remove a player by ID */
  removePlayer(playerId) {
    this.players = this.players.filter(p => p.id !== playerId);
  }

  /** Set the selected roles with counts: { godfather: 1, simpleMafia: 2, ... } */
  setSelectedRoles(roles) {
    this.selectedRoles = { ...roles };
  }

  /** Get total role count */
  getTotalRoleCount() {
    return Object.values(this.selectedRoles).reduce((s, c) => s + c, 0);
  }

  /** Validate setup before starting */
  validateSetup() {
    const errors = [];
    if (this.players.length < 4) {
      errors.push('حداقل ۴ بازیکن نیاز است.');
    }
    const totalRoles = this.getTotalRoleCount();
    if (totalRoles !== this.players.length) {
      errors.push(`تعداد نقش‌ها (${totalRoles}) با تعداد بازیکنان (${this.players.length}) برابر نیست.`);
    }
    // Ensure at least one mafia
    const mafiaCount = Object.entries(this.selectedRoles)
      .filter(([id]) => Roles.get(id)?.team === 'mafia')
      .reduce((s, [, c]) => s + c, 0);
    if (mafiaCount === 0) {
      errors.push('حداقل یک نقش مافیا باید انتخاب شود.');
    }
    return errors;
  }

  /** Randomly assign roles to players */
  assignRolesRandomly() {
    // Build a pool of role IDs
    const pool = [];
    for (const [roleId, count] of Object.entries(this.selectedRoles)) {
      for (let i = 0; i < count; i++) {
        pool.push(roleId);
      }
    }
    // Shuffle (Fisher-Yates)
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    // Assign + initialize shields
    this.players.forEach((player, idx) => {
      player.roleId = pool[idx];
      const roleDef = Roles.get(pool[idx]);
      player.initShield(roleDef);
    });
    this.phase = 'roleReveal';
  }

  // ──────────────────────────────────
  //  BLIND PHASE (روز و شب کور)
  // ──────────────────────────────────

  /** Start blind day — 1 min, no challenges */
  startBlindDay() {
    this.phase = 'blindDay';
    this._addHistory('blind_day', '☀️ روز کور آغاز شد — ۱ دقیقه بدون چالش.');
  }

  /** Start blind night — only mafia wakes to meet each other */
  startBlindNight() {
    this.round = 1;
    this.phase = 'blindNight';
    this.nightActions = {};
    this.currentNightStep = 0;

    // Clear Jack's telesm at the start of every night
    this._clearJackTelesm();

    // Blind night: only mafia recognition + Jack telesm
    this.nightSteps = this._buildBlindNightSteps();
    this._addHistory('night_start', '🌙 شب کور — فقط تیم مافیا بیدار می‌شوند.');
  }

  /** Build steps for blind night (mafia meet + Jack telesm) */
  _buildBlindNightSteps() {
    const steps = [];

    // Mafia recognition step (no target needed, just awareness)
    const mafiaPlayers = this.players.filter(
      p => p.isAlive && Roles.get(p.roleId)?.team === 'mafia'
    );
    if (mafiaPlayers.length > 0) {
      steps.push({
        roleId: 'mafiaReveal',
        roleName: 'تیم مافیا',
        roleIcon: '🔴',
        actionType: 'mafiaReveal',
        actors: mafiaPlayers.map(a => a.id),
        targetId: null,
        completed: false,
      });
    }

    // Jack places telesm even on blind night
    const jackPlayer = this.players.find(p => p.isAlive && p.roleId === 'jack');
    if (jackPlayer) {
      steps.push({
        roleId: 'jack',
        roleName: 'جک',
        roleIcon: '🔪',
        actionType: 'telesm',
        actors: [jackPlayer.id],
        targetId: null,
        completed: false,
      });
    }

    return steps;
  }

  // ──────────────────────────────────
  //  NIGHT PHASE
  // ──────────────────────────────────

  /** Start a new night */
  startNight() {
    this.round++;
    this.phase = 'night';
    this.nightActions = {};
    this.votes = {};
    this.currentNightStep = 0;

    // Clear Jack's telesm at the start of every night
    this._clearJackTelesm();

    // Reset per-night flags for alive players
    this.players.forEach(p => {
      if (p.isAlive) p.resetNightFlags();
    });

    // Build night steps based on active roles
    this.nightSteps = this._buildNightSteps();

    this._addHistory('night_start', `🌙 شب ${this.round} آغاز شد.`);
  }

  /** Clear Jack's telesm for the new night */
  _clearJackTelesm() {
    const jackPlayer = this.players.find(p => p.isAlive && p.roleId === 'jack');
    if (jackPlayer) {
      jackPlayer.telesm.clear();
    }
  }

  /** Check if Zodiac can shoot this round based on frequency setting */
  _canZodiacShoot() {
    if (this.zodiacFrequency === 'every') return true;
    if (this.zodiacFrequency === 'odd') return this.round % 2 === 1;
    if (this.zodiacFrequency === 'even') return this.round % 2 === 0;
    return true;
  }

  /** Build ordered night action steps */
  _buildNightSteps() {
    const nightRoles = Roles.getNightRoles();
    const steps = [];

    for (const role of nightRoles) {
      // Check if any alive player has this role
      const actors = this.players.filter(
        p => p.isAlive && p.roleId === role.id
      );
      if (actors.length === 0) continue;

      // Special: skip constantine if already used
      if (role.id === 'constantine' && this.constantineUsed) continue;

      // Special: skip zodiac if not their turn based on frequency
      if (role.id === 'zodiac' && !this._canZodiacShoot()) continue;

      steps.push({
        roleId: role.id,
        roleName: role.name,
        roleIcon: role.icon,
        actionType: role.nightAction,
        actors: actors.map(a => a.id),
        targetId: null,
        completed: false,
      });
    }
    return steps;
  }

  /** Get the current night step */
  getCurrentNightStep() {
    return this.nightSteps[this.currentNightStep] || null;
  }

  /** Record a night action and advance to next step
   * @param {number} targetId — Target player ID
   * @param {object} [extra] — Optional extra data (e.g. { mode: 'salakhi', guessedRoleId: 'detective' })
   */
  recordNightAction(targetId, extra = {}) {
    const step = this.getCurrentNightStep();
    if (!step) return;

    step.targetId = targetId;
    step.completed = true;
    this.nightActions[step.roleId] = {
      actorIds: step.actors,
      targetId,
      actionType: step.actionType,
      ...extra,
    };
    this.currentNightStep++;
  }

  /** Skip current night step (no action) */
  skipNightAction() {
    const step = this.getCurrentNightStep();
    if (!step) return;
    step.completed = true;
    step.targetId = null;
    this.currentNightStep++;
  }

  /** Check if all night steps are done */
  isNightComplete() {
    return this.currentNightStep >= this.nightSteps.length;
  }

  /** Resolve all night actions and determine results */
  resolveNight() {
    const results = {
      killed: [],
      saved: [],
      shielded: [],       // Players whose shield absorbed a hit
      investigated: null,
      silenced: null,
      blocked: null,
      bombed: null,
      revived: null,
      protected: null,
      salakhied: null,    // { playerId, correct: boolean }
    };

    const actions = this.nightActions;

    // 1. Sorcerer blocks someone's action
    if (actions.sorcerer?.targetId) {
      const blockedId = actions.sorcerer.targetId;
      results.blocked = blockedId;
      // Find which role the blocked player has and remove their action
      const blockedPlayer = this.getPlayer(blockedId);
      if (blockedPlayer) {
        // Remove the blocked player's action
        for (const [roleId, action] of Object.entries(actions)) {
          if (action.actorIds?.includes(blockedId) && roleId !== 'sorcerer') {
            delete actions[roleId];
          }
        }
      }
    }

    // 2. Bodyguard protects
    if (actions.bodyguard?.targetId) {
      const protectedPlayer = this.getPlayer(actions.bodyguard.targetId);
      if (protectedPlayer) {
        protectedPlayer.protected = true;
        results.protected = actions.bodyguard.targetId;
      }
    }

    // 3. Dr Watson heals
    if (actions.drWatson?.targetId) {
      const healedPlayer = this.getPlayer(actions.drWatson.targetId);
      if (healedPlayer) {
        healedPlayer.healed = true;
        results.saved.push(actions.drWatson.targetId);
      }
      this._lastDrWatsonTarget = actions.drWatson.targetId;
    }

    // 4. Dr Lecter heals mafia
    if (actions.drLecter?.targetId) {
      const target = this.getPlayer(actions.drLecter.targetId);
      if (target && Roles.get(target.roleId)?.team === 'mafia') {
        target.healed = true;
      }
      this._lastDrLecterTarget = actions.drLecter.targetId;
    }

    // 5. Godfather action — Shoot OR Salakhi (سلاخی)
    if (actions.godfather?.targetId) {
      const targetId = actions.godfather.targetId;
      const target = this.getPlayer(targetId);
      const isSalakhi = actions.godfather.mode === 'salakhi';

      if (target && isSalakhi) {
        // ── Salakhi — guess exact role ──
        const guessedRoleId = actions.godfather.guessedRoleId;
        const isCorrect = target.roleId === guessedRoleId;
        results.salakhied = { playerId: targetId, correct: isCorrect };

        if (isCorrect) {
          // Salakhi bypasses doctor, shield, bodyguard — instant kill
          target.kill(this.round, 'salakhi');
          results.killed.push(targetId);
          this._addHistory('death', `🗡️ ${target.name} سلاخی شد. (${Roles.get(target.roleId)?.name})`);
        } else {
          this._addHistory('salakhi_fail', `🗡️ سلاخی نادرست بود — ${target.name} زنده ماند.`);
        }
      } else if (target) {
        // ── Regular mafia shoot ──
        const targetRole = Roles.get(target.roleId);

        // Jack & Zodiac are immune to mafia shoot
        if (targetRole?.shootImmune) {
          this._addHistory('immune', `🔫 شلیک مافیا به ${target.name} تأثیری نداشت (مصونیت).`);
        } else if (target.healed) {
          results.saved.push(targetId);
          this._addHistory('save', `⚕️ ${target.name} توسط دکتر نجات یافت.`);
        } else if (target.protected) {
          // Bodyguard dies instead
          const bodyguardId = actions.bodyguard?.actorIds?.[0];
          if (bodyguardId) {
            const bodyguard = this.getPlayer(bodyguardId);
            if (bodyguard) {
              const died = bodyguard.tryKill(this.round, 'bodyguard_sacrifice');
              if (died) {
                results.killed.push(bodyguardId);
                this._addHistory('death', `🛡️ ${bodyguard.name} (محافظ) جان خود را فدا کرد.`);
              } else {
                results.shielded.push(bodyguardId);
                this._addHistory('shield', `🛡️ سپر ${bodyguard.name} ضربه را جذب کرد.`);
              }
            }
          }
        } else {
          // Check shield before killing
          const died = target.tryKill(this.round, 'mafia');
          if (died) {
            results.killed.push(targetId);
            this._addHistory('death', `🔫 ${target.name} توسط مافیا کشته شد.`);
          } else {
            results.shielded.push(targetId);
            this._addHistory('shield', `🛡️ سپر ${target.name} شلیک مافیا را دفع کرد.`);
          }
        }
      }
    }

    // 6. Jack places telesm (no kill — Jack's telesm links his fate to target)
    if (actions.jack?.targetId) {
      const jackPlayer = this.players.find(p => p.isAlive && p.roleId === 'jack');
      if (jackPlayer) {
        jackPlayer.telesm.place(actions.jack.targetId);
        const telesmTarget = this.getPlayer(actions.jack.targetId);
        this._addHistory('telesm', `🔪 جک طلسم خود را روی ${telesmTarget?.name || '—'} گذاشت.`);
      }
    }

    // 7. Zodiac kills (special: if target IS the bodyguard role, Zodiac dies, bodyguard lives)
    if (actions.zodiac?.targetId) {
      const targetId = actions.zodiac.targetId;
      const target = this.getPlayer(targetId);
      const zodiacId = actions.zodiac.actorIds[0];
      const zodiacPlayer = this.getPlayer(zodiacId);

      if (target && target.isAlive && zodiacPlayer) {
        if (target.roleId === 'bodyguard') {
          // Zodiac shot the bodyguard → Zodiac dies, bodyguard survives
          zodiacPlayer.kill(this.round, 'zodiac_bodyguard');
          results.killed.push(zodiacId);
          this._addHistory('death', `♈ زودیاک به محافظ شلیک کرد و خودش حذف شد.`);
        } else if (target.healed) {
          results.saved.push(targetId);
        } else {
          const died = target.tryKill(this.round, 'zodiac');
          if (died) {
            results.killed.push(targetId);
            this._addHistory('death', `♈ ${target.name} توسط زودیاک کشته شد.`);
          } else {
            results.shielded.push(targetId);
            this._addHistory('shield', `🛡️ سپر ${target.name} حمله زودیاک را دفع کرد.`);
          }
        }
      }
    }

    // 8. Sniper
    if (actions.sniper?.targetId) {
      const targetId = actions.sniper.targetId;
      const target = this.getPlayer(targetId);
      const sniperId = actions.sniper.actorIds[0];
      const sniperPlayer = this.getPlayer(sniperId);

      if (target && sniperPlayer) {
        const targetTeam = Roles.get(target.roleId)?.team;
        if (targetTeam === 'mafia' || targetTeam === 'independent') {
          // Correct shot — check target's shield
          const died = target.tryKill(this.round, 'sniper');
          if (died) {
            results.killed.push(targetId);
            this._addHistory('death', `🎯 ${target.name} توسط تک‌تیرانداز کشته شد.`);
          } else {
            results.shielded.push(targetId);
            this._addHistory('shield', `🛡️ سپر ${target.name} تیر تک‌تیرانداز را دفع کرد.`);
          }
        } else {
          // Wrong shot — sniper dies (check sniper's own shield)
          const died = sniperPlayer.tryKill(this.round, 'sniper_miss');
          if (died) {
            results.killed.push(sniperId);
            this._addHistory('death', `🎯 تک‌تیرانداز اشتباه زد و خودش مرد.`);
          }
        }
      }
    }

    // 9. Detective investigates
    if (actions.detective?.targetId) {
      const targetId = actions.detective.targetId;
      const target = this.getPlayer(targetId);
      if (target) {
        const role = Roles.get(target.roleId);
        // Godfather appears as citizen
        const appearsAs = target.roleId === 'godfather' ? 'citizen' : role?.team;
        results.investigated = { playerId: targetId, result: appearsAs };
        this._addHistory('investigate', `🔍 کارآگاه ${target.name} را بررسی کرد: ${Roles.getTeamName(appearsAs)}`);
      }
    }

    // 10. Matador silences
    if (actions.matador?.targetId) {
      const target = this.getPlayer(actions.matador.targetId);
      if (target) {
        target.silenced = true;
        results.silenced = actions.matador.targetId;
        this._addHistory('silence', `🤐 ${target.name} توسط ماتادور سکوت شد.`);
      }
    }

    // 11. Bomber plants bomb
    if (actions.bomber?.targetId) {
      const target = this.getPlayer(actions.bomber.targetId);
      if (target) {
        target.bombed = true;
        results.bombed = actions.bomber.targetId;
        this._addHistory('bomb', `💣 بمب روی ${target.name} کار گذاشته شد.`);
      }
    }

    // 12. Constantine revives
    if (actions.constantine?.targetId) {
      const target = this.getPlayer(actions.constantine.targetId);
      if (target && !target.isAlive) {
        target.revive();
        results.revived = actions.constantine.targetId;
        this.constantineUsed = true;
        this._addHistory('revive', `✝️ ${target.name} توسط کنستانتین زنده شد.`);
      }
    }

    // Check for bomber chain reaction
    for (const killedId of [...results.killed]) {
      const killedPlayer = this.getPlayer(killedId);
      if (killedPlayer?.roleId === 'bomber') {
        // Bomber died → find bombed player
        const bombedPlayer = this.players.find(p => p.bombed && p.isAlive);
        if (bombedPlayer) {
          bombedPlayer.kill(this.round, 'bomb');
          results.killed.push(bombedPlayer.id);
          this._addHistory('death', `💥 ${bombedPlayer.name} با انفجار بمب کشته شد.`);
        }
      }
    }

    // Check Jack's telesm chain reaction — if telesm target died, Jack dies too
    results.jackTelesmTriggered = false;
    const jackPlayer = this.players.find(p => p.isAlive && p.roleId === 'jack');
    if (jackPlayer && jackPlayer.telesm.isActive) {
      for (const killedId of results.killed) {
        if (jackPlayer.telesm.isTriggeredBy(killedId)) {
          jackPlayer.kill(this.round, 'telesm');
          results.killed.push(jackPlayer.id);
          results.jackTelesmTriggered = true;
          const telesmTarget = this.getPlayer(killedId);
          this._addHistory('death', `🔪 ${telesmTarget?.name} کشته شد و به همراه آن جک هم از بازی خارج شد (طلسم).`);
          break;
        }
      }
    }

    return results;
  }

  // ──────────────────────────────────
  //  DAY PHASE
  // ──────────────────────────────────

  /** Start day phase */
  startDay() {
    this.phase = 'day';
    this.votes = {};
    this._addHistory('day_start', `☀️ روز ${this.round} آغاز شد.`);
  }

  /** Cast a vote: voter votes to eliminate target */
  castVote(voterId, targetId) {
    this.votes[voterId] = targetId;
  }

  /** Remove a vote */
  removeVote(voterId) {
    delete this.votes[voterId];
  }

  /** Get vote tally: { playerId: voteCount } */
  getVoteTally() {
    const tally = {};
    for (const [voterId, targetId] of Object.entries(this.votes)) {
      if (!targetId) continue;
      // Kane's vote counts double
      const voter = this.getPlayer(Number(voterId));
      const weight = voter?.roleId === 'kane' ? 2 : 1;
      tally[targetId] = (tally[targetId] || 0) + weight;
    }
    return tally;
  }

  /** Check if a player is immune to day voting */
  isVoteImmune(playerId) {
    const player = this.getPlayer(playerId);
    if (!player) return false;
    const role = Roles.get(player.roleId);
    return role?.voteImmune === true;
  }

  /** Eliminate a player by vote. Returns extra info (e.g. telesm triggered). */
  eliminateByVote(playerId) {
    const player = this.getPlayer(playerId);
    if (!player) return {};

    // Jack is immune to vote
    if (this.isVoteImmune(playerId)) {
      this._addHistory('vote_immune', `⚖️ رأی‌گیری علیه ${player.name} — اما حذف نشد (مصونیت از رأی).`);
      return { voteImmune: true };
    }

    player.kill(this.round, 'vote');
    this._addHistory('death', `⚖️ ${player.name} با رأی‌گیری اعدام شد. (${Roles.get(player.roleId)?.name})`);

    const extra = {};

    // Bomber chain
    if (player.roleId === 'bomber') {
      const bombedPlayer = this.players.find(p => p.bombed && p.isAlive);
      if (bombedPlayer) {
        bombedPlayer.kill(this.round, 'bomb');
        this._addHistory('death', `💥 ${bombedPlayer.name} با انفجار بمب کشته شد.`);
      }
    }

    // Jack telesm chain — if voted-out player was Jack's telesm target
    const jackPlayer = this.players.find(p => p.isAlive && p.roleId === 'jack');
    if (jackPlayer && jackPlayer.telesm.isTriggeredBy(playerId)) {
      jackPlayer.kill(this.round, 'telesm');
      extra.jackTelesmTriggered = true;
      this._addHistory('death', `🔪 ${player.name} اعدام شد و جک هم به همراه او از بازی خارج شد (طلسم).`);
    }

    return extra;
  }

  /** Gunner shoots during day (one-time ability) */
  gunnerShoot(targetId) {
    if (this.gunnerUsed) return false;
    const target = this.getPlayer(targetId);
    if (!target || !target.isAlive) return false;

    target.kill(this.round, 'gunner');
    this.gunnerUsed = true;
    this._addHistory('death', `🔫 ${target.name} توسط تفنگدار کشته شد.`);
    return true;
  }

  // ──────────────────────────────────
  //  WIN CONDITION
  // ──────────────────────────────────

  /** Check if someone has won */
  checkWinCondition() {
    const alive = this.players.filter(p => p.isAlive);
    const mafiaAlive = alive.filter(p => Roles.get(p.roleId)?.team === 'mafia');
    const citizenAlive = alive.filter(p => Roles.get(p.roleId)?.team === 'citizen');
    const independentAlive = alive.filter(p => Roles.get(p.roleId)?.team === 'independent');

    // All mafia dead and no independent threats
    if (mafiaAlive.length === 0 && independentAlive.length === 0) {
      this.winner = 'citizen';
      this.phase = 'ended';
      this._addHistory('win', '🏆 تیم شهروند پیروز شد!');
      return 'citizen';
    }

    // Mafia >= citizens (mafia wins)
    if (mafiaAlive.length >= citizenAlive.length + independentAlive.length) {
      this.winner = 'mafia';
      this.phase = 'ended';
      this._addHistory('win', '🏆 تیم مافیا پیروز شد!');
      return 'mafia';
    }

    // Independent alone with one other (edge case)
    if (independentAlive.length > 0 && alive.length <= 2 && mafiaAlive.length === 0) {
      this.winner = 'independent';
      this.phase = 'ended';
      this._addHistory('win', '🏆 بازیکن مستقل پیروز شد!');
      return 'independent';
    }

    return null;
  }

  // ──────────────────────────────────
  //  HELPERS
  // ──────────────────────────────────

  /** Get a player by ID */
  getPlayer(id) {
    return this.players.find(p => p.id === id);
  }

  /** Get alive players */
  getAlivePlayers() {
    return this.players.filter(p => p.isAlive);
  }

  /** Get dead players */
  getDeadPlayers() {
    return this.players.filter(p => !p.isAlive);
  }

  /** Get players by team (alive only) */
  getTeamPlayers(team) {
    return this.players.filter(p => p.isAlive && Roles.get(p.roleId)?.team === team);
  }

  /** Get team counts */
  getTeamCounts() {
    const alive = this.getAlivePlayers();
    return {
      mafia: alive.filter(p => Roles.get(p.roleId)?.team === 'mafia').length,
      citizen: alive.filter(p => Roles.get(p.roleId)?.team === 'citizen').length,
      independent: alive.filter(p => Roles.get(p.roleId)?.team === 'independent').length,
      total: alive.length,
    };
  }

  /** Can Dr Watson heal this target? (not same as last night) */
  canDrWatsonHeal(targetId) {
    return this._lastDrWatsonTarget !== targetId;
  }

  /** Can Dr Lecter heal this target? (not same as last night) */
  canDrLecterHeal(targetId) {
    return this._lastDrLecterTarget !== targetId;
  }

  /** Add a history entry */
  _addHistory(type, text) {
    this.history.push({
      round: this.round,
      phase: this.phase,
      type,
      text,
      timestamp: Date.now(),
    });
  }

  /** Get history for a specific round */
  getHistoryForRound(round) {
    return this.history.filter(h => h.round === round);
  }

  // ──────────────────────────────────
  //  SERIALIZATION
  // ──────────────────────────────────

  /** Serialize the game state */
  toJSON() {
    return {
      players: this.players.map(p => p.toJSON()),
      round: this.round,
      phase: this.phase,
      winner: this.winner,
      history: this.history,
      selectedRoles: this.selectedRoles,
      constantineUsed: this.constantineUsed,
      gunnerUsed: this.gunnerUsed,
      dayTimerDuration: this.dayTimerDuration,
      defenseTimerDuration: this.defenseTimerDuration,
      blindDayDuration: this.blindDayDuration,
      zodiacFrequency: this.zodiacFrequency,
      _lastDrWatsonTarget: this._lastDrWatsonTarget,
      _lastDrLecterTarget: this._lastDrLecterTarget,
    };
  }

  /** Load from saved data */
  loadFromJSON(data) {
    this.players = data.players.map(p => Player.fromJSON(p));
    this.round = data.round;
    this.phase = data.phase;
    this.winner = data.winner;
    this.history = data.history || [];
    this.selectedRoles = data.selectedRoles || {};
    this.constantineUsed = data.constantineUsed || false;
    this.gunnerUsed = data.gunnerUsed || false;
    this.dayTimerDuration = data.dayTimerDuration || 180;
    this.defenseTimerDuration = data.defenseTimerDuration || 60;
    this.blindDayDuration = data.blindDayDuration || 60;
    this.zodiacFrequency = data.zodiacFrequency || 'every';
    this._lastDrWatsonTarget = data._lastDrWatsonTarget || null;
    this._lastDrLecterTarget = data._lastDrLecterTarget || null;

    // Restore Player ID counter
    const maxId = Math.max(0, ...this.players.map(p => p.id));
    Player._nextId = maxId + 1;
  }
}
