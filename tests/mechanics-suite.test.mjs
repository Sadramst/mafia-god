/**
 * mechanics-suite.test.mjs â€” Tests for:
 *   M1: Beautiful Mind card availability (only when independent alive)
 *   M2: Jack vote immunity
 *   M3: Salakhi vs independents (Jack & Zodiac)
 *   M4: Negotiate ability (Negotiator-based, mutually exclusive with shoot/salakhi)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../js/models/Game.js';
import { Roles } from '../js/models/Roles.js';
import { CARD } from '../js/models/LastActionManager.js';

/* â”€â”€â”€ Helpers â”€â”€â”€ */

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


/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   M1 â€” Beautiful Mind card only available when alive independent
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
describe('M1 â€” Beautiful Mind card availability', () => {

  it('M1.1 â€” Beautiful Mind is auto-discarded when no independent exists in roster', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Doc: 'doctor', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
        // Force all cards to unused except Beautiful Mind
    game.lastActionManager.cards.forEach(c => { c.used = (c.id !== CARD.BEAUTIFUL_MIND); });

    // With no independent in the game, drawing should auto-discard Beautiful Mind
    const result = game.drawLastActionFor(p.SC1.id);
    expect(result).toBeNull(); // Only card was BM, now auto-discarded â†’ null
  });

  it('M1.2 â€” Beautiful Mind is auto-discarded when all independents are dead', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack', Doc: 'doctor',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
        // Kill Jack
    p.Jack.kill(1, 'salakhi', false);

    // Force only Beautiful Mind remaining
    game.lastActionManager.cards.forEach(c => { c.used = (c.id !== CARD.BEAUTIFUL_MIND); });

    const result = game.drawLastActionFor(p.SC1.id);
    expect(result).toBeNull();
  });

  it('M1.3 â€” Beautiful Mind is available when an independent is alive', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack', Doc: 'doctor',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
        // Force only Beautiful Mind remaining
    game.lastActionManager.cards.forEach(c => { c.used = (c.id !== CARD.BEAUTIFUL_MIND); });

    // Jack is alive â†’ Beautiful Mind should be drawable
    const result = game.drawLastActionFor(p.SC1.id);
    expect(result).not.toBeNull();
    expect(result.card.id).toBe(CARD.BEAUTIFUL_MIND);
  });

  it('M1.4 â€” Beautiful Mind correct guess kills independent and revives victim', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack', Doc: 'doctor',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
        // Simulate SC1 voted out
    p.SC1.kill(1, 'vote');

    const result = game.applyLastActionCard(CARD.BEAUTIFUL_MIND, p.SC1.id, p.Jack.id);
    expect(result.success).toBe(true);
    expect(result.eliminated).toBe(p.Jack.id);
    expect(result.revived).toBe(p.SC1.id);
    expect(dead(p.Jack)).toBe(true);
    expect(alive(p.SC1)).toBe(true);
  });

  it('M1.5 â€” Beautiful Mind wrong guess (non-independent) fails', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack', Doc: 'doctor',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
        p.SC1.kill(1, 'vote');

    const result = game.applyLastActionCard(CARD.BEAUTIFUL_MIND, p.SC1.id, p.Doc.id);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('wrong');
    expect(dead(p.SC1)).toBe(true); // SC1 stays dead
    expect(alive(p.Doc)).toBe(true); // Doc unaffected
  });

  it('M1.6 â€” Other cards still drawn when Beautiful Mind auto-discarded (no independent)', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Doc: 'doctor', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
        // Force two cards remaining: Beautiful Mind + Final Shoot
    game.lastActionManager.cards.forEach(c => {
      c.used = (c.id !== CARD.BEAUTIFUL_MIND && c.id !== CARD.FINAL_SHOOT);
    });

    // No independent â†’ BM auto-discarded, but Final Shoot should still draw
    const result = game.drawLastActionFor(p.SC1.id);
    expect(result).not.toBeNull();
    expect(result.card.id).toBe(CARD.FINAL_SHOOT);
  });
});


/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   M2 â€” Jack vote immunity
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
describe('M2 â€” Jack vote immunity', () => {

  it('M2.1 â€” Jack cannot be executed by day vote', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack', Doc: 'doctor',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
        const result = game.eliminateByVote(p.Jack.id);
    expect(result.voteImmune).toBe(true);
    expect(alive(p.Jack)).toBe(true);
  });

  it('M2.2 â€” isVoteImmune returns true for Jack', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack', Doc: 'doctor',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
        expect(game.isVoteImmune(p.Jack.id)).toBe(true);
  });

  it('M2.3 â€” isVoteImmune returns false for regular citizen', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack', Doc: 'doctor',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
        expect(game.isVoteImmune(p.SC1.id)).toBe(false);
  });

  it('M2.4 â€” Jack vote attempt does not trigger curse chain', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack', Doc: 'doctor',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
        // Set Jack's curse on SC1
    p.Jack.curse.place(p.SC1.id);

    // Try to vote out Jack â€” should be immune
    const result = game.eliminateByVote(p.Jack.id);
    expect(result.voteImmune).toBe(true);
    expect(alive(p.Jack)).toBe(true);
    // Curse should NOT be triggered since Jack wasn't eliminated
    expect(result.jackCurseTriggered).toBeUndefined();
  });

  it('M2.5 â€” Zodiac can be voted out (not vote immune)', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Zodiac: 'zodiac', Doc: 'doctor',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
        expect(game.isVoteImmune(p.Zodiac.id)).toBe(false);

    const result = game.eliminateByVote(p.Zodiac.id);
    expect(result.voteImmune).toBeUndefined();
    expect(dead(p.Zodiac)).toBe(true);
  });

  it('M2.6 â€” Jack curse triggers when cursed target is voted out', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack', Doc: 'doctor',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
        // Jack curses SC1
    p.Jack.curse.place(p.SC1.id);

    // Vote out SC1 â€” should trigger Jack's curse
    const result = game.eliminateByVote(p.SC1.id);
    expect(dead(p.SC1)).toBe(true);
    expect(result.jackCurseTriggered).toBe(true);
    expect(dead(p.Jack)).toBe(true);
  });

  it('M2.7 â€” Godfather can be voted out (not vote immune)', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack', Doc: 'doctor',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
        expect(game.isVoteImmune(p.GF.id)).toBe(false);

    const result = game.eliminateByVote(p.GF.id);
    expect(dead(p.GF)).toBe(true);
  });
});


/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   M3 â€” Salakhi vs independents
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
describe('M3 â€” Salakhi kills independents', () => {

  it('M3.1 â€” Salakhi correctly guesses Jack â†’ Jack dies', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack', Doc: 'doctor',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
        const results = nightRound(game, {
      godfather: { targetId: p.Jack.id, mode: 'salakhi', guessedRoleId: 'jack' },
    });

    expect(dead(p.Jack)).toBe(true);
    expect(p.Jack.deathCause).toBe('salakhi');
    expect(p.Jack.isRevivable).toBe(false);
    expect(results.salakhied.playerId).toBe(p.Jack.id);
    expect(results.salakhied.correct).toBe(true);
  });

  it('M3.2 â€” Salakhi wrong guess on Jack â†’ Jack survives', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack', Doc: 'doctor',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
        const results = nightRound(game, {
      godfather: { targetId: p.Jack.id, mode: 'salakhi', guessedRoleId: 'zodiac' },
    });

    expect(alive(p.Jack)).toBe(true);
    expect(results.salakhied.correct).toBe(false);
  });

  it('M3.3 â€” Salakhi correctly guesses Zodiac â†’ Zodiac dies', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Zodiac: 'zodiac', Doc: 'doctor',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
        const results = nightRound(game, {
      godfather: { targetId: p.Zodiac.id, mode: 'salakhi', guessedRoleId: 'zodiac' },
    });

    expect(dead(p.Zodiac)).toBe(true);
    expect(p.Zodiac.deathCause).toBe('salakhi');
    expect(p.Zodiac.isRevivable).toBe(false);
    expect(results.salakhied.correct).toBe(true);
  });

  it('M3.4 â€” Salakhi wrong guess on Zodiac â†’ Zodiac survives', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Zodiac: 'zodiac', Doc: 'doctor',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
        const results = nightRound(game, {
      godfather: { targetId: p.Zodiac.id, mode: 'salakhi', guessedRoleId: 'jack' },
    });

    expect(alive(p.Zodiac)).toBe(true);
    expect(results.salakhied.correct).toBe(false);
  });

  it('M3.5 â€” Salakhi death is not revivable (Jack)', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack', Doc: 'doctor',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
        nightRound(game, {
      godfather: { targetId: p.Jack.id, mode: 'salakhi', guessedRoleId: 'jack' },
    });

    expect(dead(p.Jack)).toBe(true);
    expect(p.Jack.isRevivable).toBe(false);
  });

  it('M3.6 â€” Salakhi bypasses doctor heal on Jack', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack', Doc: 'doctor',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
        const results = nightRound(game, {
      godfather: { targetId: p.Jack.id, mode: 'salakhi', guessedRoleId: 'jack' },
      doctor: { targetId: p.Jack.id },
    });

    // Salakhi bypasses all protection
    expect(dead(p.Jack)).toBe(true);
    expect(p.Jack.deathCause).toBe('salakhi');
  });

  it('M3.7 â€” Regular mafia shoot does not affect Jack (shoot immune)', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack', Doc: 'doctor',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
        const results = nightRound(game, {
      godfather: { targetId: p.Jack.id, mode: 'shoot' },
    });

    expect(alive(p.Jack)).toBe(true);
    expect(results.killed).not.toContain(p.Jack.id);
  });

  it('M3.8 â€” Regular mafia shoot does not affect Zodiac (shoot immune)', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Zodiac: 'zodiac', Doc: 'doctor',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
        const results = nightRound(game, {
      godfather: { targetId: p.Zodiac.id, mode: 'shoot' },
    });

    expect(alive(p.Zodiac)).toBe(true);
    expect(results.killed).not.toContain(p.Zodiac.id);
  });
});


/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   M4 â€” Negotiate ability (Negotiator-based)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
describe('M4 â€” Negotiate mechanics', () => {

  it('M4.1 â€” canNegotiate requires negotiator alive', () => {
    const { game, p } = setup({
      GF: 'godfather', Neg: 'negotiator',
      Doc: 'doctor', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
        // Default threshold is 2; alive mafia = GF + Neg = 2 â†’ should be able to negotiate
    expect(game.canNegotiate()).toBe(true);

    // Kill negotiator
    p.Neg.kill(1, 'vote');
    expect(game.canNegotiate()).toBe(false);
  });

  it('M4.2 â€” canNegotiate blocked when alive mafia > threshold', () => {
    const { game, p } = setup({
      GF: 'godfather', Neg: 'negotiator', SM: 'simpleMafia',
      Doc: 'doctor', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
        // alive mafia = 3 (GF + Neg + SM), threshold = 2 â†’ cannot negotiate
    expect(game.canNegotiate()).toBe(false);

    // Kill SM â†’ alive mafia = 2 â†’ can negotiate
    p.SM.kill(1, 'vote');
    expect(game.canNegotiate()).toBe(true);
  });

  it('M4.3 â€” Negotiate recruits simpleCitizen â†’ becomes simpleMafia', () => {
    const { game, p } = setup({
      GF: 'godfather', Neg: 'negotiator',
      Doc: 'doctor', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
        const results = nightRound(game, {
      godfather: { targetId: p.SC1.id, mode: 'negotiate' },
    });

    expect(results.negotiated.success).toBe(true);
    expect(p.SC1.roleId).toBe('simpleMafia');
    expect(alive(p.SC1)).toBe(true);
  });

  it('M4.4 â€” Negotiate recruits suspect â†’ becomes simpleMafia', () => {
    const { game, p } = setup({
      GF: 'godfather', Neg: 'negotiator',
      Doc: 'doctor', Sus: 'suspect',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
        const results = nightRound(game, {
      godfather: { targetId: p.Sus.id, mode: 'negotiate' },
    });

    expect(results.negotiated.success).toBe(true);
    expect(p.Sus.roleId).toBe('simpleMafia');
  });

  it('M4.5 â€” Negotiate fails on non-recruitable role (doctor)', () => {
    const { game, p } = setup({
      GF: 'godfather', Neg: 'negotiator',
      Doc: 'doctor', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
        const results = nightRound(game, {
      godfather: { targetId: p.Doc.id, mode: 'negotiate' },
    });

    expect(results.negotiated.success).toBe(false);
    expect(p.Doc.roleId).toBe('doctor'); // Role unchanged
  });

  it('M4.6 â€” Negotiate is one-time only', () => {
    const { game, p } = setup({
      GF: 'godfather', Neg: 'negotiator',
      Doc: 'doctor', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
        expect(game.canNegotiate()).toBe(true);

    // Use negotiate
    nightRound(game, {
      godfather: { targetId: p.SC1.id, mode: 'negotiate' },
    });

    // Should be used now, even if conditions still met
    expect(game.canNegotiate()).toBe(false);
  });

  it('M4.7 â€” Negotiate night: no mafia shoot (mode is mutually exclusive)', () => {
    const { game, p } = setup({
      GF: 'godfather', Neg: 'negotiator',
      Doc: 'doctor', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
        // Negotiate instead of shooting
    const results = nightRound(game, {
      godfather: { targetId: p.SC1.id, mode: 'negotiate' },
    });

    // Nobody should be killed by mafia this night
    expect(results.killed.length).toBe(0);
    // SC1 was recruited, not killed
    expect(alive(p.SC1)).toBe(true);
  });

  it('M4.8 â€” Failed negotiate: no one dies, mafia loses shoot', () => {
    const { game, p } = setup({
      GF: 'godfather', Neg: 'negotiator',
      Doc: 'doctor', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });
        // Negotiate with doctor (non-recruitable) â†’ fails
    const results = nightRound(game, {
      godfather: { targetId: p.Doc.id, mode: 'negotiate' },
    });

    expect(results.negotiated.success).toBe(false);
    // No one dies â€” mafia lost their action this night
    expect(results.killed.length).toBe(0);
    expect(alive(p.Doc)).toBe(true);
  });

  it('M4.9 â€” canNegotiate with custom threshold', () => {
    const { game, p } = setup({
      GF: 'godfather', Neg: 'negotiator', SM: 'simpleMafia',
      Doc: 'doctor', SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
        // Default threshold = 2, alive mafia = 3 â†’ false
    expect(game.canNegotiate()).toBe(false);

    // Increase threshold to 3
    game.negotiatorThreshold = 3;
    expect(game.canNegotiate()).toBe(true);
  });

  it('M4.10 â€” Negotiate fails on independent (Jack)', () => {
    const { game, p } = setup({
      GF: 'godfather', Neg: 'negotiator',
      Jack: 'jack', Doc: 'doctor',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });
        const results = nightRound(game, {
      godfather: { targetId: p.Jack.id, mode: 'negotiate' },
    });

    // Jack is not simpleCitizen or suspect â†’ negotiation fails
    expect(results.negotiated.success).toBe(false);
    expect(p.Jack.roleId).toBe('jack'); // Unchanged
    expect(alive(p.Jack)).toBe(true);   // Not killed either
  });
});
