/**
 * rules-v6-suite.test.mjs — Comprehensive tests for v6 rule changes:
 *   R1: Jack — only dies from curse chain; immune to everything else
 *   R2: Jack — no repeat curse (unless forced)
 *   R3: Jack — day shoot / vote locks curse
 *   R4: Sniper — citizen target dies (not sniper)
 *   R5: Kane — kane_sacrifice is revivable; unused ability preserved
 *   R6: Beautiful Mind — auto-discard for Jack/mafia; can't kill Jack
 *   R7: Jadoogar — blocks night + morning bullet becomes blank (existing)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../js/models/Game.js';
import { Roles } from '../js/models/Roles.js';
import { Curse } from '../js/models/Curse.js';
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


/* ═══════════════════════════════════════════════════════════════════
   R1 — Jack immunity: only dies from curse chain
   ═══════════════════════════════════════════════════════════════════ */
describe('R1 — Jack only dies from curse chain', () => {

  it('R1.1 — Jack killed by salakhi (correct guess)', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack', SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const results = nightRound(game, {
      godfather: { targetId: p.Jack.id, mode: 'salakhi', guessedRoleId: 'jack' },
    });
    expect(dead(p.Jack)).toBe(true);
    expect(p.Jack.deathCause).toBe('salakhi');
    expect(results.salakhied.correct).toBe(true);
    expect(results.killed).toContain(p.Jack.id);
  });

  it('R1.2 — Jack immune to mafia night shoot', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack', SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const results = nightRound(game, {
      godfather: { targetId: p.Jack.id, mode: 'shoot' },
    });
    expect(alive(p.Jack)).toBe(true);
  });

  it('R1.3 — Jack immune to vote (voteImmune)', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack', SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const result = game.eliminateByVote(p.Jack.id);
    expect(result.voteImmune).toBe(true);
    expect(alive(p.Jack)).toBe(true);
  });

  it('R1.4 — Jack immune to lastaction_guess (Beautiful Mind)', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack', SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    p.SC1.kill(1, 'vote');
    const result = game.applyLastActionCard(CARD.BEAUTIFUL_MIND, p.SC1.id, p.Jack.id);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('immune');
    expect(alive(p.Jack)).toBe(true);
  });

  it('R1.5 — Jack dies from curse chain (night kill of cursed target)', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack', SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const results = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      jack: { actorIds: [p.Jack.id], targetId: p.SC1.id, actionType: 'curse' },
    });
    expect(dead(p.SC1)).toBe(true);
    expect(results.jackCurseTriggered).toBe(true);
    expect(dead(p.Jack)).toBe(true);
    expect(p.Jack.deathCause).toBe('curse');
  });

  it('R1.6 — Jack dies from curse chain (vote out of cursed target)', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack', SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    p.Jack.curse.place(p.SC1.id);
    game.round = 1; game.phase = 'day';
    const result = game.eliminateByVote(p.SC1.id);
    expect(dead(p.SC1)).toBe(true);
    expect(result.jackCurseTriggered).toBe(true);
    expect(dead(p.Jack)).toBe(true);
  });

  it('R1.7 — Jack.kill() returns false for non-curse/non-salakhi causes', () => {
    const { p } = setup({ Jack: 'jack', SC1: 'simpleCitizen' });
    expect(p.Jack.kill(1, 'mafia')).toBe(false);
    expect(p.Jack.kill(1, 'morning_shot')).toBe(false);
    expect(p.Jack.kill(1, 'vote')).toBe(false);
    expect(p.Jack.kill(1, 'lastaction_guess')).toBe(false);
    expect(p.Jack.kill(1, 'kane_sacrifice')).toBe(false);
    expect(alive(p.Jack)).toBe(true);
  });

  it('R1.7b — Jack.kill() returns true for salakhi', () => {
    const { p } = setup({ Jack: 'jack', SC1: 'simpleCitizen' });
    expect(p.Jack.kill(1, 'salakhi')).not.toBe(false);
    expect(dead(p.Jack)).toBe(true);
  });

  it('R1.8 — Jack.kill() returns true for curse cause', () => {
    const { p } = setup({ Jack: 'jack', SC1: 'simpleCitizen' });
    const result = p.Jack.kill(1, 'curse');
    expect(result).not.toBe(false);
    expect(dead(p.Jack)).toBe(true);
  });

  it('R1.9 — Jack.tryKill() returns false for non-curse/non-salakhi causes', () => {
    const { p } = setup({ Jack: 'jack', SC1: 'simpleCitizen' });
    expect(p.Jack.tryKill(1, 'mafia')).toBe(false);
    expect(p.Jack.tryKill(1, 'sniper')).toBe(false);
    expect(alive(p.Jack)).toBe(true);
  });

  it('R1.9b — Jack.tryKill() returns true for salakhi', () => {
    const { p } = setup({ Jack: 'jack', SC1: 'simpleCitizen' });
    expect(p.Jack.tryKill(1, 'salakhi')).toBe(true);
    expect(dead(p.Jack)).toBe(true);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   R2 — Jack curse: no repeat targets (unless forced)
   ═══════════════════════════════════════════════════════════════════ */
describe('R2 — Jack curse no repeat targets', () => {

  it('R2.1 — Curse.place() rejects previously cursed target', () => {
    const curse = new Curse();
    curse.place(10);
    curse.clear(); // Night ends, P10 added to previousTargetIds
    expect(curse.place(10)).toBe(false);
    expect(curse.targetId).toBeNull();
  });

  it('R2.2 — Curse.place() accepts new target', () => {
    const curse = new Curse();
    curse.place(10);
    curse.clear();
    expect(curse.place(20)).toBe(true);
    expect(curse.targetId).toBe(20);
  });

  it('R2.3 — Curse.place() with forceRepeat allows repeat', () => {
    const curse = new Curse();
    curse.place(10);
    curse.clear();
    expect(curse.place(10, true)).toBe(true);
    expect(curse.targetId).toBe(10);
  });

  it('R2.4 — previousTargetIds tracks all past targets', () => {
    const curse = new Curse();
    curse.place(10); curse.clear();
    curse.place(20); curse.clear();
    curse.place(30); curse.clear();
    expect(curse.previousTargetIds).toEqual([10, 20, 30]);
  });

  it('R2.5 — wasPreviousTarget() works correctly', () => {
    const curse = new Curse();
    curse.place(10); curse.clear();
    expect(curse.wasPreviousTarget(10)).toBe(true);
    expect(curse.wasPreviousTarget(20)).toBe(false);
  });

  it('R2.6 — Duplicate target not added to previousTargetIds twice', () => {
    const curse = new Curse();
    curse.place(10); curse.clear();
    curse.place(10, true); curse.clear(); // Force repeat
    expect(curse.previousTargetIds).toEqual([10]); // Only once
  });

  it('R2.7 — resolveNight uses forceRepeat when all alive cursed before', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack', SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });

    // Night 1: Curse SC1
    nightRound(game, {
      jack: { actorIds: [p.Jack.id], targetId: p.SC1.id, actionType: 'curse' },
    });

    // Kill everyone except Jack and SC1
    p.SC2.kill(1, 'mafia'); p.SC3.kill(1, 'mafia');
    p.SC4.kill(1, 'mafia'); p.SC5.kill(1, 'mafia');
    p.GF.kill(1, 'vote'); p.SM.kill(1, 'vote');

    // Night 2: Only SC1 is alive (non-Jack). SC1 was previously cursed.
    // forceRepeat should allow re-cursing SC1
    const results = nightRound(game, {
      jack: { actorIds: [p.Jack.id], targetId: p.SC1.id, actionType: 'curse' },
    });

    expect(p.Jack.curse.targetId).toBe(p.SC1.id);
  });

  it('R2.8 — resolveNight rejects repeat when other targets available', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack', SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });

    // Night 1: Curse SC1
    nightRound(game, {
      jack: { actorIds: [p.Jack.id], targetId: p.SC1.id, actionType: 'curse' },
    });

    // Night 2: Try to re-curse SC1 when SC2+ still available → should fail
    nightRound(game, {
      jack: { actorIds: [p.Jack.id], targetId: p.SC1.id, actionType: 'curse' },
    });

    expect(p.Jack.curse.targetId).toBeNull();
  });

  it('R2.9 — Curse serialization round-trip preserves previousTargetIds', () => {
    const curse = new Curse();
    curse.place(10); curse.clear();
    curse.place(20); curse.clear();
    curse.lock();

    const json = curse.toJSON();
    const restored = Curse.fromJSON(json);
    expect(restored.previousTargetIds).toEqual([10, 20]);
    expect(restored.isLocked).toBe(true);
    expect(restored.targetId).toBeNull();
  });

  it('R2.10 — Curse backward compat: old format with lastTargetId', () => {
    const restored = Curse.fromJSON({ targetId: 5, lastTargetId: 3 });
    expect(restored.previousTargetIds).toEqual([3]);
    expect(restored.targetId).toBe(5);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   R3 — Jack: day shoot / vote locks curse
   ═══════════════════════════════════════════════════════════════════ */
describe('R3 — Day shoot / vote locks Jack curse', () => {

  it('R3.1 — Morning shot on Jack locks curse', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack', Gunner: 'gunner',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    // Jack curses SC1
    p.Jack.curse.place(p.SC1.id);

    // Give SC2 a live bullet via bulletManager
    game.bulletManager.init(2, 2);
    game.bulletManager.giveBullet(p.SC2.id, 'live', 1);
    game.round = 1; game.phase = 'day';

    const result = game.resolveMorningShot(p.SC2.id, p.Jack.id);
    expect(alive(p.Jack)).toBe(true);
    expect(p.Jack.curse.isLocked).toBe(true);
  });

  it('R3.2 — Vote on Jack locks curse', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack', SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    p.Jack.curse.place(p.SC1.id);
    game.round = 1; game.phase = 'day';

    const result = game.eliminateByVote(p.Jack.id);
    expect(result.voteImmune).toBe(true);
    expect(alive(p.Jack)).toBe(true);
    expect(p.Jack.curse.isLocked).toBe(true);
  });

  it('R3.3 — Locked curse cannot be changed by place()', () => {
    const curse = new Curse();
    curse.place(10);
    curse.lock();
    expect(curse.place(20)).toBe(false);
    expect(curse.targetId).toBe(10); // Still locked on 10
  });

  it('R3.4 — Jack night step skipped when curse is locked', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack', SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    p.Jack.curse.lock();
    const steps = game._buildNightSteps();
    const jackStep = steps.find(s => s.roleId === 'jack');
    expect(jackStep).toBeUndefined();
  });

  it('R3.5 — Locked curse still triggers on target death', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack', SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    p.Jack.curse.place(p.SC1.id);
    p.Jack.curse.lock();
    game.round = 1; game.phase = 'day';

    const result = game.eliminateByVote(p.SC1.id);
    expect(dead(p.SC1)).toBe(true);
    expect(result.jackCurseTriggered).toBe(true);
    expect(dead(p.Jack)).toBe(true);
  });

  it('R3.6 — Vote on Jack also auto-discards Beautiful Mind', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack', Zodiac: 'zodiac',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    game.round = 1; game.phase = 'day';

    const bmCard = game.lastActionManager.cards.find(c => c.id === CARD.BEAUTIFUL_MIND);
    expect(bmCard.used).toBe(false);

    game.eliminateByVote(p.Jack.id);
    expect(bmCard.used).toBe(true);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   R4 — Sniper: sniper dies when shooting citizen
   ═════════════════════════════════════════════════════════════════ */
describe('R4 — Sniper citizen target → sniper dies', () => {

  it('R4.1 — Sniper shoots citizen → sniper dies, citizen survives', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Sniper: 'sniper', SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const results = nightRound(game, {
      sniper: { actorIds: [p.Sniper.id], targetId: p.SC1.id, actionType: 'shoot' },
    });
    expect(dead(p.Sniper)).toBe(true);
    expect(p.Sniper.deathCause).toBe('sniper_penalty');
    expect(alive(p.SC1)).toBe(true);
  });

  it('R4.2 — Sniper shoots independent → nothing happens', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Sniper: 'sniper', Jack: 'jack',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    const results = nightRound(game, {
      sniper: { actorIds: [p.Sniper.id], targetId: p.Jack.id, actionType: 'shoot' },
    });
    expect(alive(p.Sniper)).toBe(true);
    expect(alive(p.Jack)).toBe(true);
  });

  it('R4.3 — Sniper shoots Zodiac → nothing happens', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Sniper: 'sniper', Zodiac: 'zodiac',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    const results = nightRound(game, {
      sniper: { actorIds: [p.Sniper.id], targetId: p.Zodiac.id, actionType: 'shoot' },
    });
    expect(alive(p.Sniper)).toBe(true);
    expect(alive(p.Zodiac)).toBe(true);
  });

  it('R4.4 — Sniper killed by citizen-penalty can be revived by Constantine', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Sniper: 'sniper', Constantine: 'constantine',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    // Night 1: Sniper shoots citizen → sniper dies
    nightRound(game, {
      sniper: { actorIds: [p.Sniper.id], targetId: p.SC1.id, actionType: 'shoot' },
    });
    expect(dead(p.Sniper)).toBe(true);
    expect(p.Sniper.isRevivable).toBe(true);

    // Advance round so deathRound < round
    game.startDay();

    // Night 2: Constantine revives sniper
    const results = nightRound(game, {
      constantine: { actorIds: [p.Constantine.id], targetId: p.Sniper.id, actionType: 'revive' },
    });
    expect(alive(p.Sniper)).toBe(true);
  });

  it('R4.5 — Sniper shot count still consumed on citizen kill', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Sniper: 'sniper', SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const beforeShots = game._sniperShotCount || 0;
    nightRound(game, {
      sniper: { actorIds: [p.Sniper.id], targetId: p.SC1.id, actionType: 'shoot' },
    });
    const afterShots = game._sniperShotCount || 0;
    expect(afterShots).toBe(beforeShots + 1);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   R5 — Kane: revivable after sacrifice; ability preserved
   ═══════════════════════════════════════════════════════════════════ */
describe('R5 — Kane sacrifice revivable + ability preserved', () => {

  it('R5.1 — Kane sacrifice death is revivable', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Kane: 'kane', Constantine: 'constantine',
      Mafia1: 'simpleMafia',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen',
    });

    // Night 1: Kane reveals Mafia1
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      kane: { actorIds: [p.Kane.id], targetId: p.Mafia1.id, actionType: 'kaneReveal' },
    });

    // Night 2: Kane dying from sacrifice
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
    });

    expect(dead(p.Kane)).toBe(true);
    expect(p.Kane.isRevivable).toBe(true);
  });

  it('R5.2 — Constantine can revive Kane after sacrifice', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Kane: 'kane', Constantine: 'constantine',
      Mafia1: 'simpleMafia',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen',
    });

    // Night 1: Kane uses ability
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      kane: { actorIds: [p.Kane.id], targetId: p.Mafia1.id, actionType: 'kaneReveal' },
    });
    game.startDay(); // round → 1

    // Night 2: Kane dies from sacrifice
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
    });
    expect(dead(p.Kane)).toBe(true);
    game.startDay(); // round → 2

    // Night 3: Constantine revives Kane (deathRound < round)
    const results = nightRound(game, {
      constantine: { actorIds: [p.Constantine.id], targetId: p.Kane.id, actionType: 'revive' },
    });
    expect(alive(p.Kane)).toBe(true);
  });

  it('R5.3 — Kane unused ability preserved after non-sacrifice death + revival', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Kane: 'kane', Constantine: 'constantine',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });

    // Kill Kane without using ability
    const results = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.Kane.id, actionType: 'shoot', mode: 'shoot' },
    });
    expect(dead(p.Kane)).toBe(true);
    game.startDay(); // round → 1

    // Revive Kane
    nightRound(game, {
      constantine: { actorIds: [p.Constantine.id], targetId: p.Kane.id, actionType: 'revive' },
    });
    expect(alive(p.Kane)).toBe(true);

    // Kane should still have ability (not used)
    expect(game._kaneUsed).toBe(false);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   R6 — Beautiful Mind: auto-discard for Jack/mafia; can't kill Jack
   ═══════════════════════════════════════════════════════════════════ */
describe('R6 — Beautiful Mind restrictions', () => {

  it('R6.1 — BM auto-discarded when only Jack is alive independent', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack', SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    game.lastActionManager.cards.forEach(c => { c.used = (c.id !== CARD.BEAUTIFUL_MIND); });

    // Only Jack as independent → BM auto-discarded (Jack is invulnerable)
    const result = game.drawLastActionFor(p.SC1.id);
    expect(result).toBeNull();
  });

  it('R6.2 — BM available when Zodiac is alive', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Zodiac: 'zodiac', SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    game.lastActionManager.cards.forEach(c => { c.used = (c.id !== CARD.BEAUTIFUL_MIND); });

    const result = game.drawLastActionFor(p.SC1.id);
    expect(result).not.toBeNull();
    expect(result.card.id).toBe(CARD.BEAUTIFUL_MIND);
  });

  it('R6.3 — BM correct guess on Jack → immune, card fails', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack', Zodiac: 'zodiac',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    p.SC1.kill(1, 'vote');
    const result = game.applyLastActionCard(CARD.BEAUTIFUL_MIND, p.SC1.id, p.Jack.id);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('immune');
    expect(alive(p.Jack)).toBe(true);
    expect(dead(p.SC1)).toBe(true); // Victim stays dead
  });

  it('R6.4 — BM correct guess on Zodiac → works normally', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Zodiac: 'zodiac', SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    p.SC1.kill(1, 'vote');
    const result = game.applyLastActionCard(CARD.BEAUTIFUL_MIND, p.SC1.id, p.Zodiac.id);
    expect(result.success).toBe(true);
    expect(dead(p.Zodiac)).toBe(true);
    expect(alive(p.SC1)).toBe(true);
  });

  it('R6.5 — BM auto-discarded when mafia is voted out', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack', Zodiac: 'zodiac',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    game.round = 1; game.phase = 'day';

    // Vote out a mafia member
    game.eliminateByVote(p.SM.id);
    expect(dead(p.SM)).toBe(true);

    // Force only BM remaining
    game.lastActionManager.cards.forEach(c => { c.used = (c.id !== CARD.BEAUTIFUL_MIND); });

    // BM should be auto-discarded for mafia victim
    const result = game.drawLastActionFor(p.SM.id);
    expect(result).toBeNull();
  });

  it('R6.6 — BM auto-discarded when Jack is vote-targeted (voteImmune branch)', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack', Zodiac: 'zodiac',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    game.round = 1; game.phase = 'day';

    const bmCard = game.lastActionManager?.cards?.find(c => c.id === CARD.BEAUTIFUL_MIND);
    expect(bmCard.used).toBe(false);

    game.eliminateByVote(p.Jack.id);
    expect(bmCard.used).toBe(true);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   R7 — Zodiac: morning shot vulnerability
   ═══════════════════════════════════════════════════════════════════ */
describe('R7 — Zodiac morning shot vulnerability', () => {

  it('R7.1 — Zodiac can be killed by live morning bullet', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Zodiac: 'zodiac', Gunner: 'gunner',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    game.bulletManager.init(2, 2);
    game.bulletManager.giveBullet(p.SC1.id, 'live', 1);
    game.round = 1; game.phase = 'day';

    const result = game.resolveMorningShot(p.SC1.id, p.Zodiac.id);
    expect(dead(p.Zodiac)).toBe(true);
  });

  it('R7.2 — Zodiac can be voted out', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Zodiac: 'zodiac', SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    game.round = 1; game.phase = 'day';

    const result = game.eliminateByVote(p.Zodiac.id);
    expect(dead(p.Zodiac)).toBe(true);
  });

  it('R7.3 — Zodiac immune to night shoots', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Zodiac: 'zodiac', SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const results = nightRound(game, {
      godfather: { targetId: p.Zodiac.id, mode: 'shoot' },
    });
    expect(alive(p.Zodiac)).toBe(true);
  });

  it('R7.4 — Zodiac can be killed by salakhi', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Zodiac: 'zodiac', SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const results = nightRound(game, {
      godfather: { targetId: p.Zodiac.id, mode: 'salakhi', guessedRoleId: 'zodiac' },
    });
    expect(dead(p.Zodiac)).toBe(true);
    expect(p.Zodiac.deathCause).toBe('salakhi');
  });
});
