/**
 * manual-assign-suite.test.mjs — Tests for manual role assignment:
 *   MA1: Pool construction & remaining-role bookkeeping
 *   MA2: Turn order & assignment correctness
 *   MA3: Rejection of invalid picks
 *   MA4: Completion triggers the same finalize path as random assignment
 *   MA5: Manually-assigned roles behave identically in the engine afterwards
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../js/models/Game.js';
import { Roles } from '../js/models/Roles.js';

function makeGame(playerNames, selectedRoles) {
  const game = new Game();
  playerNames.forEach(name => game.addPlayer(name));
  game.setSelectedRoles(selectedRoles);
  return game;
}

const EIGHT_PLAYER_ROLES = {
  godfather: 1,
  drLecter: 1,
  detective: 1,
  drWatson: 1,
  simpleCitizen: 4,
};

/* ═══════════════════════════════════════════════════════════════
   MA1 — Pool construction & remaining-role bookkeeping
   ═══════════════════════════════════════════════════════════════ */
describe('MA1 — Manual pool construction', () => {

  it('MA1.1 — startManualAssignment builds a pool matching selectedRoles counts', () => {
    const game = makeGame(['P1','P2','P3','P4','P5','P6','P7','P8'], EIGHT_PLAYER_ROLES);
    game.startManualAssignment();

    const remaining = game.getManualRemainingRoles();
    const totalRemaining = remaining.reduce((s, r) => s + r.count, 0);
    expect(totalRemaining).toBe(8);
    const scEntry = remaining.find(r => r.roleId === 'simpleCitizen');
    expect(scEntry.count).toBe(4);
    expect(game.phase).toBe('manualAssign');
  });

  it('MA1.2 — remaining count decrements as copies of a multi-count role are picked', () => {
    const game = makeGame(['P1','P2','P3','P4','P5','P6','P7','P8'], EIGHT_PLAYER_ROLES);
    game.startManualAssignment();

    game.assignManualRole('simpleCitizen');
    let sc = game.getManualRemainingRoles().find(r => r.roleId === 'simpleCitizen');
    expect(sc.count).toBe(3);

    game.assignManualRole('simpleCitizen');
    sc = game.getManualRemainingRoles().find(r => r.roleId === 'simpleCitizen');
    expect(sc.count).toBe(2);
  });

  it('MA1.3 — a role disappears from the remaining pool once its count hits 0', () => {
    const game = makeGame(['P1','P2','P3','P4','P5','P6','P7','P8'], EIGHT_PLAYER_ROLES);
    game.startManualAssignment();

    game.assignManualRole('godfather');
    const gf = game.getManualRemainingRoles().find(r => r.roleId === 'godfather');
    expect(gf).toBeUndefined();
  });

  it('MA1.4 — starting manual assignment again resets the pool cleanly', () => {
    const game = makeGame(['P1','P2','P3','P4','P5','P6','P7','P8'], EIGHT_PLAYER_ROLES);
    game.startManualAssignment();
    game.assignManualRole('godfather');
    game.assignManualRole('drWatson');

    // Restart from scratch (e.g. God backs out and starts over)
    game.startManualAssignment();
    const remaining = game.getManualRemainingRoles();
    expect(remaining.reduce((s, r) => s + r.count, 0)).toBe(8);
    expect(game.getManualCurrentPlayer().name).toBe('P1');
  });
});

/* ═══════════════════════════════════════════════════════════════
   MA2 — Turn order & assignment correctness
   ═══════════════════════════════════════════════════════════════ */
describe('MA2 — Turn order', () => {

  it('MA2.1 — players pick in the order they appear in game.players', () => {
    const game = makeGame(['P1','P2','P3','P4','P5','P6','P7','P8'], EIGHT_PLAYER_ROLES);
    game.startManualAssignment();

    expect(game.getManualCurrentPlayer().name).toBe('P1');
    game.assignManualRole('godfather');
    expect(game.getManualCurrentPlayer().name).toBe('P2');
    game.assignManualRole('drWatson');
    expect(game.getManualCurrentPlayer().name).toBe('P3');
  });

  it('MA2.2 — assignManualRole sets roleId on the correct player, not the next one', () => {
    const game = makeGame(['P1','P2','P3','P4','P5','P6','P7','P8'], EIGHT_PLAYER_ROLES);
    game.startManualAssignment();
    const p1 = game.players[0];
    const p2 = game.players[1];

    game.assignManualRole('godfather');
    expect(p1.roleId).toBe('godfather');
    expect(p2.roleId).toBeNull();
  });

  it('MA2.3 — getManualCurrentPlayer returns null once assignment is complete', () => {
    const game = makeGame(['P1','P2','P3','P4','P5','P6','P7','P8'], EIGHT_PLAYER_ROLES);
    game.startManualAssignment();
    const pool = ['godfather','drLecter','detective','drWatson','simpleCitizen','simpleCitizen','simpleCitizen','simpleCitizen'];
    pool.forEach(roleId => game.assignManualRole(roleId));

    expect(game.getManualCurrentPlayer()).toBeNull();
    expect(game.isManualAssignmentComplete()).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════
   MA3 — Rejection of invalid picks
   ═══════════════════════════════════════════════════════════════ */
describe('MA3 — Invalid picks are rejected', () => {

  it('MA3.1 — picking a role not in selectedRoles fails and does not advance the turn', () => {
    const game = makeGame(['P1','P2','P3','P4','P5','P6','P7','P8'], EIGHT_PLAYER_ROLES);
    game.startManualAssignment();

    const ok = game.assignManualRole('zodiac'); // never selected
    expect(ok).toBe(false);
    expect(game.getManualCurrentPlayer().name).toBe('P1');
    expect(game.players[0].roleId).toBeNull();
  });

  it('MA3.2 — picking a role whose pool is already exhausted fails', () => {
    const game = makeGame(['P1','P2','P3','P4','P5','P6','P7','P8'], EIGHT_PLAYER_ROLES);
    game.startManualAssignment();
    game.assignManualRole('godfather'); // consumes the only godfather

    const ok = game.assignManualRole('godfather');
    expect(ok).toBe(false);
    expect(game.getManualCurrentPlayer().name).toBe('P2'); // still P2's turn, unaffected
  });

  it('MA3.3 — calling assignManualRole after completion is a no-op', () => {
    const game = makeGame(['P1','P2','P3','P4','P5','P6','P7','P8'], EIGHT_PLAYER_ROLES);
    game.startManualAssignment();
    ['godfather','drLecter','detective','drWatson','simpleCitizen','simpleCitizen','simpleCitizen','simpleCitizen']
      .forEach(roleId => game.assignManualRole(roleId));

    const ok = game.assignManualRole('simpleCitizen');
    expect(ok).toBe(false);
  });

  it('MA3.4 — assignManualRole before startManualAssignment is called fails safely', () => {
    const game = makeGame(['P1','P2'], { godfather: 1, simpleCitizen: 1 });
    const ok = game.assignManualRole('godfather');
    expect(ok).toBe(false);
  });
});

/* ═══════════════════════════════════════════════════════════════
   MA4 — Completion triggers the same finalize path as random assignment
   ═══════════════════════════════════════════════════════════════ */
describe('MA4 — Finalize parity with random assignment', () => {

  it('MA4.1 — phase becomes roleReveal only after the last player picks', () => {
    const game = makeGame(['P1','P2','P3','P4','P5','P6','P7','P8'], EIGHT_PLAYER_ROLES);
    game.startManualAssignment();
    const pool = ['godfather','drLecter','detective','drWatson','simpleCitizen','simpleCitizen','simpleCitizen'];
    pool.forEach(roleId => game.assignManualRole(roleId));
    expect(game.phase).toBe('manualAssign'); // 7 of 8 done

    game.assignManualRole('simpleCitizen');
    expect(game.phase).toBe('roleReveal');
  });

  it('MA4.2 — every player has a non-null roleId once complete, matching selectedRoles exactly', () => {
    const game = makeGame(['P1','P2','P3','P4','P5','P6','P7','P8'], EIGHT_PLAYER_ROLES);
    game.startManualAssignment();
    ['simpleCitizen','godfather','simpleCitizen','drWatson','simpleCitizen','detective','simpleCitizen','drLecter']
      .forEach(roleId => game.assignManualRole(roleId));

    expect(game.players.every(p => !!p.roleId)).toBe(true);
    const counts = {};
    game.players.forEach(p => { counts[p.roleId] = (counts[p.roleId] || 0) + 1; });
    expect(counts).toEqual(EIGHT_PLAYER_ROLES);
  });

  it('MA4.3 — gunner bulletManager is initialized when gunner was manually picked', () => {
    const roles = { godfather: 1, drWatson: 1, gunner: 1, simpleCitizen: 5 };
    const game = makeGame(['P1','P2','P3','P4','P5','P6','P7','P8'], roles);
    game.startManualAssignment();
    ['gunner','godfather','drWatson','simpleCitizen','simpleCitizen','simpleCitizen','simpleCitizen','simpleCitizen']
      .forEach(roleId => game.assignManualRole(roleId));

    expect(game.bulletManager.isActive).toBe(true);
  });

  it('MA4.4 — freemason alliance is initialized when freemason was manually picked', () => {
    const roles = { godfather: 1, drWatson: 1, freemason: 1, simpleCitizen: 5 };
    const game = makeGame(['P1','P2','P3','P4','P5','P6','P7','P8'], roles);
    game.framasonMaxMembers = 2;
    game.startManualAssignment();
    ['freemason','godfather','drWatson','simpleCitizen','simpleCitizen','simpleCitizen','simpleCitizen','simpleCitizen']
      .forEach(roleId => game.assignManualRole(roleId));

    const leader = game.players.find(p => p.roleId === 'freemason');
    expect(game.framason.isActive).toBe(true);
    expect(game.framason.leaderId).toBe(leader.id);
  });

  it('MA4.5 — Beautiful Mind last-action card is discarded when no Jack was manually picked', () => {
    const game = makeGame(['P1','P2','P3','P4','P5','P6','P7','P8'], EIGHT_PLAYER_ROLES);
    game.startManualAssignment();
    ['godfather','drLecter','detective','drWatson','simpleCitizen','simpleCitizen','simpleCitizen','simpleCitizen']
      .forEach(roleId => game.assignManualRole(roleId));

    const bm = game.lastActionManager.cards.find(c => c.id === 4); // CARD.BEAUTIFUL_MIND
    expect(bm.used).toBe(true);
  });

  it('MA4.6 — shields are initialized per-pick for shielded roles (godfather)', () => {
    const game = makeGame(['P1','P2','P3','P4','P5','P6','P7','P8'], EIGHT_PLAYER_ROLES);
    game.startManualAssignment();
    game.assignManualRole('godfather');
    const gfPlayer = game.players[0];
    expect(gfPlayer.shield.isActive).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════
   MA5 — Manually-assigned roles behave identically afterwards
   ═══════════════════════════════════════════════════════════════ */
describe('MA5 — Engine parity after manual assignment', () => {

  it('MA5.1 — a manually-assigned mafia can shoot and kill exactly like a randomly-assigned one', () => {
    const game = makeGame(['P1','P2','P3','P4','P5','P6','P7','P8'], EIGHT_PLAYER_ROLES);
    game.startManualAssignment();
    ['godfather','drLecter','detective','drWatson','simpleCitizen','simpleCitizen','simpleCitizen','simpleCitizen']
      .forEach(roleId => game.assignManualRole(roleId));

    const gf = game.players.find(p => p.roleId === 'godfather');
    const victim = game.players.find(p => p.roleId === 'simpleCitizen');

    game.startNight();
    game.nightActions.godfather = { actorIds: [gf.id], targetId: victim.id, mode: 'shoot' };
    const results = game.resolveNight();

    expect(results.killed).toContain(victim.id);
    expect(victim.isAlive).toBe(false);
  });

  it('MA5.2 — checkWinCondition works correctly on a fully manually-assigned roster', () => {
    const roles = { godfather: 1, simpleCitizen: 7 };
    const game = makeGame(['P1','P2','P3','P4','P5','P6','P7','P8'], roles);
    game.startManualAssignment();
    ['godfather','simpleCitizen','simpleCitizen','simpleCitizen','simpleCitizen','simpleCitizen','simpleCitizen','simpleCitizen']
      .forEach(roleId => game.assignManualRole(roleId));

    // Kill the lone mafia — citizens should win
    const gf = game.players.find(p => p.roleId === 'godfather');
    gf.kill(1, 'vote');
    const winner = game.checkWinCondition();
    expect(winner).toBe('citizen');
  });
});

/* ═══════════════════════════════════════════════════════════════
   MA6 — Blind pick (manualPickShowRoles toggle + peekManualRandomRole)
   ═══════════════════════════════════════════════════════════════ */
describe('MA6 — Blind pick mode', () => {

  it('MA6.1 — manualPickShowRoles defaults to true (existing behavior unchanged by default)', () => {
    const game = new Game();
    expect(game.manualPickShowRoles).toBe(true);
  });

  it('MA6.2 — peekManualRandomRole only ever returns roles still in the pool', () => {
    const game = makeGame(['P1','P2','P3','P4','P5','P6','P7','P8'], EIGHT_PLAYER_ROLES);
    game.startManualAssignment();
    for (let i = 0; i < 50; i++) {
      const picked = game.peekManualRandomRole();
      expect(Object.keys(EIGHT_PLAYER_ROLES)).toContain(picked);
    }
  });

  it('MA6.3 — peekManualRandomRole does not mutate the pool (pure peek)', () => {
    const game = makeGame(['P1','P2','P3','P4','P5','P6','P7','P8'], EIGHT_PLAYER_ROLES);
    game.startManualAssignment();
    const before = game.getManualRemainingRoles();
    game.peekManualRandomRole();
    game.peekManualRandomRole();
    const after = game.getManualRemainingRoles();
    expect(after).toEqual(before);
    expect(game.getManualCurrentPlayer().name).toBe('P1'); // turn didn't advance
  });

  it('MA6.4 — peekManualRandomRole returns null once the pool is empty', () => {
    const game = makeGame(['P1','P2','P3','P4','P5','P6','P7','P8'], EIGHT_PLAYER_ROLES);
    game.startManualAssignment();
    ['godfather','drLecter','detective','drWatson','simpleCitizen','simpleCitizen','simpleCitizen','simpleCitizen']
      .forEach(roleId => game.assignManualRole(roleId));
    expect(game.peekManualRandomRole()).toBeNull();
  });

  it('MA6.5 — a full blind-pick playthrough (peek then commit the same roleId) assigns every player exactly once', () => {
    const game = makeGame(['P1','P2','P3','P4','P5','P6','P7','P8'], EIGHT_PLAYER_ROLES);
    game.manualPickShowRoles = false;
    game.startManualAssignment();

    for (let i = 0; i < 8; i++) {
      const peeked = game.peekManualRandomRole();
      expect(peeked).not.toBeNull();
      const ok = game.assignManualRole(peeked);
      expect(ok).toBe(true);
    }

    expect(game.isManualAssignmentComplete()).toBe(true);
    expect(game.phase).toBe('roleReveal');
    const counts = {};
    game.players.forEach(p => { counts[p.roleId] = (counts[p.roleId] || 0) + 1; });
    expect(counts).toEqual(EIGHT_PLAYER_ROLES);
  });

  it('MA6.6 — manualPickShowRoles survives a toJSON/loadFromJSON round trip', () => {
    const game = new Game();
    for (let i = 0; i < 8; i++) game.addPlayer(`P${i}`);
    game.manualPickShowRoles = false;

    const snapshot = game.toJSON();
    const reloaded = new Game();
    reloaded.loadFromJSON(snapshot);

    expect(reloaded.manualPickShowRoles).toBe(false);
  });
});
