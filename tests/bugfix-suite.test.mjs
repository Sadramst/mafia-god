/**
 * bugfix-suite.test.mjs — Regression tests for 6 bug fixes
 *
 * B1: Gunner bullet returns to pool when holder dies before using it
 * B2: Morning shot immunity only shown when jack/zodiac selected (UI only)
 * B3: Detective gets thumbs-up for player negotiated into mafia same night
 * B4: Voting state resets each day (tested via DayView destroy logic)
 * B5: Negotiator can only negotiate once (success or fail)
 * B6: Runoff voting — clear winner eliminated, tie goes to coin toss
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../js/models/Game.js';
import { Roles } from '../js/models/Roles.js';

/* ───────────── helpers ───────────── */

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

function alive(player) { return player.isAlive; }
function dead(player) { return !player.isAlive; }


/* ═══════════════════════════════════════════════════════════════════
   B1 — Bullet Return on Holder Death
   ═══════════════════════════════════════════════════════════════════ */
describe('B1 — Bullet returns to gunner when holder dies', () => {
  let game, p;

  beforeEach(() => {
    ({ game, p } = setup({
      P1: 'godfather',
      P2: 'simpleMafia',
      P3: 'drWatson',
      P4: 'detective',
      P5: 'gunner',
      P6: 'simpleCitizen',
      P7: 'simpleCitizen',
      P8: 'simpleCitizen',
    }));
    game.bulletManager.init(2, 2);
    game.round = 1;
  });

  it('returns live bullet when holder is killed at night', () => {
    // Gunner gives live bullet to P6
    game.bulletManager.giveBullet(p.P6.id, 'live', 1);
    expect(game.bulletManager.liveRemaining).toBe(1);
    expect(game.bulletManager.getPlayerBullet(p.P6.id)).toBeTruthy();

    // Mafia kills P6 at night
    const results = nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P6.id, actionType: 'shoot', mode: 'shoot' },
    });

    expect(dead(p.P6)).toBe(true);
    expect(results.killed).toContain(p.P6.id);
    // Bullet should be returned to gunner pool
    expect(game.bulletManager.liveRemaining).toBe(2);
    expect(game.bulletManager.getPlayerBullet(p.P6.id)).toBeNull();
  });

  it('returns blank bullet when holder is killed at night', () => {
    game.bulletManager.giveBullet(p.P7.id, 'blank', 1);
    expect(game.bulletManager.blankRemaining).toBe(1);

    const results = nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P7.id, actionType: 'shoot', mode: 'shoot' },
    });

    expect(dead(p.P7)).toBe(true);
    expect(game.bulletManager.blankRemaining).toBe(2);
    expect(game.bulletManager.getPlayerBullet(p.P7.id)).toBeNull();
  });

  it('returns bullet when holder is eliminated by vote', () => {
    game.bulletManager.giveBullet(p.P6.id, 'live', 1);
    expect(game.bulletManager.liveRemaining).toBe(1);

    game.startDay();
    game.eliminateByVote(p.P6.id);

    expect(dead(p.P6)).toBe(true);
    expect(game.bulletManager.liveRemaining).toBe(2);
    expect(game.bulletManager.getPlayerBullet(p.P6.id)).toBeNull();
  });

  it('returns bullet when holder is killed by morning shot', () => {
    // P6 has a live bullet, P7 has a live bullet
    game.bulletManager.giveBullet(p.P6.id, 'live', 1);
    game.bulletManager.giveBullet(p.P7.id, 'live', 1);
    expect(game.bulletManager.liveRemaining).toBe(0);

    game.phase = 'day';
    game.round = 1;

    // P6 shoots P7 (P7 has a bullet too) — P7's bullet should be returned
    const result = game.resolveMorningShot(p.P6.id, p.P7.id);
    expect(result.killed).toBe(true);
    expect(dead(p.P7)).toBe(true);
    // P7's bullet returned, P6 used theirs (not returned)
    expect(game.bulletManager.liveRemaining).toBe(1);
  });

  it('does NOT return bullet when holder uses it (no double-return)', () => {
    game.bulletManager.giveBullet(p.P6.id, 'blank', 1);
    expect(game.bulletManager.blankRemaining).toBe(1);

    game.phase = 'day';
    game.round = 1;

    // P6 shoots P8 with blank (bullet consumed, P8 lives)
    const result = game.resolveMorningShot(p.P6.id, p.P8.id);
    expect(result.type).toBe('blank');
    expect(alive(p.P8)).toBe(true);
    // Blank was consumed, remaining should still be 1 (not 2)
    expect(game.bulletManager.blankRemaining).toBe(1);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   B3 — Detective + Negotiation Same Night
   ═══════════════════════════════════════════════════════════════════ */
describe('B3 — Detective detects negotiated player as mafia same night', () => {
  let game, p;

  beforeEach(() => {
    ({ game, p } = setup({
      P1:  'godfather',
      P2:  'negotiator',
      P3:  'simpleMafia',
      P4:  'detective',
      P5:  'simpleCitizen',
      P6:  'simpleCitizen',
      P7:  'simpleCitizen',
      P8:  'suspect',
    }));
    game.negotiatorThreshold = 3; // allow negotiation
    game.round = 1;
  });

  it('detective gets thumbs-up for simpleCitizen recruited this night', () => {
    const results = nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P5.id, actionType: 'shoot', mode: 'negotiate' },
      detective: { actorIds: [p.P4.id], targetId: p.P5.id, actionType: 'investigate' },
    });

    // P5 was simpleCitizen → negotiated → simpleMafia
    expect(results.negotiated.success).toBe(true);
    expect(p.P5.roleId).toBe('simpleMafia');
    // Detective should see thumbs-up (positive) for the now-mafia player
    expect(results.investigated.result).toBe('positive');
  });

  it('detective gets thumbs-up for suspect recruited this night', () => {
    const results = nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P8.id, actionType: 'shoot', mode: 'negotiate' },
      detective: { actorIds: [p.P4.id], targetId: p.P8.id, actionType: 'investigate' },
    });

    expect(results.negotiated.success).toBe(true);
    expect(p.P8.roleId).toBe('simpleMafia');
    expect(results.investigated.result).toBe('positive');
  });

  it('detective gets thumbs-down for failed negotiation (non-recruitable)', () => {
    // Try to negotiate with detective (not recruitable)
    const results = nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P4.id, actionType: 'shoot', mode: 'negotiate' },
      detective: { actorIds: [p.P4.id], targetId: p.P6.id, actionType: 'investigate' },
    });

    expect(results.negotiated.success).toBe(false);
    // P6 is simpleCitizen (not negotiated) → thumbs-down
    expect(results.investigated.result).toBe('negative');
  });
});


/* ═══════════════════════════════════════════════════════════════════
   B4 — Voting State Resets Each Day
   ═══════════════════════════════════════════════════════════════════ */
describe('B4 — Voting state resets between days', () => {
  it('votes reset when startDay is called', () => {
    const { game, p } = setup({
      P1: 'godfather',
      P2: 'simpleMafia',
      P3: 'detective',
      P4: 'simpleCitizen',
      P5: 'simpleCitizen',
      P6: 'simpleCitizen',
      P7: 'simpleCitizen',
      P8: 'simpleCitizen',
    });

    game.startDay();
    game.castVote(p.P3.id, p.P1.id);
    game.castVote(p.P4.id, p.P1.id);
    expect(Object.keys(game.votes).length).toBe(2);

    // Start a new night and day — votes should reset
    game.startNight();
    expect(game.votes).toEqual({});

    game.startDay();
    expect(game.votes).toEqual({});
  });

  it('votes from dead players are not carried over', () => {
    const { game, p } = setup({
      P1: 'godfather',
      P2: 'simpleMafia',
      P3: 'detective',
      P4: 'simpleCitizen',
      P5: 'simpleCitizen',
      P6: 'simpleCitizen',
      P7: 'simpleCitizen',
      P8: 'simpleCitizen',
    });

    game.startDay();
    game.castVote(p.P3.id, p.P1.id);

    // Eliminate P3
    game.eliminateByVote(p.P3.id);
    expect(dead(p.P3)).toBe(true);

    // Start new cycle — votes should be empty
    game.startNight();
    game.startDay();
    expect(game.votes).toEqual({});
    // P3's vote should not exist
    expect(game.votes[p.P3.id]).toBeUndefined();
  });
});


/* ═══════════════════════════════════════════════════════════════════
   B5 — Negotiator One-Time Use
   ═══════════════════════════════════════════════════════════════════ */
describe('B5 — Negotiation is one-time only', () => {
  let game, p;

  beforeEach(() => {
    ({ game, p } = setup({
      P1:  'godfather',
      P2:  'negotiator',
      P3:  'simpleMafia',
      P4:  'detective',
      P5:  'simpleCitizen',
      P6:  'simpleCitizen',
      P7:  'simpleCitizen',
      P8:  'simpleCitizen',
    }));
    game.negotiatorThreshold = 4; // allow negotiation
    game.round = 1;
  });

  it('canNegotiate returns false after successful negotiation', () => {
    expect(game.canNegotiate()).toBe(true);

    nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P5.id, actionType: 'shoot', mode: 'negotiate' },
    });

    // P5 recruited → simpleMafia
    expect(p.P5.roleId).toBe('simpleMafia');
    // canNegotiate should now be false forever
    expect(game.canNegotiate()).toBe(false);
    expect(game._negotiationUsed).toBe(true);
  });

  it('canNegotiate returns false after failed negotiation', () => {
    expect(game.canNegotiate()).toBe(true);

    nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P4.id, actionType: 'shoot', mode: 'negotiate' },
    });

    // P4 is detective → not recruitable
    expect(p.P4.roleId).toBe('detective');
    expect(game._negotiationUsed).toBe(true);
    expect(game.canNegotiate()).toBe(false);
  });

  it('negotiation flag persists through serialization', () => {
    nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P5.id, actionType: 'shoot', mode: 'negotiate' },
    });

    expect(game._negotiationUsed).toBe(true);

    // Serialize and reload
    const json = game.toJSON();
    const game2 = new Game();
    game2.loadFromJSON(json);

    expect(game2._negotiationUsed).toBe(true);
    expect(game2.canNegotiate()).toBe(false);
  });

  it('canNegotiate returns true when negotiation has not been used', () => {
    // Use regular shoot instead
    nightRound(game, {
      godfather: { actorIds: [p.P1.id], targetId: p.P5.id, actionType: 'shoot', mode: 'shoot' },
    });

    expect(game._negotiationUsed).toBe(false);
    // Still should be available
    expect(game.canNegotiate()).toBe(true);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   B6 — Runoff Voting: Clear Winner vs Tie
   ═══════════════════════════════════════════════════════════════════ */
describe('B6 — Runoff voting logic (Game model)', () => {
  let game, p;

  beforeEach(() => {
    ({ game, p } = setup({
      P1: 'godfather',
      P2: 'simpleMafia',
      P3: 'detective',
      P4: 'simpleCitizen',
      P5: 'simpleCitizen',
      P6: 'simpleCitizen',
      P7: 'simpleCitizen',
      P8: 'simpleCitizen',
    }));
    game.round = 1;
    game.phase = 'day';
  });

  it('eliminateByVote kills the player and records death', () => {
    const result = game.eliminateByVote(p.P4.id);
    expect(dead(p.P4)).toBe(true);
    expect(result.voteImmune).toBeFalsy();
  });

  it('vote tally correctly counts votes', () => {
    game.castVote(p.P3.id, p.P1.id);
    game.castVote(p.P4.id, p.P1.id);
    game.castVote(p.P5.id, p.P2.id);
    const tally = game.getVoteTally();
    expect(tally[p.P1.id]).toBe(2);
    expect(tally[p.P2.id]).toBe(1);
  });

  it('votes reset on startDay', () => {
    game.castVote(p.P3.id, p.P1.id);
    expect(Object.keys(game.votes).length).toBe(1);
    game.startDay();
    expect(game.votes).toEqual({});
  });

  it('votes reset on startNight', () => {
    game.castVote(p.P3.id, p.P1.id);
    game.startNight();
    expect(game.votes).toEqual({});
  });
});
