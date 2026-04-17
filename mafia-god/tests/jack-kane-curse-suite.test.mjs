/**
 * jack-kane-curse-suite.test.mjs — Comprehensive tests for:
 *
 * JK1: Kane reveals Jack → curse permanently locked
 * JK2: After lock, cursed player death → Jack eliminated
 * JK3: After lock, curse survives night reset (_clearJackCurse)
 * JK4: Locked curse not cleared by Curse.clear()
 * JK5: Jack skipped in night steps when curse locked
 * JK6: Kill scenarios — all roles properly die when killed
 * JK7: Locked curse from day shoot persists across nights
 * JK8: Locked curse from vote persists across nights
 * JK9: Locked curse from cowboy persists across nights
 * JK10: Locked curse from jadoogar block persists across nights
 * JK11: Kane reveals Jack + cursed dies same night → Jack dies too
 * JK12: Kane reveals Jack + cursed survives → curse stays locked next round
 * JK13: Multiple lock sources don't interfere
 * JK14: Curse chain triggers from every kill type after lock
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../js/models/Game.js';
import { Roles } from '../js/models/Roles.js';
import { Curse } from '../js/models/Curse.js';

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

const baseRoster = {
  Kane: 'kane',
  Jack: 'jack',
  GF: 'godfather',
  Lecter: 'drLecter',
  Watson: 'drWatson',
  SC1: 'simpleCitizen',
  SC2: 'simpleCitizen',
  SC3: 'simpleCitizen',
};


/* ═══════════════════════════════════════════════════════════════════
   JK1 — Kane reveals Jack → curse permanently locked
   ═══════════════════════════════════════════════════════════════════ */
describe('JK1 — Kane reveals Jack → curse locked', () => {

  it('JK1.1 — Kane successfully reveals Jack as independent, curse is locked', () => {
    const { game, p } = setup(baseRoster);

    const results = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      jack: { actorIds: [p.Jack.id], targetId: p.SC2.id, actionType: 'curse' },
      kane: { actorIds: [p.Kane.id], targetId: p.Jack.id, actionType: 'kaneReveal' },
    });

    expect(results.kaneReveal).toBeTruthy();
    expect(results.kaneReveal.targetId).toBe(p.Jack.id);
    expect(game._kanePendingDeath).toBe(true);
    expect(game._kaneUsed).toBe(true);
    // Jack's curse should be locked
    expect(p.Jack.curse.isLocked).toBe(true);
    // Jack's curse target should still be SC2
    expect(p.Jack.curse.targetId).toBe(p.SC2.id);
  });

  it('JK1.2 — Jack still alive after Kane reveal', () => {
    const { game, p } = setup(baseRoster);

    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      jack: { actorIds: [p.Jack.id], targetId: p.SC2.id, actionType: 'curse' },
      kane: { actorIds: [p.Kane.id], targetId: p.Jack.id, actionType: 'kaneReveal' },
    });

    expect(alive(p.Jack)).toBe(true);
    expect(alive(p.Kane)).toBe(true); // Kane dies next night
  });

  it('JK1.3 — Kane dies next night after revealing Jack', () => {
    const { game, p } = setup(baseRoster);

    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      jack: { actorIds: [p.Jack.id], targetId: p.SC2.id, actionType: 'curse' },
      kane: { actorIds: [p.Kane.id], targetId: p.Jack.id, actionType: 'kaneReveal' },
    });

    const results2 = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC3.id, actionType: 'shoot', mode: 'shoot' },
    });

    expect(dead(p.Kane)).toBe(true);
    expect(results2.killed).toContain(p.Kane.id);
  });

  it('JK1.4 — History records the Kane-Jack curse lock announcement', () => {
    const { game, p } = setup(baseRoster);

    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      jack: { actorIds: [p.Jack.id], targetId: p.SC2.id, actionType: 'curse' },
      kane: { actorIds: [p.Kane.id], targetId: p.Jack.id, actionType: 'kaneReveal' },
    });

    const curseLockedEntry = game.history.find(h => h.type === 'info' && h.text?.includes('Jack'));
    expect(curseLockedEntry).toBeTruthy();
  });
});


/* ═══════════════════════════════════════════════════════════════════
   JK2 — After Kane lock, cursed player death → Jack eliminated
   ═══════════════════════════════════════════════════════════════════ */
describe('JK2 — Cursed player dies after Kane lock → Jack dies', () => {

  it('JK2.1 — Cursed player killed by mafia next night → Jack dies', () => {
    const { game, p } = setup(baseRoster);

    // Night 1: Kane reveals Jack, Jack curses SC2
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      jack: { actorIds: [p.Jack.id], targetId: p.SC2.id, actionType: 'curse' },
      kane: { actorIds: [p.Kane.id], targetId: p.Jack.id, actionType: 'kaneReveal' },
    });

    expect(p.Jack.curse.isLocked).toBe(true);
    expect(p.Jack.curse.targetId).toBe(p.SC2.id);

    // Night 2: Mafia kills SC2 (the cursed player)
    const results2 = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
    });

    expect(dead(p.SC2)).toBe(true);
    expect(results2.jackCurseTriggered).toBe(true);
    expect(dead(p.Jack)).toBe(true);
    expect(p.Jack.deathCause).toBe('curse');
  });

  it('JK2.2 — Cursed player voted out → Jack dies', () => {
    const { game, p } = setup(baseRoster);

    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      jack: { actorIds: [p.Jack.id], targetId: p.SC2.id, actionType: 'curse' },
      kane: { actorIds: [p.Kane.id], targetId: p.Jack.id, actionType: 'kaneReveal' },
    });

    game.round = 1; game.phase = 'day';
    game.lastActionManager.cards.forEach(c => c.used = true);
    const result = game.eliminateByVote(p.SC2.id);

    expect(dead(p.SC2)).toBe(true);
    expect(result.jackCurseTriggered).toBe(true);
    expect(dead(p.Jack)).toBe(true);
  });

  it('JK2.3 — Cursed player killed by morning shot → Jack dies', () => {
    const { game, p } = setup({
      Kane: 'kane', Jack: 'jack', GF: 'godfather',
      Gunner: 'gunner', SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });

    // Night 1: Kane reveals Jack, Jack curses SC1
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
      jack: { actorIds: [p.Jack.id], targetId: p.SC1.id, actionType: 'curse' },
      kane: { actorIds: [p.Kane.id], targetId: p.Jack.id, actionType: 'kaneReveal' },
      gunner: { actorIds: [p.Gunner.id], targetId: p.SC3.id, actionType: 'giveBullet', bulletType: 'live' },
    });

    expect(p.Jack.curse.isLocked).toBe(true);

    // Morning shot: SC3 shoots SC1 (cursed target)
    game.round = 1; game.phase = 'day';
    game.bulletManager.giveBullet(p.SC3.id, 'live');
    const result = game.resolveMorningShot(p.SC3.id, p.SC1.id);

    expect(result.killed).toBe(true);
    expect(dead(p.SC1)).toBe(true);
    expect(result.jackCurseTriggered).toBe(true);
    expect(dead(p.Jack)).toBe(true);
  });

  it('JK2.4 — Cursed player killed by cowboy → Jack dies', () => {
    const { game, p } = setup({
      Kane: 'kane', Jack: 'jack', GF: 'godfather',
      Cowboy: 'cowboy', SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });

    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
      jack: { actorIds: [p.Jack.id], targetId: p.SC1.id, actionType: 'curse' },
      kane: { actorIds: [p.Kane.id], targetId: p.Jack.id, actionType: 'kaneReveal' },
    });

    expect(p.Jack.curse.isLocked).toBe(true);

    game.round = 1; game.phase = 'day';
    const result = game.resolveCowboyAction(p.SC1.id);

    expect(result.killed).toBe(true);
    expect(dead(p.SC1)).toBe(true);
    expect(result.jackCurseTriggered).toBe(true);
    expect(dead(p.Jack)).toBe(true);
  });

  it('JK2.5 — Cursed player killed by sniper at night → Jack dies', () => {
    const { game, p } = setup({
      Kane: 'kane', Jack: 'jack', GF: 'godfather', SM: 'simpleMafia',
      Sniper: 'sniper', SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen',
    });

    // Night 1: Kane reveals Jack, Jack curses SM
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      jack: { actorIds: [p.Jack.id], targetId: p.SM.id, actionType: 'curse' },
      kane: { actorIds: [p.Kane.id], targetId: p.Jack.id, actionType: 'kaneReveal' },
    });

    expect(p.Jack.curse.isLocked).toBe(true);

    // Night 2: Sniper kills SM (cursed target)
    const results2 = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
      sniper: { actorIds: [p.Sniper.id], targetId: p.SM.id, actionType: 'snipe' },
    });

    expect(dead(p.SM)).toBe(true);
    expect(results2.jackCurseTriggered).toBe(true);
    expect(dead(p.Jack)).toBe(true);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   JK3 — Locked curse survives night reset (_clearJackCurse)
   ═══════════════════════════════════════════════════════════════════ */
describe('JK3 — Locked curse survives night reset', () => {

  it('JK3.1 — Curse from day shoot remains across multiple nights', () => {
    const { game, p } = setup({
      Jack: 'jack', GF: 'godfather', SM: 'simpleMafia',
      Gunner: 'gunner', SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });

    // Night 1: Jack curses SC1
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
      jack: { actorIds: [p.Jack.id], targetId: p.SC1.id, actionType: 'curse' },
      gunner: { actorIds: [p.Gunner.id], targetId: p.SC3.id, actionType: 'giveBullet', bulletType: 'live' },
    });

    // Day: Morning shot on Jack → survives, curse locked
    game.round = 1; game.phase = 'day';
    game.bulletManager.giveBullet(p.SC3.id, 'live');
    game.resolveMorningShot(p.SC3.id, p.Jack.id);
    expect(p.Jack.curse.isLocked).toBe(true);
    expect(p.Jack.curse.targetId).toBe(p.SC1.id);

    // Night 2: Curse should STILL be on SC1
    game.startNight();
    expect(p.Jack.curse.isLocked).toBe(true);
    expect(p.Jack.curse.targetId).toBe(p.SC1.id);

    // Night 3: Still locked
    game.startNight();
    expect(p.Jack.curse.isLocked).toBe(true);
    expect(p.Jack.curse.targetId).toBe(p.SC1.id);
  });

  it('JK3.2 — Curse from vote remains across multiple nights', () => {
    const { game, p } = setup({
      Jack: 'jack', GF: 'godfather', SM: 'simpleMafia',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });

    // Night 1: Jack curses SC1
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
      jack: { actorIds: [p.Jack.id], targetId: p.SC1.id, actionType: 'curse' },
    });

    // Day: Vote Jack → immune, curse locked
    game.round = 1; game.phase = 'day';
    game.eliminateByVote(p.Jack.id);
    expect(p.Jack.curse.isLocked).toBe(true);
    expect(p.Jack.curse.targetId).toBe(p.SC1.id);

    // Night 2: Curse should still be on SC1
    game.startNight();
    expect(p.Jack.curse.isLocked).toBe(true);
    expect(p.Jack.curse.targetId).toBe(p.SC1.id);
  });

  it('JK3.3 — Curse from Kane reveal persists across nights', () => {
    const { game, p } = setup(baseRoster);

    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      jack: { actorIds: [p.Jack.id], targetId: p.SC2.id, actionType: 'curse' },
      kane: { actorIds: [p.Kane.id], targetId: p.Jack.id, actionType: 'kaneReveal' },
    });

    expect(p.Jack.curse.isLocked).toBe(true);
    expect(p.Jack.curse.targetId).toBe(p.SC2.id);

    // Night 2: Curse target preserved
    game.startNight();
    expect(p.Jack.curse.isLocked).toBe(true);
    expect(p.Jack.curse.targetId).toBe(p.SC2.id);

    // Night 3: Still preserved
    game.startNight();
    expect(p.Jack.curse.isLocked).toBe(true);
    expect(p.Jack.curse.targetId).toBe(p.SC2.id);
  });

  it('JK3.4 — Curse from cowboy persists across nights', () => {
    const { game, p } = setup({
      Jack: 'jack', GF: 'godfather', SM: 'simpleMafia',
      Cowboy: 'cowboy', SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });

    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
      jack: { actorIds: [p.Jack.id], targetId: p.SC1.id, actionType: 'curse' },
    });

    game.round = 1; game.phase = 'day';
    game.resolveCowboyAction(p.Jack.id);
    expect(p.Jack.curse.isLocked).toBe(true);
    expect(p.Jack.curse.targetId).toBe(p.SC1.id);

    game.startNight();
    expect(p.Jack.curse.isLocked).toBe(true);
    expect(p.Jack.curse.targetId).toBe(p.SC1.id);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   JK4 — Curse.clear() respects lock
   ═══════════════════════════════════════════════════════════════════ */
describe('JK4 — Curse.clear() respects lock', () => {

  it('JK4.1 — clear() does nothing when locked', () => {
    const curse = new Curse();
    curse.place(10);
    curse.lock();
    curse.clear(); // Should be a no-op
    expect(curse.targetId).toBe(10);
    expect(curse.isLocked).toBe(true);
  });

  it('JK4.2 — clear() works normally when NOT locked', () => {
    const curse = new Curse();
    curse.place(10);
    curse.clear();
    expect(curse.targetId).toBeNull();
    expect(curse.previousTargetIds).toContain(10);
  });

  it('JK4.3 — place() returns false when locked', () => {
    const curse = new Curse();
    curse.place(10);
    curse.lock();
    expect(curse.place(20)).toBe(false);
    expect(curse.targetId).toBe(10);
  });

  it('JK4.4 — Serialization preserves locked state', () => {
    const curse = new Curse();
    curse.place(10);
    curse.lock();

    const json = curse.toJSON();
    const restored = Curse.fromJSON(json);
    expect(restored.isLocked).toBe(true);
    expect(restored.targetId).toBe(10);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   JK5 — Jack skipped in night steps when locked
   ═══════════════════════════════════════════════════════════════════ */
describe('JK5 — Jack night step behavior with lock', () => {

  it('JK5.1 — Jack skipped when curse locked by Kane', () => {
    const { game, p } = setup(baseRoster);

    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      jack: { actorIds: [p.Jack.id], targetId: p.SC2.id, actionType: 'curse' },
      kane: { actorIds: [p.Kane.id], targetId: p.Jack.id, actionType: 'kaneReveal' },
    });

    game.startNight();
    const jackStep = game.nightSteps.find(s => s.roleId === 'jack');
    expect(jackStep).toBeUndefined();
  });

  it('JK5.2 — Jack appears in steps when curse NOT locked', () => {
    const { game, p } = setup(baseRoster);

    game.startNight();
    const jackStep = game.nightSteps.find(s => s.roleId === 'jack');
    expect(jackStep).toBeDefined();
  });

  it('JK5.3 — Jack skipped in blind night steps too when locked', () => {
    const { game, p } = setup(baseRoster);

    p.Jack.curse.place(p.SC1.id);
    p.Jack.curse.lock();

    const steps = game._buildBlindNightSteps();
    const jackStep = steps.find(s => s.roleId === 'jack');
    expect(jackStep).toBeUndefined();
  });
});


/* ═══════════════════════════════════════════════════════════════════
   JK6 — Kill scenarios: all non-immune roles die when killed
   ═══════════════════════════════════════════════════════════════════ */
describe('JK6 — Kill scenarios', () => {

  it('JK6.1 — simpleCitizen dies from mafia night shoot', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
      SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    const results = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
    });
    expect(dead(p.SC1)).toBe(true);
    expect(results.killed).toContain(p.SC1.id);
  });

  it('JK6.2 — simpleCitizen dies from vote', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
      SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    game.round = 1; game.phase = 'day';
    game.lastActionManager.cards.forEach(c => c.used = true);
    game.eliminateByVote(p.SC1.id);
    expect(dead(p.SC1)).toBe(true);
    expect(p.SC1.deathCause).toBe('vote');
  });

  it('JK6.3 — simpleMafia dies from salakhi', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
      SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    const results = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SM.id, actionType: 'shoot', mode: 'salakhi', guessedRoleId: 'simpleMafia' },
    });
    expect(dead(p.SM)).toBe(true);
    expect(results.salakhied.correct).toBe(true);
  });

  it('JK6.4 — Player dies from cowboy action', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Cowboy: 'cowboy',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    game.round = 1; game.phase = 'day';
    const result = game.resolveCowboyAction(p.SM.id);
    expect(result.killed).toBe(true);
    expect(dead(p.SM)).toBe(true);
  });

  it('JK6.5 — Player dies from morning shot (live bullet)', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Gunner: 'gunner',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    game.bulletManager.init(2, 2);
    game.bulletManager.giveBullet(p.SC1.id, 'live');
    game.round = 1; game.phase = 'day';
    const result = game.resolveMorningShot(p.SC1.id, p.SM.id);
    expect(result.killed).toBe(true);
    expect(dead(p.SM)).toBe(true);
  });

  it('JK6.6 — Godfather dies from vote', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
      SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    game.round = 1; game.phase = 'day';
    game.lastActionManager.cards.forEach(c => c.used = true);
    game.eliminateByVote(p.GF.id);
    expect(dead(p.GF)).toBe(true);
    expect(p.GF.deathCause).toBe('vote');
  });

  it('JK6.7 — drWatson dies from mafia shoot', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Watson: 'drWatson',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const results = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.Watson.id, actionType: 'shoot', mode: 'shoot' },
    });
    expect(dead(p.Watson)).toBe(true);
    expect(results.killed).toContain(p.Watson.id);
  });

  it('JK6.8 — Detective dies from sniper (penalty)', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Sniper: 'sniper',
      Detective: 'detective', SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    const results = nightRound(game, {
      sniper: { actorIds: [p.Sniper.id], targetId: p.Detective.id, actionType: 'snipe' },
    });
    // Sniper shot citizen/detective → sniper dies as penalty
    expect(dead(p.Sniper)).toBe(true);
    expect(results.killed).toContain(p.Sniper.id);
  });

  it('JK6.9 — Jack immune to mafia shoot', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Jack: 'jack',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const results = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.Jack.id, actionType: 'shoot', mode: 'shoot' },
    });
    expect(alive(p.Jack)).toBe(true);
    expect(results.killed).not.toContain(p.Jack.id);
  });

  it('JK6.10 — Jack immune to vote', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Jack: 'jack',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    game.round = 1; game.phase = 'day';
    const result = game.eliminateByVote(p.Jack.id);
    expect(alive(p.Jack)).toBe(true);
    expect(result.voteImmune).toBe(true);
  });

  it('JK6.11 — Jack dies from correct salakhi', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Jack: 'jack',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const results = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.Jack.id, mode: 'salakhi', guessedRoleId: 'jack' },
    });
    expect(dead(p.Jack)).toBe(true);
    expect(results.salakhied.correct).toBe(true);
  });

  it('JK6.12 — Player healed by Watson survives mafia shoot', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Watson: 'drWatson',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const results = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      drWatson: { actorIds: [p.Watson.id], targetId: p.SC1.id, actionType: 'heal' },
    });
    expect(alive(p.SC1)).toBe(true);
    expect(results.saved).toContain(p.SC1.id);
  });

  it('JK6.13 — Godfather shield absorbs first hit', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Sniper: 'sniper',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const results = nightRound(game, {
      sniper: { actorIds: [p.Sniper.id], targetId: p.GF.id, actionType: 'snipe' },
    });
    expect(alive(p.GF)).toBe(true); // Shield absorbed
    expect(results.shielded).toContain(p.GF.id);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   JK7-JK10 — Locked curse from various sources persists
   ═══════════════════════════════════════════════════════════════════ */
describe('JK7-10 — Locked curse chain triggers after night reset', () => {

  it('JK7 — Day shoot lock: cursed target killed next night → Jack dies', () => {
    const { game, p } = setup({
      Jack: 'jack', GF: 'godfather', SM: 'simpleMafia', Gunner: 'gunner',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });

    // Night 1: Jack curses SC1
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
      jack: { actorIds: [p.Jack.id], targetId: p.SC1.id, actionType: 'curse' },
      gunner: { actorIds: [p.Gunner.id], targetId: p.SC3.id, actionType: 'giveBullet', bulletType: 'live' },
    });

    // Day: Morning shot on Jack → lock
    game.round = 1; game.phase = 'day';
    game.bulletManager.giveBullet(p.SC3.id, 'live');
    game.resolveMorningShot(p.SC3.id, p.Jack.id);

    // Night 2: mafia kills SC1
    const results2 = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
    });

    expect(dead(p.SC1)).toBe(true);
    expect(results2.jackCurseTriggered).toBe(true);
    expect(dead(p.Jack)).toBe(true);
  });

  it('JK8 — Vote lock: cursed target killed next night → Jack dies', () => {
    const { game, p } = setup({
      Jack: 'jack', GF: 'godfather', SM: 'simpleMafia',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });

    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
      jack: { actorIds: [p.Jack.id], targetId: p.SC1.id, actionType: 'curse' },
    });

    // Day: Vote Jack → immune, lock
    game.round = 1; game.phase = 'day';
    game.eliminateByVote(p.Jack.id);

    // Night 2: mafia kills SC1
    const results2 = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
    });

    expect(dead(p.SC1)).toBe(true);
    expect(results2.jackCurseTriggered).toBe(true);
    expect(dead(p.Jack)).toBe(true);
  });

  it('JK9 — Cowboy lock: cursed target killed next night → Jack dies', () => {
    const { game, p } = setup({
      Jack: 'jack', GF: 'godfather', SM: 'simpleMafia', Cowboy: 'cowboy',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });

    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
      jack: { actorIds: [p.Jack.id], targetId: p.SC1.id, actionType: 'curse' },
    });

    game.round = 1; game.phase = 'day';
    game.resolveCowboyAction(p.Jack.id);

    const results2 = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
    });

    expect(dead(p.SC1)).toBe(true);
    expect(results2.jackCurseTriggered).toBe(true);
    expect(dead(p.Jack)).toBe(true);
  });

  it('JK10 — Jadoogar block lock: cursed target killed next night → Jack dies', () => {
    const { game, p } = setup({
      Jack: 'jack', GF: 'godfather', Jadoogar: 'jadoogar', SM: 'simpleMafia',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });

    // Simulate: Jack placed curse on SC1 and jadoogar blocked → curse locked
    // (In real gameplay, _clearJackCurse at night start detects jadoogar blocked Jack)
    p.Jack.curse.place(p.SC1.id);
    game._jadoogarLastBlockedId = p.Jack.id;

    // Night start triggers _clearJackCurse which sees jadoogar block → locks curse
    game.startNight();

    expect(p.Jack.curse.isLocked).toBe(true);
    expect(p.Jack.curse.targetId).toBe(p.SC1.id);

    // Mafia kills SC1 (cursed target)
    Object.assign(game.nightActions, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
    });
    const results = game.resolveNight();

    expect(dead(p.SC1)).toBe(true);
    expect(results.jackCurseTriggered).toBe(true);
    expect(dead(p.Jack)).toBe(true);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   JK11-14 — Edge cases
   ═══════════════════════════════════════════════════════════════════ */
describe('JK11-14 — Edge cases', () => {

  it('JK11 — Kane reveals Jack + cursed dies same night → Jack dies same night', () => {
    const { game, p } = setup(baseRoster);

    const results = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
      jack: { actorIds: [p.Jack.id], targetId: p.SC2.id, actionType: 'curse' },
      kane: { actorIds: [p.Kane.id], targetId: p.Jack.id, actionType: 'kaneReveal' },
    });

    expect(dead(p.SC2)).toBe(true);
    expect(results.jackCurseTriggered).toBe(true);
    expect(dead(p.Jack)).toBe(true);
    expect(p.Jack.deathCause).toBe('curse');
    expect(p.Jack.curse.isLocked).toBe(true);
  });

  it('JK12 — Kane reveals Jack + cursed survives → curse locked for future', () => {
    const { game, p } = setup(baseRoster);

    const results = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      jack: { actorIds: [p.Jack.id], targetId: p.SC2.id, actionType: 'curse' },
      kane: { actorIds: [p.Kane.id], targetId: p.Jack.id, actionType: 'kaneReveal' },
    });

    expect(alive(p.SC2)).toBe(true);
    expect(alive(p.Jack)).toBe(true);
    expect(p.Jack.curse.isLocked).toBe(true);
    expect(p.Jack.curse.targetId).toBe(p.SC2.id);
    expect(results.jackCurseTriggered).toBe(false);
  });

  it('JK13 — Lock from vote + then Kane reveal (double lock) has no issues', () => {
    const { game, p } = setup(baseRoster);

    // Night 1: Jack curses SC1
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
      jack: { actorIds: [p.Jack.id], targetId: p.SC1.id, actionType: 'curse' },
    });

    // Day: Vote Jack → lock
    game.round = 1; game.phase = 'day';
    game.eliminateByVote(p.Jack.id);
    expect(p.Jack.curse.isLocked).toBe(true);

    // Lock again (simulate double lock)
    p.Jack.curse.lock();
    expect(p.Jack.curse.isLocked).toBe(true);
    expect(p.Jack.curse.targetId).toBe(p.SC1.id);
  });

  it('JK14 — Locked curse chain triggers via live bullet explosion', () => {
    const { game, p } = setup({
      Jack: 'jack', GF: 'godfather', SM: 'simpleMafia', Gunner: 'gunner',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });

    p.Jack.curse.place(p.SC1.id);
    p.Jack.curse.lock();

    // Give SC1 a live bullet and don't use it → explosion at voting
    game.bulletManager.init(2, 2);
    game.bulletManager.giveBullet(p.SC1.id, 'live');

    game.round = 1; game.phase = 'day';
    const explosions = game.resolveLiveExpiration();

    expect(explosions.length).toBeGreaterThan(0);
    expect(dead(p.SC1)).toBe(true);

    // Check Jack curse triggered
    const jackPlayer = game.players.find(pl => pl.roleId === 'jack');
    expect(dead(jackPlayer)).toBe(true);
  });
});
