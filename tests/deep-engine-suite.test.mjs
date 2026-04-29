/**
 * deep-engine-suite.test.mjs
 *
 * Exhaustive tests for core engine mechanics:
 *   DE1  — Shield absorption (which attacks bypass, which are absorbed)
 *   DE2  — Jack curse mechanics (place, clear, lock, trigger chain)
 *   DE3  — Salakhi mechanics (bypass shield, doctor, immunity)
 *   DE4  — Zodiac mechanics (immunity, bodyguard reflection, vote death)
 *   DE5  — Sniper mechanics (mafia kill, citizen penalty, independent waste)
 *   DE6  — Win conditions (all 6 win paths + no-win)
 *   DE7  — Handshake resolution (all pair team combos)
 *   DE8  — Voting mechanics (threshold, Jack immunity, tally, curse on vote)
 *   DE9  — Jadoogar block depth (blocks each role independently)
 *   DE10 — Detective investigation (all team outcomes, joker reversal, suspect)
 *   DE11 — Zodiac frequency setting (every/odd/even)
 *   DE12 — Night step building edge cases
 *   DE13 — Cowboy day ability (all target types, self-death, Jack curse)
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

/** Exhaust all last-action cards so they don't interfere */
function exhaustCards(game) {
  game.lastActionManager.cards.forEach(c => { c.used = true; });
}

const alive = pl => pl.isAlive;
const dead  = pl => !pl.isAlive;

/* ═══════════════════════════════════════════════════════════
   DE1 — Shield Absorption
   ═══════════════════════════════════════════════════════════ */
describe('DE1 — Shield absorption', () => {
  it('DE1.1 — Sniper absorbs into GF shield; GF survives first hit', () => {
    const { game, p } = setup({
      GF: 'godfather', Snp: 'sniper',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      sniper:    { actorIds: [p.Snp.id], targetId: p.GF.id, actionType: 'snipe' },
    });
    expect(alive(p.GF)).toBe(true);
    expect(r.shielded).toContain(p.GF.id);
    expect(p.GF.shield.isActive).toBe(false); // consumed
  });

  it('DE1.2 — GF shield consumed; second sniper shot kills', () => {
    const { game, p } = setup({
      GF: 'godfather', Snp: 'sniper',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    // Night 1: shield absorbs
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      sniper:    { actorIds: [p.Snp.id], targetId: p.GF.id, actionType: 'snipe' },
    });
    game.startDay();
    // Night 2: no shield → death
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
      sniper:    { actorIds: [p.Snp.id], targetId: p.GF.id, actionType: 'snipe' },
    });
    expect(dead(p.GF)).toBe(true);
  });

  it('DE1.3 — Salakhi bypasses GF shield', () => {
    const { game, p } = setup({
      GF: 'godfather', Snp: 'sniper',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    // GF salakhis sniper (who also has a shield); salakhi bypasses both shields
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.Snp.id, actionType: 'shoot', mode: 'salakhi', guessedRoleId: 'sniper' },
    });
    expect(dead(p.Snp)).toBe(true);  // salakhi kills despite sniper's shield
  });

  it('DE1.4 — Vote bypasses shield (direct kill, not tryKill)', () => {
    const { game, p } = setup({
      GF: 'godfather',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
      SC7: 'simpleCitizen',
    });
    exhaustCards(game);
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();
    game.eliminateByVote(p.GF.id);
    expect(dead(p.GF)).toBe(true); // vote kills GF even though shield is active
  });

  it('DE1.5 — Sniper has shield; mafia shoot absorbed first time', () => {
    const { game, p } = setup({
      GF: 'godfather', Snp: 'sniper',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.Snp.id, actionType: 'shoot', mode: 'shoot' },
    });
    expect(alive(p.Snp)).toBe(true);
    expect(r.shielded).toContain(p.Snp.id);
  });

  it('DE1.6 — Zodiac shot absorbed by GF shield', () => {
    const { game, p } = setup({
      GF: 'godfather', Zod: 'zodiac',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      zodiac:    { actorIds: [p.Zod.id], targetId: p.GF.id, actionType: 'kill' },
    });
    expect(alive(p.GF)).toBe(true);
    expect(r.shielded).toContain(p.GF.id);
  });

  it('DE1.7 — drWatson heal saves target from mafia shoot', () => {
    const { game, p } = setup({
      GF: 'godfather', DW: 'drWatson',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      drWatson:  { actorIds: [p.DW.id], targetId: p.SC1.id, actionType: 'heal' },
    });
    expect(alive(p.SC1)).toBe(true);
    expect(r.saved).toContain(p.SC1.id);
  });

  it('DE1.8 — Shield AND heal: heal takes priority; shield remains intact', () => {
    // When target is healed, mafia shoot path hits `target.healed` first and saves → shield not consumed
    const { game, p } = setup({
      GF: 'godfather', Snp: 'sniper', DW: 'drWatson',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    // Night 1: heal sniper from GF mafia shoot → sniper saved, shield NOT consumed
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.Snp.id, actionType: 'shoot', mode: 'shoot' },
      drWatson:  { actorIds: [p.DW.id], targetId: p.Snp.id, actionType: 'heal' },
    });
    expect(alive(p.Snp)).toBe(true);
    expect(p.Snp.shield.isActive).toBe(true); // shield still active (heal consumed, not shield)
  });
});

/* ═══════════════════════════════════════════════════════════
   DE2 — Jack Curse Mechanics
   ═══════════════════════════════════════════════════════════ */
describe('DE2 — Jack curse mechanics', () => {
  it('DE2.1 — Jack curses player; same night that player killed → Jack dies', () => {
    const { game, p } = setup({
      GF: 'godfather', Jack: 'jack',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      jack:      { actorIds: [p.Jack.id], targetId: p.SC1.id, actionType: 'curse' },
    });
    expect(dead(p.SC1)).toBe(true);
    expect(dead(p.Jack)).toBe(true);
    expect(r.jackCurseTriggered).toBe(true);
    expect(r.killed).toContain(p.Jack.id);
  });

  it('DE2.2 — Jack curses player; player saved by doctor → Jack lives', () => {
    const { game, p } = setup({
      GF: 'godfather', Jack: 'jack', DW: 'drWatson',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      drWatson:  { actorIds: [p.DW.id], targetId: p.SC1.id, actionType: 'heal' },
      jack:      { actorIds: [p.Jack.id], targetId: p.SC1.id, actionType: 'curse' },
    });
    expect(alive(p.SC1)).toBe(true);  // saved by doctor
    expect(alive(p.Jack)).toBe(true); // curse not triggered (SC1 didn't die)
    expect(r.jackCurseTriggered).toBe(false);
  });

  it('DE2.3 — Curse clears each night; Jack can curse new player', () => {
    const { game, p } = setup({
      GF: 'godfather', Jack: 'jack',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC3.id, actionType: 'shoot', mode: 'shoot' },
      jack:      { actorIds: [p.Jack.id], targetId: p.SC1.id, actionType: 'curse' },
    });
    game.startDay();
    // Night 2: curse cleared, Jack can curse SC2 now
    const r2 = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC4.id, actionType: 'shoot', mode: 'shoot' },
      jack:      { actorIds: [p.Jack.id], targetId: p.SC2.id, actionType: 'curse' },
    });
    expect(p.Jack.curse.targetId).toBe(p.SC2.id);
  });

  it('DE2.4 — Jack cannot re-curse same player (unless forced)', () => {
    const { game, p } = setup({
      GF: 'godfather', Jack: 'jack',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    // Night 1: curse SC1
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC3.id, actionType: 'shoot', mode: 'shoot' },
      jack:      { actorIds: [p.Jack.id], targetId: p.SC1.id, actionType: 'curse' },
    });
    game.startDay();
    // Night 2: try to curse SC1 again — should be blocked (previousTargetIds contains SC1)
    game.startNight();
    const placed = p.Jack.curse.place(p.SC1.id); // forceRepeat = false
    expect(placed).toBe(false); // can't re-curse the same person
  });

  it('DE2.5 — Curse locked by vote attempt on Jack', () => {
    const { game, p } = setup({
      GF: 'godfather', Jack: 'jack',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      jack:      { actorIds: [p.Jack.id], targetId: p.SC2.id, actionType: 'curse' },
    });
    game.startDay();
    exhaustCards(game);
    const result = game.eliminateByVote(p.Jack.id);
    expect(result.voteImmune).toBe(true); // Jack survives vote
    expect(alive(p.Jack)).toBe(true);
    expect(p.Jack.curse.isLocked).toBe(true); // curse locked after vote attempt
  });

  it('DE2.6 — Locked curse triggers when cursed player voted out', () => {
    const { game, p } = setup({
      GF: 'godfather', Jack: 'jack',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC3.id, actionType: 'shoot', mode: 'shoot' },
      jack:      { actorIds: [p.Jack.id], targetId: p.SC1.id, actionType: 'curse' },
    });
    game.startDay();
    exhaustCards(game);
    // Try to vote Jack → curse locks, Jack immune
    game.eliminateByVote(p.Jack.id);
    // Vote out SC1 (Jack's cursed target) → Jack should die
    const r = game.eliminateByVote(p.SC1.id);
    expect(dead(p.SC1)).toBe(true);
    expect(dead(p.Jack)).toBe(true); // curse triggered
    expect(r.jackCurseTriggered).toBe(true);
  });

  it('DE2.7 — Jack immune to regular mafia shoot', () => {
    const { game, p } = setup({
      GF: 'godfather', Jack: 'jack',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.Jack.id, actionType: 'shoot', mode: 'shoot' },
    });
    expect(alive(p.Jack)).toBe(true);
    expect(r.killed).not.toContain(p.Jack.id);
  });

  it('DE2.8 — Jack immune to zodiac shot', () => {
    const { game, p } = setup({
      GF: 'godfather', Jack: 'jack', Zod: 'zodiac',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      zodiac:    { actorIds: [p.Zod.id], targetId: p.Jack.id, actionType: 'kill' },
    });
    expect(alive(p.Jack)).toBe(true);
  });

  it('DE2.9 — Jack dies from correct salakhi', () => {
    const { game, p } = setup({
      GF: 'godfather', Jack: 'jack',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.Jack.id, actionType: 'shoot', mode: 'salakhi', guessedRoleId: 'jack' },
    });
    expect(dead(p.Jack)).toBe(true);
    expect(r.salakhied.correct).toBe(true);
  });

  it('DE2.10 — isVoteImmune returns true for Jack only', () => {
    const { game, p } = setup({
      GF: 'godfather', Jack: 'jack',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    expect(game.isVoteImmune(p.Jack.id)).toBe(true);
    expect(game.isVoteImmune(p.GF.id)).toBe(false);
    expect(game.isVoteImmune(p.SC1.id)).toBe(false);
  });
});

/* ═══════════════════════════════════════════════════════════
   DE3 — Salakhi Mechanics
   ═══════════════════════════════════════════════════════════ */
describe('DE3 — Salakhi mechanics', () => {
  it('DE3.1 — Correct salakhi kills target (bypasses doctor)', () => {
    const { game, p } = setup({
      GF: 'godfather', DW: 'drWatson',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'salakhi', guessedRoleId: 'simpleCitizen' },
      drWatson:  { actorIds: [p.DW.id], targetId: p.SC1.id, actionType: 'heal' },
    });
    expect(dead(p.SC1)).toBe(true);  // doctor couldn't save
    expect(r.salakhied.correct).toBe(true);
  });

  it('DE3.2 — Incorrect salakhi does nothing', () => {
    const { game, p } = setup({
      GF: 'godfather',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen', SC7: 'simpleCitizen',
    });
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'salakhi', guessedRoleId: 'detective' },
    });
    expect(alive(p.SC1)).toBe(true);
    expect(r.salakhied.correct).toBe(false);
    expect(r.killed.length).toBe(0);
  });

  it('DE3.3 — Salakhi victim is NOT revivable (not revivable flag)', () => {
    const { game, p } = setup({
      GF: 'godfather',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen', SC7: 'simpleCitizen',
    });
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'salakhi', guessedRoleId: 'simpleCitizen' },
    });
    expect(dead(p.SC1)).toBe(true);
    expect(p.SC1.isRevivable).toBe(false);
  });

  it('DE3.4 — Salakhi night: GF has NO regular shoot (actions mutually exclusive)', () => {
    // When mode is 'salakhi', the regular shoot branch is skipped. Only one target.
    const { game, p } = setup({
      GF: 'godfather', SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen', SC7: 'simpleCitizen',
    });
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'salakhi', guessedRoleId: 'simpleCitizen' },
    });
    // Only SC1 dies; salakhi mode = no additional mafia shot
    expect(r.killed.length).toBe(1);
    expect(r.killed[0]).toBe(p.SC1.id);
  });

  it('DE3.5 — Salakhi kills Zodiac (Zodiac not immune to salakhi)', () => {
    const { game, p } = setup({
      GF: 'godfather', Zod: 'zodiac',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.Zod.id, actionType: 'shoot', mode: 'salakhi', guessedRoleId: 'zodiac' },
    });
    expect(dead(p.Zod)).toBe(true);
  });

  it('DE3.6 — Godfather appears negative to detective investigation', () => {
    const { game, p } = setup({
      GF: 'godfather', Det: 'detective',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    const r = nightRound(game, {
      godfather:  { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      detective:  { actorIds: [p.Det.id], targetId: p.GF.id, actionType: 'investigate' },
    });
    expect(r.investigated.result).toBe('negative'); // GF hides as citizen
  });
});

/* ═══════════════════════════════════════════════════════════
   DE4 — Zodiac Mechanics
   ═══════════════════════════════════════════════════════════ */
describe('DE4 — Zodiac mechanics', () => {
  it('DE4.1 — Zodiac shoots citizen → citizen dies', () => {
    const { game, p } = setup({
      GF: 'godfather', Zod: 'zodiac',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      zodiac:    { actorIds: [p.Zod.id], targetId: p.SC2.id, actionType: 'kill' },
    });
    expect(dead(p.SC2)).toBe(true);
    expect(r.killed).toContain(p.SC2.id);
  });

  it('DE4.2 — Zodiac shoots bodyguard → Zodiac dies, bodyguard lives', () => {
    const { game, p } = setup({
      GF: 'godfather', Zod: 'zodiac', BG: 'bodyguard',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      zodiac:    { actorIds: [p.Zod.id], targetId: p.BG.id, actionType: 'kill' },
    });
    expect(dead(p.Zod)).toBe(true);
    expect(alive(p.BG)).toBe(true);
    expect(r.killed).toContain(p.Zod.id);
    expect(r.killed).not.toContain(p.BG.id);
  });

  it('DE4.3 — Zodiac immune to regular mafia shoot', () => {
    const { game, p } = setup({
      GF: 'godfather', Zod: 'zodiac',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.Zod.id, actionType: 'shoot', mode: 'shoot' },
    });
    expect(alive(p.Zod)).toBe(true);
    expect(r.killed).not.toContain(p.Zod.id);
  });

  it('DE4.4 — Zodiac immune to sniper shot', () => {
    const { game, p } = setup({
      GF: 'godfather', Zod: 'zodiac', Snp: 'sniper',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      sniper:    { actorIds: [p.Snp.id], targetId: p.Zod.id, actionType: 'snipe' },
    });
    expect(alive(p.Zod)).toBe(true); // independent → sniper wasted
  });

  it('DE4.5 — Zodiac can be killed by vote', () => {
    const { game, p } = setup({
      GF: 'godfather', Zod: 'zodiac',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    exhaustCards(game);
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();
    game.eliminateByVote(p.Zod.id);
    expect(dead(p.Zod)).toBe(true);
  });

  it('DE4.6 — Zodiac can be killed by correct salakhi', () => {
    const { game, p } = setup({
      GF: 'godfather', Zod: 'zodiac',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.Zod.id, actionType: 'shoot', mode: 'salakhi', guessedRoleId: 'zodiac' },
    });
    expect(dead(p.Zod)).toBe(true);
  });

  it('DE4.7 — Zodiac healed by drWatson; zodiac shot saved', () => {
    const { game, p } = setup({
      GF: 'godfather', Zod: 'zodiac', DW: 'drWatson',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    // Zodiac shoots SC1; drWatson heals SC1 → SC1 saved
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
      zodiac:    { actorIds: [p.Zod.id], targetId: p.SC1.id, actionType: 'kill' },
      drWatson:  { actorIds: [p.DW.id], targetId: p.SC1.id, actionType: 'heal' },
    });
    expect(alive(p.SC1)).toBe(true); // healed from zodiac shot
    expect(r.saved).toContain(p.SC1.id);
  });
});

/* ═══════════════════════════════════════════════════════════
   DE5 — Sniper Mechanics
   ═══════════════════════════════════════════════════════════ */
describe('DE5 — Sniper mechanics', () => {
  it('DE5.1 — Sniper kills mafia', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Snp: 'sniper',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      sniper:    { actorIds: [p.Snp.id], targetId: p.SM.id, actionType: 'snipe' },
    });
    expect(dead(p.SM)).toBe(true);
    expect(r.killed).toContain(p.SM.id);
  });

  it('DE5.2 — Sniper shoots citizen → sniper dies as penalty', () => {
    const { game, p } = setup({
      GF: 'godfather', Snp: 'sniper',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      sniper:    { actorIds: [p.Snp.id], targetId: p.SC2.id, actionType: 'snipe' },
    });
    expect(dead(p.Snp)).toBe(true);  // sniper penalty
    expect(alive(p.SC2)).toBe(true); // citizen survives
    expect(r.killed).toContain(p.Snp.id);
    expect(r.killed).not.toContain(p.SC2.id);
  });

  it('DE5.3 — Sniper shoots independent → wasted (sniper survives)', () => {
    const { game, p } = setup({
      GF: 'godfather', Zod: 'zodiac', Snp: 'sniper',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      sniper:    { actorIds: [p.Snp.id], targetId: p.Zod.id, actionType: 'snipe' },
    });
    expect(alive(p.Snp)).toBe(true); // no penalty
    expect(alive(p.Zod)).toBe(true); // immune (independent)
  });

  it('DE5.4 — Sniper shot count increments; after max shots sniper not in steps', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Snp: 'sniper',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    game.sniperMaxShots = 1; // only 1 shot allowed
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      sniper:    { actorIds: [p.Snp.id], targetId: p.SM.id, actionType: 'snipe' },
    });
    expect(game._sniperShotCount).toBe(1);
    game.startDay();
    // Night 2: sniper should not appear in steps (max reached)
    game.startNight();
    const hasSniper = game.nightSteps.some(s => s.roleId === 'sniper');
    expect(hasSniper).toBe(false);
  });

  it('DE5.5 — Sniper healed mafia target: bullet wasted, sniper survives', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Snp: 'sniper', DL: 'drLecter',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen',
    });
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      drLecter:  { actorIds: [p.DL.id], targetId: p.SM.id, actionType: 'mafiaHeal' },
      sniper:    { actorIds: [p.Snp.id], targetId: p.SM.id, actionType: 'snipe' },
    });
    expect(alive(p.SM)).toBe(true);   // healed → sniper bullet wasted
    expect(alive(p.Snp)).toBe(true);  // sniper no penalty (target was mafia)
  });

  it('DE5.6 — Sniper penalty citizen: sniper is revivable', () => {
    const { game, p } = setup({
      GF: 'godfather', Snp: 'sniper',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      sniper:    { actorIds: [p.Snp.id], targetId: p.SC2.id, actionType: 'snipe' },
    });
    expect(dead(p.Snp)).toBe(true);
    expect(p.Snp.isRevivable).toBe(true); // Constantine can revive sniper
  });
});

/* ═══════════════════════════════════════════════════════════
   DE6 — Win Conditions
   ═══════════════════════════════════════════════════════════ */
describe('DE6 — Win conditions', () => {
  it('DE6.1 — Mafia >= citizens with no independents → mafia wins', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    // Kill 3 citizens → 2 mafia vs 1 citizen
    p.SC1.kill(1, 'test', false);
    p.SC2.kill(1, 'test', false);
    p.SC3.kill(1, 'test', false);
    expect(game.checkWinCondition()).toBe('mafia');
    expect(game.winner).toBe('mafia');
  });

  it('DE6.2 — All mafia dead, no independents → citizen wins', () => {
    const { game, p } = setup({
      GF: 'godfather',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
      SC7: 'simpleCitizen',
    });
    p.GF.kill(1, 'vote', false);
    expect(game.checkWinCondition()).toBe('citizen');
  });

  it('DE6.3 — All mafia dead + Jack alive → Jack wins (not citizen)', () => {
    const { game, p } = setup({
      GF: 'godfather', Jack: 'jack',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    p.GF.kill(1, 'vote', false);
    expect(game.checkWinCondition()).toBe('independent');
    expect(game.winner).toBe('independent');
  });

  it('DE6.4 — All mafia dead, independents alive (non-Jack) → independent wins', () => {
    const { game, p } = setup({
      GF: 'godfather', Zod: 'zodiac',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    // Kill all citizens and mafia → only zodiac alive
    p.GF.kill(1, 'vote', false);
    p.SC1.kill(1, 'test', false); p.SC2.kill(1, 'test', false);
    p.SC3.kill(1, 'test', false); p.SC4.kill(1, 'test', false);
    p.SC5.kill(1, 'test', false); p.SC6.kill(1, 'test', false);
    expect(game.checkWinCondition()).toBe('independent');
  });

  it('DE6.5 — Exactly 3 alive with no Jack → handshake triggered', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    // Kill everyone except GF, SC1, SC2
    p.SM.kill(1, 'test', false);
    p.SC3.kill(1, 'test', false); p.SC4.kill(1, 'test', false);
    p.SC5.kill(1, 'test', false); p.SC6.kill(1, 'test', false);
    const result = game.checkWinCondition();
    expect(result).toBe('handshake');
    expect(game.phase).toBe('handshake');
  });

  it('DE6.6 — Exactly 3 alive with Jack in chaos → Jack wins immediately', () => {
    const { game, p } = setup({
      GF: 'godfather', Jack: 'jack',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    p.SC1.kill(1, 'test', false); p.SC2.kill(1, 'test', false);
    p.SC3.kill(1, 'test', false); p.SC4.kill(1, 'test', false);
    p.SC5.kill(1, 'test', false);
    // 3 alive: GF, Jack, SC6
    expect(game.checkWinCondition()).toBe('independent');
    expect(game.winner).toBe('independent');
    expect(game.phase).toBe('ended');
  });

  it('DE6.7 — No win condition returns null', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    expect(game.checkWinCondition()).toBe(null);
    expect(game.winner).toBe(null);
  });

  it('DE6.8 — Mafia >= citizens but independent alive → no win yet (>3 players)', () => {
    // Need ≥4 alive to avoid handshake: 2 mafia + 1 citizen + 1 independent (zodiac)
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Zod: 'zodiac',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    // Kill 5 citizens → 4 alive: GF, SM, Zod, SC6
    p.SC1.kill(1, 'test', false); p.SC2.kill(1, 'test', false);
    p.SC3.kill(1, 'test', false); p.SC4.kill(1, 'test', false);
    p.SC5.kill(1, 'test', false);
    // 2 mafia >= 1 citizen BUT zodiac alive → mafia win condition blocked
    expect(game.checkWinCondition()).toBe(null);
  });
});

/* ═══════════════════════════════════════════════════════════
   DE7 — Handshake Resolution
   ═══════════════════════════════════════════════════════════ */
describe('DE7 — Handshake resolution', () => {
  function triggerHandshake(roster) {
    const { game, p } = setup(roster);
    const alive = Object.values(p);
    // Kill all but 3
    const toKill = alive.slice(3);
    toKill.forEach(pl => pl.kill(1, 'test', false));
    game.checkWinCondition(); // triggers handshake
    return { game, p };
  }

  it('DE7.1 — Pair with independent in it → independent wins', () => {
    const { game, p } = setup({
      GF: 'godfather', Zod: 'zodiac',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    p.SC1.kill(1,'x',false); p.SC2.kill(1,'x',false);
    p.SC3.kill(1,'x',false); p.SC4.kill(1,'x',false);
    p.SC5.kill(1,'x',false);
    game.checkWinCondition();
    // Pair: GF + Zod → Zod is independent → independent wins
    const result = game.resolveHandshake(p.GF.id, p.Zod.id);
    expect(result.winner).toBe('independent');
  });

  it('DE7.2 — Pair with mafia, no independent → mafia wins', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    p.SM.kill(1,'x',false); p.SC3.kill(1,'x',false);
    p.SC4.kill(1,'x',false); p.SC5.kill(1,'x',false);
    p.SC6.kill(1,'x',false);
    game.checkWinCondition();
    // Pair: GF + SC1 → GF is mafia → mafia wins
    const result = game.resolveHandshake(p.GF.id, p.SC1.id);
    expect(result.winner).toBe('mafia');
  });

  it('DE7.3 — Pair of two citizens → citizen wins', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    p.GF.kill(1,'x',false); p.SM.kill(1,'x',false);
    p.SC3.kill(1,'x',false); p.SC4.kill(1,'x',false);
    p.SC5.kill(1,'x',false);
    game.checkWinCondition();
    // Pair: SC1 + SC2 → citizens → citizen wins
    const result = game.resolveHandshake(p.SC1.id, p.SC2.id);
    expect(result.winner).toBe('citizen');
  });

  it('DE7.4 — Eliminated player is the one NOT in the pair', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    p.SM.kill(1,'x',false); p.SC3.kill(1,'x',false);
    p.SC4.kill(1,'x',false); p.SC5.kill(1,'x',false);
    p.SC6.kill(1,'x',false);
    game.checkWinCondition();
    // 3 alive: GF, SC1, SC2. Pair: GF + SC1. Eliminated: SC2
    const result = game.resolveHandshake(p.GF.id, p.SC1.id);
    expect(result.eliminated).toBe(p.SC2.id);
    expect(dead(p.SC2)).toBe(true);
    expect(game.phase).toBe('ended');
  });
});

/* ═══════════════════════════════════════════════════════════
   DE8 — Voting Mechanics
   ═══════════════════════════════════════════════════════════ */
describe('DE8 — Voting mechanics', () => {
  it('DE8.1 — Vote threshold formula: floor((alive-1)/2)+1', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    // 8 players: floor((8-1)/2)+1 = 3+1 = 4
    expect(game.getVoteThreshold()).toBe(4);
    p.SC1.kill(1,'x',false); p.SC2.kill(1,'x',false);
    // 6 players: floor((6-1)/2)+1 = 2+1 = 3
    expect(game.getVoteThreshold()).toBe(3);
    p.SC3.kill(1,'x',false);
    // 5 players: floor((5-1)/2)+1 = 2+1 = 3
    expect(game.getVoteThreshold()).toBe(3);
    p.SC4.kill(1,'x',false);
    // 4 players: floor((4-1)/2)+1 = 1+1 = 2
    expect(game.getVoteThreshold()).toBe(2);
  });

  it('DE8.2 — Vote tally aggregates correctly', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    game.castVote(p.SC1.id, p.GF.id);
    game.castVote(p.SC2.id, p.GF.id);
    game.castVote(p.SC3.id, p.SM.id);
    const tally = game.getVoteTally();
    expect(tally[p.GF.id]).toBe(2);
    expect(tally[p.SM.id]).toBe(1);
    game.removeVote(p.SC1.id);
    const tally2 = game.getVoteTally();
    expect(tally2[p.GF.id]).toBe(1);
  });

  it('DE8.3 — Negotiator and GF shoot are mutually exclusive same night', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Neg: 'negotiator',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    // Make negotiation available (default threshold=2, 2 mafia alive)
    const r = nightRound(game, {
      negotiator: { actorIds: [p.Neg.id], targetId: p.SC1.id, actionType: 'negotiate' },
      godfather:  { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
    });
    // Negotiator acted → GF shoot skipped
    expect(alive(p.SC2)).toBe(true);  // GF shot was suppressed
    expect(r.negotiated?.success).toBe(true);
  });

  it('DE8.4 — Framason leader voted out; alliance deactivates', () => {
    const { game, p } = setup({
      GF: 'godfather', Free: 'freemason',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    game.framason.init(p.Free.id, 2);
    exhaustCards(game);
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();
    game.eliminateByVote(p.Free.id);
    expect(game.framason._leaderDead).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════
   DE9 — Jadoogar Block Depth
   ═══════════════════════════════════════════════════════════ */
describe('DE9 — Jadoogar block depth', () => {
  it('DE9.1 — Block drWatson → mafia target dies (heal nullified)', () => {
    const { game, p } = setup({
      GF: 'godfather', Jad: 'jadoogar', DW: 'drWatson',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      jadoogar:  { actorIds: [p.Jad.id], targetId: p.DW.id, actionType: 'block' },
      drWatson:  { actorIds: [p.DW.id], targetId: p.SC1.id, actionType: 'heal' },
    });
    expect(dead(p.SC1)).toBe(true);   // doctor was blocked → target died
    expect(r.blocked).toBe(p.DW.id);
  });

  it('DE9.2 — Block detective → investigation result is undefined (action removed)', () => {
    const { game, p } = setup({
      GF: 'godfather', Jad: 'jadoogar', Det: 'detective',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      jadoogar:  { actorIds: [p.Jad.id], targetId: p.Det.id, actionType: 'block' },
      detective: { actorIds: [p.Det.id], targetId: p.GF.id, actionType: 'investigate' },
    });
    // When detective is blocked, their action is removed → investigated is null/undefined
    expect(r.blocked).toBe(p.Det.id);
    expect(r.investigated).toBeFalsy();
  });

  it('DE9.3 — Block sniper → sniper action removed', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Jad: 'jadoogar', Snp: 'sniper',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen',
    });
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      jadoogar:  { actorIds: [p.Jad.id], targetId: p.Snp.id, actionType: 'block' },
      sniper:    { actorIds: [p.Snp.id], targetId: p.SM.id, actionType: 'snipe' },
    });
    // Sniper blocked → SM not shot by sniper
    expect(alive(p.SM)).toBe(true);
    expect(alive(p.Snp)).toBe(true); // sniper didn't shoot, so no penalty either
  });

  it('DE9.4 — Jadoogar tracks last blocked ID; different player next night is fine', () => {
    const { game, p } = setup({
      GF: 'godfather', Jad: 'jadoogar', DW: 'drWatson', Det: 'detective',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen',
    });
    // Night 1: block drWatson
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      jadoogar:  { actorIds: [p.Jad.id], targetId: p.DW.id, actionType: 'block' },
    });
    expect(game._jadoogarLastBlockedId).toBe(p.DW.id);
    game.startDay();
    // Night 2: block detective (different player) → drWatson free to heal
    const r2 = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
      jadoogar:  { actorIds: [p.Jad.id], targetId: p.Det.id, actionType: 'block' },
      drWatson:  { actorIds: [p.DW.id], targetId: p.SC2.id, actionType: 'heal' },
    });
    expect(alive(p.SC2)).toBe(true); // drWatson healed (not blocked)
  });

  it('DE9.5 — Jadoogar block nullifies zodiac action', () => {
    const { game, p } = setup({
      GF: 'godfather', Jad: 'jadoogar', Zod: 'zodiac',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      jadoogar:  { actorIds: [p.Jad.id], targetId: p.Zod.id, actionType: 'block' },
      zodiac:    { actorIds: [p.Zod.id], targetId: p.SC2.id, actionType: 'kill' },
    });
    expect(alive(p.SC2)).toBe(true); // zodiac blocked → SC2 not killed by zodiac
  });
});

/* ═══════════════════════════════════════════════════════════
   DE10 — Detective Investigation
   ═══════════════════════════════════════════════════════════ */
describe('DE10 — Detective investigation outcomes', () => {
  it('DE10.1 — Regular mafia returns positive', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Det: 'detective',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      detective: { actorIds: [p.Det.id], targetId: p.SM.id, actionType: 'investigate' },
    });
    expect(r.investigated.result).toBe('positive');
  });

  it('DE10.2 — Suspect returns positive (false positive)', () => {
    const { game, p } = setup({
      GF: 'godfather', Sus: 'suspect', Det: 'detective',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      detective: { actorIds: [p.Det.id], targetId: p.Sus.id, actionType: 'investigate' },
    });
    expect(r.investigated.result).toBe('positive'); // suspect appears as mafia
  });

  it('DE10.3 — Citizen returns negative', () => {
    const { game, p } = setup({
      GF: 'godfather', Det: 'detective',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      detective: { actorIds: [p.Det.id], targetId: p.SC2.id, actionType: 'investigate' },
    });
    expect(r.investigated.result).toBe('negative');
  });

  it('DE10.4 — Joker reversal flips detective result (mafia → appears negative)', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Det: 'detective', Jok: 'joker',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen',
    });
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      joker:     { actorIds: [p.Jok.id], targetId: p.SM.id, actionType: 'target' },
      detective: { actorIds: [p.Det.id], targetId: p.SM.id, actionType: 'investigate' },
    });
    // Joker targeted SM → detective result flipped → positive → negative
    expect(r.investigated.result).toBe('negative');
    expect(r.jokerTarget).toBe(p.SM.id);
  });

  it('DE10.5 — Joker reversal flips citizen result (citizen → appears positive)', () => {
    const { game, p } = setup({
      GF: 'godfather', Det: 'detective', Jok: 'joker',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const r = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      joker:     { actorIds: [p.Jok.id], targetId: p.SC2.id, actionType: 'target' },
      detective: { actorIds: [p.Det.id], targetId: p.SC2.id, actionType: 'investigate' },
    });
    expect(r.investigated.result).toBe('positive'); // citizen flipped to positive
  });

  it('DE10.6 — Negotiated player detected as mafia same night', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Neg: 'negotiator', Det: 'detective',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen',
    });
    // Default threshold=2, 2 mafia alive → negotiation available
    const r = nightRound(game, {
      negotiator: { actorIds: [p.Neg.id], targetId: p.SC1.id, actionType: 'negotiate' },
      detective:  { actorIds: [p.Det.id], targetId: p.SC1.id, actionType: 'investigate' },
    });
    // SC1 recruited to mafia same night → detective sees positive
    expect(r.investigated.result).toBe('positive');
  });
});

/* ═══════════════════════════════════════════════════════════
   DE11 — Zodiac Frequency Setting
   ═══════════════════════════════════════════════════════════ */
describe('DE11 — Zodiac frequency', () => {
  it('DE11.1 — frequency=every: zodiac always in night steps', () => {
    const { game, p } = setup({
      GF: 'godfather', Zod: 'zodiac',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    game.zodiacFrequency = 'every';
    game.round = 1;
    game.startNight();
    expect(game.nightSteps.some(s => s.roleId === 'zodiac')).toBe(true);
    game.round = 2;
    game.startNight();
    expect(game.nightSteps.some(s => s.roleId === 'zodiac')).toBe(true);
  });

  it('DE11.2 — frequency=odd: zodiac only on odd rounds', () => {
    const { game, p } = setup({
      GF: 'godfather', Zod: 'zodiac',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    game.zodiacFrequency = 'odd';
    game.round = 1; // odd → zodiac present
    game.startNight();
    expect(game.nightSteps.some(s => s.roleId === 'zodiac')).toBe(true);
    game.round = 2; // even → zodiac absent
    game.startNight();
    expect(game.nightSteps.some(s => s.roleId === 'zodiac')).toBe(false);
  });

  it('DE11.3 — frequency=even: zodiac only on even rounds', () => {
    const { game, p } = setup({
      GF: 'godfather', Zod: 'zodiac',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    game.zodiacFrequency = 'even';
    game.round = 2; // even → zodiac present
    game.startNight();
    expect(game.nightSteps.some(s => s.roleId === 'zodiac')).toBe(true);
    game.round = 3; // odd → zodiac absent
    game.startNight();
    expect(game.nightSteps.some(s => s.roleId === 'zodiac')).toBe(false);
  });
});

/* ═══════════════════════════════════════════════════════════
   DE12 — Night Step Building Edge Cases
   ═══════════════════════════════════════════════════════════ */
describe('DE12 — Night step building edge cases', () => {
  it('DE12.1 — GF dead: other mafia act as godfather step actors', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    p.GF.kill(1, 'vote', false);
    game.startNight();
    const gfStep = game.nightSteps.find(s => s.roleId === 'godfather');
    expect(gfStep).toBeDefined();
    expect(gfStep.actors).toContain(p.SM.id);
  });

  it('DE12.2 — Negotiator absent when mafia count > threshold', () => {
    const { game, p } = setup({
      GF: 'godfather', SM1: 'simpleMafia', SM2: 'simpleMafia', Neg: 'negotiator',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    // 3 mafia alive, threshold=2 → negotiator skipped
    game.startNight();
    expect(game.nightSteps.some(s => s.roleId === 'negotiator')).toBe(false);
  });

  it('DE12.3 — Kane absent from steps when _kanePendingDeath=true', () => {
    const { game, p } = setup({
      GF: 'godfather', Kane: 'kane',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    game._kanePendingDeath = true;
    game.startNight();
    expect(game.nightSteps.some(s => s.roleId === 'kane')).toBe(false);
  });

  it('DE12.4 — lastActionBlockMafiaShoot blocks godfather step from building', () => {
    const { game, p } = setup({
      GF: 'godfather',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen', SC7: 'simpleCitizen',
    });
    game.lastActionBlockMafiaShoot = true;
    game.startNight();
    expect(game.nightSteps.some(s => s.roleId === 'godfather')).toBe(false);
  });

  it('DE12.5 — Constantine absent when no revivable players exist', () => {
    const { game, p } = setup({
      GF: 'godfather', Con: 'constantine',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    // No dead revivable players → Constantine skipped
    game.startNight();
    expect(game.nightSteps.some(s => s.roleId === 'constantine')).toBe(false);
  });
});

/* ═══════════════════════════════════════════════════════════
   DE13 — Cowboy Day Ability
   ═══════════════════════════════════════════════════════════ */
describe('DE13 — Cowboy day ability', () => {
  it('DE13.1 — Cowboy shoots mafia → mafia dies, cowboy dies', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Cow: 'cowboy',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();
    const result = game.resolveCowboyAction(p.SM.id);
    expect(result.killed).toBe(true);
    expect(result.side).toBe('mafia');
    expect(dead(p.SM)).toBe(true);
    expect(dead(p.Cow)).toBe(true); // cowboy always dies
  });

  it('DE13.2 — Cowboy shoots citizen → citizen dies, cowboy dies', () => {
    const { game, p } = setup({
      GF: 'godfather', Cow: 'cowboy',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();
    const result = game.resolveCowboyAction(p.SC2.id);
    expect(result.killed).toBe(true);
    expect(result.side).toBe('citizen');
    expect(dead(p.SC2)).toBe(true);
    expect(dead(p.Cow)).toBe(true);
  });

  it('DE13.3 — Cowboy shoots Jack → Jack survives, curse locked, cowboy dies', () => {
    const { game, p } = setup({
      GF: 'godfather', Jack: 'jack', Cow: 'cowboy',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();
    const result = game.resolveCowboyAction(p.Jack.id);
    expect(result.jackCurseLocked).toBe(true);
    expect(alive(p.Jack)).toBe(true);   // Jack survives
    expect(dead(p.Cow)).toBe(true);     // cowboy dies
    expect(p.Jack.curse.isLocked).toBe(true);
  });

  it('DE13.4 — canCowboyAct returns false after use', () => {
    const { game, p } = setup({
      GF: 'godfather', Cow: 'cowboy',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();
    expect(game.canCowboyAct()).toBe(true);
    game.resolveCowboyAction(p.GF.id);
    expect(game.canCowboyAct()).toBe(false);
  });

  it('DE13.5 — Jack curse chain: cowboy is Jack cursed target → Jack dies when cowboy dies', () => {
    const { game, p } = setup({
      GF: 'godfather', Jack: 'jack', SM: 'simpleMafia', Cow: 'cowboy',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen',
    });
    // Night 1: Jack curses Cowboy
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      jack:      { actorIds: [p.Jack.id], targetId: p.Cow.id, actionType: 'curse' },
    });
    game.startDay();
    // Cowboy uses ability → cowboy dies → Jack curse triggers → Jack dies
    const result = game.resolveCowboyAction(p.SM.id);
    expect(dead(p.Cow)).toBe(true);
    expect(result.jackCurseTriggered).toBe(true);
    expect(dead(p.Jack)).toBe(true);
  });
});
