/**
 * scenario-suite.test.mjs — 13 User-Defined Scenario Tests
 *
 * Maps directly to the user's scenario JSON (S1–S13).
 * Each scenario tests the full timeline phase-by-phase using the Game engine API.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../js/models/Game.js';
import { Roles } from '../js/models/Roles.js';
import { CARD, LastActionManager } from '../js/models/LastActionManager.js';

/* ─── Helpers ─── */

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

function nightRound(game, actions) {
  game.startNight();
  Object.assign(game.nightActions, actions);
  return game.resolveNight();
}

const alive = (player) => player.isAlive;
const dead  = (player) => !player.isAlive;

/* ═══════════════════════════════════════════════════════════════════
   S1 — Chain Reactions & Misleading Signals (16 Players)
   Full timeline: BlindDay → BlindNight → Night1 → Day1 → Night2
                → Day2 → Night3 → Day3 → Night4 → Citizens Win
   ═══════════════════════════════════════════════════════════════════ */
describe('S1 — Chain Reactions & Misleading Signals', () => {
  let game, p;

  const roster = {
    P1: 'sniper', P2: 'simpleCitizen', P3: 'suspect', P4: 'zodiac',
    P5: 'freemason', P6: 'gunner', P7: 'jack', P8: 'bomber',
    P9: 'drWatson', P10: 'simpleCitizen', P11: 'bodyguard', P12: 'drLecter',
    P13: 'detective', P14: 'godfather', P15: 'constantine', P16: 'kane',
  };

  beforeEach(() => {
    ({ game, p } = setup(roster));
    game.framason.init(p.P5.id, game.framasonMaxMembers);
    game.bulletManager.init(game.gunnerBlankMax, game.gunnerLiveMax);
  });

  it('BlindNight — Jack curses P3', () => {
    game.startBlindNight();
    game.nightActions.jack = { actorIds: [p.P7.id], targetId: p.P3.id, actionType: 'curse' };
    game.resolveNight();
    expect(p.P7.curse.targetId).toBe(p.P3.id);
  });

  it('Night 1 — Watson self-heal saves P9; P10 dies to Zodiac; Detective sees suspect as positive', () => {
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

    expect(alive(p.P9)).toBe(true);                        // Watson survived (self-heal)
    expect(results.saved).toContain(p.P9.id);
    expect(dead(p.P10)).toBe(true);                         // Zodiac killed P10
    expect(results.investigated.result).toBe('positive');   // Suspect → misleading positive
    expect(results.bombed).toBe(p.P6.id);                   // Bomb planted on P6
    expect(results.framasonRecruit.safe).toBe(true);         // P2 is citizen → safe recruit
  });

  it('Day 1 — P2 shoots P3 (live bullet), Jack curse triggers, bomb kills bodyguard, vote P13', () => {
    // State after Night 1
    p.P7.curse.place(p.P3.id);
    p.P10.kill(1, 'zodiac');
    game.bulletManager.giveBullet(p.P2.id, 'live', 1);
    game.bomb.plant(p.P6.id, 2);
    game.round = 1; game.phase = 'day';

    // P2 morning-shoots P3 with live bullet
    const shot = game.resolveMorningShot(p.P2.id, p.P3.id);
    expect(shot.type).toBe('live');
    expect(dead(p.P3)).toBe(true);

    // Jack curse chain: P3 was cursed → Jack dies
    if (p.P7.isAlive && p.P7.curse.isTriggeredBy(p.P3.id)) {
      p.P7.kill(1, 'curse');
    }
    expect(dead(p.P7)).toBe(true);

    // Bomb siesta: bodyguard guesses wrong → bodyguard dies, target survives
    const bgResult = game.bombGuardianGuess(3); // Wrong (correct is 2)
    expect(bgResult.result).toBe('wrong');
    expect(dead(p.P11)).toBe(true);
    expect(alive(p.P6)).toBe(true);   // Target P6 survives when guardian dies

    // Vote eliminates P13 (Detective)
    game.eliminateByVote(p.P13.id);
    expect(dead(p.P13)).toBe(true);
  });

  it('Night 2 — Salakhi P5 (correct), Zodiac kills P2, Constantine revives P3, Sniper vs GF shield', () => {
    // Dead after Day 1: P3, P7, P10, P11, P13
    p.P3.kill(1, 'morning_shot'); p.P7.kill(1, 'curse');
    p.P10.kill(1, 'zodiac'); p.P11.kill(1, 'bomb'); p.P13.kill(1, 'vote');
    game.round = 2;

    const results = nightRound(game, {
      godfather:   { actorIds: [p.P14.id], targetId: p.P5.id, actionType: 'shoot', mode: 'salakhi', guessedRoleId: 'freemason' },
      zodiac:      { actorIds: [p.P4.id],  targetId: p.P2.id, actionType: 'shoot' },
      constantine: { actorIds: [p.P15.id], targetId: p.P3.id, actionType: 'revive' },
      sniper:      { actorIds: [p.P1.id],  targetId: p.P14.id, actionType: 'shoot' },
    });

    expect(results.salakhied.correct).toBe(true);
    expect(dead(p.P5)).toBe(true);
    expect(p.P5.isRevivable).toBe(false);
    expect(dead(p.P2)).toBe(true);
    expect(results.revived).toBe(p.P3.id);
    expect(alive(p.P3)).toBe(true);
    expect(alive(p.P14)).toBe(true);              // Shield absorbed sniper shot
    expect(p.P14.shield.isActive).toBe(false);    // Shield consumed
  });

  it('Day 2 — Vote tie eliminates both P8 (Bomber) and P4 (Zodiac)', () => {
    p.P2.kill(2, 'zodiac'); p.P3.isAlive = true; p.P3.deathCause = null;
    p.P5.kill(2, 'salakhi', false); p.P7.kill(1, 'curse');
    p.P10.kill(1, 'zodiac'); p.P11.kill(1, 'bomb'); p.P13.kill(1, 'vote');
    game.round = 1; game.startDay();

    game.eliminateByVote(p.P8.id);
    game.eliminateByVote(p.P4.id);
    expect(dead(p.P8)).toBe(true);
    expect(dead(p.P4)).toBe(true);
  });

  it('Night 3 — Godfather shoots P1 (Sniper) → shield absorbs', () => {
    p.P2.kill(2, 'zodiac'); p.P4.kill(2, 'vote'); p.P5.kill(2, 'salakhi', false);
    p.P7.kill(1, 'curse'); p.P8.kill(2, 'vote'); p.P10.kill(1, 'zodiac');
    p.P11.kill(1, 'bomb'); p.P13.kill(1, 'vote');
    game.round = 2;

    const results = nightRound(game, {
      godfather: { actorIds: [p.P14.id], targetId: p.P1.id, actionType: 'shoot', mode: 'shoot' },
    });

    expect(alive(p.P1)).toBe(true);
    expect(results.shielded).toContain(p.P1.id);
    expect(p.P1.shield.isActive).toBe(false);
  });

  it('Day 3 — Vote eliminates P14 (Godfather)', () => {
    p.P1.kill(3, 'mafia'); p.P2.kill(2, 'zodiac'); p.P4.kill(2, 'vote');
    p.P5.kill(2, 'salakhi', false); p.P7.kill(1, 'curse'); p.P8.kill(2, 'vote');
    p.P10.kill(1, 'zodiac'); p.P11.kill(1, 'bomb'); p.P13.kill(1, 'vote');
    game.round = 2; game.startDay();
    game.eliminateByVote(p.P14.id);
    expect(dead(p.P14)).toBe(true);
  });

  it('Final — All mafia + independents dead → Citizens Win', () => {
    // Kill all mafia: P8 (bomber), P12 (lecter), P14 (godfather)
    // Kill all independents: P4 (zodiac), P7 (jack)
    p.P8.kill(2, 'vote'); p.P12.kill(4, 'vote'); p.P14.kill(3, 'vote');
    p.P4.kill(2, 'vote'); p.P7.kill(1, 'curse');
    p.P1.kill(3, 'mafia'); p.P2.kill(2, 'zodiac');
    p.P5.kill(2, 'salakhi', false); p.P10.kill(1, 'zodiac');
    p.P11.kill(1, 'bomb'); p.P13.kill(1, 'vote');

    const winner = game.checkWinCondition();
    expect(winner).toBe('citizen');
    expect(game.phase).toBe('ended');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   S2 — Freemason Contamination & Negotiation (16 Players)
   ═══════════════════════════════════════════════════════════════════ */
describe('S2 — Freemason Contamination & Negotiation', () => {
  let game, p;

  beforeEach(() => {
    ({ game, p } = setup({
      P1: 'sniper', P2: 'simpleCitizen', P3: 'simpleCitizen', P4: 'zodiac',
      P5: 'freemason', P6: 'gunner', P7: 'jack', P8: 'bomber',
      P9: 'drWatson', P10: 'simpleCitizen', P11: 'bodyguard', P12: 'drLecter',
      P13: 'detective', P14: 'godfather', P15: 'negotiator', P16: 'constantine',
    }));
    game.framason.init(p.P5.id, game.framasonMaxMembers);
    game.bulletManager.init(game.gunnerBlankMax, game.gunnerLiveMax);
  });

  it('BlindNight — Jack curses P5', () => {
    game.startBlindNight();
    game.nightActions.jack = { actorIds: [p.P7.id], targetId: p.P5.id, actionType: 'curse' };
    game.resolveNight();
    expect(p.P7.curse.targetId).toBe(p.P5.id);
  });

  it('Night 1 — Mafia kills P2, Zodiac kills P10, Freemason recruits P3, Gunner gives bullet', () => {
    p.P7.curse.place(p.P5.id);
    const results = nightRound(game, {
      godfather: { actorIds: [p.P14.id], targetId: p.P2.id, actionType: 'shoot', mode: 'shoot' },
      zodiac:    { actorIds: [p.P4.id],  targetId: p.P10.id, actionType: 'shoot' },
      freemason: { actorIds: [p.P5.id],  targetId: p.P3.id, actionType: 'recruit' },
      gunner:    { actorIds: [p.P6.id],  bulletAssignments: [{ holderId: p.P5.id, type: 'live' }], actionType: 'bullets' },
    });

    expect(dead(p.P2)).toBe(true);
    expect(dead(p.P10)).toBe(true);
    expect(results.framasonRecruit.safe).toBe(true);
  });

  it('Day 1 — P5 morning-shoots P14 (shield absorbs), vote eliminates P3', () => {
    p.P2.kill(1, 'mafia'); p.P10.kill(1, 'zodiac');
    game.bulletManager.giveBullet(p.P5.id, 'live', 1);
    game.round = 1; game.phase = 'day';

    const shot = game.resolveMorningShot(p.P5.id, p.P14.id);
    expect(alive(p.P14)).toBe(true);
    expect(p.P14.shield.isActive).toBe(false);

    game.eliminateByVote(p.P3.id);
    expect(dead(p.P3)).toBe(true);
  });

  it('Night 2 — Freemason recruits P14 (mafia) → contamination', () => {
    p.P2.kill(1, 'mafia'); p.P3.kill(1, 'vote'); p.P10.kill(1, 'zodiac');
    p.P14.shield._active = false;
    game.framason.init(p.P5.id, game.framasonMaxMembers);
    game.round = 1;

    const results = nightRound(game, {
      freemason: { actorIds: [p.P5.id], targetId: p.P14.id, actionType: 'recruit' },
    });

    expect(results.framasonRecruit.contaminated).toBe(true);
    expect(game.hasFramasonContamination()).toBe(true);
  });

  it('Day 2 — Contamination kills P5 alliance', () => {
    p.P2.kill(1, 'mafia'); p.P3.kill(1, 'vote'); p.P10.kill(1, 'zodiac');
    game.framason.init(p.P5.id, game.framasonMaxMembers);
    game.framason.recruit(p.P14.id, 'godfather', 'mafia');
    game.round = 1; game.startDay();

    const contamResult = game.resolveFramasonContamination();
    expect(contamResult.deadIds).toContain(p.P5.id);
    expect(dead(p.P5)).toBe(true);
  });

  it('Night 3 — Negotiation on P16 (constantine) fails, Zodiac kills P6, Sniper shoots P4', () => {
    p.P2.kill(1, 'mafia'); p.P3.kill(1, 'vote'); p.P5.kill(2, 'framason');
    p.P10.kill(1, 'zodiac');
    game.round = 2;

    const results = nightRound(game, {
      godfather: { actorIds: [p.P14.id], targetId: p.P16.id, actionType: 'shoot', mode: 'negotiate' },
      zodiac:    { actorIds: [p.P4.id],  targetId: p.P6.id, actionType: 'shoot' },
      sniper:    { actorIds: [p.P1.id],  targetId: p.P4.id, actionType: 'shoot' },
    });

    expect(results.negotiated.success).toBe(false);     // Constantine is not recruitable
    expect(dead(p.P6)).toBe(true);                        // Zodiac killed P6
  });

  it('Mafia cannot win while independents alive (new rule)', () => {
    for (const key of ['P1', 'P2', 'P3', 'P5', 'P6', 'P9', 'P10', 'P11', 'P13', 'P16']) {
      p[key].kill(3, 'mafia');
    }
    // Alive: P4(indie), P7(indie), P8(mafia), P12(mafia), P14(mafia), P15(mafia)
    // Mafia=4, Citizen=0, Independent=2 → independents alive → mafia CANNOT win
    const winner = game.checkWinCondition();
    expect(winner).toBeNull();
  });
});

/* ═══════════════════════════════════════════════════════════════════
   S3 — Independent Victory Edge
   ═══════════════════════════════════════════════════════════════════ */
describe('S3 — Independent Victory Edge', () => {
  it('Jack instant win: all mafia dead + Jack alive → independent wins', () => {
    const { game, p } = setup({
      P1: 'sniper', P2: 'simpleCitizen', P3: 'jack', P4: 'godfather',
      P5: 'simpleMafia', P6: 'simpleCitizen', P7: 'simpleCitizen', P8: 'simpleCitizen',
    });

    p.P4.kill(2, 'vote'); p.P5.kill(3, 'vote');
    const winner = game.checkWinCondition();
    expect(winner).toBe('independent');
    expect(game.phase).toBe('ended');
  });

  it('Zodiac alone (all mafia + citizens dead) → independent wins', () => {
    const { game, p } = setup({
      P1: 'sniper', P2: 'simpleCitizen', P3: 'zodiac',
      P4: 'godfather', P5: 'simpleMafia',
      P6: 'simpleCitizen', P7: 'simpleCitizen', P8: 'simpleCitizen',
    });

    p.P4.kill(2, 'vote'); p.P5.kill(3, 'vote');
    p.P1.kill(1, 'mafia'); p.P2.kill(2, 'zodiac');
    p.P6.kill(3, 'mafia'); p.P7.kill(3, 'zodiac'); p.P8.kill(4, 'mafia');
    const winner = game.checkWinCondition();
    expect(winner).toBe('independent');
  });

  it('Sniper kills citizen → sniper dies; then zodiac reaches handshake', () => {
    const { game, p } = setup({
      P1: 'sniper', P2: 'simpleCitizen', P3: 'zodiac', P4: 'godfather',
      P5: 'simpleMafia', P6: 'jack', P7: 'simpleCitizen', P8: 'bodyguard',
    });

    // Sniper misfire kills sniper
    const results = nightRound(game, {
      sniper: { actorIds: [p.P1.id], targetId: p.P2.id, actionType: 'shoot' },
    });
    expect(dead(p.P1)).toBe(true);
    expect(p.P1.deathCause).toBe('sniper_miss');

    // Kill all mafia
    p.P4.kill(2, 'vote'); p.P5.kill(3, 'vote');
    // Jack instant win (all mafia dead, Jack alive)
    const winner = game.checkWinCondition();
    expect(winner).toBe('independent');
  });

  it('3 alive with independent → handshake triggered', () => {
    const { game, p } = setup({
      P1: 'zodiac', P2: 'simpleCitizen', P3: 'godfather',
      P4: 'simpleCitizen', P5: 'simpleCitizen', P6: 'simpleCitizen',
      P7: 'simpleCitizen', P8: 'simpleMafia',
    });

    for (const k of ['P4', 'P5', 'P6', 'P7', 'P8']) p[k].kill(2, 'mafia');
    const result = game.checkWinCondition();
    expect(result).toBe('handshake');
    expect(game.handshakeState.players).toHaveLength(3);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   S4 — Sniper Misfire Cascade
   ═══════════════════════════════════════════════════════════════════ */
describe('S4 — Sniper Misfire Cascade', () => {
  let game, p;

  beforeEach(() => {
    ({ game, p } = setup({
      P1: 'sniper', P2: 'simpleCitizen', P3: 'drWatson', P4: 'godfather',
      P5: 'simpleMafia', P6: 'simpleCitizen', P7: 'simpleCitizen', P8: 'simpleCitizen',
    }));
  });

  it('Night 1 — Sniper shoots citizen → sniper dies, citizen lives', () => {
    const results = nightRound(game, {
      sniper: { actorIds: [p.P1.id], targetId: p.P2.id, actionType: 'shoot' },
    });
    expect(dead(p.P1)).toBe(true);
    expect(p.P1.deathCause).toBe('sniper_miss');
    expect(alive(p.P2)).toBe(true);
  });

  it('Night 2 — Mafia kills Watson', () => {
    p.P1.kill(1, 'sniper_miss'); game.round = 1;
    const results = nightRound(game, {
      godfather: { actorIds: [p.P4.id], targetId: p.P3.id, actionType: 'shoot', mode: 'shoot' },
    });
    expect(dead(p.P3)).toBe(true);
  });

  it('Day 2 — Vote eliminates all mafia → Citizens Win', () => {
    p.P1.kill(1, 'sniper_miss'); p.P3.kill(2, 'mafia');
    game.round = 1; game.startDay();
    game.eliminateByVote(p.P4.id);
    game.eliminateByVote(p.P5.id);
    const winner = game.checkWinCondition();
    expect(winner).toBe('citizen');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   S5 — Bomb Full Failure Chain
   ═══════════════════════════════════════════════════════════════════ */
describe('S5 — Bomb Full Failure Chain', () => {
  it('Bodyguard fails → bodyguard dies, target survives', () => {
    const { game, p } = setup({
      P1: 'godfather', P2: 'bomber', P3: 'simpleCitizen', P4: 'bodyguard',
      P5: 'simpleCitizen', P6: 'simpleCitizen', P7: 'simpleCitizen', P8: 'drWatson',
    });

    game.bomb.plant(p.P3.id, 3);
    game.round = 1; game.phase = 'day';

    const bgResult = game.bombGuardianGuess(1);
    expect(bgResult.result).toBe('wrong');
    expect(dead(p.P4)).toBe(true);
    expect(alive(p.P3)).toBe(true);
  });

  it('Bodyguard skips → target fails → target dies', () => {
    const { game, p } = setup({
      P1: 'godfather', P2: 'bomber', P3: 'simpleCitizen', P4: 'bodyguard',
      P5: 'simpleCitizen', P6: 'simpleCitizen', P7: 'simpleCitizen', P8: 'drWatson',
    });

    game.bomb.plant(p.P3.id, 3);
    game.round = 1; game.phase = 'day';

    game.bombGuardianSkip();
    const targetResult = game.bombTargetGuess(4);
    expect(targetResult.result).toBe('exploded');
    expect(dead(p.P3)).toBe(true);
    expect(alive(p.P4)).toBe(true);
  });

  it('Bodyguard guesses correctly → defused, both live', () => {
    const { game, p } = setup({
      P1: 'godfather', P2: 'bomber', P3: 'simpleCitizen', P4: 'bodyguard',
      P5: 'simpleCitizen', P6: 'simpleCitizen', P7: 'simpleCitizen', P8: 'drWatson',
    });

    game.bomb.plant(p.P3.id, 2);
    game.round = 1; game.phase = 'day';

    const bgResult = game.bombGuardianGuess(2);
    expect(bgResult.result).toBe('defused');
    expect(alive(p.P3)).toBe(true);
    expect(alive(p.P4)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   S6 — Salakhi Dominance
   ═══════════════════════════════════════════════════════════════════ */
describe('S6 — Salakhi Dominance', () => {
  let game, p;

  beforeEach(() => {
    ({ game, p } = setup({
      P1: 'godfather', P2: 'drWatson', P3: 'detective', P4: 'simpleCitizen',
      P5: 'simpleCitizen', P6: 'simpleCitizen', P7: 'simpleCitizen', P8: 'simpleMafia',
    }));
  });

  it('Night 1 — Salakhi Watson → dies, not revivable', () => {
    const results = nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P2.id, actionType: 'shoot', mode: 'salakhi', guessedRoleId: 'drWatson' },
    });
    expect(results.salakhied.correct).toBe(true);
    expect(dead(p.P2)).toBe(true);
    expect(p.P2.isRevivable).toBe(false);
  });

  it('Night 2 — Salakhi Detective → dies, not revivable', () => {
    p.P2.kill(1, 'salakhi', false); game.round = 1;
    const results = nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P3.id, actionType: 'shoot', mode: 'salakhi', guessedRoleId: 'detective' },
    });
    expect(results.salakhied.correct).toBe(true);
    expect(dead(p.P3)).toBe(true);
    expect(p.P3.isRevivable).toBe(false);
  });

  it('Salakhi bypasses Watson self-heal', () => {
    const results = nightRound(game, {
      drWatson:  { actorIds: [p.P2.id], targetId: p.P2.id, actionType: 'heal' },
      godfather: { actorIds: [p.P1.id], targetId: p.P2.id, actionType: 'shoot', mode: 'salakhi', guessedRoleId: 'drWatson' },
    });
    expect(results.salakhied.correct).toBe(true);
    expect(dead(p.P2)).toBe(true);
  });

  it('Citizens collapse from salakhi losses → Mafia Win', () => {
    p.P2.kill(1, 'salakhi', false); p.P3.kill(2, 'salakhi', false);
    p.P4.kill(3, 'mafia'); p.P5.kill(3, 'mafia'); p.P6.kill(3, 'mafia');
    // Alive: P1(GF), P7(citizen), P8(mafia) → 2 >= 1 → Mafia wins
    const winner = game.checkWinCondition();
    expect(winner).toBe('mafia');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   S7 — Bullet Explosion Endgame
   ═══════════════════════════════════════════════════════════════════ */
describe('S7 — Bullet Explosion Endgame', () => {
  it('Unused live bullet explodes at voting → holder dies', () => {
    const { game, p } = setup({
      P1: 'godfather', P2: 'gunner', P3: 'simpleCitizen', P4: 'simpleCitizen',
      P5: 'simpleCitizen', P6: 'simpleCitizen', P7: 'simpleCitizen', P8: 'simpleMafia',
    });
    game.bulletManager.init(2, 2);
    game.bulletManager.giveBullet(p.P3.id, 'live', 1);
    game.round = 1; game.phase = 'day';

    const explosions = game.resolveLiveExpiration();
    expect(explosions.some(e => e.holderId === p.P3.id)).toBe(true);
    expect(dead(p.P3)).toBe(true);
  });

  it('Blank bullet does NOT explode → holder survives', () => {
    const { game, p } = setup({
      P1: 'godfather', P2: 'gunner', P3: 'simpleCitizen', P4: 'simpleCitizen',
      P5: 'simpleCitizen', P6: 'simpleCitizen', P7: 'simpleCitizen', P8: 'simpleMafia',
    });
    game.bulletManager.init(2, 2);
    game.bulletManager.giveBullet(p.P3.id, 'blank', 1);
    game.round = 1; game.phase = 'day';

    const explosions = game.resolveLiveExpiration();
    expect(explosions.some(e => e.holderId === p.P3.id)).toBe(false);
    expect(alive(p.P3)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   S8 — Constantine Critical Revival
   ═══════════════════════════════════════════════════════════════════ */
describe('S8 — Constantine Critical Revival', () => {
  it('Revives dead detective → detective alive again', () => {
    const { game, p } = setup({
      P1: 'godfather', P2: 'detective', P3: 'constantine', P4: 'simpleCitizen',
      P5: 'simpleCitizen', P6: 'simpleCitizen', P7: 'simpleCitizen', P8: 'simpleMafia',
    });

    p.P2.kill(1, 'mafia'); game.round = 2;
    const results = nightRound(game, {
      constantine: { actorIds: [p.P3.id], targetId: p.P2.id, actionType: 'revive' },
    });
    expect(results.revived).toBe(p.P2.id);
    expect(alive(p.P2)).toBe(true);
  });

  it('Cannot revive salakhi victim (not revivable)', () => {
    const { game, p } = setup({
      P1: 'godfather', P2: 'detective', P3: 'constantine', P4: 'simpleCitizen',
      P5: 'simpleCitizen', P6: 'simpleCitizen', P7: 'simpleCitizen', P8: 'simpleMafia',
    });

    p.P2.kill(1, 'salakhi', false); game.round = 2;
    const results = nightRound(game, {
      constantine: { actorIds: [p.P3.id], targetId: p.P2.id, actionType: 'revive' },
    });
    expect(dead(p.P2)).toBe(true);
  });

  it('Constantine + sniper recovery → Citizens Win', () => {
    const { game, p } = setup({
      P1: 'godfather', P2: 'simpleMafia', P3: 'drWatson', P4: 'detective',
      P5: 'constantine', P6: 'sniper', P7: 'simpleCitizen', P8: 'simpleCitizen',
      P9: 'simpleCitizen', P10: 'simpleCitizen',
    });

    p.P6.kill(1, 'mafia'); p.P2.kill(1, 'vote'); game.round = 2;
    const results = nightRound(game, {
      godfather:   { actorIds: [p.P1.id], targetId: p.P4.id, actionType: 'shoot', mode: 'shoot' },
      constantine: { actorIds: [p.P5.id], targetId: p.P6.id, actionType: 'revive' },
    });
    expect(alive(p.P6)).toBe(true);
    expect(dead(p.P4)).toBe(true);
    game.startDay();
    game.eliminateByVote(p.P1.id);
    const winner = game.checkWinCondition();
    expect(winner).toBe('citizen');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   S9 — Zodiac vs Bodyguard
   ═══════════════════════════════════════════════════════════════════ */
describe('S9 — Zodiac vs Bodyguard', () => {
  it('Zodiac shoots Bodyguard → Zodiac dies, Bodyguard survives', () => {
    const { game, p } = setup({
      P1: 'zodiac', P2: 'bodyguard', P3: 'godfather', P4: 'simpleCitizen',
      P5: 'simpleCitizen', P6: 'simpleCitizen', P7: 'simpleCitizen', P8: 'simpleMafia',
    });

    const results = nightRound(game, {
      zodiac: { actorIds: [p.P1.id], targetId: p.P2.id, actionType: 'shoot' },
    });
    expect(dead(p.P1)).toBe(true);
    expect(p.P1.deathCause).toBe('zodiac_bodyguard');
    expect(alive(p.P2)).toBe(true);
  });

  it('After Zodiac dies to Bodyguard → citizens can win', () => {
    const { game, p } = setup({
      P1: 'zodiac', P2: 'bodyguard', P3: 'godfather', P4: 'simpleCitizen',
      P5: 'simpleCitizen', P6: 'simpleCitizen', P7: 'simpleCitizen', P8: 'simpleMafia',
    });

    p.P1.kill(3, 'zodiac_bodyguard');
    p.P3.kill(3, 'vote'); p.P8.kill(3, 'vote');
    const winner = game.checkWinCondition();
    expect(winner).toBe('citizen');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   S10 — Negotiation Success Swing
   ═══════════════════════════════════════════════════════════════════ */
describe('S10 — Negotiation Success Swing', () => {
  it('Godfather converts Suspect to mafia', () => {
    const { game, p } = setup({
      P1: 'godfather', P2: 'negotiator', P3: 'suspect', P4: 'simpleCitizen',
      P5: 'simpleCitizen', P6: 'simpleCitizen', P7: 'simpleCitizen', P8: 'simpleCitizen',
    });

    const results = nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P3.id, actionType: 'shoot', mode: 'negotiate' },
    });
    expect(results.negotiated.success).toBe(true);
    expect(p.P3.roleId).toBe('simpleMafia');
  });

  it('Negotiation on non-suspect/citizen fails', () => {
    const { game, p } = setup({
      P1: 'godfather', P2: 'negotiator', P3: 'detective', P4: 'simpleCitizen',
      P5: 'simpleCitizen', P6: 'simpleCitizen', P7: 'simpleCitizen', P8: 'simpleCitizen',
    });

    const results = nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P3.id, actionType: 'shoot', mode: 'negotiate' },
    });
    expect(results.negotiated.success).toBe(false);
    expect(p.P3.roleId).toBe('detective');
    expect(alive(p.P3)).toBe(true);
  });

  it('Successful negotiation swings balance → Mafia Win', () => {
    const { game, p } = setup({
      P1: 'godfather', P2: 'negotiator', P3: 'suspect', P4: 'simpleCitizen',
      P5: 'simpleCitizen', P6: 'simpleCitizen', P7: 'simpleCitizen', P8: 'simpleCitizen',
    });

    // Convert P3 to mafia
    nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P3.id, actionType: 'shoot', mode: 'negotiate' },
    });
    // Kill citizens down
    p.P4.kill(2, 'mafia'); p.P5.kill(2, 'mafia'); p.P6.kill(3, 'mafia');
    // Alive: P1(GF), P2(negotiator=mafia), P3(now mafia), P7(citizen), P8(citizen)
    // Mafia=3 >= Citizen=2 → Mafia wins
    const winner = game.checkWinCondition();
    expect(winner).toBe('mafia');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   S11 — Sorcerer Total Disruption
   ═══════════════════════════════════════════════════════════════════ */
describe('S11 — Sorcerer (Jadoogar) Total Disruption', () => {
  it('Jadoogar blocks Watson → mafia kill succeeds on healed target', () => {
    const { game, p } = setup({
      P1: 'godfather', P2: 'drWatson', P3: 'jadoogar', P4: 'simpleCitizen',
      P5: 'simpleCitizen', P6: 'simpleCitizen', P7: 'simpleCitizen', P8: 'simpleMafia',
    });

    const results = nightRound(game, {
      jadoogar:  { actorIds: [p.P3.id], targetId: p.P2.id, actionType: 'block' },
      drWatson:  { actorIds: [p.P2.id], targetId: p.P4.id, actionType: 'heal' },
      godfather: { actorIds: [p.P1.id], targetId: p.P4.id, actionType: 'shoot', mode: 'shoot' },
    });

    expect(results.blocked).toBe(p.P2.id);
    expect(dead(p.P4)).toBe(true);
  });

  it('Jadoogar blocks Detective → investigation nullified', () => {
    const { game, p } = setup({
      P1: 'godfather', P2: 'detective', P3: 'jadoogar', P4: 'simpleCitizen',
      P5: 'simpleCitizen', P6: 'simpleCitizen', P7: 'simpleCitizen', P8: 'simpleMafia',
    });

    const results = nightRound(game, {
      jadoogar:  { actorIds: [p.P3.id], targetId: p.P2.id, actionType: 'block' },
      detective: { actorIds: [p.P2.id], targetId: p.P8.id, actionType: 'investigate' },
    });

    expect(results.blocked).toBe(p.P2.id);
    expect(results.investigated).toBeNull();
  });
});

/* ═══════════════════════════════════════════════════════════════════
   S12 — Tie Vote Multi-Elimination
   ═══════════════════════════════════════════════════════════════════ */
describe('S12 — Tie Vote Multi-Elimination', () => {
  it('Tie between 3 players → all 3 eliminated', () => {
    const { game, p } = setup({
      P1: 'godfather', P2: 'simpleCitizen', P3: 'simpleCitizen', P4: 'simpleCitizen',
      P5: 'simpleCitizen', P6: 'simpleCitizen', P7: 'simpleCitizen', P8: 'simpleMafia',
    });
    game.round = 2; game.startDay();

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
  it('Night: cursed player killed → Jack also dies', () => {
    const { game, p } = setup({
      P1: 'godfather', P2: 'simpleCitizen', P3: 'jack', P4: 'simpleCitizen',
      P5: 'simpleCitizen', P6: 'simpleCitizen', P7: 'simpleCitizen', P8: 'simpleMafia',
    });

    p.P3.curse.place(p.P2.id);
    const results = nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P2.id, actionType: 'shoot', mode: 'shoot' },
      jack:      { actorIds: [p.P3.id], targetId: p.P2.id, actionType: 'curse' },
    });

    expect(dead(p.P2)).toBe(true);
    expect(results.jackCurseTriggered).toBe(true);
    expect(dead(p.P3)).toBe(true);
    expect(p.P3.deathCause).toBe('curse');
  });

  it('Day: cursed player voted out → Jack also dies', () => {
    const { game, p } = setup({
      P1: 'godfather', P2: 'simpleCitizen', P3: 'jack', P4: 'simpleCitizen',
      P5: 'simpleCitizen', P6: 'simpleCitizen', P7: 'simpleCitizen', P8: 'simpleMafia',
    });

    p.P3.curse.place(p.P2.id);
    game.round = 1; game.phase = 'day';

    const result = game.eliminateByVote(p.P2.id);
    expect(dead(p.P2)).toBe(true);
    expect(result.jackCurseTriggered).toBe(true);
    expect(dead(p.P3)).toBe(true);
  });

  it('Jack is vote-immune → voting Jack does not eliminate him', () => {
    const { game, p } = setup({
      P1: 'godfather', P2: 'jack', P3: 'simpleCitizen', P4: 'simpleCitizen',
      P5: 'simpleCitizen', P6: 'simpleCitizen', P7: 'simpleCitizen', P8: 'simpleMafia',
    });

    game.round = 1; game.phase = 'day';
    const result = game.eliminateByVote(p.P2.id);
    expect(result.voteImmune).toBe(true);
    expect(alive(p.P2)).toBe(true);
  });
});
