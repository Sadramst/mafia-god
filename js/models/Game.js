/**
 * Game.js — Core game state machine
 *
 * Phases: setup → roleReveal → night ↔ day → ended
 */
import { Player } from './Player.js';
import { Roles } from './Roles.js';
import { Bomb } from './Bomb.js';
import { Framason } from './Framason.js';
import { BulletManager } from './BulletManager.js';

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
    this.bulletManager = new BulletManager();
    this.gunnerBlankMax = 2;
    this.gunnerLiveMax = 2;
    this.jackMorningShotImmune = false;
    this.zodiacMorningShotImmune = false;
    this.bomb = new Bomb();          // One-time bomb mechanic
    this.framason = new Framason();   // Freemason alliance mechanic
    this.framasonMaxMembers = 2;     // Configurable in settings
    this.negotiatorThreshold = 2;    // Negotiate unlocks when alive mafia <= this
    this.drWatsonSelfHealMax = 2;   // Max times Dr Watson can heal self
    this.drLecterSelfHealMax = 2;   // Max times Dr Lecter can heal self
    this._drWatsonSelfHealCount = 0; // Times Dr Watson has healed self
    this._drLecterSelfHealCount = 0; // Times Dr Lecter has healed self
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

    // Initialize framason if present
    const framasonPlayer = this.players.find(p => p.roleId === 'freemason');
    if (framasonPlayer) {
      this.framason.init(framasonPlayer.id, this.framasonMaxMembers);
    }

    // Initialize gunner if present
    const gunnerPlayer = this.players.find(p => p.roleId === 'gunner');
    if (gunnerPlayer) {
      this.bulletManager.init(this.gunnerBlankMax, this.gunnerLiveMax);
    }

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

    // Clear Jack's curse at the start of every night
    this._clearJackCurse();

    // Blind night: only mafia recognition + Jack curse
    this.nightSteps = this._buildBlindNightSteps();
    this._addHistory('night_start', '🌙 شب کور — فقط تیم مافیا بیدار می‌شوند.');
  }

  /** Build steps for blind night (mafia meet + Jack curse) */
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

    // Jack places curse even on blind night
    const jackPlayer = this.players.find(p => p.isAlive && p.roleId === 'jack');
    if (jackPlayer) {
      steps.push({
        roleId: 'jack',
        roleName: 'جک',
        roleIcon: '🔪',
        actionType: 'curse',
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

    // Clear Jack's curse at the start of every night
    this._clearJackCurse();

    // Reset per-night flags for alive players
    this.players.forEach(p => {
      if (p.isAlive) p.resetNightFlags();
    });

    // Build night steps based on active roles
    this.nightSteps = this._buildNightSteps();

    this._addHistory('night_start', `🌙 شب ${this.round} آغاز شد.`);
  }

  /** Clear Jack's curse for the new night */
  _clearJackCurse() {
    const jackPlayer = this.players.find(p => p.isAlive && p.roleId === 'jack');
    if (jackPlayer) {
      jackPlayer.curse.clear();
    }
  }

  /** Check if negotiation option is available (negotiator alive + alive mafia <= threshold) */
  canNegotiate() {
    const negotiatorAlive = this.players.some(p => p.isAlive && p.roleId === 'negotiator');
    if (!negotiatorAlive) return false;
    const mafiaAlive = this.players.filter(p => p.isAlive && Roles.get(p.roleId)?.team === 'mafia').length;
    return mafiaAlive <= this.negotiatorThreshold;
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

      // Special: skip bomber if bomb already used
      if (role.id === 'bomber' && this.bomb.isUsed) continue;

      // Special: skip zodiac if not their turn based on frequency
      if (role.id === 'zodiac' && !this._canZodiacShoot()) continue;

      // Special: skip gunner if no bullets remain
      if (role.id === 'gunner' && !this.bulletManager.hasBullets) continue;

      // Special: skip freemason if can't recruit (dead, max reached, or contaminated)
      if (role.id === 'freemason' && !this.framason.canRecruit) continue;

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

    // 2. (Bodyguard has no night action — abilities are bomb-guess & zodiac-immunity)

    // 3. Dr Watson heals
    if (actions.drWatson?.targetId) {
      const healedPlayer = this.getPlayer(actions.drWatson.targetId);
      if (healedPlayer) {
        healedPlayer.healed = true;
        results.saved.push(actions.drWatson.targetId);
      }
      // Track self-heal count
      const watsonId = actions.drWatson.actorIds?.[0];
      if (watsonId && actions.drWatson.targetId === watsonId) {
        this._drWatsonSelfHealCount++;
      }
    }

    // 4. Dr Lecter heals mafia
    if (actions.drLecter?.targetId) {
      const target = this.getPlayer(actions.drLecter.targetId);
      if (target && Roles.get(target.roleId)?.team === 'mafia') {
        target.healed = true;
      }
      // Track self-heal count
      const lecterId = actions.drLecter.actorIds?.[0];
      if (lecterId && actions.drLecter.targetId === lecterId) {
        this._drLecterSelfHealCount++;
      }
    }

    // 5. Godfather action — Shoot, Salakhi, or Negotiate
    if (actions.godfather?.targetId) {
      const targetId = actions.godfather.targetId;
      const target = this.getPlayer(targetId);
      const mode = actions.godfather.mode; // 'shoot' | 'salakhi' | 'negotiate'

      if (target && mode === 'salakhi') {
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
      } else if (target && mode === 'negotiate') {
        // ── Negotiate — recruit simpleCitizen or suspect ──
        const isRecruitable = target.roleId === 'simpleCitizen' || target.roleId === 'suspect';
        results.negotiated = { playerId: targetId, success: isRecruitable };
        if (isRecruitable) {
          target.roleId = 'simpleMafia';
          this._addHistory('negotiate', `🤝 ${target.name} توسط مذاکره به تیم مافیا پیوست.`);
        } else {
          this._addHistory('negotiate_fail', `🤝 مذاکره با ${target.name} شکست خورد — شلیک مافیا از دست رفت.`);
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

    // 6. Jack places curse (no kill — Jack's curse links his fate to target)
    if (actions.jack?.targetId) {
      const jackPlayer = this.players.find(p => p.isAlive && p.roleId === 'jack');
      if (jackPlayer) {
        jackPlayer.curse.place(actions.jack.targetId);
        const curseTarget = this.getPlayer(actions.jack.targetId);
        this._addHistory('curse', `🔪 جک طلسم خود را روی ${curseTarget?.name || '—'} گذاشت.`);
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
        // Godfather appears as citizen, Suspect appears as mafia
        let appearsAs;
        if (target.roleId === 'godfather') {
          appearsAs = 'citizen';
        } else if (target.roleId === 'suspect') {
          appearsAs = 'mafia';
        } else {
          appearsAs = role?.team;
        }
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

    // 11. Bomber plants bomb (one-time, with password)
    if (actions.bomber?.targetId && !this.bomb.isUsed) {
      const target = this.getPlayer(actions.bomber.targetId);
      const password = actions.bomber.bombPassword;
      if (target && password) {
        this.bomb.plant(target.id, password);
        results.bombed = actions.bomber.targetId;
        this._addHistory('bomb', `💣 بمب روی ${target.name} کار گذاشته شد (رمز: ${password}).`);
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

    // 13. Framason recruits
    if (actions.freemason?.targetId) {
      const recruitId = actions.freemason.targetId;
      const recruit = this.getPlayer(recruitId);
      if (recruit) {
        const recruitRole = Roles.get(recruit.roleId);
        const res = this.framason.recruit(recruitId, recruit.roleId, recruitRole?.team);
        results.framasonRecruit = {
          recruitId,
          safe: res.safe,
          contaminated: res.contaminated,
        };
        if (res.safe) {
          this._addHistory('framason', `🔺 فراماسون ${recruit.name} را به تیم اضافه کرد.`);
        } else {
          this._addHistory('framason', `🔺⚠️ فراماسون ${recruit.name} را بیدار کرد — تیم آلوده شد!`);
        }
      }
    }

    // 14. Gunner gives bullets (multiple per night, max 1 per person)
    if (actions.gunner?.bulletAssignments) {
      const assignments = actions.gunner.bulletAssignments;
      results.gunnerBullets = [];
      for (const assignment of assignments) {
        const res = this.gunnerGiveBullet(assignment.holderId, assignment.type);
        results.gunnerBullets.push({ holderId: assignment.holderId, type: assignment.type, success: res.success });
      }
    } else if (actions.gunner?.targetId) {
      // Legacy single-bullet fallback
      const holderId = actions.gunner.targetId;
      const bulletType = actions.gunner.bulletType || 'blank';
      const res = this.gunnerGiveBullet(holderId, bulletType);
      results.gunnerBullets = [{ holderId, type: bulletType, success: res.success }];
    }

    // Check Jack's curse chain reaction — if curse target died, Jack dies too
    results.jackCurseTriggered = false;
    const jackPlayer = this.players.find(p => p.isAlive && p.roleId === 'jack');
    if (jackPlayer && jackPlayer.curse.isActive) {
      for (const killedId of results.killed) {
        if (jackPlayer.curse.isTriggeredBy(killedId)) {
          jackPlayer.kill(this.round, 'curse');
          results.killed.push(jackPlayer.id);
          results.jackCurseTriggered = true;
          const curseTarget = this.getPlayer(killedId);
          this._addHistory('death', `🔪 ${curseTarget?.name} کشته شد و به همراه آن جک هم از بازی خارج شد (طلسم).`);
          break;
        }
      }
    }

    // Track framason leader death during night
    if (this.framason.isActive && results.killed.includes(this.framason.leaderId)) {
      this.framason.onLeaderDeath();
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

  // ──────────────────────────────────
  //  FRAMASON (فراماسون)
  // ──────────────────────────────────

  /** Check if framason team was contaminated and needs resolution */
  hasFramasonContamination() {
    return this.framason.isContaminated;
  }

  /**
   * Resolve framason contamination — kill all alliance members.
   * @returns {{ deadIds: number[], recruitId: number|null }}
   */
  resolveFramasonContamination() {
    if (!this.framason.isContaminated) return { deadIds: [], recruitId: null };

    const recruitId = this.framason._contaminated.recruitId;
    const deadIds = this.framason.resolveContamination();

    for (const id of deadIds) {
      const p = this.getPlayer(id);
      if (p && p.isAlive) {
        p.kill(this.round, 'framason');
        this._addHistory('death', `🔺 ${p.name} (تیم فراماسون) حذف شد.`);
      }
    }

    return { deadIds: deadIds.filter(id => this.getPlayer(id)), recruitId };
  }

  /** Get framason alliance member names (God-only info) */
  getFramasonAllianceNames() {
    return this.framason.allianceIds.map(id => this.getPlayer(id)?.name).filter(Boolean);
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

  /** Eliminate a player by vote. Returns extra info (e.g. curse triggered). */
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

    // If framason leader is eliminated, deactivate alliance
    if (this.framason.isActive && playerId === this.framason.leaderId) {
      this.framason.onLeaderDeath();
    }

    const extra = {};

    // Jack curse chain — if voted-out player was Jack's curse target
    const jackPlayer = this.players.find(p => p.isAlive && p.roleId === 'jack');
    if (jackPlayer && jackPlayer.curse.isTriggeredBy(playerId)) {
      jackPlayer.kill(this.round, 'curse');
      extra.jackCurseTriggered = true;
      this._addHistory('death', `🔪 ${player.name} اعدام شد و جک هم به همراه او از بازی خارج شد (طلسم).`);
    }

    return extra;
  }

  /** Gunner night action: give bullet to a player */
  gunnerGiveBullet(holderId, type) {
    const holder = this.getPlayer(holderId);
    if (!holder || !holder.isAlive) {
      // Target is dead — return bullet
      this.bulletManager.returnBullet(type);
      return { success: false, reason: 'dead' };
    }
    const ok = this.bulletManager.giveBullet(holderId, type, this.round);
    if (!ok) return { success: false, reason: 'no_bullets' };
    this._addHistory('gunner', `🔫 تفنگدار یک تیر ${type === 'live' ? 'جنگی' : 'مشقی'} به ${holder.name} داد.`);
    return { success: true };
  }

  /** Get active bullets for the current day (God-only info) */
  getActiveBullets() {
    return this.bulletManager.activeBullets.map(b => ({
      ...b,
      holderName: this.getPlayer(b.holderId)?.name || '—',
    }));
  }

  /**
   * Resolve a morning shot.
   * @param {number} shooterId — The player who has the bullet
   * @param {number} targetId — The player being shot
   * @returns {{ type: string, killed: boolean, targetTeam: string|null, targetName: string }}
   */
  resolveMorningShot(shooterId, targetId) {
    const bulletType = this.bulletManager.useBullet(shooterId);
    if (!bulletType) return null;

    const target = this.getPlayer(targetId);
    if (!target || !target.isAlive) return null;

    const targetRole = Roles.get(target.roleId);
    const targetTeam = targetRole?.team || 'citizen';
    const result = { type: bulletType, killed: false, targetTeam, targetName: target.name };

    if (bulletType === 'blank') {
      // Blank bullet — always harmless
      this._addHistory('morning_shot', `🔫 تیر مشقی بود — ${target.name} زنده ماند.`);
      return result;
    }

    // Jangi bullet — check protections
    const shooter = this.getPlayer(shooterId);

    // Check if shooter was blocked by sorcerer last night
    const sorcererAction = this.nightActions?.sorcerer;
    if (sorcererAction?.targetId === shooterId) {
      this._addHistory('morning_shot', `🔫 تیر مشقی بود — ${target.name} زنده ماند. (شلیک‌کننده بلاک شده)`);
      return result;
    }

    // Check if target was healed (heal stays until morning)
    if (target.healed) {
      this._addHistory('morning_shot', `🔫 تیر مشقی بود — ${target.name} زنده ماند. (هیل فعال)`);
      return result;
    }

    // Check if target has active shield (morning_shot cause IS absorbable by shield)
    if (target.shield?.isActive) {
      const absorbed = target.shield.absorb('morning_shot');
      if (absorbed) {
        this._addHistory('morning_shot', `🔫 تیر مشقی بود — ${target.name} زنده ماند. (سپر)`);
        return result;
      }
    }

    // Check Jack/Zodiac morning shot immunity settings
    if (target.roleId === 'jack' && this.jackMorningShotImmune) {
      this._addHistory('morning_shot', `🔫 تیر مشقی بود — ${target.name} زنده ماند. (مصونیت جک)`);
      return result;
    }
    if (target.roleId === 'zodiac' && this.zodiacMorningShotImmune) {
      this._addHistory('morning_shot', `🔫 تیر مشقی بود — ${target.name} زنده ماند. (مصونیت زودیاک)`);
      return result;
    }

    // Kill the target
    target.kill(this.round, 'morning_shot');
    result.killed = true;

    const teamName = Roles.getTeamName(targetTeam);
    this._addHistory('death', `🔫 تیر جنگی بود — ${target.name} حذف شد. (${teamName})`);

    // Check Jack curse chain
    const jackPlayer = this.players.find(p => p.isAlive && p.roleId === 'jack');
    if (jackPlayer && jackPlayer.curse.isTriggeredBy(targetId)) {
      jackPlayer.kill(this.round, 'curse');
      this._addHistory('death', `🔪 طلسم جک فعال شد — جک هم حذف شد!`);
      result.jackCurseTriggered = true;
    }

    // Track framason leader death
    if (this.framason.isActive && targetId === this.framason.leaderId) {
      this.framason.onLeaderDeath();
    }

    return result;
  }

  /**
   * Resolve live bullet expiration at voting start.
   * Unused live bullets explode, killing their holders.
   * @returns {{ holderId: number, holderName: string }[]}
   */
  resolveLiveExpiration() {
    const liveBullets = this.bulletManager.getUnusedLiveBullets();
    const explosions = [];

    for (const bullet of liveBullets) {
      const holder = this.getPlayer(bullet.holderId);
      if (holder && holder.isAlive) {
        holder.kill(this.round, 'live_explosion');
        this.bulletManager.removeBullet(bullet.holderId);
        explosions.push({ holderId: holder.id, holderName: holder.name });
        this._addHistory('death', `💥 تیر جنگی در دست ${holder.name} منفجر شد!`);

        // Check Jack curse chain
        const jackPlayer = this.players.find(p => p.isAlive && p.roleId === 'jack');
        if (jackPlayer && jackPlayer.curse.isTriggeredBy(holder.id)) {
          jackPlayer.kill(this.round, 'curse');
          this._addHistory('death', `🔪 طلسم جک فعال شد — جک هم حذف شد!`);
          explosions.push({ holderId: jackPlayer.id, holderName: jackPlayer.name, curseChain: true });
        }

        // Track framason leader death
        if (this.framason.isActive && holder.id === this.framason.leaderId) {
          this.framason.onLeaderDeath();
        }
      }
    }

    // Clear remaining blank bullets (harmless, just discard)
    this.bulletManager.clearDayBullets();

    return explosions;
  }

  // ──────────────────────────────────
  //  BOMB DETERMINATION (خواب نیم‌روزی)
  // ──────────────────────────────────

  /** Check if there's an active bomb that needs determination */
  hasBombToResolve() {
    return this.bomb.phase === 'planted';
  }

  /** Start the خواب نیم‌روزی phase */
  startBombSiesta() {
    this.bomb.startSiesta();
  }

  /** Check if bodyguard is alive (can attempt bomb guess) */
  isBodyguardAliveForBomb() {
    return this.players.some(p => p.isAlive && p.roleId === 'bodyguard');
  }

  /**
   * Bodyguard attempts to guess the bomb password.
   * @param {number} guess — 1–4
   * @returns {{ result: 'defused'|'wrong', guardianId: number }}
   */
  bombGuardianGuess(guess) {
    const result = this.bomb.guardianGuess(guess);
    const guardianId = this.players.find(p => p.isAlive && p.roleId === 'bodyguard')?.id;

    if (result === 'defused') {
      this._addHistory('bomb_defused', `🛡️💣 محافظ رمز بمب را درست حدس زد — بمب خنثی شد!`);
      this.bomb.clear();
    } else {
      // Guardian dies instead of bombed player
      const guardian = this.getPlayer(guardianId);
      if (guardian) {
        guardian.kill(this.round, 'bomb_guardian');
        this._addHistory('death', `🛡️💥 محافظ رمز بمب را اشتباه زد — محافظ حذف شد.`);
      }
      this.bomb.clear();
    }
    return { result, guardianId };
  }

  /** Bodyguard chooses not to try guessing the bomb password */
  bombGuardianSkip() {
    this.bomb.guardianSkip();
    this._addHistory('bomb_skip', `🛡️ محافظ تصمیم گرفت رمز بمب را حدس نزند.`);
  }

  /**
   * Bombed player attempts to guess the bomb password.
   * @param {number} guess — 1–4
   * @returns {{ result: 'defused'|'exploded', targetId: number }}
   */
  bombTargetGuess(guess) {
    const targetId = this.bomb.targetId;
    const result = this.bomb.targetGuess(guess);

    if (result === 'defused') {
      this._addHistory('bomb_defused', `💣✅ ${this.getPlayer(targetId)?.name} رمز بمب را درست حدس زد — بمب خنثی شد!`);
    } else {
      const target = this.getPlayer(targetId);
      if (target) {
        target.kill(this.round, 'bomb');
        this._addHistory('death', `💥 ${target.name} رمز بمب را اشتباه زد — حذف شد.`);
      }
    }
    this.bomb.clear();
    return { result, targetId };
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

  /** Can Dr Watson heal this target? (anyone freely, self limited) */
  canDrWatsonHeal(targetId) {
    const watson = this.players.find(p => p.isAlive && p.roleId === 'drWatson');
    if (watson && targetId === watson.id) {
      return this._drWatsonSelfHealCount < this.drWatsonSelfHealMax;
    }
    return true;
  }

  /** Can Dr Lecter heal this target? (mafia freely, self limited) */
  canDrLecterHeal(targetId) {
    const lecter = this.players.find(p => p.isAlive && p.roleId === 'drLecter');
    if (lecter && targetId === lecter.id) {
      return this._drLecterSelfHealCount < this.drLecterSelfHealMax;
    }
    return true;
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
      bulletManager: this.bulletManager.toJSON(),
      gunnerBlankMax: this.gunnerBlankMax,
      gunnerLiveMax: this.gunnerLiveMax,
      jackMorningShotImmune: this.jackMorningShotImmune,
      zodiacMorningShotImmune: this.zodiacMorningShotImmune,
      bomb: this.bomb.toJSON(),
      framason: this.framason.toJSON(),
      framasonMaxMembers: this.framasonMaxMembers,
      negotiatorThreshold: this.negotiatorThreshold,
      dayTimerDuration: this.dayTimerDuration,
      defenseTimerDuration: this.defenseTimerDuration,
      blindDayDuration: this.blindDayDuration,
      zodiacFrequency: this.zodiacFrequency,
      drWatsonSelfHealMax: this.drWatsonSelfHealMax,
      drLecterSelfHealMax: this.drLecterSelfHealMax,
      _drWatsonSelfHealCount: this._drWatsonSelfHealCount,
      _drLecterSelfHealCount: this._drLecterSelfHealCount,
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
    this.bulletManager = BulletManager.fromJSON(data.bulletManager ?? data.tofangdar);
    this.gunnerBlankMax = data.gunnerBlankMax ?? data.tofangdarMashghiMax ?? 2;
    this.gunnerLiveMax = data.gunnerLiveMax ?? data.tofangdarJangiMax ?? 2;
    this.jackMorningShotImmune = data.jackMorningShotImmune ?? false;
    this.zodiacMorningShotImmune = data.zodiacMorningShotImmune ?? false;
    this.bomb = Bomb.fromJSON(data.bomb);
    this.framason = Framason.fromJSON(data.framason);
    this.framasonMaxMembers = data.framasonMaxMembers ?? 2;
    this.negotiatorThreshold = data.negotiatorThreshold ?? 2;
    this.dayTimerDuration = data.dayTimerDuration || 180;
    this.defenseTimerDuration = data.defenseTimerDuration || 60;
    this.blindDayDuration = data.blindDayDuration || 60;
    this.zodiacFrequency = data.zodiacFrequency || 'every';
    this.drWatsonSelfHealMax = data.drWatsonSelfHealMax ?? 2;
    this.drLecterSelfHealMax = data.drLecterSelfHealMax ?? 2;
    this._drWatsonSelfHealCount = data._drWatsonSelfHealCount ?? 0;
    this._drLecterSelfHealCount = data._drLecterSelfHealCount ?? 0;

    // Restore Player ID counter
    const maxId = Math.max(0, ...this.players.map(p => p.id));
    Player._nextId = maxId + 1;
  }
}
