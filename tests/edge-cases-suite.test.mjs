/**
 * edge-cases-suite.test.mjs
 *
 * Exhaustive edge-case tests for:
 *   EC1  — Last action: FINAL_SHOOT card
 *   EC2  — Last action: SKIP_NIGHT and REVEAL cards
 *   EC3  — Last action: BEAUTIFUL_MIND card
 *   EC4  — Last action: FACE_OFF card
 *   EC5  — Morning shots (blank, live, shield, healed, Jack, zodiac)
 *   EC6  — Bullet / gunner mechanics (give, use, expire, return)
 *   EC7  — Bomb determination (guardian, target, skip, defuse)
 *   EC8  — Negotiator mechanics (recruit, fail, one-time, canNegotiate)
 *   EC9  — Kane mechanics (target types, pending death, Jack reveal)
 *   EC10 — Framason contamination full flow
 *   EC11 — Constantine revive
 *   EC12 — Doctor self-heal limits (drWatson + drLecter)
 *   EC13 — Serialization round-trip
 *   EC14 — God corrections (godKill / godRevive)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../js/models/Game.js';
import { Roles } from '../js/models/Roles.js';
import { CARD } from '../js/models/LastActionManager.js';

/* ─── Helpers ─────────────────────────────────────────────── */

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

/** Force exactly one card to remain drawable */
function forceCard(game, cardId) {
  game.lastActionManager.cards.forEach(c => {
    c.used = (c.id !== cardId);
  });
  const target = game.lastActionManager.cards.find(c => c.id === cardId);
  if (target) target.used = false;
}

/** Exhaust all last-action cards */
function exhaustCards(game) {
  game.lastActionManager.cards.forEach(c => { c.used = true; });
}

const alive = pl => pl.isAlive;
const dead  = pl => !pl.isAlive;

/* ═══════════════════════════════════════════════════════════
   EC1 — Last Action: FINAL_SHOOT
   ═══════════════════════════════════════════════════════════ */
describe('EC1 — Last action: FINAL_SHOOT', () => {
  it('EC1.1 — FINAL_SHOOT kills mafia target; sets lastActionBlockMafiaShoot', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();
    exhaustCards(game);
    forceCard(game, CARD.FINAL_SHOOT);
    game.eliminateByVote(p.SC1.id);
    const drawn = game.drawLastActionFor(p.SC1.id);
    expect(drawn?.card?.id).toBe(CARD.FINAL_SHOOT);
    const result = game.applyLastActionCard(drawn.card.id, p.SC1.id, p.SM.id);
    expect(result.success).toBe(true);
    expect(dead(p.SM)).toBe(true);
    expect(game.lastActionBlockMafiaShoot).toBe(true);
  });

  it('EC1.2 — FINAL_SHOOT on Jack → Jack immune; block NOT set (early return for shootImmune)', () => {
    const { game, p } = setup({
      GF: 'godfather', Jack: 'jack',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();
    exhaustCards(game);
    forceCard(game, CARD.FINAL_SHOOT);
    game.eliminateByVote(p.SC1.id);
    const drawn = game.drawLastActionFor(p.SC1.id);
    const result = game.applyLastActionCard(drawn.card.id, p.SC1.id, p.Jack.id);
    expect(alive(p.Jack)).toBe(true); // Jack immune (shootImmune)
    expect(result.success).toBe(false);
    expect(result.reason).toBe('immune');
    // Block is NOT set when target is immune (early return before tryKill)
    expect(game.lastActionBlockMafiaShoot).toBe(false);
  });

  it('EC1.3 — FINAL_SHOOT on shielded GF → shield absorbs; GF survives; block set', () => {
    const { game, p } = setup({
      GF: 'godfather',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen', SC7: 'simpleCitizen',
    });
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();
    forceCard(game, CARD.FINAL_SHOOT);
    game.eliminateByVote(p.SC1.id);
    const drawn = game.drawLastActionFor(p.SC1.id);
    game.applyLastActionCard(drawn.card.id, p.SC1.id, p.GF.id);
    expect(alive(p.GF)).toBe(true);       // shield absorbed the shot
    expect(p.GF.shield.isActive).toBe(false); // shield consumed
    expect(game.lastActionBlockMafiaShoot).toBe(true);
  });

  it('EC1.4 — lastActionBlockMafiaShoot causes GF to be absent from next night steps', () => {
    const { game, p } = setup({
      GF: 'godfather',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen', SC7: 'simpleCitizen',
    });
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();
    forceCard(game, CARD.FINAL_SHOOT);
    game.eliminateByVote(p.SC1.id);
    const drawn = game.drawLastActionFor(p.SC1.id);
    game.applyLastActionCard(drawn.card.id, p.SC1.id, p.SC3.id);
    // Next night startNight() → builds steps (GF blocked) → clears flag
    game.startNight();
    expect(game.nightSteps.some(s => s.roleId === 'godfather')).toBe(false);
    expect(game.lastActionBlockMafiaShoot).toBe(false); // flag cleared after building
  });

  it('EC1.5 — FINAL_SHOOT on healed player → survives; block NOT set (healed early return)', () => {
    const { game, p } = setup({
      GF: 'godfather', DW: 'drWatson',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();
    forceCard(game, CARD.FINAL_SHOOT);
    game.eliminateByVote(p.SC1.id);
    const drawn = game.drawLastActionFor(p.SC1.id);
    // Mark SC3 as healed (simulating night heal that persists to day)
    p.SC3.healed = true;
    const result = game.applyLastActionCard(drawn.card.id, p.SC1.id, p.SC3.id);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('healed');
    expect(alive(p.SC3)).toBe(true);
    // Block is NOT set when target is healed (early return before tryKill)
    expect(game.lastActionBlockMafiaShoot).toBe(false);
  });
});

/* ═══════════════════════════════════════════════════════════
   EC2 — Last Action: SKIP_NIGHT and REVEAL
   ═══════════════════════════════════════════════════════════ */
describe('EC2 — Last action: SKIP_NIGHT and REVEAL', () => {
  it('EC2.1 — SKIP_NIGHT card sets lastActionSkipNight=true', () => {
    const { game, p } = setup({
      GF: 'godfather',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen', SC7: 'simpleCitizen',
    });
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();
    forceCard(game, CARD.SKIP_NIGHT);
    game.eliminateByVote(p.SC1.id);
    game.drawLastActionFor(p.SC1.id);
    expect(game.lastActionSkipNight).toBe(true);
  });

  it('EC2.2 — REVEAL card makes victim not revivable (auto-resolved in drawLastActionFor)', () => {
    const { game, p } = setup({
      GF: 'godfather',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen', SC7: 'simpleCitizen',
    });
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();
    forceCard(game, CARD.REVEAL);
    game.eliminateByVote(p.SC1.id);
    // REVEAL is auto-resolved inside drawLastActionFor, must call it explicitly
    game.drawLastActionFor(p.SC1.id);
    expect(p.SC1.isRevivable).toBe(false); // set by drawLastActionFor auto-resolve
  });

  it('EC2.3 — REVEAL card prevents Constantine revive (via night action)', () => {
    const { game, p } = setup({
      GF: 'godfather', Con: 'constantine',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();
    forceCard(game, CARD.REVEAL);
    game.eliminateByVote(p.SC1.id);
    game.drawLastActionFor(p.SC1.id); // auto-resolves REVEAL: SC1.isRevivable=false
    expect(p.SC1.isRevivable).toBe(false);
    game.startDay();
    // Constantine tries to revive SC1 via night action → SC1 is not revivable
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC3.id, actionType: 'shoot', mode: 'shoot' },
      constantine: { actorIds: [p.Con.id], targetId: p.SC1.id, actionType: 'revive' },
    });
    // SC1 is not in revivable players list → constantine action should fail or be skipped
    expect(dead(p.SC1)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════
   EC3 — Last Action: BEAUTIFUL_MIND
   ═══════════════════════════════════════════════════════════ */
describe('EC3 — Last action: BEAUTIFUL_MIND', () => {
  it('EC3.1 — Guess zodiac → zodiac dies, victim revived', () => {
    const { game, p } = setup({
      GF: 'godfather', Zod: 'zodiac',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();
    forceCard(game, CARD.BEAUTIFUL_MIND);
    game.eliminateByVote(p.SC1.id);
    const drawn = game.drawLastActionFor(p.SC1.id);
    expect(drawn?.card?.id).toBe(CARD.BEAUTIFUL_MIND);
    const result = game.applyLastActionCard(drawn.card.id, p.SC1.id, p.Zod.id);
    expect(result.success).toBe(true);
    expect(dead(p.Zod)).toBe(true);   // zodiac killed
    expect(alive(p.SC1)).toBe(true);  // victim revived
  });

  it('EC3.2 — Guess Jack → Jack immune, victim not revived', () => {
    const { game, p } = setup({
      GF: 'godfather', Jack: 'jack',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();
    forceCard(game, CARD.BEAUTIFUL_MIND);
    game.eliminateByVote(p.SC1.id);
    game.drawLastActionFor(p.SC1.id);
    const result = game.applyLastActionCard(CARD.BEAUTIFUL_MIND, p.SC1.id, p.Jack.id);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('immune');
    expect(alive(p.Jack)).toBe(true); // Jack immune
    expect(dead(p.SC1)).toBe(true);   // victim NOT revived
  });

  it('EC3.3 — Guess citizen → wrong guess, victim not revived', () => {
    const { game, p } = setup({
      GF: 'godfather', Zod: 'zodiac',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();
    forceCard(game, CARD.BEAUTIFUL_MIND);
    game.eliminateByVote(p.SC1.id);
    game.drawLastActionFor(p.SC1.id);
    const result = game.applyLastActionCard(CARD.BEAUTIFUL_MIND, p.SC1.id, p.SC3.id);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('wrong');
    expect(dead(p.SC1)).toBe(true); // not revived
  });

  it('EC3.4 — BEAUTIFUL_MIND auto-discarded when mafia is voted out', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Zod: 'zodiac',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();
    forceCard(game, CARD.BEAUTIFUL_MIND);
    game.eliminateByVote(p.SM.id); // SM is mafia → BM auto-discarded
    const drawn = game.drawLastActionFor(p.SM.id);
    expect(drawn?.id).not.toBe(CARD.BEAUTIFUL_MIND); // BM discarded → another card or null
  });

  it('EC3.5 — BEAUTIFUL_MIND auto-discarded when no vulnerable independent', () => {
    const { game, p } = setup({
      GF: 'godfather',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen', SC7: 'simpleCitizen',
    });
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();
    forceCard(game, CARD.BEAUTIFUL_MIND); // only BM left
    game.eliminateByVote(p.SC1.id);
    // No independent in game → BM auto-discarded → null (no other cards)
    const drawn = game.drawLastActionFor(p.SC1.id);
    expect(drawn).toBeNull();
  });
});

/* ═══════════════════════════════════════════════════════════
   EC4 — Last Action: FACE_OFF
   ═══════════════════════════════════════════════════════════ */
describe('EC4 — Last action: FACE_OFF', () => {
  it('EC4.1 — FACE_OFF swaps roles between victim and chosen', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();
    forceCard(game, CARD.FACE_OFF);
    game.eliminateByVote(p.SC1.id);
    const drawn = game.drawLastActionFor(p.SC1.id);
    expect(drawn?.card?.id).toBe(CARD.FACE_OFF);
    const result = game.applyLastActionCard(drawn.card.id, p.SC1.id, p.SM.id);
    // Victim (SC1) was simpleCitizen, chosen (SM) was simpleMafia → roles swapped
    expect(result.success).toBe(true);
    expect(p.SC1.roleId).toBe('simpleMafia');   // victim gets SM's role
    expect(p.SM.roleId).toBe('simpleCitizen');   // chosen gets SC1's role
  });

  it('EC4.2 — FACE_OFF victim is not revivable after swap', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();
    forceCard(game, CARD.FACE_OFF);
    game.eliminateByVote(p.SC1.id);
    const drawn = game.drawLastActionFor(p.SC1.id);
    game.applyLastActionCard(drawn.card.id, p.SC1.id, p.SM.id);
    expect(p.SC1.isRevivable).toBe(false);
  });

  it('EC4.3 — FACE_OFF transfers victim shield to chosen', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    // Vote out GF (shield owner), do face-off: victim=GF, chosen=SM
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();
    forceCard(game, CARD.FACE_OFF);
    game.eliminateByVote(p.GF.id); // GF voted out
    const drawn = game.drawLastActionFor(p.GF.id);
    const result = game.applyLastActionCard(drawn.card.id, p.GF.id, p.SM.id);
    // GF's shield should transfer to SM
    expect(result.success).toBe(true);
    expect(p.SM.shield?.isActive).toBe(true); // SM received GF's shield
  });

  it('EC4.4 — FACE_OFF: victim not revivable; roles swapped correctly with 3 players', () => {
    // Simplified version: just verify roles swap and isRevivable=false
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Det: 'detective',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();
    forceCard(game, CARD.FACE_OFF);
    game.eliminateByVote(p.Det.id); // Vote out detective
    const drawn = game.drawLastActionFor(p.Det.id);
    const result = game.applyLastActionCard(drawn.card.id, p.Det.id, p.SM.id);
    // Detective (citizen) role swapped with SM (simpleMafia)
    expect(result.success).toBe(true);
    expect(p.Det.roleId).toBe('simpleMafia');
    expect(p.SM.roleId).toBe('detective');
    expect(p.Det.isRevivable).toBe(false);
  });
});

/* ═══════════════════════════════════════════════════════════
   EC5 — Morning Shots
   ═══════════════════════════════════════════════════════════ */
describe('EC5 — Morning shots', () => {
  it('EC5.1 — Blank morning shot: target lives', () => {
    const { game, p } = setup({
      GF: 'godfather',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen', SC7: 'simpleCitizen',
    });
    // Initialize gunner / give blank bullet to SC1 via bulletManager
    game.bulletManager.init(1, 0); // 1 blank, 0 live
    game.bulletManager.giveBullet(p.SC1.id, 'blank', 1);
    const result = game.resolveMorningShot(p.SC1.id, p.SC2.id);
    expect(result.type).toBe('blank');
    expect(alive(p.SC2)).toBe(true);
  });

  it('EC5.2 — Live morning shot: target dies', () => {
    const { game, p } = setup({
      GF: 'godfather',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen', SC7: 'simpleCitizen',
    });
    game.bulletManager.init(0, 1); // 0 blank, 1 live
    game.bulletManager.giveBullet(p.SC1.id, 'live', 1);
    const result = game.resolveMorningShot(p.SC1.id, p.SC2.id);
    expect(result.type).toBe('live');
    expect(dead(p.SC2)).toBe(true);
  });

  it('EC5.3 — Live morning shot on healed target: target survives', () => {
    const { game, p } = setup({
      GF: 'godfather', DW: 'drWatson',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    game.bulletManager.init(0, 1);
    game.bulletManager.giveBullet(p.SC1.id, 'live', 1);
    // Mark SC2 as healed (persists from night)
    p.SC2.healed = true;
    const result = game.resolveMorningShot(p.SC1.id, p.SC2.id);
    expect(result.type).toBe('live');
    expect(alive(p.SC2)).toBe(true); // healed → saved
    expect(result.stoppedBy).toBe('healed');
  });

  it('EC5.4 — Live morning shot on Jack: Jack lives, curse locks', () => {
    const { game, p } = setup({
      GF: 'godfather', Jack: 'jack',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    game.bulletManager.init(0, 1);
    game.bulletManager.giveBullet(p.SC1.id, 'live', 1);
    const result = game.resolveMorningShot(p.SC1.id, p.Jack.id);
    expect(alive(p.Jack)).toBe(true);          // Jack immune to morning shot
    expect(result.stoppedBy).toBe('jack');     // stopped by Jack immunity
    expect(p.Jack.curse.isLocked).toBe(true);  // curse locked
  });

  it('EC5.5 — Live morning shot on shielded GF: shield absorbs', () => {
    const { game, p } = setup({
      GF: 'godfather',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen', SC7: 'simpleCitizen',
    });
    game.bulletManager.init(0, 1);
    game.bulletManager.giveBullet(p.SC1.id, 'live', 1);
    const result = game.resolveMorningShot(p.SC1.id, p.GF.id);
    expect(alive(p.GF)).toBe(true);             // shield absorbed
    expect(result.stoppedBy).toBe('shield');    // stopped by shield
    expect(p.GF.shield.isActive).toBe(false);   // shield consumed
  });

  it('EC5.6 — Live morning shot on Zodiac: Zodiac dies', () => {
    const { game, p } = setup({
      GF: 'godfather', Zod: 'zodiac',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    game.bulletManager.init(0, 1);
    game.bulletManager.giveBullet(p.SC1.id, 'live', 1);
    const result = game.resolveMorningShot(p.SC1.id, p.Zod.id);
    expect(dead(p.Zod)).toBe(true); // zodiac dies from morning_shot
  });
});

/* ═══════════════════════════════════════════════════════════
   EC6 — Bullet / Gunner Mechanics
   ═══════════════════════════════════════════════════════════ */
describe('EC6 — Bullet/gunner mechanics', () => {
  it('EC6.1 — Live bullet expires at voting → holder dies', () => {
    const { game, p } = setup({
      GF: 'godfather', Gun: 'gunner',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    game.bulletManager.init(1, 1);
    // Give SC1 a live bullet (simulating gunner distributing)
    game.bulletManager.giveBullet(p.SC1.id, 'live', 1);
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();
    // SC1 didn't use their bullet → expires at voting phase
    const explosions = game.resolveLiveExpiration();
    // Returns array of {holderId, holderName} for each exploded bullet
    expect(explosions.some(e => e.holderId === p.SC1.id)).toBe(true);
    expect(dead(p.SC1)).toBe(true);
  });

  it('EC6.2 — Blank bullet discarded silently on expiration', () => {
    const { game, p } = setup({
      GF: 'godfather', Gun: 'gunner',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    game.bulletManager.init(1, 1);
    game.bulletManager.giveBullet(p.SC1.id, 'blank', 1);
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();
    const explosions = game.resolveLiveExpiration();
    // Blanks don't explode → empty explosions array, SC1 alive
    expect(explosions.some(e => e.holderId === p.SC1.id)).toBe(false);
    expect(alive(p.SC1)).toBe(true); // blank → no explosion
  });

  it('EC6.3 — giveBullet returns false when no bullets of that type remain', () => {
    const { game, p } = setup({
      GF: 'godfather', Gun: 'gunner',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    game.bulletManager.init(0, 1); // only 1 live
    game.bulletManager.giveBullet(p.SC1.id, 'live', 1); // uses the 1 live
    const second = game.bulletManager.giveBullet(p.SC2.id, 'live', 1); // none left
    expect(second).toBe(false);
  });

  it('EC6.4 — Used bullet removed from active list; expiration skips it', () => {
    const { game, p } = setup({
      GF: 'godfather', Gun: 'gunner',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    game.bulletManager.init(0, 1);
    game.bulletManager.giveBullet(p.SC1.id, 'live', 1);
    // SC1 uses their bullet (morning shot)
    game.bulletManager.useBullet(p.SC1.id);
    const explosions = game.resolveLiveExpiration();
    // Bullet was used → not in active list → no explosion
    expect(explosions.some(e => e.holderId === p.SC1.id)).toBe(false);
  });
});

/* ═══════════════════════════════════════════════════════════
   EC7 — Bomb Determination
   ═══════════════════════════════════════════════════════════ */
describe('EC7 — Bomb determination', () => {
  it('EC7.1 — Bodyguard correct guess defuses bomb; BG survives', () => {
    const { game, p } = setup({
      GF: 'godfather', Bmb: 'bomber', BG: 'bodyguard',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      bomber:    { actorIds: [p.Bmb.id], targetId: p.SC2.id, actionType: 'bomb', bombPassword: 3 },
    });
    game.startDay();
    game.startBombSiesta();
    const result = game.bombGuardianGuess(3); // correct password
    expect(result.result).toBe('defused');
    expect(alive(p.BG)).toBe(true);
    expect(alive(p.SC2)).toBe(true);
  });

  it('EC7.2 — Bodyguard wrong guess; BG dies, target survives bomb', () => {
    const { game, p } = setup({
      GF: 'godfather', Bmb: 'bomber', BG: 'bodyguard',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      bomber:    { actorIds: [p.Bmb.id], targetId: p.SC2.id, actionType: 'bomb', bombPassword: 3 },
    });
    game.startDay();
    game.startBombSiesta();
    const result = game.bombGuardianGuess(1); // wrong
    expect(result.result).toBe('wrong');
    expect(dead(p.BG)).toBe(true);  // BG dies instead
    expect(alive(p.SC2)).toBe(true); // target survives
  });

  it('EC7.3 — No bodyguard: target correct guess defuses bomb', () => {
    const { game, p } = setup({
      GF: 'godfather', Bmb: 'bomber',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      bomber:    { actorIds: [p.Bmb.id], targetId: p.SC2.id, actionType: 'bomb', bombPassword: 2 },
    });
    game.startDay();
    game.startBombSiesta();
    const result = game.bombTargetGuess(2); // correct
    expect(result.result).toBe('defused');
    expect(alive(p.SC2)).toBe(true);
  });

  it('EC7.4 — No bodyguard: target wrong guess; target dies', () => {
    const { game, p } = setup({
      GF: 'godfather', Bmb: 'bomber',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      bomber:    { actorIds: [p.Bmb.id], targetId: p.SC2.id, actionType: 'bomb', bombPassword: 2 },
    });
    game.startDay();
    game.startBombSiesta();
    const result = game.bombTargetGuess(4); // wrong
    expect(result.result).toBe('exploded');
    expect(dead(p.SC2)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════
   EC8 — Negotiator Mechanics
   ═══════════════════════════════════════════════════════════ */
describe('EC8 — Negotiator mechanics', () => {
  it('EC8.1 — Recruit simpleCitizen → success; roleId changes to simpleMafia', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Neg: 'negotiator',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const r = nightRound(game, {
      negotiator: { actorIds: [p.Neg.id], targetId: p.SC1.id, actionType: 'negotiate' },
    });
    expect(r.negotiated?.success).toBe(true);
    expect(p.SC1.roleId).toBe('simpleMafia');
  });

  it('EC8.2 — Recruit suspect → success; suspect becomes simpleMafia', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Neg: 'negotiator',
      Sus: 'suspect', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    const r = nightRound(game, {
      negotiator: { actorIds: [p.Neg.id], targetId: p.Sus.id, actionType: 'negotiate' },
    });
    expect(r.negotiated?.success).toBe(true);
    expect(p.Sus.roleId).toBe('simpleMafia');
  });

  it('EC8.3 — Recruit detective → fails; detective keeps roleId', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Neg: 'negotiator',
      Det: 'detective', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    const r = nightRound(game, {
      negotiator: { actorIds: [p.Neg.id], targetId: p.Det.id, actionType: 'negotiate' },
    });
    expect(r.negotiated?.success).toBe(false);
    expect(p.Det.roleId).toBe('detective');
  });

  it('EC8.4 — After successful negotiation, canNegotiate returns false', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Neg: 'negotiator',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    nightRound(game, {
      negotiator: { actorIds: [p.Neg.id], targetId: p.SC1.id, actionType: 'negotiate' },
    });
    game.startDay();
    expect(game.canNegotiate()).toBe(false);
  });

  it('EC8.5 — After failed negotiation, _negotiationUsed=true; negotiator not in next steps', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Neg: 'negotiator',
      Det: 'detective', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    nightRound(game, {
      negotiator: { actorIds: [p.Neg.id], targetId: p.Det.id, actionType: 'negotiate' },
    });
    game.startDay();
    game.startNight();
    expect(game.nightSteps.some(s => s.roleId === 'negotiator')).toBe(false);
  });

  it('EC8.6 — canNegotiate false when mafia count > threshold (default=2)', () => {
    const { game, p } = setup({
      GF: 'godfather', SM1: 'simpleMafia', SM2: 'simpleMafia', SM3: 'simpleMafia', Neg: 'negotiator',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    // 4 mafia alive > threshold (2)
    expect(game.canNegotiate()).toBe(false);
  });
});

/* ═══════════════════════════════════════════════════════════
   EC9 — Kane Mechanics
   ═══════════════════════════════════════════════════════════ */
describe('EC9 — Kane mechanics', () => {
  it('EC9.1 — Kane targets mafia → kaneReveal object announced, kanePendingDeath=true', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Kane: 'kane',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      kane:      { actorIds: [p.Kane.id], targetId: p.SM.id, actionType: 'reveal' },
    });
    // kaneReveal is an object {targetId, targetName, roleName, roleIcon}
    expect(r.kaneReveal?.targetId).toBe(p.SM.id);
    expect(game._kanePendingDeath).toBe(true);
  });

  it('EC9.2 — Kane targets citizen → kaneReveal null, ability consumed', () => {
    const { game, p } = setup({
      GF: 'godfather', Kane: 'kane',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      kane:      { actorIds: [p.Kane.id], targetId: p.SC2.id, actionType: 'reveal' },
    });
    expect(r.kaneReveal).toBeFalsy(); // citizen → no reveal
    expect(game._kanePendingDeath).toBe(false);
    expect(game._kaneUsed).toBe(true); // ability consumed
  });

  it('EC9.3 — Kane pending death → Kane dies at start of next resolveNight', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Kane: 'kane',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      kane:      { actorIds: [p.Kane.id], targetId: p.SM.id, actionType: 'reveal' },
    });
    expect(game._kanePendingDeath).toBe(true);
    game.startDay();
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
    });
    expect(dead(p.Kane)).toBe(true); // Kane died at start of night 2
  });

  it('EC9.4 — Kane absent from night steps when kanePendingDeath=true', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Kane: 'kane',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      kane:      { actorIds: [p.Kane.id], targetId: p.SM.id, actionType: 'reveal' },
    });
    game.startDay();
    game.startNight();
    expect(game.nightSteps.some(s => s.roleId === 'kane')).toBe(false);
  });

  it('EC9.5 — Kane targets mafia that dies same night → kaneUsed reset (ability returns)', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Kane: 'kane', Snp: 'sniper',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen',
    });
    // Sniper also shoots SM → SM dies same night; Kane's ability resets
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      sniper:    { actorIds: [p.Snp.id], targetId: p.SM.id, actionType: 'snipe' },
      kane:      { actorIds: [p.Kane.id], targetId: p.SM.id, actionType: 'reveal' },
    });
    // SM died from sniper → Kane's pending death is cleared
    expect(dead(p.SM)).toBe(true);
    expect(game._kanePendingDeath).toBe(false); // ability returned
    expect(game._kaneUsed).toBe(false);
  });

  it('EC9.6 — Kane reveals Jack (independent) → Jack curse locked, ability consumed, pending death=true', () => {
    const { game, p } = setup({
      GF: 'godfather', Jack: 'jack', Kane: 'kane',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      kane:      { actorIds: [p.Kane.id], targetId: p.Jack.id, actionType: 'reveal' },
    });
    // Jack is independent → kaneReveal object set, _kanePendingDeath=true, kaneUsed=true
    // Kane also locks Jack's curse when targeting Jack
    expect(alive(p.Jack)).toBe(true);     // Jack not killed by Kane reveal
    expect(game._kaneUsed).toBe(true);    // ability consumed
    expect(game._kanePendingDeath).toBe(true); // Kane will die next night
    expect(p.Jack.curse.isLocked).toBe(true);  // curse locked
  });
});

/* ═══════════════════════════════════════════════════════════
   EC10 — Framason Contamination Full Flow
   ═══════════════════════════════════════════════════════════ */
describe('EC10 — Framason contamination full flow', () => {
  it('EC10.1 — Recruit simpleCitizen → alliance grows, no contamination', () => {
    const { game, p } = setup({
      GF: 'godfather', Free: 'freemason',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    game.framason.init(p.Free.id, 2);
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      freemason: { actorIds: [p.Free.id], targetId: p.SC2.id, actionType: 'recruit' },
    });
    expect(r.framasonRecruit?.safe).toBe(true);
    expect(game.framason.isContaminated).toBe(false);
  });

  it('EC10.2 — Recruit mafia → contaminated=true', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Free: 'freemason',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    game.framason.init(p.Free.id, 2);
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      freemason: { actorIds: [p.Free.id], targetId: p.SM.id, actionType: 'recruit' },
    });
    expect(r.framasonRecruit?.safe).toBe(false);
    expect(r.framasonRecruit?.contaminated).toBe(true);
    expect(game.framason.isContaminated).toBe(true);
  });

  it('EC10.3 — Contamination resolution kills freemason leader', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Free: 'freemason',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    game.framason.init(p.Free.id, 2);
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      freemason: { actorIds: [p.Free.id], targetId: p.SM.id, actionType: 'recruit' },
    });
    game.startDay();
    const result = game.resolveFramasonContamination();
    expect(result.deadIds).toContain(p.Free.id);
    expect(dead(p.Free)).toBe(true);
  });

  it('EC10.4 — Bad mafia recruit is NOT killed by contamination; only alliance members die', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Free: 'freemason',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    game.framason.init(p.Free.id, 2);
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      freemason: { actorIds: [p.Free.id], targetId: p.SM.id, actionType: 'recruit' },
    });
    game.startDay();
    const result = game.resolveFramasonContamination();
    expect(result.deadIds).not.toContain(p.SM.id); // mafia recruit not killed
    expect(alive(p.SM)).toBe(true);
  });

  it('EC10.5 — Freemason contaminated → freemason absent from next night steps', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Free: 'freemason',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    game.framason.init(p.Free.id, 2);
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      freemason: { actorIds: [p.Free.id], targetId: p.SM.id, actionType: 'recruit' },
    });
    game.startDay();
    game.startNight();
    // When contaminated, freemason is skipped in nightSteps
    expect(game.nightSteps.some(s => s.roleId === 'freemason')).toBe(false);
  });
});

/* ═══════════════════════════════════════════════════════════
   EC11 — Constantine Revive
   ═══════════════════════════════════════════════════════════ */
describe('EC11 — Constantine revive', () => {
  it('EC11.1 — Constantine revives a dead revivable player via night action', () => {
    const { game, p } = setup({
      GF: 'godfather', Con: 'constantine',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    // Night 1: GF kills SC1
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
    });
    expect(dead(p.SC1)).toBe(true);
    game.startDay();
    // Night 2: Constantine revives SC1
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
      constantine: { actorIds: [p.Con.id], targetId: p.SC1.id, actionType: 'revive' },
    });
    expect(alive(p.SC1)).toBe(true);
    expect(r.revived).toBe(p.SC1.id);
  });

  it('EC11.2 — Constantine cannot revive salakhi victim (isRevivable=false)', () => {
    const { game, p } = setup({
      GF: 'godfather', Con: 'constantine',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    // Night 1: salakhi kills SC1 (isRevivable=false)
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'salakhi', guessedRoleId: 'simpleCitizen' },
    });
    expect(dead(p.SC1)).toBe(true);
    expect(p.SC1.isRevivable).toBe(false);
    game.startDay();
    // Night 2: Constantine tries to revive SC1 → SC1 not in getRevivablePlayers() → action silently skipped
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
      constantine: { actorIds: [p.Con.id], targetId: p.SC1.id, actionType: 'revive' },
    });
    expect(dead(p.SC1)).toBe(true); // SC1 NOT revived (not revivable)
    // r.revived may be undefined or null (action skipped for non-revivable)
    expect(r.revived).not.toBe(p.SC1.id);
  });

  it('EC11.3 — constantineUsed prevents second revive', () => {
    const { game, p } = setup({
      GF: 'godfather', Con: 'constantine',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    // Night 1: kill SC1
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();
    // Night 2: Constantine revives SC1 (first use)
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
      constantine: { actorIds: [p.Con.id], targetId: p.SC1.id, actionType: 'revive' },
    });
    expect(game.constantineUsed).toBe(true);
    expect(alive(p.SC1)).toBe(true);
    game.startDay();
    // Night 3: Constantine NOT in nightSteps (constantineUsed=true) so no revive action sent
    game.startNight();
    const hasConstantine = game.nightSteps.some(s => s.roleId === 'constantine');
    expect(hasConstantine).toBe(false); // Constantine absent from steps
    game.resolveNight({}); // no actions → SC3 safe
    expect(alive(p.SC3)).toBe(true); // SC3 not killed (no GF action sent either)
  });

  it('EC11.4 — After Constantine used, Constantine absent from night steps', () => {
    const { game, p } = setup({
      GF: 'godfather', Con: 'constantine',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    // Night 1: kill SC1, Constantine revives
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
      constantine: { actorIds: [p.Con.id], targetId: p.SC1.id, actionType: 'revive' },
    });
    expect(game.constantineUsed).toBe(true);
    game.startDay();
    // Night 3: Constantine should NOT be in nightSteps
    game.startNight();
    expect(game.nightSteps.some(s => s.roleId === 'constantine')).toBe(false);
  });
});

/* ═══════════════════════════════════════════════════════════
   EC12 — Doctor Self-Heal Limits
   ═══════════════════════════════════════════════════════════ */
describe('EC12 — Doctor self-heal limits', () => {
  it('EC12.1 — canDrWatsonHeal(self) true initially', () => {
    const { game, p } = setup({
      GF: 'godfather', DW: 'drWatson',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    expect(game.canDrWatsonHeal(p.DW.id)).toBe(true);
  });

  it('EC12.2 — canDrWatsonHeal(self) false after reaching max', () => {
    const { game, p } = setup({
      GF: 'godfather', DW: 'drWatson',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    game._drWatsonSelfHealCount = game.drWatsonSelfHealMax;
    expect(game.canDrWatsonHeal(p.DW.id)).toBe(false);
  });

  it('EC12.3 — canDrWatsonHeal(other) always true regardless of self-count', () => {
    const { game, p } = setup({
      GF: 'godfather', DW: 'drWatson',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    game._drWatsonSelfHealCount = game.drWatsonSelfHealMax;
    expect(game.canDrWatsonHeal(p.SC1.id)).toBe(true); // healing others unaffected
  });

  it('EC12.4 — Self-heal count increments after each drWatson self-heal night', () => {
    const { game, p } = setup({
      GF: 'godfather', DW: 'drWatson',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    expect(game._drWatsonSelfHealCount).toBe(0);
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      drWatson:  { actorIds: [p.DW.id], targetId: p.DW.id, actionType: 'heal' },
    });
    expect(game._drWatsonSelfHealCount).toBe(1);
    game.startDay();
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
      drWatson:  { actorIds: [p.DW.id], targetId: p.DW.id, actionType: 'heal' },
    });
    expect(game._drWatsonSelfHealCount).toBe(2);
  });

  it('EC12.5 — canDrLecterHeal(self) false after reaching max', () => {
    const { game, p } = setup({
      GF: 'godfather', DL: 'drLecter',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    game._drLecterSelfHealCount = game.drLecterSelfHealMax;
    expect(game.canDrLecterHeal(p.DL.id)).toBe(false);
  });
});

/* ═══════════════════════════════════════════════════════════
   EC13 — Serialization Round-Trip
   ═══════════════════════════════════════════════════════════ */
describe('EC13 — Serialization round-trip', () => {
  it('EC13.1 — toJSON/loadFromJSON preserves player count and round', () => {
    const { game, p } = setup({
      GF: 'godfather', Det: 'detective',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();
    const json = game.toJSON();
    const game2 = new Game();
    game2.loadFromJSON(json);
    expect(game2.players.length).toBe(game.players.length);
    expect(game2.round).toBe(game.round);
  });

  it('EC13.2 — toJSON/loadFromJSON preserves alive/dead status', () => {
    const { game, p } = setup({
      GF: 'godfather',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen', SC7: 'simpleCitizen',
    });
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
    });
    const json = game.toJSON();
    const game2 = new Game();
    game2.loadFromJSON(json);
    const sc1_in_2 = game2.getPlayer(p.SC1.id);
    expect(sc1_in_2.isAlive).toBe(false);
  });

  it('EC13.3 — Serialization preserves winner and phase', () => {
    const { game, p } = setup({
      GF: 'godfather',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen', SC7: 'simpleCitizen',
    });
    p.GF.kill(1, 'vote', false);
    game.checkWinCondition();
    const json = game.toJSON();
    const game2 = new Game();
    game2.loadFromJSON(json);
    expect(game2.winner).toBe('citizen');
    expect(game2.phase).toBe('ended');
  });
});

/* ═══════════════════════════════════════════════════════════
   EC14 — God Corrections (godKill / godRevive)
   ═══════════════════════════════════════════════════════════ */
describe('EC14 — God corrections', () => {
  it('EC14.1 — godKill kills a living player immediately', () => {
    const { game, p } = setup({
      GF: 'godfather',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen', SC7: 'simpleCitizen',
    });
    const result = game.godKill(p.SC1.id);
    expect(result.success).toBe(true);
    expect(dead(p.SC1)).toBe(true);
  });

  it('EC14.2 — godKill already-dead player returns success=false', () => {
    const { game, p } = setup({
      GF: 'godfather',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen', SC7: 'simpleCitizen',
    });
    p.SC1.kill(1, 'test', false);
    const result = game.godKill(p.SC1.id);
    expect(result.success).toBe(false);
  });

  it('EC14.3 — godRevive brings a dead player back', () => {
    const { game, p } = setup({
      GF: 'godfather',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen', SC7: 'simpleCitizen',
    });
    p.SC1.kill(1, 'test', false);
    expect(dead(p.SC1)).toBe(true);
    const result = game.godRevive(p.SC1.id);
    expect(result.success).toBe(true);
    expect(alive(p.SC1)).toBe(true);
  });
});
