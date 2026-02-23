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
import { t, translations as tr } from '../utils/i18n.js';

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
    this.dayTimerDuration = 60; // seconds
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
    this.sniperMaxShots = 2;          // Sniper's max number of shots
    this._sniperShotCount = 0;        // Sniper shots used so far
    this._kaneUsed = false;            // Kane has used his one-time ability
    this._kaneTargetId = null;         // Kane's current target (set during night, resolved in morning)
    this._kanePendingDeath = false;    // Kane should die next night after successful reveal
    this._jadoogarLastBlockedId = null; // Jadoogar can't block same person two nights in a row
    this.drWatsonSelfHealMax = 2;   // Max times Dr Watson can heal self
    this.drLecterSelfHealMax = 2;   // Max times Dr Lecter can heal self
    this._drWatsonSelfHealCount = 0; // Times Dr Watson has healed self
    this._drLecterSelfHealCount = 0; // Times Dr Lecter has healed self
    this.zodiacFrequency = 'every'; // 'every' | 'odd' | 'even'
    // Desired team counts (computed from players and independents)
    this.desiredMafia = 0;
    this.desiredCitizen = 0;
  }

  // ──────────────────────────────────
  //  SETUP PHASE
  // ──────────────────────────────────

  /** Add a player by name */
  addPlayer(nameOrObj) {
    if (!nameOrObj) return null;
    // allow passing either a string or { en, fa }
    if (typeof nameOrObj === 'string' && !nameOrObj.trim()) return null;
    const player = new Player(nameOrObj);
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
    const totalRoles = this.getTotalRoleCount();

    const MIN_PLAYERS = 8;
    if (this.players.length < MIN_PLAYERS) {
      errors.push(t(tr.setup.minPlayers).replace('%d', MIN_PLAYERS));
    }

    if (totalRoles !== this.players.length) {
      // Use translated mismatch message with placeholders
      const msg = t(tr.setup.rolesMismatch).replace('%d', totalRoles).replace('%d', this.players.length);
      errors.push(msg);
    }

    // Team counts
    const mafiaCount = Object.entries(this.selectedRoles)
      .filter(([id]) => Roles.get(id)?.team === 'mafia')
      .reduce((s, [, c]) => s + c, 0);
    const citizenCount = Object.entries(this.selectedRoles)
      .filter(([id]) => Roles.get(id)?.team === 'citizen')
      .reduce((s, [, c]) => s + c, 0);

    // If desired counts are configured, enforce them
    if (this.desiredMafia > 0 && mafiaCount !== this.desiredMafia) {
      errors.push(t(tr.setup.mustChooseMafia).replace('%d', this.desiredMafia));
    }
    if (this.desiredCitizen > 0 && citizenCount !== this.desiredCitizen) {
      errors.push(t(tr.setup.mustChooseCitizen).replace('%d', this.desiredCitizen));
    }

    // Ensure at least one mafia by default
    if (mafiaCount === 0) {
      errors.push(t(tr.setup.mafiaRequired));
    }

    return errors;
  }

  /** Compute recommended team counts based on current players and independents
   * @param {boolean} force — when true, overwrite `desiredMafia`/`desiredCitizen` with recommendations
   */
  computeRecommendedCounts(force = false) {
    const totalPlayers = this.players.length;
    const independents = Object.entries(this.selectedRoles)
      .filter(([id]) => Roles.get(id)?.team === 'independent')
      .reduce((s, [, c]) => s + c, 0);

    const remaining = Math.max(0, totalPlayers - independents);
    // Maximum mafia allowed so that at least one citizen remains and mafia <= floor((remaining-1)/2)
    const maxMafia = Math.max(1, Math.floor((remaining - 1) / 2));
    // A baseline recommended count (previous heuristic)
    let recommendedMafia = Math.max(1, Math.floor(remaining / 4));
    // Clamp recommendation into allowed range
    recommendedMafia = Math.min(Math.max(1, recommendedMafia), Math.max(1, Math.min(maxMafia, Math.max(1, remaining - 1))));
    const recommendedCitizen = Math.max(0, remaining - recommendedMafia);

    // Initialize or update desired counts (ensure they respect min/max)
    if (force) {
      this.desiredMafia = recommendedMafia;
      this.desiredCitizen = recommendedCitizen;
    } else {
      if (!this.desiredMafia) this.desiredMafia = recommendedMafia;
      if (!this.desiredCitizen) this.desiredCitizen = recommendedCitizen;
      // ensure existing desired values are within bounds
      const bounded = Math.max(1, Math.min(this.desiredMafia, maxMafia));
      this.desiredMafia = bounded;
      this.desiredCitizen = remaining - this.desiredMafia;
    }

    return { recommendedMafia, recommendedCitizen, independents, maxMafia };
  }

  /** Adjust desired mafia count (clamped) and keep citizen consistent */
  setDesiredMafia(count) {
    const totalPlayers = this.players.length;
    const independents = Object.entries(this.selectedRoles)
      .filter(([id]) => Roles.get(id)?.team === 'independent')
      .reduce((s, [, c]) => s + c, 0);
    const remaining = Math.max(0, totalPlayers - independents);

    // Enforce min 1 mafia and max floor((remaining-1)/2), but never exceed remaining-1
    const maxMafia = Math.max(1, Math.floor((remaining - 1) / 2));
    const upper = Math.min(maxMafia, Math.max(0, remaining - 1));
    const clamped = Math.max(1, Math.min(count, upper));
    this.desiredMafia = clamped;
    this.desiredCitizen = Math.max(0, remaining - clamped);
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
    this._addHistory('blind_day', t(tr.history.blindDayStart));
  }

  /** Start blind night — only mafia wakes to meet each other */
  startBlindNight() {
    this.phase = 'blindNight';
    this.nightActions = {};
    this.currentNightStep = 0;

    // Clear Jack's curse at the start of every night
    this._clearJackCurse();

    // Blind night: only mafia recognition + Jack curse
    this.nightSteps = this._buildBlindNightSteps();
    this._addHistory('night_start', t(tr.history.blindNightStart));
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
        roleName: t(tr.setup.teamMafia),
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
        roleName: (typeof Roles.get === 'function' ? Roles.get('jack')?.getLocalizedName?.() : 'Jack'),
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
    // Round is incremented at the start of the day so day/night share the same round number.
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

    this._addHistory('night_start', t(tr.history.nightStart).replace('%d', String(this.round)));
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
      let actors = this.players.filter(
        p => p.isAlive && p.roleId === role.id
      );

      // If Godfather is dead but other mafia are alive, use mafia members as actors
      if (actors.length === 0 && role.id === 'godfather') {
        const mafiaPlayers = this.players.filter(p => p.isAlive && Roles.get(p.roleId)?.team === 'mafia');
        if (mafiaPlayers.length > 0) {
          actors = mafiaPlayers;
        }
      }
      if (actors.length === 0) continue;

      // Special: skip constantine if already used
      if (role.id === 'constantine' && this.constantineUsed) continue;

      // Special: skip bomber if bomb already used
      if (role.id === 'bomber' && this.bomb.isUsed) continue;

      // Special: skip zodiac if not their turn based on frequency
      if (role.id === 'zodiac' && !this._canZodiacShoot()) continue;

      // Special: skip gunner if no bullets remain
      if (role.id === 'gunner' && !this.bulletManager.hasBullets) continue;

      // Special: skip sniper if no shots remaining
      if (role.id === 'sniper' && this._sniperShotCount >= this.sniperMaxShots) continue;

      // Special: skip kane if already used his one-time ability
      if (role.id === 'kane' && this._kaneUsed) continue;

      // Special: skip freemason if can't recruit (dead, max reached, or contaminated)
      if (role.id === 'freemason' && !this.framason.canRecruit) continue;

      steps.push({
        roleId: role.id,
        roleName: typeof role.getLocalizedName === 'function' ? role.getLocalizedName() : role.name,
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

    // 0. Kane pending death from previous night's successful reveal
    if (this._kanePendingDeath) {
      const kanePlayer = this.players.find(p => p.isAlive && p.roleId === 'kane');
      if (kanePlayer) {
        kanePlayer.kill(this.round, 'kane_sacrifice', false); // Not revivable
        results.killed.push(kanePlayer.id);
        this._addHistory('death', t(tr.history.kaneSacrifice));
      }
      this._kanePendingDeath = false;
    }

    // 1. Jadoogar blocks a citizen/independent's night action
    if (actions.jadoogar?.targetId) {
      const blockedId = actions.jadoogar.targetId;
      results.blocked = blockedId;
      // Find which role the blocked player has and remove their action
      const blockedPlayer = this.getPlayer(blockedId);
      if (blockedPlayer) {
        // Remove the blocked player's action
        for (const [roleId, action] of Object.entries(actions)) {
          if (action.actorIds?.includes(blockedId) && roleId !== 'jadoogar') {
            delete actions[roleId];
          }
        }
      }
      // Track for consecutive block restriction
      this._jadoogarLastBlockedId = blockedId;
    } else {
      this._jadoogarLastBlockedId = null;
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
          // Salakhi bypasses doctor, shield, bodyguard — instant kill (not revivable)
          target.kill(this.round, 'salakhi', false);
          results.killed.push(targetId);
          this._addHistory('death', t(tr.history.salakhiDeath).replace('%s', target.name).replace('%s', Roles.get(target.roleId)?.getLocalizedName?.() || Roles.get(target.roleId)?.name || '—'));
        } else {
          this._addHistory('salakhi_fail', t(tr.history.salakhiFail).replace('%s', target.name));
        }
      } else if (target && mode === 'negotiate') {
        // ── Negotiate — recruit simpleCitizen or suspect ──
        const isRecruitable = target.roleId === 'simpleCitizen' || target.roleId === 'suspect';
        results.negotiated = { playerId: targetId, success: isRecruitable };
        if (isRecruitable) {
          target.roleId = 'simpleMafia';
          this._addHistory('negotiate', t(tr.history.negotiateSuccess).replace('%s', target.name));
        } else {
          this._addHistory('negotiate_fail', t(tr.history.negotiateFail).replace('%s', target.name));
        }
      } else if (target) {
        // ── Regular mafia shoot ──
        const targetRole = Roles.get(target.roleId);

        // Jack & Zodiac are immune to mafia shoot
        if (targetRole?.shootImmune) {
          this._addHistory('immune', t(tr.history.immune).replace('%s', target.name));
        } else if (target.healed) {
          results.saved.push(targetId);
          this._addHistory('save', t(tr.history.saveByDoctor).replace('%s', target.name));
        } else {
          // Check shield before killing
          const died = target.tryKill(this.round, 'mafia');
          if (died) {
            results.killed.push(targetId);
            this._addHistory('death', t(tr.history.mafiaKill).replace('%s', target.name));
          } else {
            results.shielded.push(targetId);
            this._addHistory('shield', t(tr.history.shielded).replace('%s', target.name));
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
        this._addHistory('curse', t(tr.history.cursePlaced).replace('%s', curseTarget?.name || '—'));
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
          this._addHistory('death', t(tr.history.zodiacBodyguard));
        } else if (target.healed) {
          results.saved.push(targetId);
        } else {
          const died = target.tryKill(this.round, 'zodiac');
          if (died) {
            results.killed.push(targetId);
            this._addHistory('death', t(tr.history.zodiacKilled).replace('%s', target.name));
          } else {
            results.shielded.push(targetId);
            this._addHistory('shield', t(tr.history.shielded).replace('%s', target.name));
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
        this._sniperShotCount++;
        const targetRole = Roles.get(target.roleId);
        const targetTeam = targetRole?.team;

        if (targetTeam === 'independent') {
          // Independent → nothing happens, bullet wasted
          this._addHistory('sniper', t(tr.history.sniper_independent).replace('%s', target.name));
        } else if (targetTeam === 'mafia') {
          // Use tryKill so shield semantics apply (shield absorbs first lethal shot and is consumed).
          if (target.healed) {
            // Healed by Dr Lecter → bullet wasted, nothing happens
            this._addHistory('sniper', t(tr.history.sniper_healed).replace('%s', target.name));
          } else {
            const died = target.tryKill(this.round, 'sniper');
            if (died) {
              results.killed.push(targetId);
              this._addHistory('death', t(tr.history.sniper_killed).replace('%s', target.name));
            } else {
              // tryKill returned false — either shield absorbed it or role immunity applied
              if (target.shield && !target.shield.isActive) {
                // Shield was consumed this shot
                results.shielded.push(targetId);
                this._addHistory('shield', t(tr.history.sniper_shielded).replace('%s', target.name));
              } else {
                // Otherwise treat as immune / wasted
                this._addHistory('sniper', t(tr.history.sniper_godfather_shield).replace('%s', target.name));
              }
            }
          }
        } else {
          // Citizen → sniper dies (check sniper's own shield)
          const died = sniperPlayer.tryKill(this.round, 'sniper_miss');
          if (died) {
            results.killed.push(sniperId);
            this._addHistory('death', t(tr.history.sniper_miss));
          }
        }
      }
    }

    // 9. Detective investigates
    if (actions.detective?.targetId) {
      const targetId = actions.detective.targetId;
      const target = this.getPlayer(targetId);
      if (target) {
        // Check if detective was blocked by jadoogar
        const wasBlocked = results.blocked && results.blocked === actions.detective.actorIds?.[0];
        if (wasBlocked) {
          // Blocked → closed fist ✊
          results.investigated = { playerId: targetId, result: 'blocked' };
          this._addHistory('investigate', t(tr.history.investigate_blocked));
        } else {
          const role = Roles.get(target.roleId);
          const targetTeam = role?.team;
          // 👍 if: mafia (not godfather) OR suspect
          // 👎 if: godfather, independent, or citizen (not suspect)
          let thumbsUp;
          if (target.roleId === 'suspect') {
            thumbsUp = true;  // Suspect → false positive 👍
          } else if (target.roleId === 'godfather') {
            thumbsUp = false; // Godfather hides → 👎
          } else if (targetTeam === 'mafia') {
            thumbsUp = true;  // Other mafia → 👍
          } else {
            thumbsUp = false; // Citizen or independent → 👎
          }
          results.investigated = { playerId: targetId, result: thumbsUp ? 'positive' : 'negative' };
          this._addHistory('investigate', t(tr.history.investigate_result).replace('%s', target.name).replace('%s', thumbsUp ? '👍' : '👎'));
        }
      }
    }

    // 10. Matador silences
    if (actions.matador?.targetId) {
      const target = this.getPlayer(actions.matador.targetId);
      if (target) {
        target.silenced = true;
        results.silenced = actions.matador.targetId;
        this._addHistory('silence', t(tr.history.silence).replace('%s', target.name));
      }
    }

    // 11. Bomber plants bomb (one-time, with password)
    if (actions.bomber?.targetId && !this.bomb.isUsed) {
      const target = this.getPlayer(actions.bomber.targetId);
      const password = actions.bomber.bombPassword;
      if (target && password) {
        this.bomb.plant(target.id, password);
        results.bombed = actions.bomber.targetId;
        this._addHistory('bomb', t(tr.history.bomb_planted).replace('%s', target.name).replace('%s', password));
      }
    }

    // 12. Constantine revives (only players who died last night with revivable death)
    if (actions.constantine?.targetId) {
      const target = this.getPlayer(actions.constantine.targetId);
      // Allow reviving players who died before the current night (any previous round)
      if (target && !target.isAlive && typeof target.deathRound === 'number' && target.deathRound < this.round && target.isRevivable) {
        target.revive();
        results.revived = actions.constantine.targetId;
        this.constantineUsed = true;
        this._addHistory('revive', t(tr.history.revive).replace('%s', target.name));
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
          this._addHistory('framason', t(tr.history.framason_add).replace('%s', recruit.name));
        } else {
          this._addHistory('framason', t(tr.history.framason_contaminated).replace('%s', recruit.name));
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

    // 15. Kane reveal — check if target survived night
    if (actions.kane?.targetId) {
      const kaneTargetId = actions.kane.targetId;
      const kaneTarget = this.getPlayer(kaneTargetId);
      if (kaneTarget && results.killed.includes(kaneTargetId)) {
        // Target died during night → act returns to Kane
        this._kaneUsed = false;
        this._addHistory('kane', t(tr.history.kane_return));
      } else if (kaneTarget) {
        this._kaneUsed = true;
        const targetRole = Roles.get(kaneTarget.roleId);
        const targetTeam = targetRole?.team;
        if (targetTeam === 'mafia' || targetTeam === 'independent') {
          // Successful reveal — announce in morning, Kane dies next night
          results.kaneReveal = {
            targetId: kaneTargetId,
            targetName: kaneTarget.name,
            roleName: targetRole?.name || '—',
            roleIcon: targetRole?.icon || '',
          };
          this._kanePendingDeath = true;
          this._addHistory('kane', t(tr.history.kane_reveal_success).replace('%s', kaneTarget.name).replace('%s', targetRole?.getLocalizedName?.() || targetRole?.name || '—'));
        } else {
          // Target is citizen → nothing happens, act is consumed
          results.kaneReveal = null;
          this._addHistory('kane', t(tr.history.kane_reveal_fail));
        }
      }
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
          this._addHistory('death', t(tr.history.jack_curse_chain).replace('%s', curseTarget?.name || '—'));
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
    // Increment round when a real day starts. If round is 0 (first real day), set to 1.
    if (!this.round || this.round === 0) {
      this.round = 1;
    } else {
      this.round++;
    }
    this.phase = 'day';
    this.votes = {};
    this._addHistory('day_start', t(tr.history.day_start).replace('%d', String(this.round)));
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
        this._addHistory('death', t(tr.history.framason_member_death).replace('%s', p.name));
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
      tally[targetId] = (tally[targetId] || 0) + 1;
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
      this._addHistory('vote_immune', t(tr.history.vote_immune).replace('%s', player.name));
      return { voteImmune: true };
    }

    player.kill(this.round, 'vote');
    this._addHistory('death', t(tr.history.vote_executed).replace('%s', player.name).replace('%s', Roles.get(player.roleId)?.getLocalizedName?.() || Roles.get(player.roleId)?.name || '—'));

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
      this._addHistory('death', t(tr.history.execution_with_curse).replace('%s', player.name));
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
    this._addHistory('gunner', t(tr.history.gunner_gave).replace('%s', (type === 'live' ? 'جنگی' : 'مشقی')).replace('%s', holder.name));
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

    // Defensive check: prevent non-mafia shooters from shooting themselves
    if (shooterId === targetId) {
      const shooter = this.getPlayer(shooterId);
      const shooterRole = shooter ? Roles.get(shooter.roleId) : null;
      if (shooterRole?.team !== 'mafia') {
        // Invalid self-shot by non-mafia — ignore
        return null;
      }
    }

    const targetRole = Roles.get(target.roleId);
    const targetTeam = targetRole?.team || 'citizen';
    const result = { type: bulletType, killed: false, targetTeam, targetName: target.name };

    if (bulletType === 'blank') {
      // Blank bullet — always harmless
      this._addHistory('morning_shot', t(tr.history.morning_shot_blank).replace('%s', target.name));
      return result;
    }

    // Jangi bullet — check protections
    const shooter = this.getPlayer(shooterId);

    // Check if shooter was blocked by jadoogar last night — bullet becomes blank
    const jadoogarAction = this.nightActions?.jadoogar;
    if (jadoogarAction?.targetId === shooterId) {
      result.type = 'blank';
      this._addHistory('morning_shot', t(tr.history.morning_shot_wizard).replace('%s', target.name));
      return result;
    }

    // Check if target was healed (heal stays until morning)
    if (target.healed) {
      this._addHistory('morning_shot', t(tr.history.morning_shot_healed).replace('%s', target.name));
      return result;
    }

    // Check if target has active shield (morning_shot cause IS absorbable by shield)
    if (target.shield?.isActive) {
      const absorbed = target.shield.absorb('morning_shot');
      if (absorbed) {
        this._addHistory('morning_shot', t(tr.history.morning_shot_shield).replace('%s', target.name));
        return result;
      }
    }

    // Check Jack/Zodiac morning shot immunity settings
    if (target.roleId === 'jack' && this.jackMorningShotImmune) {
      this._addHistory('morning_shot', t(tr.history.morning_shot_jack_immune).replace('%s', target.name));
      return result;
    }
    if (target.roleId === 'zodiac' && this.zodiacMorningShotImmune) {
      this._addHistory('morning_shot', t(tr.history.morning_shot_zodiac_immune).replace('%s', target.name));
      return result;
    }

    // Kill the target
    target.kill(this.round, 'morning_shot');
    result.killed = true;

    const teamName = Roles.getTeamName(targetTeam);
    this._addHistory('death', t(tr.history.warshot_death).replace('%s', target.name).replace('%s', teamName));

    // Check Jack curse chain
    const jackPlayer = this.players.find(p => p.isAlive && p.roleId === 'jack');
    if (jackPlayer && jackPlayer.curse.isTriggeredBy(targetId)) {
      jackPlayer.kill(this.round, 'curse');
      this._addHistory('death', t(tr.history.jack_curse_activated));
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
        this._addHistory('death', t(tr.history.live_explosion).replace('%s', holder.name));

        // Check Jack curse chain
        const jackPlayer = this.players.find(p => p.isAlive && p.roleId === 'jack');
        if (jackPlayer && jackPlayer.curse.isTriggeredBy(holder.id)) {
          jackPlayer.kill(this.round, 'curse');
          this._addHistory('death', t(tr.history.jack_curse_activated));
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
      this._addHistory('bomb_defused', t(tr.history.bomb_defused));
      this.bomb.clear();
    } else {
      // Guardian dies instead of bombed player
      const guardian = this.getPlayer(guardianId);
      if (guardian) {
        guardian.kill(this.round, 'bomb_guardian');
        this._addHistory('death', t(tr.history.bomb_defused_incorrect));
      }
      this.bomb.clear();
    }
    return { result, guardianId };
  }

  /** Bodyguard chooses not to try guessing the bomb password */
  bombGuardianSkip() {
    this.bomb.guardianSkip();
    this._addHistory('bomb_skip', t(tr.history.bomb_skip));
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
      this._addHistory('bomb_defused', t(tr.history.bomb_defused_named).replace('%s', this.getPlayer(targetId)?.name || '—'));
    } else {
      const target = this.getPlayer(targetId);
      if (target) {
        target.kill(this.round, 'bomb');
        this._addHistory('death', t(tr.history.bomb_wrong_pw_death).replace('%s', target.name));
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
      this._addHistory('win', t(tr.history.win_citizen));
      return 'citizen';
    }

    // Mafia >= citizens (mafia wins)
    if (mafiaAlive.length >= citizenAlive.length + independentAlive.length) {
      this.winner = 'mafia';
      this.phase = 'ended';
      this._addHistory('win', t(tr.history.win_mafia));
      return 'mafia';
    }

    // Independent alone with one other (edge case)
    if (independentAlive.length > 0 && alive.length <= 2 && mafiaAlive.length === 0) {
      this.winner = 'independent';
      this.phase = 'ended';
      this._addHistory('win', t(tr.history.win_independent));
      return 'independent';
    }

    return null;
  }

  /**
   * Reveal a player's Jack identity publicly and lock Jack's curse so it cannot be changed.
   * This is a helper for God to 'reveal' Jack and freeze his curse target.
   * @param {number} jackPlayerId
   */
  revealJack(jackPlayerId) {
    const p = this.getPlayer(jackPlayerId);
    if (!p) return false;
    if (p.roleId !== 'jack') return false;
    // Lock Jack's curse so it cannot be moved
    p.curse.lock();
    // Add an explicit history entry
    this._addHistory('reveal', t(tr.history.reveal_jack).replace('%s', p.name));
    return true;
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

  /** Get revivable players (died last night, not salakhi/kane_sacrifice) */
  getRevivablePlayers() {
    // Revivable players are those who died before the current night
    // (i.e. deathRound < this.round) and are marked revivable.
    // This includes any death from game start up to the previous round.
    return this.players.filter(p =>
      !p.isAlive &&
      typeof p.deathRound === 'number' &&
      p.deathRound < this.round &&
      p.isRevivable
    );
  }

  /**
   * Get players who are currently targeted by kill-like night actions
   * (godfather shoot, zodiac, sniper, etc.) and therefore may die
   * when the night is resolved. Excludes salakhi-mode godfather targets
   * (salakhi victims are not revivable).
   * Returns array of Player objects (may be alive at the moment).
   */
  getPendingKillTargets() {
    const actions = this.nightActions || {};
    const ids = new Set();

    // Godfather regular shoot (exclude salakhi mode)
    if (actions.godfather && actions.godfather.targetId && actions.godfather.mode !== 'salakhi') {
      ids.add(actions.godfather.targetId);
    }

    // Zodiac kill
    if (actions.zodiac && actions.zodiac.targetId) ids.add(actions.zodiac.targetId);

    // Sniper
    if (actions.sniper && actions.sniper.targetId) ids.add(actions.sniper.targetId);

    // Gunner morning shots are applied in the morning, not here — skip

    return [...ids].map(id => this.getPlayer(id)).filter(p => p && p.isRevivable);
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
      sniperMaxShots: this.sniperMaxShots,
      _sniperShotCount: this._sniperShotCount,
      _kaneUsed: this._kaneUsed,
      _kaneTargetId: this._kaneTargetId,
      _kanePendingDeath: this._kanePendingDeath,
      _jadoogarLastBlockedId: this._jadoogarLastBlockedId,
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
    this.sniperMaxShots = data.sniperMaxShots ?? 2;
    this._sniperShotCount = data._sniperShotCount ?? 0;
    this._kaneUsed = data._kaneUsed ?? false;
    this._kaneTargetId = data._kaneTargetId ?? null;
    this._kanePendingDeath = data._kanePendingDeath ?? false;
    this._jadoogarLastBlockedId = data._jadoogarLastBlockedId ?? null;
    this.dayTimerDuration = data.dayTimerDuration || 60;
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
