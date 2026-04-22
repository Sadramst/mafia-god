/**
 * detective-joker-jadoogar-suite.test.mjs — Comprehensive tests for:
 *   D1: Detective baseline investigations (all role types)
 *   D2: Joker + Detective same-target reversal
 *   D3: Jadoogar (Sorcerer) blocking various roles
 *   D4: Joker + Jadoogar combos
 *   D5: Jadoogar consecutive-block restriction
 *   D6: Joker consecutive-target restriction
 *   D7: Silencer mechanics
 *   D8: Reporter mechanics
 *   D9: Bomb + Bodyguard interactions
 *   D10: Framason contamination edge cases
 *   D11: Multi-role night interaction combos
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../js/models/Game.js';
import { Roles } from '../js/models/Roles.js';

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
   D1 — Detective Baseline Investigations
   ═══════════════════════════════════════════════════════════════════ */
describe('D1 — Detective baseline investigations', () => {

  it('D1.1 — Detective on simpleMafia → positive (👍)', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Det: 'detective',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const results = nightRound(game, {
      detective: { actorIds: [p.Det.id], targetId: p.SM.id, actionType: 'investigate' },
    });
    expect(results.investigated.result).toBe('positive');
    expect(results.investigated.playerId).toBe(p.SM.id);
  });

  it('D1.2 — Detective on godfather → negative (👎) — GF hides', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Det: 'detective',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const results = nightRound(game, {
      detective: { actorIds: [p.Det.id], targetId: p.GF.id, actionType: 'investigate' },
    });
    expect(results.investigated.result).toBe('negative');
  });

  it('D1.3 — Detective on simpleCitizen → negative (👎)', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Det: 'detective',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const results = nightRound(game, {
      detective: { actorIds: [p.Det.id], targetId: p.SC1.id, actionType: 'investigate' },
    });
    expect(results.investigated.result).toBe('negative');
  });

  it('D1.4 — Detective on suspect → positive (👍) — false positive', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Det: 'detective',
      Susp: 'suspect', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    const results = nightRound(game, {
      detective: { actorIds: [p.Det.id], targetId: p.Susp.id, actionType: 'investigate' },
    });
    expect(results.investigated.result).toBe('positive');
  });

  it('D1.5 — Detective on Jack (independent) → negative (👎)', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Det: 'detective',
      Jack: 'jack', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    p.Jack.curse.place(p.SC1.id);
    const results = nightRound(game, {
      detective: { actorIds: [p.Det.id], targetId: p.Jack.id, actionType: 'investigate' },
    });
    expect(results.investigated.result).toBe('negative');
  });

  it('D1.6 — Detective on Zodiac (independent) → negative (👎)', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Det: 'detective',
      Zod: 'zodiac', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    const results = nightRound(game, {
      detective: { actorIds: [p.Det.id], targetId: p.Zod.id, actionType: 'investigate' },
    });
    expect(results.investigated.result).toBe('negative');
  });

  it('D1.7 — Detective on drLecter (mafia) → positive (👍)', () => {
    const { game, p } = setup({
      GF: 'godfather', Lect: 'drLecter', Det: 'detective',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const results = nightRound(game, {
      detective: { actorIds: [p.Det.id], targetId: p.Lect.id, actionType: 'investigate' },
    });
    expect(results.investigated.result).toBe('positive');
  });

  it('D1.8 — Detective on jadoogar (mafia) → positive (👍)', () => {
    const { game, p } = setup({
      GF: 'godfather', Jad: 'jadoogar', Det: 'detective',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const results = nightRound(game, {
      detective: { actorIds: [p.Det.id], targetId: p.Jad.id, actionType: 'investigate' },
    });
    expect(results.investigated.result).toBe('positive');
  });

  it('D1.9 — Detective on joker (mafia) → positive (👍)', () => {
    const { game, p } = setup({
      GF: 'godfather', Jok: 'joker', Det: 'detective',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const results = nightRound(game, {
      detective: { actorIds: [p.Det.id], targetId: p.Jok.id, actionType: 'investigate' },
    });
    expect(results.investigated.result).toBe('positive');
  });

  it('D1.10 — Detective on negotiator (mafia) → positive (👍)', () => {
    const { game, p } = setup({
      GF: 'godfather', Neg: 'negotiator', Det: 'detective',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const results = nightRound(game, {
      detective: { actorIds: [p.Det.id], targetId: p.Neg.id, actionType: 'investigate' },
    });
    expect(results.investigated.result).toBe('positive');
  });

  it('D1.11 — Detective on bomber (mafia) → positive (👍)', () => {
    const { game, p } = setup({
      GF: 'godfather', Bomb: 'bomber', Det: 'detective',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const results = nightRound(game, {
      detective: { actorIds: [p.Det.id], targetId: p.Bomb.id, actionType: 'investigate' },
    });
    expect(results.investigated.result).toBe('positive');
  });

  it('D1.12 — Detective on drWatson (citizen) → negative (👎)', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Det: 'detective',
      Doc: 'drWatson', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    const results = nightRound(game, {
      detective: { actorIds: [p.Det.id], targetId: p.Doc.id, actionType: 'investigate' },
    });
    expect(results.investigated.result).toBe('negative');
  });

  it('D1.13 — Detective on sniper (citizen) → negative (👎)', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Det: 'detective',
      Snip: 'sniper', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    const results = nightRound(game, {
      detective: { actorIds: [p.Det.id], targetId: p.Snip.id, actionType: 'investigate' },
    });
    expect(results.investigated.result).toBe('negative');
  });

  it('D1.14 — Detective on spy (mafia) → positive (👍)', () => {
    const { game, p } = setup({
      GF: 'godfather', Spy: 'spy', Det: 'detective',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const results = nightRound(game, {
      detective: { actorIds: [p.Det.id], targetId: p.Spy.id, actionType: 'investigate' },
    });
    expect(results.investigated.result).toBe('positive');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   D2 — Joker + Detective Same-Target Reversal (deep edge cases)
   ═══════════════════════════════════════════════════════════════════ */
describe('D2 — Joker + Detective reversal edge cases', () => {

  it('D2.1 — Joker on negotiated player same night → detective sees positive (negotiated overrides, then reversed)', () => {
    const { game, p } = setup({
      GF: 'godfather', Jok: 'joker', Neg: 'negotiator', Det: 'detective',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    // Force negotiation threshold
    game._negotiateThreshold = 10;
    const results = nightRound(game, {
      negotiator: { actorIds: [p.Neg.id], targetId: p.SC1.id, actionType: 'negotiate' },
      joker:      { actorIds: [p.Jok.id], targetId: p.SC1.id },
      detective:  { actorIds: [p.Det.id], targetId: p.SC1.id, actionType: 'investigate' },
    });
    // SC1 negotiated → thumbsUp=true, then joker reverses → negative
    expect(results.investigated.result).toBe('negative');
  });

  it('D2.2 — Joker on dead player (killed same night) → detective still gets result for that player', () => {
    const { game, p } = setup({
      GF: 'godfather', Jok: 'joker', SM: 'simpleMafia', Det: 'detective',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    const results = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'kill', mode: 'shoot' },
      joker:     { actorIds: [p.Jok.id], targetId: p.SC1.id },
      detective: { actorIds: [p.Det.id], targetId: p.SC1.id, actionType: 'investigate' },
    });
    // SC1 is citizen → negative normally, joker reverses → positive
    // Detective still investigates even though target dies
    expect(results.investigated.result).toBe('positive');
    expect(results.jokerTarget).toBe(p.SC1.id);
  });

  it('D2.3 — No joker action at all → detective gets normal result', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Det: 'detective',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const results = nightRound(game, {
      detective: { actorIds: [p.Det.id], targetId: p.SM.id, actionType: 'investigate' },
    });
    expect(results.investigated.result).toBe('positive');
    expect(results.jokerTarget).toBeNull();
  });

  it('D2.4 — No detective action → jokerTarget still recorded', () => {
    const { game, p } = setup({
      GF: 'godfather', Jok: 'joker', SM: 'simpleMafia', Det: 'detective',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    const results = nightRound(game, {
      joker: { actorIds: [p.Jok.id], targetId: p.SC1.id },
    });
    expect(results.investigated).toBeNull();
    expect(results.jokerTarget).toBe(p.SC1.id);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   D3 — Jadoogar (Sorcerer) Blocking Various Roles
   ═══════════════════════════════════════════════════════════════════ */
describe('D3 — Jadoogar blocks various roles', () => {

  it('D3.1 — Jadoogar blocks Constantine → revival fails', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Jad: 'jadoogar',
      Const: 'constantine', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    // Kill SC1 in first round
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'kill', mode: 'shoot' },
    });
    expect(dead(p.SC1)).toBe(true);

    // Night 2: Constantine tries to revive SC1, but jadoogar blocks
    game.round = 2;
    const results = nightRound(game, {
      jadoogar:     { actorIds: [p.Jad.id], targetId: p.Const.id, actionType: 'block' },
      constantine:  { actorIds: [p.Const.id], targetId: p.SC1.id, actionType: 'revive' },
    });
    expect(results.blocked).toBe(p.Const.id);
    expect(dead(p.SC1)).toBe(true); // Still dead — revival blocked
    expect(results.revived).toBeNull();
  });

  it('D3.2 — Jadoogar blocks Sniper → sniper shot fails', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Jad: 'jadoogar',
      Snip: 'sniper', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    const results = nightRound(game, {
      jadoogar: { actorIds: [p.Jad.id], targetId: p.Snip.id, actionType: 'block' },
      sniper:   { actorIds: [p.Snip.id], targetId: p.SM.id, actionType: 'snipe' },
    });
    expect(results.blocked).toBe(p.Snip.id);
    expect(alive(p.SM)).toBe(true); // Sniper blocked, SM survives
  });

  it('D3.3 — Jadoogar blocks Kane → Kane reveal fails', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Jad: 'jadoogar',
      Kane: 'kane', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    const results = nightRound(game, {
      jadoogar: { actorIds: [p.Jad.id], targetId: p.Kane.id, actionType: 'block' },
      kane:     { actorIds: [p.Kane.id], targetId: p.SM.id, actionType: 'kane_reveal' },
    });
    expect(results.blocked).toBe(p.Kane.id);
    // Kane action deleted → no reveal
    expect(results.kaneReveal).toBeUndefined();
    expect(game._kaneUsed).toBe(false); // Ability not consumed
  });

  it('D3.4 — Jadoogar blocks Gunner → no bullets given that night', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Jad: 'jadoogar',
      Gun: 'gunner', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    game.bulletManager.init(2, 2); // 2 blank, 2 live
    const results = nightRound(game, {
      jadoogar: { actorIds: [p.Jad.id], targetId: p.Gun.id, actionType: 'block' },
      gunner:   { actorIds: [p.Gun.id], bulletAssignments: [{ holderId: p.SC1.id, type: 'live' }] },
    });
    expect(results.blocked).toBe(p.Gun.id);
    // No bullet assigned
    const bullet = game.bulletManager.getPlayerBullet(p.SC1.id);
    expect(bullet).toBeNull();
  });

  it('D3.5 — Jadoogar blocks Freemason → no recruitment', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Jad: 'jadoogar',
      FM: 'freemason', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    game.framason.init(p.FM.id, 2);
    const results = nightRound(game, {
      jadoogar:  { actorIds: [p.Jad.id], targetId: p.FM.id, actionType: 'block' },
      freemason: { actorIds: [p.FM.id], targetId: p.SC1.id, actionType: 'framason_recruit' },
    });
    expect(results.blocked).toBe(p.FM.id);
    // FM action deleted — no recruitment
    expect(game.framason.members).not.toContain(p.SC1.id);
  });

  it('D3.6 — Jadoogar blocks Joker → joker reversal does not apply', () => {
    const { game, p } = setup({
      GF: 'godfather', Jok: 'joker', Jad: 'jadoogar', Det: 'detective',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    const results = nightRound(game, {
      jadoogar:  { actorIds: [p.Jad.id], targetId: p.Jok.id, actionType: 'block' },
      joker:     { actorIds: [p.Jok.id], targetId: p.SC1.id },
      detective: { actorIds: [p.Det.id], targetId: p.SC1.id, actionType: 'investigate' },
    });
    expect(results.blocked).toBe(p.Jok.id);
    // Joker blocked → detective sees normal result (citizen → negative)
    expect(results.investigated.result).toBe('negative');
    expect(results.jokerTarget).toBeNull();
  });

  it('D3.7 — Jadoogar blocks Dr. Watson → healed player dies to mafia shot', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Jad: 'jadoogar',
      Doc: 'drWatson', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    const results = nightRound(game, {
      jadoogar:  { actorIds: [p.Jad.id], targetId: p.Doc.id, actionType: 'block' },
      drWatson:  { actorIds: [p.Doc.id], targetId: p.SC1.id, actionType: 'heal' },
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'kill', mode: 'shoot' },
    });
    expect(results.blocked).toBe(p.Doc.id);
    expect(dead(p.SC1)).toBe(true); // Not healed, killed
  });

  it('D3.8 — Jadoogar blocks Zodiac → Zodiac kill fails', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Jad: 'jadoogar',
      Zod: 'zodiac', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    const results = nightRound(game, {
      jadoogar: { actorIds: [p.Jad.id], targetId: p.Zod.id, actionType: 'block' },
      zodiac:   { actorIds: [p.Zod.id], targetId: p.SC1.id, actionType: 'kill' },
    });
    expect(results.blocked).toBe(p.Zod.id);
    expect(alive(p.SC1)).toBe(true); // Zodiac blocked
  });

  it('D3.9 — Jadoogar CANNOT block mafia members (only citizen/independent)', () => {
    // In the game, jadoogar only targets citizen/independent via UI filter.
    // But if the action is manually set to block a mafia member, the block
    // mechanic still removes their action (engine doesn't enforce team filter).
    // This test documents engine behavior.
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Jad: 'jadoogar',
      Lect: 'drLecter', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    const results = nightRound(game, {
      jadoogar:  { actorIds: [p.Jad.id], targetId: p.Lect.id, actionType: 'block' },
      drLecter:  { actorIds: [p.Lect.id], targetId: p.GF.id, actionType: 'mafia_heal' },
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'kill', mode: 'shoot' },
    });
    // Engine still processes block — Lecter's action is deleted
    expect(results.blocked).toBe(p.Lect.id);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   D4 — Joker + Jadoogar Combos
   ═══════════════════════════════════════════════════════════════════ */
describe('D4 — Joker + Jadoogar combos', () => {

  it('D4.1 — Jadoogar blocks detective + Joker targets same player → no investigation', () => {
    const { game, p } = setup({
      GF: 'godfather', Jok: 'joker', Jad: 'jadoogar', Det: 'detective',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    const results = nightRound(game, {
      jadoogar:  { actorIds: [p.Jad.id], targetId: p.Det.id, actionType: 'block' },
      joker:     { actorIds: [p.Jok.id], targetId: p.SC1.id },
      detective: { actorIds: [p.Det.id], targetId: p.SC1.id, actionType: 'investigate' },
    });
    // Detective blocked → action deleted → no investigation
    expect(results.blocked).toBe(p.Det.id);
    expect(results.investigated).toBeNull();
    // Joker target is still recorded
    expect(results.jokerTarget).toBe(p.SC1.id);
  });

  it('D4.2 — Jadoogar blocks Joker + detective investigates → normal result (no reversal)', () => {
    const { game, p } = setup({
      GF: 'godfather', Jok: 'joker', Jad: 'jadoogar', Det: 'detective',
      SM: 'simpleMafia', SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen',
    });
    const results = nightRound(game, {
      jadoogar:  { actorIds: [p.Jad.id], targetId: p.Jok.id, actionType: 'block' },
      joker:     { actorIds: [p.Jok.id], targetId: p.SM.id },
      detective: { actorIds: [p.Det.id], targetId: p.SM.id, actionType: 'investigate' },
    });
    expect(results.blocked).toBe(p.Jok.id);
    // Joker blocked → no reversal → SM is mafia → positive
    expect(results.investigated.result).toBe('positive');
    expect(results.jokerTarget).toBeNull();
  });

  it('D4.3 — Jadoogar blocks both detective and Joker in consecutive nights', () => {
    const { game, p } = setup({
      GF: 'godfather', Jok: 'joker', Jad: 'jadoogar', Det: 'detective',
      SM: 'simpleMafia', SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen',
    });
    // Night 1: block detective
    game.round = 1;
    const r1 = nightRound(game, {
      jadoogar:  { actorIds: [p.Jad.id], targetId: p.Det.id, actionType: 'block' },
      detective: { actorIds: [p.Det.id], targetId: p.SM.id, actionType: 'investigate' },
    });
    expect(r1.investigated).toBeNull();
    expect(game._jadoogarLastBlockedId).toBe(p.Det.id);

    // Night 2: must block someone else (consecutive restriction), block Joker
    game.round = 2;
    const r2 = nightRound(game, {
      jadoogar:  { actorIds: [p.Jad.id], targetId: p.Jok.id, actionType: 'block' },
      joker:     { actorIds: [p.Jok.id], targetId: p.SM.id },
      detective: { actorIds: [p.Det.id], targetId: p.SM.id, actionType: 'investigate' },
    });
    // Joker blocked, detective acts normally → SM is mafia → positive
    expect(r2.investigated.result).toBe('positive');
    expect(r2.jokerTarget).toBeNull();
    expect(game._jadoogarLastBlockedId).toBe(p.Jok.id);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   D5 — Jadoogar Consecutive Block Restriction
   ═══════════════════════════════════════════════════════════════════ */
describe('D5 — Jadoogar consecutive block restriction', () => {

  it('D5.1 — After blocking player X, _jadoogarLastBlockedId is set to X', () => {
    const { game, p } = setup({
      GF: 'godfather', Jad: 'jadoogar', SM: 'simpleMafia',
      Doc: 'drWatson', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    nightRound(game, {
      jadoogar: { actorIds: [p.Jad.id], targetId: p.Doc.id, actionType: 'block' },
    });
    expect(game._jadoogarLastBlockedId).toBe(p.Doc.id);
  });

  it('D5.2 — When jadoogar skips a night, _jadoogarLastBlockedId resets to null', () => {
    const { game, p } = setup({
      GF: 'godfather', Jad: 'jadoogar', SM: 'simpleMafia',
      Doc: 'drWatson', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    nightRound(game, {
      jadoogar: { actorIds: [p.Jad.id], targetId: p.Doc.id, actionType: 'block' },
    });
    expect(game._jadoogarLastBlockedId).toBe(p.Doc.id);

    // Night 2: no jadoogar action
    game.round = 2;
    nightRound(game, {});
    expect(game._jadoogarLastBlockedId).toBeNull();
  });

  it('D5.3 — Blocking different target on consecutive nights is allowed', () => {
    const { game, p } = setup({
      GF: 'godfather', Jad: 'jadoogar', SM: 'simpleMafia',
      Doc: 'drWatson', Det: 'detective', SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen',
    });
    // Night 1: block Watson
    nightRound(game, {
      jadoogar: { actorIds: [p.Jad.id], targetId: p.Doc.id, actionType: 'block' },
    });
    expect(game._jadoogarLastBlockedId).toBe(p.Doc.id);

    // Night 2: block Detective (different target — allowed)
    game.round = 2;
    const results = nightRound(game, {
      jadoogar:  { actorIds: [p.Jad.id], targetId: p.Det.id, actionType: 'block' },
      detective: { actorIds: [p.Det.id], targetId: p.SM.id, actionType: 'investigate' },
    });
    expect(results.blocked).toBe(p.Det.id);
    expect(results.investigated).toBeNull();
    expect(game._jadoogarLastBlockedId).toBe(p.Det.id);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   D6 — Joker Consecutive Target Restriction
   ═══════════════════════════════════════════════════════════════════ */
describe('D6 — Joker consecutive target restriction', () => {

  it('D6.1 — After targeting player X, _jokerLastTargetId is set', () => {
    const { game, p } = setup({
      GF: 'godfather', Jok: 'joker', Det: 'detective',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    nightRound(game, {
      joker: { actorIds: [p.Jok.id], targetId: p.SC1.id },
    });
    expect(game._jokerLastTargetId).toBe(p.SC1.id);
  });

  it('D6.2 — When joker skips, _jokerLastTargetId resets to null', () => {
    const { game, p } = setup({
      GF: 'godfather', Jok: 'joker', Det: 'detective',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    nightRound(game, {
      joker: { actorIds: [p.Jok.id], targetId: p.SC1.id },
    });
    expect(game._jokerLastTargetId).toBe(p.SC1.id);

    game.round = 2;
    nightRound(game, {});
    expect(game._jokerLastTargetId).toBeNull();
  });

  it('D6.3 — Joker targeting different player on consecutive nights works', () => {
    const { game, p } = setup({
      GF: 'godfather', Jok: 'joker', Det: 'detective',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    // Night 1: target SC1
    nightRound(game, {
      joker:     { actorIds: [p.Jok.id], targetId: p.SC1.id },
      detective: { actorIds: [p.Det.id], targetId: p.SC1.id, actionType: 'investigate' },
    });
    expect(game._jokerLastTargetId).toBe(p.SC1.id);

    // Night 2: target SC2 (different — allowed)
    game.round = 2;
    const r2 = nightRound(game, {
      joker:     { actorIds: [p.Jok.id], targetId: p.SC2.id },
      detective: { actorIds: [p.Det.id], targetId: p.SC2.id, actionType: 'investigate' },
    });
    // SC2 is citizen → negative, joker reverses → positive
    expect(r2.investigated.result).toBe('positive');
    expect(game._jokerLastTargetId).toBe(p.SC2.id);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   D7 — Silencer Mechanics
   ═══════════════════════════════════════════════════════════════════ */
describe('D7 — Silencer mechanics', () => {

  it('D7.1 — Silencer silences a citizen', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Mat: 'matador',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const results = nightRound(game, {
      matador: { actorIds: [p.Mat.id], targetId: p.SC1.id, actionType: 'silence' },
    });
    expect(results.silenced).toBe(p.SC1.id);
  });

  it('D7.2 — Silencer can silence a mafia member', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Mat: 'matador',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const results = nightRound(game, {
      matador: { actorIds: [p.Mat.id], targetId: p.SM.id, actionType: 'silence' },
    });
    expect(results.silenced).toBe(p.SM.id);
  });

  it('D7.3 — Silencer can silence an independent', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Mat: 'matador',
      Jack: 'jack', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    p.Jack.curse.place(p.SC1.id);
    const results = nightRound(game, {
      matador: { actorIds: [p.Mat.id], targetId: p.Jack.id, actionType: 'silence' },
    });
    expect(results.silenced).toBe(p.Jack.id);
  });

  it('D7.4 — Jadoogar blocks Silencer → no silence', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Mat: 'matador', Jad: 'jadoogar',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    // Note: Silencer is mafia, jadoogar targets citizen/independent only.
    // But engine processes the block regardless of team. This documents behavior.
    // In real game, jadoogar wouldn't target a mafia silencer.
    const results = nightRound(game, {
      jadoogar: { actorIds: [p.Jad.id], targetId: p.Mat.id, actionType: 'block' },
      matador:  { actorIds: [p.Mat.id], targetId: p.SC1.id, actionType: 'silence' },
    });
    expect(results.blocked).toBe(p.Mat.id);
    expect(results.silenced).toBeNull();
  });
});

/* D8 — Reporter mechanics removed: reporter check is UI-only, not engine-level */

/* ═══════════════════════════════════════════════════════════════════
   D9 — Bomb + Bodyguard Interactions
   ═══════════════════════════════════════════════════════════════════ */
describe('D9 — Bomb mechanics', () => {

  it('D9.1 — Bomber plants bomb on a player', () => {
    const { game, p } = setup({
      GF: 'godfather', Bomb: 'bomber', SM: 'simpleMafia',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const results = nightRound(game, {
      bomber: { actorIds: [p.Bomb.id], targetId: p.SC1.id, code: 2, actionType: 'bomb' },
    });
    expect(results.bombed).toBeDefined();
  });

  it('D9.2 — Jadoogar blocks Bomber → no bomb planted', () => {
    const { game, p } = setup({
      GF: 'godfather', Bomb: 'bomber', Jad: 'jadoogar',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    // Bomber is mafia, jadoogar wouldn't block them in real game (UI filter)
    // But testing engine behavior
    const results = nightRound(game, {
      jadoogar: { actorIds: [p.Jad.id], targetId: p.Bomb.id, actionType: 'block' },
      bomber:   { actorIds: [p.Bomb.id], targetId: p.SC1.id, code: 2, actionType: 'bomb' },
    });
    expect(results.blocked).toBe(p.Bomb.id);
    expect(results.bombed).toBeNull();
  });
});

/* ═══════════════════════════════════════════════════════════════════
   D10 — Framason Contamination Edge Cases
   ═══════════════════════════════════════════════════════════════════ */
describe('D10 — Framason contamination', () => {

  it('D10.1 — Framason recruits simpleCitizen → safe, both alive', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      FM: 'freemason', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    game.framason.init(p.FM.id, 2);
    const results = nightRound(game, {
      freemason: { actorIds: [p.FM.id], targetId: p.SC1.id, actionType: 'framason_recruit' },
    });
    expect(alive(p.FM)).toBe(true);
    expect(alive(p.SC1)).toBe(true);
    expect(game.framason.members).toContain(p.SC1.id);
  });

  it('D10.2 — Framason recruits spy → safe (spy special case)', () => {
    const { game, p } = setup({
      GF: 'godfather', Spy: 'spy',
      FM: 'freemason', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    game.framason.init(p.FM.id, 2);
    const results = nightRound(game, {
      freemason: { actorIds: [p.FM.id], targetId: p.Spy.id, actionType: 'framason_recruit' },
    });
    // Spy joins without contamination
    expect(alive(p.FM)).toBe(true);
    expect(alive(p.Spy)).toBe(true);
  });

  it('D10.3 — Framason recruits simpleMafia → contamination → FM team dies', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      FM: 'freemason', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    game.framason.init(p.FM.id, 2);
    // First recruit a citizen
    nightRound(game, {
      freemason: { actorIds: [p.FM.id], targetId: p.SC1.id, actionType: 'framason_recruit' },
    });
    // Then recruit mafia
    game.round = 2;
    const results = nightRound(game, {
      freemason: { actorIds: [p.FM.id], targetId: p.SM.id, actionType: 'framason_recruit' },
    });
    expect(results.framasonRecruit.contaminated).toBe(true);
    // Contamination resolves during morning
    const deadIds = game.framason.resolveContamination();
    deadIds.forEach(id => game.getPlayer(id)?.kill(game.round, 'framason'));
    // FM and previous allies die, mafia survives
    expect(dead(p.FM)).toBe(true);
    expect(dead(p.SC1)).toBe(true); // Previous ally dies
    expect(alive(p.SM)).toBe(true); // Mafia survives
  });

  it('D10.4 — Framason recruits Jack → contamination → FM team dies, Jack survives', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      FM: 'freemason', Jack: 'jack', SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    game.framason.init(p.FM.id, 2);
    p.Jack.curse.place(p.SC1.id);
    const results = nightRound(game, {
      freemason: { actorIds: [p.FM.id], targetId: p.Jack.id, actionType: 'framason_recruit' },
    });
    expect(results.framasonRecruit.contaminated).toBe(true);
    // Contamination resolves during morning
    const deadIds = game.framason.resolveContamination();
    deadIds.forEach(id => game.getPlayer(id)?.kill(game.round, 'framason'));
    // FM dies, Jack survives (independent causes contamination)
    expect(dead(p.FM)).toBe(true);
    expect(alive(p.Jack)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   D11 — Multi-Role Night Interaction Combos
   ═══════════════════════════════════════════════════════════════════ */
describe('D11 — Multi-role night combos', () => {

  it('D11.1 — Watson heals target + Mafia shoots target → target survives', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Doc: 'drWatson', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const results = nightRound(game, {
      drWatson:  { actorIds: [p.Doc.id], targetId: p.SC1.id, actionType: 'heal' },
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'kill', mode: 'shoot' },
    });
    expect(alive(p.SC1)).toBe(true);
    expect(results.saved).toContain(p.SC1.id);
  });

  it('D11.2 — Lecter heals GF + Sniper shoots GF → GF survives (shield + heal)', () => {
    const { game, p } = setup({
      GF: 'godfather', Lect: 'drLecter', SM: 'simpleMafia',
      Snip: 'sniper', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    const results = nightRound(game, {
      drLecter: { actorIds: [p.Lect.id], targetId: p.GF.id, actionType: 'mafia_heal' },
      sniper:   { actorIds: [p.Snip.id], targetId: p.GF.id, actionType: 'snipe' },
    });
    expect(alive(p.GF)).toBe(true); // Protected by heal and/or shield
  });

  it('D11.3 — Jadoogar blocks Watson + Joker reverses detective + Mafia kills → all effects apply', () => {
    const { game, p } = setup({
      GF: 'godfather', Jad: 'jadoogar', Jok: 'joker', SM: 'simpleMafia',
      Doc: 'drWatson', Det: 'detective',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
    });
    const results = nightRound(game, {
      jadoogar:  { actorIds: [p.Jad.id], targetId: p.Doc.id, actionType: 'block' },
      drWatson:  { actorIds: [p.Doc.id], targetId: p.SC1.id, actionType: 'heal' },
      joker:     { actorIds: [p.Jok.id], targetId: p.SC2.id },
      detective: { actorIds: [p.Det.id], targetId: p.SC2.id, actionType: 'investigate' },
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'kill', mode: 'shoot' },
    });
    // Watson blocked → SC1 not healed → killed by mafia
    expect(dead(p.SC1)).toBe(true);
    // Joker on SC2 + detective on SC2 → reversed (citizen negative → positive)
    expect(results.investigated.result).toBe('positive');
    expect(results.blocked).toBe(p.Doc.id);
  });

  it('D11.4 — Mafia shoots Jack → Jack immune, Zodiac shoots citizen → citizen dies', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack', Zod: 'zodiac',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    p.Jack.curse.place(p.SC2.id);
    const results = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.Jack.id, actionType: 'kill', mode: 'shoot' },
      zodiac:    { actorIds: [p.Zod.id], targetId: p.SC1.id, actionType: 'kill' },
    });
    expect(alive(p.Jack)).toBe(true); // Immune to mafia shoot
    expect(dead(p.SC1)).toBe(true);   // Zodiac killed citizen
  });

  it('D11.5 — Sniper shoots citizen → sniper dies as penalty', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Snip: 'sniper', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const results = nightRound(game, {
      sniper: { actorIds: [p.Snip.id], targetId: p.SC1.id, actionType: 'snipe' },
    });
    expect(dead(p.Snip)).toBe(true);   // Sniper penalty for shooting citizen
    expect(alive(p.SC1)).toBe(true);   // Citizen survives sniper misidentification
  });

  it('D11.6 — Zodiac shoots bodyguard → zodiac dies, bodyguard survives', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Zod: 'zodiac', BG: 'bodyguard',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    const results = nightRound(game, {
      zodiac: { actorIds: [p.Zod.id], targetId: p.BG.id, actionType: 'kill' },
    });
    expect(dead(p.Zod)).toBe(true);   // Zodiac dies shooting bodyguard
    expect(alive(p.BG)).toBe(true);   // Bodyguard survives
  });

  it('D11.7 — Salakhi correct guess bypasses heal and shield', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Doc: 'drWatson', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', Snip: 'sniper', SC4: 'simpleCitizen',
    });
    const results = nightRound(game, {
      drWatson:  { actorIds: [p.Doc.id], targetId: p.Snip.id, actionType: 'heal' },
      godfather: { actorIds: [p.GF.id], targetId: p.Snip.id, actionType: 'kill', mode: 'salakhi', guessedRoleId: 'sniper' },
    });
    // Salakhi correct → kills despite heal and shield
    expect(dead(p.Snip)).toBe(true);
  });

  it('D11.8 — Salakhi wrong guess → target survives', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Doc: 'drWatson', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const results = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.Doc.id, actionType: 'kill', mode: 'salakhi', guessedRoleId: 'sniper' },
    });
    // Wrong guess → target survives
    expect(alive(p.Doc)).toBe(true);
  });

  it('D11.9 — Mafia shoots Zodiac → Zodiac immune to night shot', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Zod: 'zodiac', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    const results = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.Zod.id, actionType: 'kill', mode: 'shoot' },
    });
    expect(alive(p.Zod)).toBe(true); // Zodiac immune to night shots
  });

  it('D11.10 — Detective investigates negotiated citizen same night → sees positive', () => {
    const { game, p } = setup({
      GF: 'godfather', Neg: 'negotiator', SM: 'simpleMafia', Det: 'detective',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    game._negotiateThreshold = 10;
    const results = nightRound(game, {
      negotiator: { actorIds: [p.Neg.id], targetId: p.SC1.id, actionType: 'negotiate' },
      detective:  { actorIds: [p.Det.id], targetId: p.SC1.id, actionType: 'investigate' },
    });
    // SC1 just recruited → shows as mafia → positive
    expect(results.investigated.result).toBe('positive');
  });

  it('D11.11 — Joker reverses detective on negotiated player same night → negative', () => {
    const { game, p } = setup({
      GF: 'godfather', Neg: 'negotiator', Jok: 'joker', Det: 'detective',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    game._negotiateThreshold = 10;
    const results = nightRound(game, {
      negotiator: { actorIds: [p.Neg.id], targetId: p.SC1.id, actionType: 'negotiate' },
      joker:      { actorIds: [p.Jok.id], targetId: p.SC1.id },
      detective:  { actorIds: [p.Det.id], targetId: p.SC1.id, actionType: 'investigate' },
    });
    // SC1 negotiated → positive, then joker reverses → negative
    expect(results.investigated.result).toBe('negative');
  });

  it('D11.12 — Constantine revives player killed previous night', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Const: 'constantine', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
    // Night 1: kill SC1
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'kill', mode: 'shoot' },
    });
    expect(dead(p.SC1)).toBe(true);

    // Night 2: Constantine revives SC1
    game.round = 2;
    const results = nightRound(game, {
      constantine: { actorIds: [p.Const.id], targetId: p.SC1.id, actionType: 'revive' },
    });
    expect(alive(p.SC1)).toBe(true);
  });

  it('D11.13 — Cowboy action is not blockable by Jadoogar (day action)', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Jad: 'jadoogar',
      Cow: 'cowboy', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    // Night: jadoogar blocks cowboy
    nightRound(game, {
      jadoogar: { actorIds: [p.Jad.id], targetId: p.Cow.id, actionType: 'block' },
    });
    // Day: cowboy still acts (day action, not blocked)
    game.startDay();
    const result = game.resolveCowboyAction(p.SM.id);
    expect(result).toBeDefined();
    expect(result.cowboyDied).toBe(true);
    expect(dead(p.SM)).toBe(true); // SM eliminated by cowboy
  });

  it('D11.14 — Morning shot not blocked by Jadoogar (day action)', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Jad: 'jadoogar',
      Gun: 'gunner', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
    game.bulletManager.init(2, 2);
    // Night: jadoogar blocks SC1, gunner gives live to SC1
    nightRound(game, {
      jadoogar: { actorIds: [p.Jad.id], targetId: p.SC1.id, actionType: 'block' },
      gunner:   { actorIds: [p.Gun.id], bulletAssignments: [{ holderId: p.SC1.id, type: 'live' }] },
    });
    // Day: SC1 shoots SM — jadoogar block doesn't affect day actions
    game.startDay();
    const result = game.resolveMorningShot(p.SC1.id, p.SM.id);
    expect(result).toBeDefined();
    expect(result.killed).toBe(true);
    expect(dead(p.SM)).toBe(true);
  });
});
