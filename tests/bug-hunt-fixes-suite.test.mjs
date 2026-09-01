/**
 * bug-hunt-fixes-suite.test.mjs — Regression tests for bugs found by the
 * adversarial multi-dimension bug-hunt workflow run in this session:
 *
 *   BH1: Beautiful Mind auto-discard no longer swallows a pending Jack curse check
 *   BH2: godKill() actually kills Jack/Zodiac (admin override bypasses role immunity)
 *   BH3: Face Off transfers Jack's curse when the CHOSEN player (not the victim) is Jack
 *   BH4: Game state (nightActions/currentNightStep/nightSteps) survives a save/reload round trip
 *   BH5: desiredMafia/desiredCitizen survive a save/reload round trip
 *   BH6: Editing the roster mid-manual-assignment safely cancels back to setup
 *   BH7: Final Shoot returns the target's gunner bullet to the pool
 *   BH8: Jack's own bullet is returned when a curse chain kills him (cowboy / morning shot / live expiration / face off)
 */
import { describe, it, expect } from 'vitest';
import { Game } from '../js/models/Game.js';
import { Roles } from '../js/models/Roles.js';
import { CARD } from '../js/models/LastActionManager.js';

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

/* ═══════════════════════════════════════════════════════════════
   BH1 — Beautiful Mind auto-discard resolves pending Jack curse
   ═══════════════════════════════════════════════════════════════ */
describe('BH1 — Beautiful Mind auto-discard resolves pending Jack curse', () => {

  it('BH1.1 — curse resolves even when auto-discard leaves no independent to catch it', () => {
    const { game, p } = setup({
      Jack: 'jack', GF: 'godfather', SM: 'simpleMafia',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    // Only Beautiful Mind remains unused
    game.lastActionManager.cards.forEach(c => { c.used = (c.id !== CARD.BEAUTIFUL_MIND); });

    // Jack curses SC1
    game.startNight();
    game.nightActions.jack = { actorIds: [p.Jack.id], targetId: p.SC1.id };
    game.resolveNight();
    expect(p.Jack.curse.isTriggeredBy(p.SC1.id)).toBe(true);

    // SC1 is voted out while a last-action card is still available -> curse check deferred
    const extra = game.eliminateByVote(p.SC1.id);
    expect(extra.lastActionAvailable).toBe(true);
    expect(game.pendingVoteCurseCheckId).toBe(p.SC1.id);
    expect(p.Jack.isAlive).toBe(true); // not yet resolved

    // Drawing a last action: no vulnerable independent exists -> Beautiful Mind auto-discarded,
    // nothing left to draw -> must still resolve the pending curse
    const result = game.drawLastActionFor(p.SC1.id);
    expect(p.Jack.isAlive).toBe(false);
    expect(p.Jack.deathCause).toBe('curse');
    expect(game.pendingVoteCurseCheckId).toBeNull();
    expect(result?.jackCurseTriggered).toBe(true);
  });

  it('BH1.2 — curse resolves even when auto-discard fires on the mafia-victim branch', () => {
    const { game, p } = setup({
      Jack: 'jack', Zodiac: 'zodiac', GF: 'godfather', SM: 'simpleMafia',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    game.lastActionManager.cards.forEach(c => { c.used = (c.id !== CARD.BEAUTIFUL_MIND); });

    game.startNight();
    game.nightActions.jack = { actorIds: [p.Jack.id], targetId: p.SM.id };
    game.resolveNight();
    expect(p.Jack.curse.isTriggeredBy(p.SM.id)).toBe(true);

    const extra = game.eliminateByVote(p.SM.id); // mafia victim
    expect(extra.lastActionAvailable).toBe(true);
    expect(p.Jack.isAlive).toBe(true);

    game.drawLastActionFor(p.SM.id);
    expect(p.Jack.isAlive).toBe(false);
    expect(p.Jack.deathCause).toBe('curse');
  });

  it('BH1.3 — unrelated auto-discard (no pending curse) still returns null exactly as before', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    game.lastActionManager.cards.forEach(c => { c.used = (c.id !== CARD.BEAUTIFUL_MIND); });
    const result = game.drawLastActionFor(p.SC1.id);
    expect(result).toBeNull();
  });
});

/* ═══════════════════════════════════════════════════════════════
   BH2 — godKill() bypasses role immunity as an admin override
   ═══════════════════════════════════════════════════════════════ */
describe('BH2 — godKill() forces death on immune roles', () => {

  it('BH2.1 — godKill actually kills Jack', () => {
    const { game, p } = setup({
      Jack: 'jack', GF: 'godfather',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    const result = game.godKill(p.Jack.id);
    expect(result.success).toBe(true);
    expect(p.Jack.isAlive).toBe(false);
  });

  it('BH2.2 — godKill actually kills Zodiac', () => {
    const { game, p } = setup({
      Zodiac: 'zodiac', GF: 'godfather', BG: 'bodyguard',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const result = game.godKill(p.Zodiac.id);
    expect(result.success).toBe(true);
    expect(p.Zodiac.isAlive).toBe(false);
  });

  it('BH2.3 — godKill still returns success=false and does nothing for an already-dead player', () => {
    const { game, p } = setup({
      GF: 'godfather', SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen', SC7: 'simpleCitizen',
    });
    p.SC1.kill(1, 'test', false);
    const result = game.godKill(p.SC1.id);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('already_dead');
  });
});

/* ═══════════════════════════════════════════════════════════════
   BH3 — Face Off transfers curse in both directions
   ═══════════════════════════════════════════════════════════════ */
describe('BH3 — Face Off curse transfer', () => {

  it('BH3.1 — curse still transfers when the VICTIM was Jack (existing, unbroken direction)', () => {
    const { game, p } = setup({
      Jack: 'jack', Target: 'simpleCitizen', Cursed: 'simpleCitizen', GF: 'godfather',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    game.startNight();
    game.nightActions.jack = { actorIds: [p.Jack.id], targetId: p.Cursed.id };
    game.resolveNight();

    const result = game.applyLastActionCard(CARD.FACE_OFF, p.Jack.id, p.Target.id);
    expect(result.success).toBe(true);
    expect(p.Target.roleId).toBe('jack');
    expect(p.Target.curse.isTriggeredBy(p.Cursed.id)).toBe(true);
  });

  it('BH3.2 — curse transfers when the CHOSEN swap target was Jack (previously lost)', () => {
    const { game, p } = setup({
      Jack: 'jack', Victim: 'simpleCitizen', Cursed: 'simpleCitizen', GF: 'godfather',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    game.startNight();
    game.nightActions.jack = { actorIds: [p.Jack.id], targetId: p.Cursed.id };
    game.resolveNight();
    expect(p.Jack.curse.isTriggeredBy(p.Cursed.id)).toBe(true);

    // Victim (non-Jack) is voted out and swaps with Jack — Jack is the "chosen" param
    const result = game.applyLastActionCard(CARD.FACE_OFF, p.Victim.id, p.Jack.id);
    expect(result.success).toBe(true);
    expect(p.Victim.roleId).toBe('jack'); // Victim is now Jack
    expect(p.Victim.curse.isTriggeredBy(p.Cursed.id)).toBe(true); // curse followed the identity

    // The curse chain still fires correctly for the new Jack
    p.Cursed.kill(game.round, 'vote');
    expect(p.Victim.curse.isTriggeredBy(p.Cursed.id)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════
   BH4/BH5 — Persistence round trip
   ═══════════════════════════════════════════════════════════════ */
describe('BH4/BH5 — Save/reload persists in-progress night and setup state', () => {

  it('BH4.1 — nightActions/currentNightStep/nightSteps survive a toJSON/loadFromJSON round trip', () => {
    const { game, p } = setup({
      GF: 'godfather', Doc: 'drWatson',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    game.startNight();
    game.recordNightAction(p.SC1.id); // godfather picks a target (first night step)
    expect(game.currentNightStep).toBeGreaterThan(0);
    expect(Object.keys(game.nightActions).length).toBeGreaterThan(0);

    const snapshot = game.toJSON();
    const reloaded = new Game();
    reloaded.loadFromJSON(snapshot);

    expect(reloaded.currentNightStep).toBe(game.currentNightStep);
    expect(reloaded.nightSteps.length).toBe(game.nightSteps.length);
    expect(reloaded.nightActions).toEqual(game.nightActions);
    expect(reloaded.isNightComplete()).toBe(game.isNightComplete());
  });

  it('BH5.1 — desiredMafia/desiredCitizen survive a toJSON/loadFromJSON round trip', () => {
    const game = new Game();
    for (let i = 0; i < 10; i++) game.addPlayer(`P${i}`);
    game.setDesiredMafia(3);
    expect(game.desiredMafia).toBe(3);

    const snapshot = game.toJSON();
    const reloaded = new Game();
    reloaded.loadFromJSON(snapshot);

    expect(reloaded.desiredMafia).toBe(3);
    expect(reloaded.desiredCitizen).toBe(game.desiredCitizen);
  });
});

/* ═══════════════════════════════════════════════════════════════
   BH6 — Roster edits mid-manual-assignment cancel safely
   ═══════════════════════════════════════════════════════════════ */
describe('BH6 — Roster edit mid-manual-assignment cancels back to setup', () => {

  it('BH6.1 — removePlayer() while manualAssign is in progress cancels the flow', () => {
    const game = new Game();
    const names = ['P1','P2','P3','P4','P5','P6','P7','P8'];
    names.forEach(n => game.addPlayer(n));
    game.setSelectedRoles({ godfather: 1, drWatson: 1, detective: 1, simpleCitizen: 5 });
    game.startManualAssignment();
    game.assignManualRole('godfather');
    game.assignManualRole('drWatson');
    expect(game.phase).toBe('manualAssign');

    game.removePlayer(game.players[0].id);

    expect(game.phase).toBe('setup');
    expect(game.isManualAssignmentComplete()).toBe(false);
    expect(game.getManualRemainingRoles()).toEqual([]);
  });

  it('BH6.2 — addPlayer() while manualAssign is in progress cancels the flow', () => {
    const game = new Game();
    const names = ['P1','P2','P3','P4','P5','P6','P7','P8'];
    names.forEach(n => game.addPlayer(n));
    game.setSelectedRoles({ godfather: 1, drWatson: 1, detective: 1, simpleCitizen: 5 });
    game.startManualAssignment();
    game.assignManualRole('godfather');
    expect(game.phase).toBe('manualAssign');

    game.addPlayer('P9');

    expect(game.phase).toBe('setup');
    expect(game.isManualAssignmentComplete()).toBe(false);
  });

  it('BH6.3 — restarting manual assignment after a cancel works cleanly', () => {
    const game = new Game();
    const names = ['P1','P2','P3','P4','P5','P6','P7','P8'];
    names.forEach(n => game.addPlayer(n));
    game.setSelectedRoles({ godfather: 1, drWatson: 1, detective: 1, simpleCitizen: 5 });
    game.startManualAssignment();
    game.assignManualRole('godfather');
    game.removePlayer(game.players[1].id); // cancels

    game.addPlayer('P9'); // back to 8 players
    game.startManualAssignment();
    expect(game.getManualRemainingRoles().reduce((s, r) => s + r.count, 0)).toBe(8);
    expect(game.getManualCurrentPlayer().name).toBe('P1');
  });
});

/* ═══════════════════════════════════════════════════════════════
   BH7/BH8 — Gunner bullet pool integrity
   ═══════════════════════════════════════════════════════════════ */
describe('BH7/BH8 — Bullets are returned to the pool on every death path', () => {

  it('BH7.1 — Final Shoot kill returns the target\'s gunner bullet', () => {
    const { game, p } = setup({
      GF: 'godfather', Gunner: 'gunner', Target: 'simpleCitizen',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    game.bulletManager.init(2, 2);
    game.bulletManager.giveBullet(p.Target.id, 'live', 1);
    expect(game.bulletManager.liveRemaining).toBe(1);

    const result = game.applyLastActionCard(CARD.FINAL_SHOOT, p.GF.id, p.Target.id);
    expect(result.success).toBe(true);
    expect(result.died).toBe(true);
    expect(game.bulletManager.getPlayerBullet(p.Target.id)).toBeNull();
    expect(game.bulletManager.liveRemaining).toBe(2); // returned to pool
  });

  it('BH8.1 — Jack\'s bullet is returned when a cowboy-triggered curse chain kills him', () => {
    const { game, p } = setup({
      Jack: 'jack', Cowboy: 'cowboy', Cursed: 'simpleMafia',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    game.bulletManager.init(2, 2);
    game.bulletManager.giveBullet(p.Jack.id, 'blank', 1);

    game.startNight();
    game.nightActions.jack = { actorIds: [p.Jack.id], targetId: p.Cursed.id };
    game.resolveNight();
    expect(p.Jack.curse.isTriggeredBy(p.Cursed.id)).toBe(true);

    const result = game.resolveCowboyAction(p.Cursed.id); // mafia target -> killed
    expect(result.killed).toBe(true);
    expect(result.jackCurseTriggered).toBe(true);
    expect(p.Jack.isAlive).toBe(false);
    expect(game.bulletManager.getPlayerBullet(p.Jack.id)).toBeNull();
    expect(game.bulletManager.blankRemaining).toBe(2);
  });

  it('BH8.2 — Jack\'s bullet is returned when a morning-shot-triggered curse chain kills him', () => {
    const { game, p } = setup({
      Jack: 'jack', Shooter: 'simpleCitizen', Cursed: 'simpleCitizen',
      GF: 'godfather', SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
    });
    game.bulletManager.init(2, 2);
    game.bulletManager.giveBullet(p.Jack.id, 'live', 1);
    game.bulletManager.giveBullet(p.Shooter.id, 'live', 1);

    game.startNight();
    game.nightActions.jack = { actorIds: [p.Jack.id], targetId: p.Cursed.id };
    game.resolveNight();
    expect(p.Jack.curse.isTriggeredBy(p.Cursed.id)).toBe(true);

    const shotResult = game.resolveMorningShot(p.Shooter.id, p.Cursed.id);
    expect(shotResult.killed).toBe(true);
    expect(shotResult.jackCurseTriggered).toBe(true);
    expect(p.Jack.isAlive).toBe(false);
    expect(game.bulletManager.getPlayerBullet(p.Jack.id)).toBeNull();
  });

  it('BH8.3 — Jack\'s bullet is returned when a live-bullet-expiration curse chain kills him', () => {
    const { game, p } = setup({
      Jack: 'jack', Holder: 'simpleCitizen', GF: 'godfather',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
    });
    game.bulletManager.init(2, 2);
    game.bulletManager.giveBullet(p.Jack.id, 'blank', 1);
    game.bulletManager.giveBullet(p.Holder.id, 'live', 1); // never fired -> expires

    game.startNight();
    game.nightActions.jack = { actorIds: [p.Jack.id], targetId: p.Holder.id };
    game.resolveNight();
    expect(p.Jack.curse.isTriggeredBy(p.Holder.id)).toBe(true);

    const explosions = game.resolveLiveExpiration();
    expect(explosions.some(e => e.holderId === p.Holder.id)).toBe(true);
    expect(explosions.some(e => e.curseChain && e.holderId === p.Jack.id)).toBe(true);
    expect(p.Jack.isAlive).toBe(false);
  });

  it('BH8.4 — Jack\'s bullet is returned when a Face Off curse chain kills him', () => {
    const { game, p } = setup({
      Jack: 'jack', Victim: 'simpleCitizen', Cursed: 'simpleCitizen', GF: 'godfather',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    game.bulletManager.init(2, 2);
    game.bulletManager.giveBullet(p.Jack.id, 'live', 1);

    game.startNight();
    game.nightActions.jack = { actorIds: [p.Jack.id], targetId: p.Victim.id };
    game.resolveNight();
    expect(p.Jack.curse.isTriggeredBy(p.Victim.id)).toBe(true);

    // Victim (the cursed target) is voted out and does a Face Off swap -> Jack dies immediately
    const result = game.applyLastActionCard(CARD.FACE_OFF, p.Victim.id, p.Cursed.id);
    expect(result.jackCurseTriggered).toBe(true);
    expect(p.Jack.isAlive).toBe(false);
    expect(game.bulletManager.getPlayerBullet(p.Jack.id)).toBeNull();
    expect(game.bulletManager.liveRemaining).toBe(2);
  });
});
