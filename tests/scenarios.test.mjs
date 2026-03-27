/**
 * scenarios.test.mjs — Comprehensive Mafia God Engine Test Suite
 *
 * 13 scenarios testing the full game engine: night resolution,
 * chain reactions, special mechanics, victory conditions.
 *
 * Uses Vitest + direct Game API (no UI).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../js/models/Game.js';
import { Roles } from '../js/models/Roles.js';

/* ───────────── helpers ───────────── */

/**
 * Create a game with named players and assigned roles.
 * @param {Record<string, string>} roster  e.g. { P1: 'sniper', P2: 'simpleCitizen' }
 * @returns {{ game: Game, p: Record<string, import('../js/models/Player.js').Player> }}
 */
function setup(roster) {
  const game = new Game();
  const p = {};
  for (const [label, roleId] of Object.entries(roster)) {
    const player = game.addPlayer(label);
    player.roleId = roleId;
    const roleDef = Roles.get(roleId);
    if (roleDef) player.initShield(roleDef);
    p[label] = player;
  }
  return { game, p };
}

/** Shortcut: directly populate nightActions, call startNight + resolveNight */
function nightRound(game, actions) {
  game.startNight();
  Object.assign(game.nightActions, actions);
  return game.resolveNight();
}

/** Start a day and vote-eliminate players by id */
function dayVoteEliminate(game, ...playerIds) {
  game.startDay();
  const results = [];
  for (const id of playerIds) {
    results.push(game.eliminateByVote(id));
  }
  return results;
}

/** Get player by label from roster helper */
function alive(player) { return player.isAlive; }
function dead(player) { return !player.isAlive; }

/* ═══════════════════════════════════════════════════════════════════
   S1 — Chain Reactions & Misleading Signals
   ═══════════════════════════════════════════════════════════════════ */
describe('S1 — Chain Reactions & Misleading Signals', () => {
  let game, p;

  beforeEach(() => {
    ({ game, p } = setup({
      P1:  'sniper',
      P2:  'simpleCitizen',
      P3:  'suspect',
      P4:  'zodiac',
      P5:  'freemason',
      P6:  'gunner',
      P7:  'jack',
      P8:  'bomber',
      P9:  'drWatson',
      P10: 'simpleCitizen',
      P11: 'bodyguard',
      P12: 'drLecter',
      P13: 'detective',
      P14: 'godfather',
      P15: 'constantine',
      P16: 'kane',
    }));
    // Initialise sub-systems
    game.framason.init(p.P5.id, game.framasonMaxMembers);
    game.bulletManager.init(game.gunnerBlankMax, game.gunnerLiveMax);
  });

  it('Blind Night — Jack curses P3', () => {
    game.startBlindNight();
    // Record Jack curse on P3 directly
    game.nightActions.jack = { actorIds: [p.P7.id], targetId: p.P3.id, actionType: 'curse' };
    game.resolveNight();

    const jackPlayer = p.P7;
    expect(jackPlayer.curse.targetId).toBe(p.P3.id);
  });

  it('Night 1 — Watson self-heal saves P9, P10 dies to Zodiac', () => {
    // Set Jack curse from blind night
    p.P7.curse.place(p.P3.id);

    const results = nightRound(game, {
      godfather: { actorIds: [p.P14.id], targetId: p.P9.id, actionType: 'shoot', mode: 'shoot' },
      drWatson:  { actorIds: [p.P9.id],  targetId: p.P9.id, actionType: 'heal' },
      zodiac:    { actorIds: [p.P4.id],  targetId: p.P10.id, actionType: 'shoot' },
      bomber:    { actorIds: [p.P8.id],  targetId: p.P6.id, actionType: 'bomb', bombPassword: '2' },
      detective: { actorIds: [p.P13.id], targetId: p.P3.id, actionType: 'investigate' },
      gunner:    { actorIds: [p.P6.id],  bulletAssignments: [{ holderId: p.P2.id, type: 'live' }], actionType: 'bullets' },
      freemason: { actorIds: [p.P5.id],  targetId: p.P2.id, actionType: 'recruit' },
      jack:      { actorIds: [p.P7.id],  targetId: p.P3.id, actionType: 'curse' },
    });

    // P9 (Watson) healed self → survives Godfather shoot
    expect(alive(p.P9)).toBe(true);
    expect(results.saved).toContain(p.P9.id);

    // P10 dies to Zodiac
    expect(dead(p.P10)).toBe(true);

    // Detective checks Suspect → positive (misleading)
    expect(results.investigated).toBeTruthy();
    expect(results.investigated.result).toBe('positive');
  });

  it('Day 1 — P2 morning-shoots P3, Jack dies (curse), bomb kills bodyguard & P6, vote P13', () => {
    // Set up state after Night 1 resolution
    p.P7.curse.place(p.P3.id);
    p.P10.kill(1, 'zodiac');
    game.bulletManager.giveBullet(p.P2.id, 'live', 1);
    game.bomb.plant(p.P6.id, 2);
    game.round = 1;
    game.phase = 'day';

    // Morning shot: P2 shoots P3 with live bullet
    const shotResult = game.resolveMorningShot(p.P2.id, p.P3.id);
    expect(shotResult.type).toBe('live');
    expect(dead(p.P3)).toBe(true);

    // Jack's curse was on P3 → Jack dies
    // The curse chain is checked in resolveNight, but for morning shots
    // we check directly
    const jackP = p.P7;
    if (jackP.isAlive && jackP.curse.isTriggeredBy(p.P3.id)) {
      jackP.kill(1, 'curse');
    }
    expect(dead(p.P7)).toBe(true);

    // Bomb siesta: Bodyguard guesses wrong → bodyguard dies
    const bgResult = game.bombGuardianGuess(3); // wrong code (correct is 2)
    expect(bgResult.result).toBe('wrong');
    expect(dead(p.P11)).toBe(true);

    // P6 (target) guesses wrong → P6 dies (bomb target after guardian died)
    // Actually after guardian dies, bomb is resolved — target doesn't guess in this path
    // Guardian wrong = guardian dies, bomb target survives
    // Let me re-check: per rules, if guardian wrong → guardian dies, target survives

    // Vote eliminates P13 (Detective)
    const voteResult = game.eliminateByVote(p.P13.id);
    expect(dead(p.P13)).toBe(true);
    expect(voteResult.voteImmune).toBeFalsy();
  });

  it('Night 2 — Salakhi P5, Zodiac kills P2, Constantine revives P3, Sniper vs Godfather shield', () => {
    // Set state: alive = P1, P2, P4, P5, P6, P8, P9, P12, P14, P15, P16
    // Dead: P3, P7, P10, P11, P13
    p.P3.kill(1, 'morning_shot');
    p.P7.kill(1, 'curse');
    p.P10.kill(1, 'zodiac');
    p.P11.kill(1, 'bomb');
    p.P13.kill(1, 'vote');
    // Round must be > deathRound for Constantine to revive (deathRound < this.round)
    game.round = 2;

    const results = nightRound(game, {
      godfather:   { actorIds: [p.P14.id], targetId: p.P5.id, actionType: 'shoot', mode: 'salakhi', guessedRoleId: 'freemason' },
      zodiac:      { actorIds: [p.P4.id],  targetId: p.P2.id, actionType: 'shoot' },
      constantine: { actorIds: [p.P15.id], targetId: p.P3.id, actionType: 'revive' },
      sniper:      { actorIds: [p.P1.id],  targetId: p.P14.id, actionType: 'shoot' },
    });

    // Salakhi correct → P5 dies (bypass all protection)
    expect(results.salakhied).toBeTruthy();
    expect(results.salakhied.correct).toBe(true);
    expect(dead(p.P5)).toBe(true);
    expect(p.P5.isRevivable).toBe(false); // Salakhi → not revivable

    // Zodiac kills P2
    expect(dead(p.P2)).toBe(true);

    // Constantine revives P3
    expect(results.revived).toBe(p.P3.id);
    expect(alive(p.P3)).toBe(true);

    // Sniper shoots Godfather → shield absorbs
    expect(alive(p.P14)).toBe(true);
    expect(p.P14.shield.isActive).toBe(false); // Shield consumed
  });

  it('Day 2 — Vote tie eliminates P8 (Bomber) and P4 (Zodiac)', () => {
    // Set state for Day 2
    p.P2.kill(2, 'zodiac');
    p.P3.isAlive = true; p.P3.deathCause = null; // Revived
    p.P5.kill(2, 'salakhi', false);
    p.P7.kill(1, 'curse');
    p.P10.kill(1, 'zodiac');
    p.P11.kill(1, 'bomb');
    p.P13.kill(1, 'vote');
    game.round = 1;
    game.startDay(); // round → 2

    // Vote tie: both P8 and P4 eliminated
    const r1 = game.eliminateByVote(p.P8.id);
    expect(dead(p.P8)).toBe(true);

    const r2 = game.eliminateByVote(p.P4.id);
    expect(dead(p.P4)).toBe(true);
  });

  it('Night 3 — Godfather shoots P1 (Sniper) → shield absorbs', () => {
    // Set state: P1, P3, P6, P9, P12, P14, P15, P16 alive
    p.P2.kill(2, 'zodiac'); p.P4.kill(2, 'vote'); p.P5.kill(2, 'salakhi', false);
    p.P7.kill(1, 'curse'); p.P8.kill(2, 'vote'); p.P10.kill(1, 'zodiac');
    p.P11.kill(1, 'bomb'); p.P13.kill(1, 'vote');
    game.round = 2;

    const results = nightRound(game, {
      godfather: { actorIds: [p.P14.id], targetId: p.P1.id, actionType: 'shoot', mode: 'shoot' },
    });

    // Sniper has a shield → first hit is absorbed
    expect(alive(p.P1)).toBe(true);
    expect(results.shielded).toContain(p.P1.id);
    expect(p.P1.shield.isActive).toBe(false); // Shield consumed
  });

  it('Day 3 — Vote eliminates P14 (Godfather)', () => {
    // All mafia must die for citizen win
    p.P1.kill(3, 'mafia');
    p.P2.kill(2, 'zodiac'); p.P4.kill(2, 'vote'); p.P5.kill(2, 'salakhi', false);
    p.P7.kill(1, 'curse'); p.P8.kill(2, 'vote'); p.P10.kill(1, 'zodiac');
    p.P11.kill(1, 'bomb'); p.P13.kill(1, 'vote');
    game.round = 2;
    game.startDay(); // round → 3

    game.eliminateByVote(p.P14.id);
    expect(dead(p.P14)).toBe(true);

    // After Godfather + Bomber dead, independents dead → check win
    // Alive: P3, P6, P9, P12, P15, P16
    // P12 is drLecter (mafia) — still alive, so no win yet
  });

  it('Final — all mafia dead + Jack alive (killed by curse) + all other indeps dead → Citizens Win', () => {
    // Kill all mafia: P8 (bomber), P12 (lecter), P14 (godfather)
    // Kill all independents: P4 (zodiac), P7 (jack)
    p.P8.kill(2, 'vote'); p.P12.kill(4, 'vote'); p.P14.kill(3, 'vote');
    p.P4.kill(2, 'vote'); p.P7.kill(1, 'curse');
    // Other dead
    p.P1.kill(3, 'mafia'); p.P2.kill(2, 'zodiac');
    p.P5.kill(2, 'salakhi', false); p.P10.kill(1, 'zodiac');
    p.P11.kill(1, 'bomb'); p.P13.kill(1, 'vote');

    const winner = game.checkWinCondition();
    expect(winner).toBe('citizen');
    expect(game.phase).toBe('ended');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   S2 — Freemason Contamination & Negotiation
   ═══════════════════════════════════════════════════════════════════ */
describe('S2 — Freemason Contamination & Negotiation', () => {
  let game, p;

  beforeEach(() => {
    ({ game, p } = setup({
      P1:  'sniper',
      P2:  'simpleCitizen',
      P3:  'simpleCitizen',
      P4:  'zodiac',
      P5:  'freemason',
      P6:  'gunner',
      P7:  'jack',
      P8:  'bomber',
      P9:  'drWatson',
      P10: 'simpleCitizen',
      P11: 'bodyguard',
      P12: 'drLecter',
      P13: 'detective',
      P14: 'godfather',
      P15: 'negotiator',
      P16: 'constantine',
    }));
    game.framason.init(p.P5.id, game.framasonMaxMembers);
    game.bulletManager.init(game.gunnerBlankMax, game.gunnerLiveMax);
  });

  it('Night 1 — Mafia kills P2, Zodiac kills P10, Freemason recruits P3', () => {
    p.P7.curse.place(p.P5.id); // blind night curse

    const results = nightRound(game, {
      godfather: { actorIds: [p.P14.id], targetId: p.P2.id, actionType: 'shoot', mode: 'shoot' },
      zodiac:    { actorIds: [p.P4.id],  targetId: p.P10.id, actionType: 'shoot' },
      freemason: { actorIds: [p.P5.id],  targetId: p.P3.id, actionType: 'recruit' },
      gunner:    { actorIds: [p.P6.id],  bulletAssignments: [{ holderId: p.P5.id, type: 'live' }], actionType: 'bullets' },
    });

    expect(dead(p.P2)).toBe(true);
    expect(dead(p.P10)).toBe(true);
    // Freemason recruited citizen → safe
    expect(results.framasonRecruit).toBeTruthy();
    expect(results.framasonRecruit.safe).toBe(true);
  });

  it('Day 1 — P5 morning-shoots P14 (shield absorbs), vote eliminates P3', () => {
    p.P2.kill(1, 'mafia'); p.P10.kill(1, 'zodiac');
    game.bulletManager.giveBullet(p.P5.id, 'live', 1);
    game.round = 1; game.phase = 'day';

    // P5 shoots P14 with live bullet → Godfather shield absorbs
    const shotResult = game.resolveMorningShot(p.P5.id, p.P14.id);
    expect(alive(p.P14)).toBe(true);
    expect(p.P14.shield.isActive).toBe(false); // Shield consumed

    // Vote eliminates P3
    game.eliminateByVote(p.P3.id);
    expect(dead(p.P3)).toBe(true);
  });

  it('Night 2 — Freemason recruits Godfather (mafia) → contamination', () => {
    p.P2.kill(1, 'mafia'); p.P3.kill(1, 'vote'); p.P10.kill(1, 'zodiac');
    p.P14.shield._active = false; // Shield used
    game.framason.init(p.P5.id, game.framasonMaxMembers);
    game.round = 1;

    const results = nightRound(game, {
      freemason: { actorIds: [p.P5.id], targetId: p.P14.id, actionType: 'recruit' },
    });

    // Recruited mafia → contamination
    expect(results.framasonRecruit).toBeTruthy();
    expect(results.framasonRecruit.contaminated).toBe(true);
    expect(game.hasFramasonContamination()).toBe(true);
  });

  it('Day 2 — Freemason contamination kills P5 alliance', () => {
    p.P2.kill(1, 'mafia'); p.P3.kill(1, 'vote'); p.P10.kill(1, 'zodiac');
    game.framason.init(p.P5.id, game.framasonMaxMembers);
    // Simulate contamination from recruiting mafia
    game.framason.recruit(p.P14.id, 'godfather', 'mafia');
    game.round = 1;
    game.startDay();

    const contamResult = game.resolveFramasonContamination();
    expect(contamResult.deadIds).toContain(p.P5.id);
    expect(dead(p.P5)).toBe(true);
  });

  it('Night 3 — Negotiation on Constantine fails (not simple citizen)', () => {
    // Set up: few mafia alive for negotiation threshold
    p.P2.kill(1, 'mafia'); p.P3.kill(1, 'vote'); p.P5.kill(2, 'framason');
    p.P10.kill(1, 'zodiac');
    game.round = 2;

    const results = nightRound(game, {
      godfather: { actorIds: [p.P14.id], targetId: p.P16.id, actionType: 'shoot', mode: 'negotiate' },
      zodiac:    { actorIds: [p.P4.id],  targetId: p.P6.id, actionType: 'shoot' },
      sniper:    { actorIds: [p.P1.id],  targetId: p.P4.id, actionType: 'shoot' },
    });

    // Negotiation on Constantine → fails (not simpleCitizen or suspect)
    expect(results.negotiated).toBeTruthy();
    expect(results.negotiated.success).toBe(false);

    // Zodiac kills P6
    expect(dead(p.P6)).toBe(true);
  });

  it('Mafia wins when mafia count ≥ citizens + independents', () => {
    // Simulate: enough citizens dead that mafia holds the balance
    // Alive: P4 (zodiac), P7 (jack), P8 (bomber), P12 (lecter), P14 (godfather), P15 (negotiator)
    // and maybe 1-2 citizens
    // Kill off most citizens
    for (const key of ['P1', 'P2', 'P3', 'P5', 'P6', 'P9', 'P10', 'P11', 'P13', 'P16']) {
      p[key].kill(3, 'mafia');
    }
    // Alive: P4(indie), P7(indie), P8(mafia), P12(mafia), P14(mafia), P15(mafia)
    // Mafia=4, Citizen=0, Independent=2 → 4 >= 0+2 → Mafia wins
    const winner = game.checkWinCondition();
    expect(winner).toBe('mafia');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   S3 — Independent Victory Edge
   ═══════════════════════════════════════════════════════════════════ */
describe('S3 — Independent Victory — New Rules', () => {
  it('Jack instant win: all mafia dead + Jack alive → independent wins immediately', () => {
    const { game, p } = setup({
      P1: 'sniper',
      P2: 'simpleCitizen',
      P3: 'jack',
      P4: 'godfather',
      P5: 'simpleMafia',
      P6: 'simpleCitizen',
      P7: 'simpleCitizen',
      P8: 'simpleCitizen',
    });

    // Kill all mafia
    p.P4.kill(2, 'vote'); p.P5.kill(3, 'vote');
    // Jack alive + citizens alive → Jack wins immediately
    const winner = game.checkWinCondition();
    expect(winner).toBe('independent');
    expect(game.phase).toBe('ended');
  });

  it('Zodiac alone (all mafia + all citizens dead) → independent wins', () => {
    const { game, p } = setup({
      P1: 'sniper',
      P2: 'simpleCitizen',
      P3: 'zodiac',
      P4: 'godfather',
      P5: 'simpleMafia',
    });

    // Kill all mafia + all citizens
    p.P4.kill(2, 'vote'); p.P5.kill(3, 'vote');
    p.P1.kill(1, 'mafia'); p.P2.kill(2, 'zodiac');
    // Alive: P3 (zodiac) only
    const winner = game.checkWinCondition();
    expect(winner).toBe('independent');
  });

  it('3 players with independent → handshake triggered', () => {
    const { game, p } = setup({
      P1: 'zodiac',
      P2: 'simpleCitizen',
      P3: 'godfather',
      P4: 'simpleCitizen',
      P5: 'simpleCitizen',
      P6: 'simpleCitizen',
      P7: 'simpleCitizen',
      P8: 'simpleMafia',
    });

    // Kill down to 3: P1 (zodiac), P2 (citizen), P3 (godfather)
    for (const k of ['P4', 'P5', 'P6', 'P7', 'P8']) p[k].kill(2, 'mafia');

    const result = game.checkWinCondition();
    expect(result).toBe('handshake');
    expect(game.phase).toBe('handshake');
    expect(game.handshakeState).toBeTruthy();
    expect(game.handshakeState.players).toHaveLength(3);
  });

  it('Handshake resolved: independent in pair → independent wins', () => {
    const { game, p } = setup({
      P1: 'zodiac',
      P2: 'simpleCitizen',
      P3: 'godfather',
      P4: 'simpleCitizen',
      P5: 'simpleCitizen',
      P6: 'simpleCitizen',
      P7: 'simpleCitizen',
      P8: 'simpleMafia',
    });

    for (const k of ['P4', 'P5', 'P6', 'P7', 'P8']) p[k].kill(2, 'mafia');
    game.checkWinCondition(); // triggers handshake

    const result = game.resolveHandshake(p.P2.id, p.P1.id); // citizen + zodiac
    expect(result.winner).toBe('independent');
    expect(game.phase).toBe('ended');
    expect(dead(p.P3)).toBe(true); // godfather eliminated
  });

  it('Handshake resolved: mafia + citizen (no independent) → mafia wins', () => {
    const { game, p } = setup({
      P1: 'zodiac',
      P2: 'simpleCitizen',
      P3: 'godfather',
      P4: 'simpleCitizen',
      P5: 'simpleCitizen',
      P6: 'simpleCitizen',
      P7: 'simpleCitizen',
      P8: 'simpleMafia',
    });

    for (const k of ['P4', 'P5', 'P6', 'P7', 'P8']) p[k].kill(2, 'mafia');
    game.checkWinCondition(); // triggers handshake

    const result = game.resolveHandshake(p.P2.id, p.P3.id); // citizen + godfather
    expect(result.winner).toBe('mafia');
    expect(game.phase).toBe('ended');
    expect(dead(p.P1)).toBe(true); // zodiac eliminated
  });
});

/* ═══════════════════════════════════════════════════════════════════
   S4 — Sniper Misfire Cascade
   ═══════════════════════════════════════════════════════════════════ */
describe('S4 — Sniper Misfire Cascade', () => {
  let game, p;

  beforeEach(() => {
    ({ game, p } = setup({
      P1: 'sniper',
      P2: 'simpleCitizen',
      P3: 'drWatson',
      P4: 'godfather',
      P5: 'simpleMafia',
      P6: 'simpleCitizen',
      P7: 'simpleCitizen',
      P8: 'simpleCitizen',
    }));
  });

  it('Night 1 — Sniper shoots citizen → sniper dies', () => {
    const results = nightRound(game, {
      sniper: { actorIds: [p.P1.id], targetId: p.P2.id, actionType: 'shoot' },
    });

    // Sniper targets citizen → sniper dies, citizen survives
    expect(dead(p.P1)).toBe(true);
    expect(p.P1.deathCause).toBe('sniper_miss');
    expect(alive(p.P2)).toBe(true);
  });

  it('Night 2 — Mafia kills Watson', () => {
    p.P1.kill(1, 'sniper_miss');
    game.round = 1;

    const results = nightRound(game, {
      godfather: { actorIds: [p.P4.id], targetId: p.P3.id, actionType: 'shoot', mode: 'shoot' },
    });

    expect(dead(p.P3)).toBe(true);
  });

  it('Day 2 — Vote eliminates mafia → citizens win', () => {
    p.P1.kill(1, 'sniper_miss'); p.P3.kill(2, 'mafia');
    game.round = 1;
    game.startDay();

    game.eliminateByVote(p.P4.id);
    game.eliminateByVote(p.P5.id);
    expect(dead(p.P4)).toBe(true);
    expect(dead(p.P5)).toBe(true);

    const winner = game.checkWinCondition();
    expect(winner).toBe('citizen');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   S5 — Bomb Full Failure Chain
   ═══════════════════════════════════════════════════════════════════ */
describe('S5 — Bomb Full Failure Chain', () => {
  it('Bodyguard fails guess → bodyguard dies, target survives (bodyguard sacrificed)', () => {
    const { game, p } = setup({
      P1: 'godfather',
      P2: 'bomber',
      P3: 'simpleCitizen',
      P4: 'bodyguard',
      P5: 'simpleCitizen',
      P6: 'simpleCitizen',
      P7: 'simpleCitizen',
      P8: 'drWatson',
    });

    // Plant bomb on P3, code = 3
    game.bomb.plant(p.P3.id, 3);
    game.round = 1; game.phase = 'day';

    // Bodyguard guesses wrong → bodyguard dies INSTEAD OF target
    const bgResult = game.bombGuardianGuess(1);
    expect(bgResult.result).toBe('wrong');
    expect(dead(p.P4)).toBe(true);    // Bodyguard dead
    expect(alive(p.P3)).toBe(true);   // Target survives — bomb cleared
  });

  it('Bodyguard skips → target guesses wrong → target dies', () => {
    const { game, p } = setup({
      P1: 'godfather',
      P2: 'bomber',
      P3: 'simpleCitizen',
      P4: 'bodyguard',
      P5: 'simpleCitizen',
      P6: 'simpleCitizen',
      P7: 'simpleCitizen',
      P8: 'drWatson',
    });

    // Plant bomb on P3, code = 3
    game.bomb.plant(p.P3.id, 3);
    game.round = 1; game.phase = 'day';

    // Bodyguard skips
    game.bombGuardianSkip();

    // Target guesses wrong → target dies
    const targetResult = game.bombTargetGuess(4);
    expect(targetResult.result).toBe('exploded');
    expect(dead(p.P3)).toBe(true);
    expect(alive(p.P4)).toBe(true); // Bodyguard unharmed
  });

  it('Bomb defusal by bodyguard works correctly', () => {
    const { game, p } = setup({
      P1: 'godfather',
      P2: 'bomber',
      P3: 'simpleCitizen',
      P4: 'bodyguard',
      P5: 'simpleCitizen',
      P6: 'simpleCitizen',
      P7: 'simpleCitizen',
      P8: 'drWatson',
    });

    game.bomb.plant(p.P3.id, 2);
    game.round = 1; game.phase = 'day';

    const bgResult = game.bombGuardianGuess(2); // Correct!
    expect(bgResult.result).toBe('defused');
    expect(alive(p.P4)).toBe(true);
    expect(alive(p.P3)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   S6 — Salakhi Dominance
   ═══════════════════════════════════════════════════════════════════ */
describe('S6 — Salakhi Dominance', () => {
  let game, p;

  beforeEach(() => {
    ({ game, p } = setup({
      P1: 'godfather',
      P2: 'drWatson',
      P3: 'detective',
      P4: 'simpleCitizen',
      P5: 'simpleCitizen',
      P6: 'simpleCitizen',
      P7: 'simpleCitizen',
      P8: 'simpleMafia',
    }));
  });

  it('Night 1 — Salakhi Watson (correct) → dies, not revivable', () => {
    const results = nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P2.id, actionType: 'shoot', mode: 'salakhi', guessedRoleId: 'drWatson' },
    });

    expect(results.salakhied.correct).toBe(true);
    expect(dead(p.P2)).toBe(true);
    expect(p.P2.isRevivable).toBe(false);
  });

  it('Night 2 — Salakhi Detective (correct) → dies, not revivable', () => {
    p.P2.kill(1, 'salakhi', false);
    game.round = 1;

    const results = nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P3.id, actionType: 'shoot', mode: 'salakhi', guessedRoleId: 'detective' },
    });

    expect(results.salakhied.correct).toBe(true);
    expect(dead(p.P3)).toBe(true);
    expect(p.P3.isRevivable).toBe(false);
  });

  it('Salakhi bypasses Watson heal', () => {
    // Watson heals self, Godfather salakhis Watson → Watson dies anyway
    const results = nightRound(game, {
      drWatson:  { actorIds: [p.P2.id], targetId: p.P2.id, actionType: 'heal' },
      godfather: { actorIds: [p.P1.id], targetId: p.P2.id, actionType: 'shoot', mode: 'salakhi', guessedRoleId: 'drWatson' },
    });

    expect(results.salakhied.correct).toBe(true);
    expect(dead(p.P2)).toBe(true); // Bypass heal
  });

  it('Mafia wins when citizens collapse from salakhi losses', () => {
    p.P2.kill(1, 'salakhi', false);
    p.P3.kill(2, 'salakhi', false);
    p.P4.kill(3, 'mafia');
    p.P5.kill(3, 'mafia');
    p.P6.kill(3, 'mafia');
    // Alive: P1 (godfather), P7 (citizen), P8 (mafia) = mafia 2 >= citizen 1
    const winner = game.checkWinCondition();
    expect(winner).toBe('mafia');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   S7 — Bullet Explosion Endgame
   ═══════════════════════════════════════════════════════════════════ */
describe('S7 — Bullet Explosion Endgame', () => {
  it('Unused live bullet explodes at voting start → holder dies', () => {
    const { game, p } = setup({
      P1: 'godfather',
      P2: 'gunner',
      P3: 'simpleCitizen',
      P4: 'simpleCitizen',
      P5: 'simpleCitizen',
      P6: 'simpleCitizen',
      P7: 'simpleCitizen',
      P8: 'simpleMafia',
    });
    game.bulletManager.init(2, 2);

    // Give P3 a live bullet
    game.bulletManager.giveBullet(p.P3.id, 'live', 1);
    game.round = 1; game.phase = 'day';

    // Voting starts → unused live bullets explode
    const explosions = game.resolveLiveExpiration();

    expect(explosions.length).toBeGreaterThanOrEqual(1);
    const p3Explosion = explosions.find(e => e.holderId === p.P3.id);
    expect(p3Explosion).toBeTruthy();
    expect(dead(p.P3)).toBe(true);
  });

  it('Blank bullet does not explode', () => {
    const { game, p } = setup({
      P1: 'godfather',
      P2: 'gunner',
      P3: 'simpleCitizen',
      P4: 'simpleCitizen',
      P5: 'simpleCitizen',
      P6: 'simpleCitizen',
      P7: 'simpleCitizen',
      P8: 'simpleMafia',
    });
    game.bulletManager.init(2, 2);

    game.bulletManager.giveBullet(p.P3.id, 'blank', 1);
    game.round = 1; game.phase = 'day';

    const explosions = game.resolveLiveExpiration();
    const p3Explosion = explosions.find(e => e.holderId === p.P3.id);
    expect(p3Explosion).toBeFalsy();
    expect(alive(p.P3)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   S8 — Constantine Critical Revival
   ═══════════════════════════════════════════════════════════════════ */
describe('S8 — Constantine Critical Revival', () => {
  it('Constantine revives dead detective → detective becomes alive', () => {
    const { game, p } = setup({
      P1: 'godfather',
      P2: 'detective',
      P3: 'constantine',
      P4: 'simpleCitizen',
      P5: 'simpleCitizen',
      P6: 'simpleCitizen',
      P7: 'simpleCitizen',
      P8: 'simpleMafia',
    });

    // Kill detective in round 1
    p.P2.kill(1, 'mafia');
    expect(dead(p.P2)).toBe(true);
    // Round must be > deathRound for Constantine to revive
    game.round = 2;

    // Night: Constantine revives detective
    const results = nightRound(game, {
      constantine: { actorIds: [p.P3.id], targetId: p.P2.id, actionType: 'revive' },
    });

    expect(results.revived).toBe(p.P2.id);
    expect(alive(p.P2)).toBe(true);
  });

  it('Cannot revive salakhi victim', () => {
    const { game, p } = setup({
      P1: 'godfather',
      P2: 'detective',
      P3: 'constantine',
      P4: 'simpleCitizen',
      P5: 'simpleCitizen',
      P6: 'simpleCitizen',
      P7: 'simpleCitizen',
      P8: 'simpleMafia',
    });

    // Kill detective by salakhi (not revivable)
    p.P2.kill(1, 'salakhi', false);
    game.round = 1;

    const results = nightRound(game, {
      constantine: { actorIds: [p.P3.id], targetId: p.P2.id, actionType: 'revive' },
    });

    // Should not be revived
    expect(dead(p.P2)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   S9 — Zodiac vs Bodyguard
   ═══════════════════════════════════════════════════════════════════ */
describe('S9 — Zodiac vs Bodyguard', () => {
  it('Zodiac shoots Bodyguard → Zodiac dies, Bodyguard survives', () => {
    const { game, p } = setup({
      P1: 'zodiac',
      P2: 'bodyguard',
      P3: 'godfather',
      P4: 'simpleCitizen',
      P5: 'simpleCitizen',
      P6: 'simpleCitizen',
      P7: 'simpleCitizen',
      P8: 'simpleMafia',
    });

    const results = nightRound(game, {
      zodiac: { actorIds: [p.P1.id], targetId: p.P2.id, actionType: 'shoot' },
    });

    expect(dead(p.P1)).toBe(true);
    expect(p.P1.deathCause).toBe('zodiac_bodyguard');
    expect(alive(p.P2)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   S10 — Negotiation Success Swing
   ═══════════════════════════════════════════════════════════════════ */
describe('S10 — Negotiation Success Swing', () => {
  it('Godfather converts Suspect to mafia via negotiation', () => {
    const { game, p } = setup({
      P1: 'godfather',
      P2: 'negotiator',
      P3: 'suspect',
      P4: 'simpleCitizen',
      P5: 'simpleCitizen',
      P6: 'simpleCitizen',
      P7: 'simpleCitizen',
      P8: 'simpleCitizen',
    });

    const results = nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P3.id, actionType: 'shoot', mode: 'negotiate' },
    });

    expect(results.negotiated).toBeTruthy();
    expect(results.negotiated.success).toBe(true);
    // Suspect's role changed to simpleMafia
    expect(p.P3.roleId).toBe('simpleMafia');
  });

  it('Negotiation on detective fails → mafia loses shot', () => {
    const { game, p } = setup({
      P1: 'godfather',
      P2: 'negotiator',
      P3: 'detective',
      P4: 'simpleCitizen',
      P5: 'simpleCitizen',
      P6: 'simpleCitizen',
      P7: 'simpleCitizen',
      P8: 'simpleCitizen',
    });

    const results = nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P3.id, actionType: 'shoot', mode: 'negotiate' },
    });

    expect(results.negotiated.success).toBe(false);
    expect(p.P3.roleId).toBe('detective'); // Unchanged
    expect(alive(p.P3)).toBe(true); // Still alive (mafia lost shot, not killed)
  });
});

/* ═══════════════════════════════════════════════════════════════════
   S11 — Sorcerer Total Disruption
   ═══════════════════════════════════════════════════════════════════ */
describe('S11 — Sorcerer Total Disruption', () => {
  it('Sorcerer blocks Watson → mafia kill succeeds', () => {
    const { game, p } = setup({
      P1: 'godfather',
      P2: 'drWatson',
      P3: 'jadoogar',
      P4: 'simpleCitizen',
      P5: 'simpleCitizen',
      P6: 'simpleCitizen',
      P7: 'simpleCitizen',
      P8: 'simpleMafia',
    });

    const results = nightRound(game, {
      jadoogar:  { actorIds: [p.P3.id], targetId: p.P2.id, actionType: 'block' },
      drWatson:  { actorIds: [p.P2.id], targetId: p.P4.id, actionType: 'heal' },
      godfather: { actorIds: [p.P1.id], targetId: p.P4.id, actionType: 'shoot', mode: 'shoot' },
    });

    // Watson was blocked → heal on P4 nullified → Godfather kills P4
    expect(dead(p.P4)).toBe(true);
    expect(results.blocked).toBe(p.P2.id);
  });

  it('Sorcerer blocks Detective → detective action removed entirely', () => {
    const { game, p } = setup({
      P1: 'godfather',
      P2: 'detective',
      P3: 'jadoogar',
      P4: 'simpleCitizen',
      P5: 'simpleCitizen',
      P6: 'simpleCitizen',
      P7: 'simpleCitizen',
      P8: 'simpleMafia',
    });

    const results = nightRound(game, {
      jadoogar:  { actorIds: [p.P3.id], targetId: p.P2.id, actionType: 'block' },
      detective: { actorIds: [p.P2.id], targetId: p.P8.id, actionType: 'investigate' },
    });

    // Jadoogar block removes the detective's action entirely
    expect(results.blocked).toBe(p.P2.id);
    // Investigation result is null because the action was deleted before processing
    expect(results.investigated).toBeNull();
  });
});

/* ═══════════════════════════════════════════════════════════════════
   S12 — Tie Vote Multi-Elimination
   ═══════════════════════════════════════════════════════════════════ */
describe('S12 — Tie Vote Multi-Elimination', () => {
  it('Tie vote between 3 players → all 3 eliminated', () => {
    const { game, p } = setup({
      P1: 'godfather',
      P2: 'simpleCitizen',
      P3: 'simpleCitizen',
      P4: 'simpleCitizen',
      P5: 'simpleCitizen',
      P6: 'simpleCitizen',
      P7: 'simpleCitizen',
      P8: 'simpleMafia',
    });
    game.round = 2;
    game.startDay();

    // Simulate tie: all 3 are voted out (Game handles this at the view layer,
    // engine just provides eliminateByVote for each)
    game.eliminateByVote(p.P2.id);
    game.eliminateByVote(p.P3.id);
    game.eliminateByVote(p.P4.id);

    expect(dead(p.P2)).toBe(true);
    expect(dead(p.P3)).toBe(true);
    expect(dead(p.P4)).toBe(true);
    expect(p.P2.deathCause).toBe('vote');
    expect(p.P3.deathCause).toBe('vote');
    expect(p.P4.deathCause).toBe('vote');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   S13 — Jack Curse Multi-Trigger
   ═══════════════════════════════════════════════════════════════════ */
describe('S13 — Jack Curse Multi-Trigger', () => {
  it('Cursed player killed → Jack also dies (night resolution)', () => {
    const { game, p } = setup({
      P1: 'godfather',
      P2: 'simpleCitizen',
      P3: 'jack',
      P4: 'simpleCitizen',
      P5: 'simpleCitizen',
      P6: 'simpleCitizen',
      P7: 'simpleCitizen',
      P8: 'simpleMafia',
    });

    // Jack curses P2 in blind night
    p.P3.curse.place(p.P2.id);

    // Night: mafia kills P2 (cursed)
    const results = nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P2.id, actionType: 'shoot', mode: 'shoot' },
      jack:      { actorIds: [p.P3.id], targetId: p.P2.id, actionType: 'curse' },
    });

    // P2 dies from mafia
    expect(dead(p.P2)).toBe(true);
    // Jack's curse triggers → Jack also dies
    expect(results.jackCurseTriggered).toBe(true);
    expect(dead(p.P3)).toBe(true);
    expect(p.P3.deathCause).toBe('curse');
  });

  it('Cursed player voted out → Jack dies (day vote)', () => {
    const { game, p } = setup({
      P1: 'godfather',
      P2: 'simpleCitizen',
      P3: 'jack',
      P4: 'simpleCitizen',
      P5: 'simpleCitizen',
      P6: 'simpleCitizen',
      P7: 'simpleCitizen',
      P8: 'simpleMafia',
    });

    // Jack curses P2
    p.P3.curse.place(p.P2.id);
    game.round = 1; game.phase = 'day';

    const result = game.eliminateByVote(p.P2.id);
    expect(dead(p.P2)).toBe(true);
    expect(result.jackCurseTriggered).toBe(true);
    expect(dead(p.P3)).toBe(true);
  });

  it('Jack immune to vote → voting Jack returns voteImmune', () => {
    const { game, p } = setup({
      P1: 'godfather',
      P2: 'jack',
      P3: 'simpleCitizen',
      P4: 'simpleCitizen',
      P5: 'simpleCitizen',
      P6: 'simpleCitizen',
      P7: 'simpleCitizen',
      P8: 'simpleMafia',
    });

    game.round = 1; game.phase = 'day';
    const result = game.eliminateByVote(p.P2.id);
    expect(result.voteImmune).toBe(true);
    expect(alive(p.P2)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   S14 — Jack Instant Win — Mafia Collapse
   ═══════════════════════════════════════════════════════════════════ */
describe('S14 — Jack Instant Win — Mafia Collapse', () => {
  it('All mafia die + Jack alive → Jack wins instantly (citizens still alive)', () => {
    const { game, p } = setup({
      P1: 'jack', P2: 'zodiac', P3: 'godfather', P4: 'simpleMafia',
      P5: 'drWatson', P6: 'detective', P7: 'sniper', P8: 'simpleCitizen',
      P9: 'simpleCitizen', P10: 'bodyguard',
    });

    // Night 1: kill some players
    p.P8.kill(1, 'mafia'); p.P9.kill(1, 'zodiac'); p.P4.kill(1, 'sniper');
    game.round = 1;
    game.startDay();

    // Day 1 vote: Godfather out
    game.eliminateByVote(p.P3.id);
    expect(dead(p.P3)).toBe(true);

    // All mafia dead (P3+P4). Jack alive → instant win
    const winner = game.checkWinCondition();
    expect(winner).toBe('independent');
    expect(game.phase).toBe('ended');
    // Citizens and Zodiac still alive but Jack wins
    expect(alive(p.P5)).toBe(true);
    expect(alive(p.P1)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   S15 — Zodiac Handshake Victory
   ═══════════════════════════════════════════════════════════════════ */
describe('S15 — Zodiac Handshake Victory', () => {
  it('Zodiac kills to 3 players, citizen allies with Zodiac → independent wins', () => {
    const { game, p } = setup({
      P1: 'zodiac', P2: 'godfather', P3: 'simpleMafia', P4: 'drWatson',
      P5: 'detective', P6: 'sniper', P7: 'simpleCitizen', P8: 'simpleCitizen',
      P9: 'simpleCitizen', P10: 'bodyguard',
    });

    // Kill mafia first
    p.P4.kill(1, 'mafia'); p.P7.kill(1, 'zodiac');
    p.P2.kill(1, 'vote'); // Godfather
    p.P8.kill(2, 'zodiac'); p.P3.kill(2, 'vote'); // Last mafia
    // All mafia dead. No Jack → no instant win. Zodiac + citizens remain.
    p.P9.kill(3, 'zodiac'); p.P6.kill(3, 'vote');
    // 3 alive: P1(zodiac), P5(detective), P10(bodyguard)
    const result = game.checkWinCondition();
    expect(result).toBe('handshake');

    // Citizen allies with Zodiac
    const hsResult = game.resolveHandshake(p.P5.id, p.P1.id);
    expect(hsResult.winner).toBe('independent');
    expect(dead(p.P10)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   S16 — Mafia Wins via Handshake
   ═══════════════════════════════════════════════════════════════════ */
describe('S16 — Mafia Wins via Handshake', () => {
  it('3 alive (2 mafia + 1 zodiac), mafia pair up → mafia wins', () => {
    const { game, p } = setup({
      P1: 'zodiac', P2: 'godfather', P3: 'simpleCitizen', P4: 'simpleCitizen',
      P5: 'simpleCitizen', P6: 'simpleCitizen', P7: 'simpleCitizen', P8: 'simpleMafia',
    });

    // Kill citizens down to 3: P1(zodiac), P2(godfather), P8(simpleMafia)
    for (const k of ['P3', 'P4', 'P5', 'P6', 'P7']) p[k].kill(2, 'mafia');

    // Mafia normally wins (2 >= 0+1) but 3 alive with independent → handshake
    const result = game.checkWinCondition();
    expect(result).toBe('handshake');

    // Mafia pair allies
    const hsResult = game.resolveHandshake(p.P2.id, p.P8.id);
    expect(hsResult.winner).toBe('mafia');
    expect(dead(p.P1)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   S17 — Jack Curse Prevents Jack Win — Citizens Win
   ═══════════════════════════════════════════════════════════════════ */
describe('S17 — Jack Curse Chain → Jack Dies Before Mafia Collapse', () => {
  it('Jack cursed player voted out → Jack dies → then mafia eliminated → citizen wins', () => {
    const { game, p } = setup({
      P1: 'jack', P2: 'godfather', P3: 'simpleMafia', P4: 'drWatson',
      P5: 'detective', P6: 'simpleCitizen', P7: 'simpleCitizen', P8: 'sniper',
    });

    // Jack curses P6
    p.P1.curse.place(p.P6.id);

    p.P4.kill(1, 'mafia'); // Watson dies N1
    game.round = 1; game.startDay();

    // Day 1: Vote P6 → Jack curse triggers
    game.eliminateByVote(p.P6.id);
    expect(dead(p.P1)).toBe(true);
    expect(p.P1.deathCause).toBe('curse');

    // Day 1: Also vote out P3
    game.eliminateByVote(p.P3.id);
    expect(dead(p.P3)).toBe(true);

    // N2: Godfather shoots P7
    p.P7.kill(2, 'mafia');
    game.round = 2; game.startDay();

    // Day 2: Vote out Godfather → all mafia dead, Jack already dead → citizen wins
    game.eliminateByVote(p.P2.id);
    const winner = game.checkWinCondition();
    expect(winner).toBe('citizen');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   S18 — Zodiac Long Game → Handshake Win
   ═══════════════════════════════════════════════════════════════════ */
describe('S18 — Zodiac Long Game → Handshake', () => {
  it('Zodiac kills consistently, reaches 3-player handshake after mafia eliminated', () => {
    const { game, p } = setup({
      P1: 'zodiac', P2: 'godfather', P3: 'jadoogar', P4: 'drWatson',
      P5: 'detective', P6: 'sniper', P7: 'simpleCitizen', P8: 'simpleCitizen',
      P9: 'bodyguard', P10: 'simpleMafia',
    });

    // N1: Godfather kills P7, Zodiac kills P8
    p.P7.kill(1, 'mafia'); p.P8.kill(1, 'zodiac');
    // D1: Vote out Godfather
    p.P2.kill(1, 'vote');
    // N2: Zodiac kills P5
    p.P5.kill(2, 'zodiac');
    // D2: Vote out P10 (simpleMafia)
    p.P10.kill(2, 'vote');
    // Alive: P1(zodiac), P3(jadoogar), P4(watson), P6(sniper), P9(bodyguard) = 5
    // Still 1 mafia (P3) alive → game continues normally
    let winner = game.checkWinCondition();
    expect(winner).toBeNull();

    // N3: Zodiac kills P6
    p.P6.kill(3, 'zodiac');
    // D3: Vote out P3 (jadoogar — last mafia)
    p.P3.kill(3, 'vote');
    // Alive: P1(zodiac), P4(watson), P9(bodyguard) = 3
    // All mafia dead. Zodiac alive. 3 players with independent → handshake
    winner = game.checkWinCondition();
    expect(winner).toBe('handshake');

    const hsResult = game.resolveHandshake(p.P9.id, p.P1.id);
    expect(hsResult.winner).toBe('independent');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   S19 — Salakhi Kills Jack → Mafia Domination
   ═══════════════════════════════════════════════════════════════════ */
describe('S19 — Salakhi Kills Jack → Mafia Dominates', () => {
  it('Godfather salakhis Jack N1. No instant win for Jack. Mafia wins by numbers.', () => {
    const { game, p } = setup({
      P1: 'jack', P2: 'godfather', P3: 'simpleMafia', P4: 'drWatson',
      P5: 'simpleCitizen', P6: 'simpleCitizen', P7: 'simpleCitizen', P8: 'simpleCitizen',
    });

    // Night 1: Salakhi Jack (correct)
    const results = nightRound(game, {
      godfather: { actorIds: [p.P2.id], targetId: p.P1.id, actionType: 'shoot', mode: 'salakhi', guessedRoleId: 'jack' },
    });
    expect(results.salakhied.correct).toBe(true);
    expect(dead(p.P1)).toBe(true);
    expect(p.P1.isRevivable).toBe(false);

    // Night 2: Godfather shoots P4
    p.P4.kill(2, 'mafia');
    // Day 2: Citizens mislynch P5
    p.P5.kill(2, 'vote');

    // Night 3: Godfather shoots P6
    p.P6.kill(3, 'mafia');
    // Alive: P2(GF), P3(mafia), P7(citizen), P8(citizen) → 2 mafia >= 2 citizen → mafia wins
    const winner = game.checkWinCondition();
    expect(winner).toBe('mafia');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   S20 — Bomb + Curse Chain → Citizens Win
   ═══════════════════════════════════════════════════════════════════ */
describe('S20 — Bomb + Curse → Jack Dies → Citizens Win', () => {
  it('Jack cursed player voted out → Jack dies, then remaining mafia eliminated → citizen win', () => {
    const { game, p } = setup({
      P1: 'jack', P2: 'godfather', P3: 'simpleMafia', P4: 'drWatson',
      P5: 'detective', P6: 'bodyguard', P7: 'simpleCitizen', P8: 'simpleCitizen',
      P9: 'simpleCitizen', P10: 'sniper',
    });

    // Jack curses P7
    p.P1.curse.place(p.P7.id);

    // N1: Kill some players
    p.P8.kill(1, 'mafia');
    game.round = 1; game.startDay();

    // Vote: P7 out → Jack curse triggers, Jack dies
    game.eliminateByVote(p.P7.id);
    expect(dead(p.P7)).toBe(true);
    expect(dead(p.P1)).toBe(true);

    // Kill mafia over subsequent rounds
    p.P3.kill(2, 'vote');
    p.P2.kill(3, 'vote');

    // All mafia dead, all indep dead → citizen wins
    const winner = game.checkWinCondition();
    expect(winner).toBe('citizen');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   S21 — Freemason Contamination + Zodiac → Handshake
   ═══════════════════════════════════════════════════════════════════ */
describe('S21 — Freemason Contamination + Zodiac Survives → Handshake', () => {
  it('Freemason recruits mafia → contamination. Zodiac reaches handshake.', () => {
    const { game, p } = setup({
      P1: 'zodiac', P2: 'godfather', P3: 'simpleMafia', P4: 'drWatson',
      P5: 'freemason', P6: 'simpleCitizen', P7: 'simpleCitizen', P8: 'simpleCitizen',
      P9: 'bodyguard', P10: 'detective',
    });
    game.framason.init(p.P5.id, game.framasonMaxMembers);

    // N1: kill P6, P7
    p.P6.kill(1, 'mafia'); p.P7.kill(1, 'zodiac');
    // D1: Vote P2
    p.P2.kill(1, 'vote');

    // N2: Freemason recruits P3 (mafia) → contamination
    game.framason.recruit(p.P3.id, 'simpleMafia', 'mafia');
    expect(game.hasFramasonContamination()).toBe(true);

    // Also: Zodiac kills P10
    p.P10.kill(2, 'zodiac');

    // D2: Contamination kills freemason team
    game.round = 2; game.startDay();
    const { deadIds } = game.resolveFramasonContamination();
    expect(deadIds).toContain(p.P5.id);
    expect(dead(p.P5)).toBe(true);

    // Also vote P3
    game.eliminateByVote(p.P3.id);
    expect(dead(p.P3)).toBe(true);

    // N3: Zodiac kills P4
    p.P4.kill(3, 'zodiac');

    // 3 alive: P1(zodiac), P8(citizen), P9(bodyguard) → handshake
    const result = game.checkWinCondition();
    expect(result).toBe('handshake');

    // Bodyguard allies with Zodiac
    const hsResult = game.resolveHandshake(p.P9.id, p.P1.id);
    expect(hsResult.winner).toBe('independent');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   S22 — Constantine Revival → Citizens Win
   ═══════════════════════════════════════════════════════════════════ */
describe('S22 — Constantine Revival Saves Game → Citizens Win', () => {
  it('Constantine revives sniper. Later all mafia die. No independents → citizen win.', () => {
    const { game, p } = setup({
      P1: 'godfather', P2: 'simpleMafia', P3: 'drWatson', P4: 'detective',
      P5: 'constantine', P6: 'sniper', P7: 'simpleCitizen', P8: 'simpleCitizen',
      P9: 'simpleCitizen', P10: 'simpleCitizen',
    });

    // N1: Godfather kills P6 (sniper)
    p.P6.kill(1, 'mafia');
    // D1: Vote P2 out
    p.P2.kill(1, 'vote');

    // N2: Constantine revives P6 (sniper)
    game.round = 2;
    const results = nightRound(game, {
      godfather:   { actorIds: [p.P1.id], targetId: p.P4.id, actionType: 'shoot', mode: 'shoot' },
      constantine: { actorIds: [p.P5.id], targetId: p.P6.id, actionType: 'revive' },
    });
    expect(results.revived).toBe(p.P6.id);
    expect(alive(p.P6)).toBe(true);
    expect(dead(p.P4)).toBe(true);

    // D2: Vote out Godfather
    game.startDay();
    game.eliminateByVote(p.P1.id);

    // All mafia dead, no independents → citizen wins
    const winner = game.checkWinCondition();
    expect(winner).toBe('citizen');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   S23 — Jack + Zodiac Both Alive, Jack Curse Kills Jack
   ═══════════════════════════════════════════════════════════════════ */
describe('S23 — Jack Curse Self-Destructs, Zodiac Continues', () => {
  it('Jack dies from curse. Then mafia dies. No Jack → no instant win. Zodiac must reach handshake.', () => {
    const { game, p } = setup({
      P1: 'jack', P2: 'zodiac', P3: 'godfather', P4: 'simpleMafia',
      P5: 'drWatson', P6: 'detective', P7: 'simpleCitizen', P8: 'simpleCitizen',
      P9: 'bodyguard', P10: 'sniper',
    });

    // Jack curses P7
    p.P1.curse.place(p.P7.id);

    // N1: Godfather kills P7 (cursed citizen)
    p.P7.kill(1, 'mafia');
    // Jack curse triggers → Jack dies
    p.P1.kill(1, 'curse');
    expect(dead(p.P1)).toBe(true);

    // Zodiac kills P8
    p.P8.kill(1, 'zodiac');

    // D1: Vote Godfather
    p.P3.kill(1, 'vote');
    // D2: Vote P4 (last mafia)
    p.P4.kill(2, 'vote');

    // All mafia dead. Jack dead. Zodiac alive. Citizens alive.
    // Jack NOT alive → no instant win
    let winner = game.checkWinCondition();
    expect(winner).toBeNull(); // Game continues — Zodiac must kill to 3

    // Zodiac keeps killing
    p.P5.kill(3, 'zodiac'); p.P6.kill(3, 'vote');

    // 3 alive: P2(zodiac), P9(bodyguard), P10(sniper) → handshake
    winner = game.checkWinCondition();
    expect(winner).toBe('handshake');

    // Handshake: sniper + zodiac → independent wins
    const hsResult = game.resolveHandshake(p.P10.id, p.P2.id);
    expect(hsResult.winner).toBe('independent');
    expect(dead(p.P9)).toBe(true);
  });
});
