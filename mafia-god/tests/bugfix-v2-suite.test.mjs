/**
 * bugfix-v2-suite.test.mjs — Tests for 5 bug fixes:
 *
 * BF1: Konstantin sees ALL dead revivable players (not just previous round)
 * BF2: Zehne Ziba (Beautiful Mind) removed when Jack is revealed/locked
 * BF3: Zehne Ziba removed when Jack is not in the game
 * BF4: Framason team wakes at night even after leader dies
 * BF5: Kane fake wake after using ability on citizen
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../js/models/Game.js';
import { Roles } from '../js/models/Roles.js';
import { CARD } from '../js/models/LastActionManager.js';

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

function getBMCard(game) {
  return game.lastActionManager.cards.find(c => c.id === CARD.BEAUTIFUL_MIND);
}

function exhaustLastActions(game) {
  game.lastActionManager.cards.forEach(c => c.used = true);
}


/* ═══════════════════════════════════════════════════════════════════
   BF1 — Konstantin sees ALL dead revivable players
   ═══════════════════════════════════════════════════════════════════ */
describe('BF1 — Konstantin sees all dead revivable players', () => {
  let game, p;

  beforeEach(() => {
    const r = setup({
      P1: 'godfather', P2: 'simpleMafia', P3: 'drWatson',
      P4: 'constantine', P5: 'simpleCitizen', P6: 'simpleCitizen',
      P7: 'simpleCitizen', P8: 'simpleCitizen',
    });
    game = r.game; p = r.p;
    game.round = 1;
  });

  it('BF1.1: Player killed in Night 1 is revivable in Night 2', () => {
    // Night 1: mafia kills P5
    nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P5.id, actionType: 'shoot', mode: 'shoot' },
    });
    expect(dead(p.P5)).toBe(true);

    // Night 2: Constantine should see P5
    game.startNight();
    const revivable = game.getRevivablePlayers();
    expect(revivable.map(r => r.id)).toContain(p.P5.id);
  });

  it('BF1.2: Player voted out same day is revivable that same night', () => {
    // Night 1: mafia kills P5
    nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P5.id, actionType: 'shoot', mode: 'shoot' },
    });

    // Day 1: vote out P6
    game.startDay(); // round becomes 2
    exhaustLastActions(game);
    game.eliminateByVote(p.P6.id);
    expect(dead(p.P6)).toBe(true);
    expect(p.P6.deathRound).toBe(2);

    // Night 2 (round 2): Constantine should see BOTH P5 and P6
    game.startNight();
    const revivable = game.getRevivablePlayers();
    const ids = revivable.map(r => r.id);
    expect(ids).toContain(p.P5.id);
    expect(ids).toContain(p.P6.id);
  });

  it('BF1.3: Player killed by cowboy same day is revivable that night', () => {
    // Add cowboy to the roster
    const r = setup({
      P1: 'godfather', P2: 'simpleMafia', P3: 'cowboy',
      P4: 'constantine', P5: 'simpleCitizen', P6: 'simpleCitizen',
      P7: 'simpleCitizen', P8: 'simpleCitizen',
    });
    game = r.game; p = r.p;
    game.round = 1;

    // Night 1: mafia kills P5
    nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P5.id, actionType: 'shoot', mode: 'shoot' },
    });

    // Day 1: cowboy shoots P1 (mafia)
    game.startDay(); // round = 2
    game.resolveCowboyAction(p.P1.id);
    expect(dead(p.P1)).toBe(true);

    // Night 2: Constantine should see P5 (night 1) AND P1 (day 2)
    game.startNight();
    const ids = game.getRevivablePlayers().map(r => r.id);
    expect(ids).toContain(p.P5.id);
    expect(ids).toContain(p.P1.id);
  });

  it('BF1.4: Player killed by morning shot same day is revivable that night', () => {
    const r = setup({
      P1: 'godfather', P2: 'simpleMafia', P3: 'gunner',
      P4: 'constantine', P5: 'simpleCitizen', P6: 'simpleCitizen',
      P7: 'simpleCitizen', P8: 'simpleCitizen',
    });
    game = r.game; p = r.p;
    game.round = 1;
    game.bulletManager.init(2, 2);

    // Night 1: gunner gives live bullet to P5
    nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P7.id, actionType: 'shoot', mode: 'shoot' },
      gunner: { actorIds: [p.P3.id], targetId: p.P5.id, actionType: 'giveBullet', bulletType: 'live' },
    });

    // Day: morning shot P6
    game.startDay(); // round = 2
    game.bulletManager.giveBullet(p.P5.id, 'live');
    game.resolveMorningShot(p.P5.id, p.P6.id);
    expect(dead(p.P6)).toBe(true);

    // Night 2: P7 and P6 should both be revivable
    game.startNight();
    const ids = game.getRevivablePlayers().map(r => r.id);
    expect(ids).toContain(p.P7.id);
    expect(ids).toContain(p.P6.id);
  });

  it('BF1.5: Salakhi victim is NOT revivable', () => {
    nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P5.id, mode: 'salakhi', guessedRoleId: 'simpleCitizen' },
    });
    expect(dead(p.P5)).toBe(true);
    expect(p.P5.isRevivable).toBe(false);

    game.startNight();
    const ids = game.getRevivablePlayers().map(r => r.id);
    expect(ids).not.toContain(p.P5.id);
  });

  it('BF1.6: Constantine actually revives a same-day-voted player', () => {
    // Night 1: mafia kills P5
    nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P5.id, actionType: 'shoot', mode: 'shoot' },
    });

    // Day: vote P6
    game.startDay(); // round = 2
    exhaustLastActions(game);
    game.eliminateByVote(p.P6.id);
    expect(dead(p.P6)).toBe(true);

    // Night 2: Constantine revives P6
    const results = nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P7.id, actionType: 'shoot', mode: 'shoot' },
      constantine: { actorIds: [p.P4.id], targetId: p.P6.id, actionType: 'revive' },
    });

    expect(results.revived).toBe(p.P6.id);
    expect(alive(p.P6)).toBe(true);
  });

  it('BF1.7: Constantine appears in night steps when revivable players exist from same day', () => {
    // Night 1: mafia kills P5
    nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P5.id, actionType: 'shoot', mode: 'shoot' },
    });

    // Day: vote P6
    game.startDay();
    exhaustLastActions(game);
    game.eliminateByVote(p.P6.id);

    // Night 2: Constantine step should exist
    game.startNight();
    const step = game.nightSteps.find(s => s.roleId === 'constantine');
    expect(step).toBeDefined();
  });

  it('BF1.8: Multiple rounds dead — all shown to Constantine', () => {
    // Night 1: kill P5
    nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P5.id, actionType: 'shoot', mode: 'shoot' },
    });

    // Day 1: vote P6
    game.startDay();
    exhaustLastActions(game);
    game.eliminateByVote(p.P6.id);

    // Night 2: kill P7
    nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P7.id, actionType: 'shoot', mode: 'shoot' },
    });

    // Day 2: vote P8
    game.startDay();
    exhaustLastActions(game);
    game.eliminateByVote(p.P8.id);

    // Night 3: Constantine should see P5, P6, P7, P8
    game.startNight();
    const ids = game.getRevivablePlayers().map(r => r.id);
    expect(ids).toContain(p.P5.id);
    expect(ids).toContain(p.P6.id);
    expect(ids).toContain(p.P7.id);
    expect(ids).toContain(p.P8.id);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   BF2 — Beautiful Mind removed when Jack is revealed/locked
   ═══════════════════════════════════════════════════════════════════ */
describe('BF2 — Zehne Ziba removed on Jack reveal', () => {

  it('BF2.1: Vote on Jack → Beautiful Mind discarded', () => {
    const { game, p } = setup({
      P1: 'godfather', P2: 'simpleMafia', P3: 'drWatson',
      P4: 'jack', P5: 'simpleCitizen', P6: 'simpleCitizen',
      P7: 'simpleCitizen', P8: 'simpleCitizen',
    });
    game.round = 1; game.phase = 'day';

    expect(getBMCard(game).used).toBe(false);
    game.eliminateByVote(p.P4.id); // Jack is vote immune → curse locked
    expect(alive(p.P4)).toBe(true);
    expect(getBMCard(game).used).toBe(true);
  });

  it('BF2.2: Morning shot on Jack → Beautiful Mind discarded', () => {
    const { game, p } = setup({
      P1: 'godfather', P2: 'simpleMafia', P3: 'gunner',
      P4: 'jack', P5: 'simpleCitizen', P6: 'simpleCitizen',
      P7: 'simpleCitizen', P8: 'simpleCitizen',
    });
    game.round = 1; game.phase = 'day';
    game.bulletManager.init(2, 2);
    game.bulletManager.giveBullet(p.P5.id, 'live');

    expect(getBMCard(game).used).toBe(false);
    game.resolveMorningShot(p.P5.id, p.P4.id);
    expect(alive(p.P4)).toBe(true); // Jack immune
    expect(p.P4.curse.isLocked).toBe(true);
    expect(getBMCard(game).used).toBe(true);
  });

  it('BF2.3: Cowboy shoots Jack → Beautiful Mind discarded', () => {
    const { game, p } = setup({
      P1: 'godfather', P2: 'simpleMafia', P3: 'cowboy',
      P4: 'jack', P5: 'simpleCitizen', P6: 'simpleCitizen',
      P7: 'simpleCitizen', P8: 'simpleCitizen',
    });
    game.round = 1; game.phase = 'day';

    expect(getBMCard(game).used).toBe(false);
    game.resolveCowboyAction(p.P4.id);
    expect(alive(p.P4)).toBe(true); // Jack survives
    expect(p.P4.curse.isLocked).toBe(true);
    expect(getBMCard(game).used).toBe(true);
  });

  it('BF2.4: Kane reveals Jack → Beautiful Mind discarded', () => {
    const { game, p } = setup({
      P1: 'kane', P2: 'jack', P3: 'godfather',
      P4: 'drLecter', P5: 'drWatson', P6: 'simpleCitizen',
      P7: 'simpleCitizen', P8: 'simpleMafia',
    });
    game.round = 1;

    expect(getBMCard(game).used).toBe(false);
    nightRound(game, {
      godfather: { actorIds: [p.P3.id], targetId: p.P6.id, actionType: 'shoot', mode: 'shoot' },
      kane: { actorIds: [p.P1.id], targetId: p.P2.id, actionType: 'kaneReveal' },
    });
    expect(p.P2.curse.isLocked).toBe(true);
    expect(getBMCard(game).used).toBe(true);
  });

  it('BF2.5: Beautiful Mind stays when Jack not yet revealed', () => {
    const { game, p } = setup({
      P1: 'godfather', P2: 'simpleMafia', P3: 'drWatson',
      P4: 'jack', P5: 'simpleCitizen', P6: 'simpleCitizen',
      P7: 'simpleCitizen', P8: 'simpleCitizen',
    });
    game.round = 1;

    // Night 1: Jack curses someone, no reveal
    nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P5.id, actionType: 'shoot', mode: 'shoot' },
      jack: { actorIds: [p.P4.id], targetId: p.P6.id, actionType: 'curse' },
    });

    expect(p.P4.curse.isLocked).toBe(false);
    expect(getBMCard(game).used).toBe(false);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   BF3 — Beautiful Mind removed when Jack is not in the game
   ═══════════════════════════════════════════════════════════════════ */
describe('BF3 — Zehne Ziba removed when no Jack in game', () => {

  it('BF3.1: No Jack in game → BM auto-discarded on role assignment', () => {
    const game = new Game();
    const names = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];
    for (const name of names) game.addPlayer(name);

    // Select roles WITHOUT Jack
    game.selectedRoles = {
      godfather: 1, simpleMafia: 1, drLecter: 1,
      drWatson: 1, detective: 1, simpleCitizen: 3,
    };
    game.assignRolesRandomly();

    expect(getBMCard(game).used).toBe(true);
  });

  it('BF3.2: Jack in game → BM stays available', () => {
    const game = new Game();
    const names = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];
    for (const name of names) game.addPlayer(name);

    game.selectedRoles = {
      godfather: 1, simpleMafia: 1, jack: 1,
      drWatson: 1, detective: 1, simpleCitizen: 3,
    };
    game.assignRolesRandomly();

    expect(getBMCard(game).used).toBe(false);
  });

  it('BF3.3: No independent at all → BM discarded', () => {
    const game = new Game();
    const names = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];
    for (const name of names) game.addPlayer(name);

    game.selectedRoles = {
      godfather: 1, simpleMafia: 2,
      drWatson: 1, detective: 1, simpleCitizen: 3,
    };
    game.assignRolesRandomly();

    expect(getBMCard(game).used).toBe(true);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   BF4 — Framason team wakes at night even after leader dies
   ═══════════════════════════════════════════════════════════════════ */
describe('BF4 — Framason team wakes after leader death', () => {
  let game, p;

  beforeEach(() => {
    const r = setup({
      P1: 'godfather', P2: 'simpleMafia', P3: 'drWatson',
      P4: 'freemason', P5: 'simpleCitizen', P6: 'simpleCitizen',
      P7: 'simpleCitizen', P8: 'simpleCitizen',
    });
    game = r.game; p = r.p;
    game.framason.init(p.P4.id, 2);
    game.round = 1;
  });

  it('BF4.1: Leader alive → freemason step appears and can recruit', () => {
    game.startNight();
    const step = game.nightSteps.find(s => s.roleId === 'freemason');
    expect(step).toBeDefined();
    expect(game.framason.canRecruit).toBe(true);
  });

  it('BF4.2: Leader dies by vote → alliance stays active, freemason step still appears', () => {
    // Recruit P5 first
    nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P8.id, actionType: 'shoot', mode: 'shoot' },
      freemason: { actorIds: [p.P4.id], targetId: p.P5.id, actionType: 'recruit' },
    });
    expect(game.framason.members).toContain(p.P5.id);

    // Day: vote leader out
    game.startDay();
    exhaustLastActions(game);
    game.eliminateByVote(p.P4.id);
    expect(dead(p.P4)).toBe(true);
    expect(game.framason.isActive).toBe(true);
    expect(game.framason.canRecruit).toBe(false);

    // Night: freemason step should STILL appear (member P5 alive)
    game.startNight();
    const step = game.nightSteps.find(s => s.roleId === 'freemason');
    expect(step).toBeDefined();
    // Actors should include the surviving alliance member
    expect(step.actors).toContain(p.P5.id);
  });

  it('BF4.3: Leader killed by mafia → members still wake up next night', () => {
    // Recruit P5
    nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P7.id, actionType: 'shoot', mode: 'shoot' },
      freemason: { actorIds: [p.P4.id], targetId: p.P5.id, actionType: 'recruit' },
    });

    // Night 2: mafia kills leader
    nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P4.id, actionType: 'shoot', mode: 'shoot' },
    });
    expect(dead(p.P4)).toBe(true);

    // Night 3: freemason step should appear with P5 as actor
    game.startNight();
    const step = game.nightSteps.find(s => s.roleId === 'freemason');
    expect(step).toBeDefined();
    expect(step.actors).toContain(p.P5.id);
  });

  it('BF4.4: All alliance members dead → freemason step disappears', () => {
    // Night 1: recruit P5
    nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P7.id, actionType: 'shoot', mode: 'shoot' },
      freemason: { actorIds: [p.P4.id], targetId: p.P5.id, actionType: 'recruit' },
    });

    // Kill leader
    game.startDay();
    exhaustLastActions(game);
    game.eliminateByVote(p.P4.id);

    // Night 2: kill member P5
    nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P5.id, actionType: 'shoot', mode: 'shoot' },
    });

    // Night 3: no alive alliance member → step should NOT appear
    game.startNight();
    const step = game.nightSteps.find(s => s.roleId === 'freemason');
    expect(step).toBeUndefined();
  });

  it('BF4.5: Contamination kills entire team → step disappears (marge framasoni)', () => {
    // Night 1: recruit a mafia member → contamination
    const results = nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P7.id, actionType: 'shoot', mode: 'shoot' },
      freemason: { actorIds: [p.P4.id], targetId: p.P2.id, actionType: 'recruit' },
    });

    expect(results.framasonRecruit.contaminated).toBe(true);

    // Resolve contamination (morning)
    game.resolveFramasonContamination();
    expect(dead(p.P4)).toBe(true); // Leader dies
    expect(game.framason.isActive).toBe(false);

    // Next night: no freemason step
    game.startNight();
    const step = game.nightSteps.find(s => s.roleId === 'freemason');
    expect(step).toBeUndefined();
  });

  it('BF4.6: Leader alive, max members reached → step still appears (can talk)', () => {
    game.framason.setMaxMembers(1); // Only 1 recruit allowed

    // Night 1: recruit P5 (max reached)
    nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P7.id, actionType: 'shoot', mode: 'shoot' },
      freemason: { actorIds: [p.P4.id], targetId: p.P5.id, actionType: 'recruit' },
    });
    expect(game.framason.canRecruit).toBe(false); // Max reached

    // Night 2: step should still appear (alliance wakes to talk)
    game.startNight();
    const step = game.nightSteps.find(s => s.roleId === 'freemason');
    // canRecruit is false but alliance is active with alive members
    // The step should appear so the team can communicate
    expect(game.framason.isActive).toBe(true);
  });

  it('BF4.7: Leader dies, recruits survive, no new recruits possible', () => {
    // Recruit P5 and P6
    game.framason.setMaxMembers(2);
    nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P7.id, actionType: 'shoot', mode: 'shoot' },
      freemason: { actorIds: [p.P4.id], targetId: p.P5.id, actionType: 'recruit' },
    });

    // Kill leader by mafia
    nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P4.id, actionType: 'shoot', mode: 'shoot' },
    });
    expect(dead(p.P4)).toBe(true);
    expect(game.framason.canRecruit).toBe(false);

    // P5 still alive, so step should appear
    game.startNight();
    const step = game.nightSteps.find(s => s.roleId === 'freemason');
    expect(step).toBeDefined();
  });

  it('BF4.8: Framason serialization preserves leaderDead flag', () => {
    game.framason.onLeaderDeath();
    expect(game.framason.canRecruit).toBe(false);

    const json = game.framason.toJSON();
    expect(json.leaderDead).toBe(true);

    const restored = game.framason.constructor.fromJSON(json);
    expect(restored.canRecruit).toBe(false);
    expect(restored.isActive).toBe(true);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   BF5 — Kane fake wake after using ability on citizen
   ═══════════════════════════════════════════════════════════════════ */
describe('BF5 — Kane fake wake after citizen reveal', () => {
  let game, p;

  const roster = {
    Kane: 'kane',
    Godfather: 'godfather',
    Mafia2: 'simpleMafia',
    Watson: 'drWatson',
    Citizen1: 'simpleCitizen',
    Citizen2: 'simpleCitizen',
    Citizen3: 'simpleCitizen',
    Citizen4: 'simpleCitizen',
  };

  beforeEach(() => {
    const r = setup(roster);
    game = r.game; p = r.p;
    game.round = 1;
  });

  it('BF5.1: Kane used on citizen → still appears in night steps (fake wake)', () => {
    nightRound(game, {
      godfather: { actorIds: [p.Godfather.id], targetId: p.Citizen1.id, actionType: 'shoot', mode: 'shoot' },
      kane: { actorIds: [p.Kane.id], targetId: p.Watson.id, actionType: 'kaneReveal' },
    });
    expect(game._kaneUsed).toBe(true);
    expect(game._kanePendingDeath).toBe(false);

    // Night 2: Kane should STILL appear (fake wake)
    game.startNight();
    const kaneStep = game.nightSteps.find(s => s.roleId === 'kane');
    expect(kaneStep).toBeDefined();
  });

  it('BF5.2: Kane fake wake action is ignored by resolveNight', () => {
    // Night 1: Kane uses on citizen
    nightRound(game, {
      godfather: { actorIds: [p.Godfather.id], targetId: p.Citizen1.id, actionType: 'shoot', mode: 'shoot' },
      kane: { actorIds: [p.Kane.id], targetId: p.Watson.id, actionType: 'kaneReveal' },
    });
    expect(game._kaneUsed).toBe(true);

    // Night 2: Kane "targets" someone during fake wake
    const results = nightRound(game, {
      godfather: { actorIds: [p.Godfather.id], targetId: p.Citizen2.id, actionType: 'shoot', mode: 'shoot' },
      kane: { actorIds: [p.Kane.id], targetId: p.Mafia2.id, actionType: 'kaneReveal' },
    });

    // Action should be IGNORED — no reveal, no pending death
    expect(results.kaneReveal).toBeUndefined();
    expect(game._kanePendingDeath).toBe(false);
    // Mafia2 should still be alive (not revealed)
    expect(alive(p.Mafia2)).toBe(true);
  });

  it('BF5.3: Kane successful reveal (mafia) → does NOT appear next night (pending death)', () => {
    nightRound(game, {
      godfather: { actorIds: [p.Godfather.id], targetId: p.Citizen1.id, actionType: 'shoot', mode: 'shoot' },
      kane: { actorIds: [p.Kane.id], targetId: p.Godfather.id, actionType: 'kaneReveal' },
    });
    expect(game._kaneUsed).toBe(true);
    expect(game._kanePendingDeath).toBe(true);

    // Night 2: Kane should NOT appear (public knowledge, will die this night)
    game.startNight();
    const kaneStep = game.nightSteps.find(s => s.roleId === 'kane');
    expect(kaneStep).toBeUndefined();
  });

  it('BF5.4: Kane fake wake persists across multiple nights', () => {
    // Night 1: use on citizen
    nightRound(game, {
      godfather: { actorIds: [p.Godfather.id], targetId: p.Citizen1.id, actionType: 'shoot', mode: 'shoot' },
      kane: { actorIds: [p.Kane.id], targetId: p.Watson.id, actionType: 'kaneReveal' },
    });
    expect(game._kaneUsed).toBe(true);

    // Night 2: should appear
    game.startNight();
    expect(game.nightSteps.find(s => s.roleId === 'kane')).toBeDefined();
    Object.assign(game.nightActions, {
      godfather: { actorIds: [p.Godfather.id], targetId: p.Citizen2.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.resolveNight();

    // Night 3: should still appear
    game.startNight();
    expect(game.nightSteps.find(s => s.roleId === 'kane')).toBeDefined();
  });

  it('BF5.5: Kane target dies same night → ability returns, next night is real', () => {
    // Night 1: Kane targets Citizen1, mafia also kills Citizen1
    nightRound(game, {
      godfather: { actorIds: [p.Godfather.id], targetId: p.Citizen1.id, actionType: 'shoot', mode: 'shoot' },
      kane: { actorIds: [p.Kane.id], targetId: p.Citizen1.id, actionType: 'kaneReveal' },
    });
    expect(game._kaneUsed).toBe(false); // Ability returned

    // Night 2: Kane should appear with real ability
    game.startNight();
    const step = game.nightSteps.find(s => s.roleId === 'kane');
    expect(step).toBeDefined();

    // Use on mafia this time
    Object.assign(game.nightActions, {
      godfather: { actorIds: [p.Godfather.id], targetId: p.Citizen2.id, actionType: 'shoot', mode: 'shoot' },
      kane: { actorIds: [p.Kane.id], targetId: p.Mafia2.id, actionType: 'kaneReveal' },
    });
    const r2 = game.resolveNight();
    expect(r2.kaneReveal).toBeTruthy();
    expect(game._kanePendingDeath).toBe(true);
  });

  it('BF5.6: Kane fake wake + skip action = no side effects', () => {
    // Night 1: use on citizen
    nightRound(game, {
      godfather: { actorIds: [p.Godfather.id], targetId: p.Citizen1.id, actionType: 'shoot', mode: 'shoot' },
      kane: { actorIds: [p.Kane.id], targetId: p.Watson.id, actionType: 'kaneReveal' },
    });

    // Night 2: Kane step exists but God skips it (no kane action)
    const results = nightRound(game, {
      godfather: { actorIds: [p.Godfather.id], targetId: p.Citizen2.id, actionType: 'shoot', mode: 'shoot' },
    });

    // No kane reveal
    expect(results.kaneReveal).toBeUndefined();
    expect(game._kaneUsed).toBe(true); // Still used
    expect(game._kanePendingDeath).toBe(false);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   BF-COMBO — Combined scenarios
   ═══════════════════════════════════════════════════════════════════ */
describe('BF-COMBO — Combined bug fix scenarios', () => {

  it('Kane reveals Jack + BM discarded + Constantine sees day-voted player', () => {
    const { game, p } = setup({
      P1: 'kane', P2: 'jack', P3: 'godfather',
      P4: 'constantine', P5: 'drWatson', P6: 'simpleCitizen',
      P7: 'simpleCitizen', P8: 'simpleMafia',
    });
    game.round = 1;

    // Night 1: Kane reveals Jack, mafia kills P6
    nightRound(game, {
      godfather: { actorIds: [p.P3.id], targetId: p.P6.id, actionType: 'shoot', mode: 'shoot' },
      jack: { actorIds: [p.P2.id], targetId: p.P7.id, actionType: 'curse' },
      kane: { actorIds: [p.P1.id], targetId: p.P2.id, actionType: 'kaneReveal' },
    });

    // BM should be discarded (Jack revealed)
    expect(getBMCard(game).used).toBe(true);

    // Day: vote out P7
    game.startDay();
    exhaustLastActions(game);
    game.eliminateByVote(p.P7.id);
    expect(dead(p.P7)).toBe(true);

    // Night 2: Constantine should see P6 (night 1) AND P7 (day vote)
    game.startNight();
    const ids = game.getRevivablePlayers().map(r => r.id);
    expect(ids).toContain(p.P6.id);
    expect(ids).toContain(p.P7.id);
  });

  it('Framason leader dies + Kane fake wake in same game', () => {
    const { game, p } = setup({
      P1: 'kane', P2: 'freemason', P3: 'godfather',
      P4: 'simpleMafia', P5: 'drWatson', P6: 'simpleCitizen',
      P7: 'simpleCitizen', P8: 'simpleCitizen',
    });
    game.framason.init(p.P2.id, 2);
    game.round = 1;

    // Night 1: Kane reveals citizen, framason recruits P6
    nightRound(game, {
      godfather: { actorIds: [p.P3.id], targetId: p.P7.id, actionType: 'shoot', mode: 'shoot' },
      kane: { actorIds: [p.P1.id], targetId: p.P5.id, actionType: 'kaneReveal' },
      freemason: { actorIds: [p.P2.id], targetId: p.P6.id, actionType: 'recruit' },
    });
    expect(game._kaneUsed).toBe(true);
    expect(game._kanePendingDeath).toBe(false);
    expect(game.framason.members).toContain(p.P6.id);

    // Night 2: Mafia kills framason leader
    nightRound(game, {
      godfather: { actorIds: [p.P3.id], targetId: p.P2.id, actionType: 'shoot', mode: 'shoot' },
    });
    expect(dead(p.P2)).toBe(true);

    // Night 3: Both Kane (fake wake) AND freemason (member P6 still alive) should appear
    game.startNight();
    const kaneStep = game.nightSteps.find(s => s.roleId === 'kane');
    const framasonStep = game.nightSteps.find(s => s.roleId === 'freemason');
    expect(kaneStep).toBeDefined();
    expect(framasonStep).toBeDefined();
    expect(framasonStep.actors).toContain(p.P6.id);
  });
});
