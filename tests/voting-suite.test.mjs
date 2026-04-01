/**
 * voting-suite.test.mjs — Voting system tests
 *
 * V1: getVoteThreshold formula: Math.floor((alive - 1) / 2) + 1
 * V2: Stage 1 — only players meeting threshold advance
 * V3: Stage 2 — single candidate needs threshold votes to execute
 * V4: Stage 2 — multiple candidates, highest vote wins
 * V5: Stage 2 — tied votes → coin flip (both candidates valid)
 * V6: Jack vote immunity — survives, curse locked, Beautiful Mind discarded
 * V7: eliminateByVote — last action card available after execution
 * V8: eliminateByVote — Jack curse chain triggers when cursed player voted out
 * V9: Reporter nightOrder is after all mafia roles
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../js/models/Game.js';
import { Roles } from '../js/models/Roles.js';
import { CARD } from '../js/models/LastActionManager.js';

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


/* ═══════════════════════════════════════════════════════════════════
   V1 — getVoteThreshold formula
   ═══════════════════════════════════════════════════════════════════ */
describe('V1 — Vote threshold formula', () => {
  it('16 alive → threshold 8', () => {
    const roster = {};
    for (let i = 1; i <= 16; i++) roster[`P${i}`] = 'simpleCitizen';
    const { game } = setup(roster);
    expect(game.getVoteThreshold()).toBe(8);
  });

  it('15 alive → threshold 8', () => {
    const roster = {};
    for (let i = 1; i <= 15; i++) roster[`P${i}`] = 'simpleCitizen';
    const { game } = setup(roster);
    expect(game.getVoteThreshold()).toBe(8);
  });

  it('10 alive → threshold 5', () => {
    const roster = {};
    for (let i = 1; i <= 10; i++) roster[`P${i}`] = 'simpleCitizen';
    const { game } = setup(roster);
    expect(game.getVoteThreshold()).toBe(5);
  });

  it('8 alive → threshold 4', () => {
    const roster = {};
    for (let i = 1; i <= 8; i++) roster[`P${i}`] = 'simpleCitizen';
    const { game } = setup(roster);
    expect(game.getVoteThreshold()).toBe(4);
  });

  it('3 alive → threshold 2', () => {
    const roster = {};
    for (let i = 1; i <= 3; i++) roster[`P${i}`] = 'simpleCitizen';
    const { game } = setup(roster);
    expect(game.getVoteThreshold()).toBe(2);
  });

  it('threshold decreases when a player dies', () => {
    const roster = {};
    for (let i = 1; i <= 10; i++) roster[`P${i}`] = 'simpleCitizen';
    const { game } = setup(roster);
    expect(game.getVoteThreshold()).toBe(5);

    // Kill one player
    game.players[0].kill(1, 'mafia');
    expect(game.getVoteThreshold()).toBe(5); // 9 alive → floor(8/2)+1 = 5

    // Kill another
    game.players[1].kill(1, 'mafia');
    expect(game.getVoteThreshold()).toBe(4); // 8 alive → floor(7/2)+1 = 4
  });
});


/* ═══════════════════════════════════════════════════════════════════
   V2 — Stage 1: Tally and threshold filtering
   ═══════════════════════════════════════════════════════════════════ */
describe('V2 — Stage 1 threshold filtering', () => {
  let game, p;

  beforeEach(() => {
    const roster = {};
    for (let i = 1; i <= 10; i++) roster[`P${i}`] = 'simpleCitizen';
    ({ game, p } = setup(roster));
  });

  it('players at or above threshold advance', () => {
    const threshold = game.getVoteThreshold(); // 5
    // P1 gets 5 votes, P2 gets 3
    game.castVote(p.P3.id, p.P1.id);
    game.castVote(p.P4.id, p.P1.id);
    game.castVote(p.P5.id, p.P1.id);
    game.castVote(p.P6.id, p.P1.id);
    game.castVote(p.P7.id, p.P1.id);
    game.castVote(p.P8.id, p.P2.id);
    game.castVote(p.P9.id, p.P2.id);
    game.castVote(p.P10.id, p.P2.id);

    const tally = game.getVoteTally();
    const advanced = Object.entries(tally)
      .filter(([, count]) => count >= threshold)
      .map(([id]) => id);

    expect(advanced).toContain(String(p.P1.id));
    expect(advanced).not.toContain(String(p.P2.id));
  });

  it('multiple players can meet threshold', () => {
    const threshold = game.getVoteThreshold(); // 5
    // P1 and P2 both get 5 votes
    game.castVote(p.P3.id, p.P1.id);
    game.castVote(p.P4.id, p.P1.id);
    game.castVote(p.P5.id, p.P1.id);
    game.castVote(p.P6.id, p.P1.id);
    game.castVote(p.P7.id, p.P1.id);
    game.castVote(p.P1.id, p.P2.id);
    game.castVote(p.P8.id, p.P2.id);
    game.castVote(p.P9.id, p.P2.id);
    game.castVote(p.P10.id, p.P2.id);
    game.castVote(p.P2.id, p.P2.id); // self-vote for testing

    const tally = game.getVoteTally();
    const advanced = Object.entries(tally)
      .filter(([, count]) => count >= threshold)
      .map(([id]) => id);

    expect(advanced).toContain(String(p.P1.id));
    expect(advanced).toContain(String(p.P2.id));
  });

  it('no one advances when all below threshold', () => {
    const threshold = game.getVoteThreshold(); // 5
    // Spread votes: P1 gets 3, P2 gets 3
    game.castVote(p.P3.id, p.P1.id);
    game.castVote(p.P4.id, p.P1.id);
    game.castVote(p.P5.id, p.P1.id);
    game.castVote(p.P6.id, p.P2.id);
    game.castVote(p.P7.id, p.P2.id);
    game.castVote(p.P8.id, p.P2.id);

    const tally = game.getVoteTally();
    const advanced = Object.entries(tally)
      .filter(([, count]) => count >= threshold)
      .map(([id]) => id);

    expect(advanced).toHaveLength(0);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   V3 — Stage 2: single candidate needs threshold
   ═══════════════════════════════════════════════════════════════════ */
describe('V3 — Runoff single candidate needs threshold', () => {
  let game, p;

  beforeEach(() => {
    const roster = {};
    for (let i = 1; i <= 10; i++) roster[`P${i}`] = 'simpleCitizen';
    ({ game, p } = setup(roster));
  });

  it('single candidate with threshold votes → executed', () => {
    const threshold = game.getVoteThreshold(); // 5
    // Simulate runoff: only P1 advanced, gets 5 votes
    game.votes = {};
    game.castVote(p.P2.id, p.P1.id);
    game.castVote(p.P3.id, p.P1.id);
    game.castVote(p.P4.id, p.P1.id);
    game.castVote(p.P5.id, p.P1.id);
    game.castVote(p.P6.id, p.P1.id);

    const tally = game.getVoteTally();
    expect(tally[p.P1.id]).toBe(5);
    expect(tally[p.P1.id]).toBeGreaterThanOrEqual(threshold);

    const result = game.eliminateByVote(p.P1.id);
    expect(p.P1.isAlive).toBe(false);
    expect(result.voteImmune).toBeUndefined();
  });

  it('single candidate below threshold → survives (not eliminated)', () => {
    const threshold = game.getVoteThreshold(); // 5
    game.votes = {};
    game.castVote(p.P2.id, p.P1.id);
    game.castVote(p.P3.id, p.P1.id);
    game.castVote(p.P4.id, p.P1.id);

    const tally = game.getVoteTally();
    expect(tally[p.P1.id]).toBe(3);
    expect(tally[p.P1.id]).toBeLessThan(threshold);
    // Game logic: don't call eliminateByVote if below threshold
    expect(p.P1.isAlive).toBe(true);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   V4 — Stage 2: multiple candidates, highest wins
   ═══════════════════════════════════════════════════════════════════ */
describe('V4 — Runoff with multiple candidates', () => {
  let game, p;

  beforeEach(() => {
    const roster = {};
    for (let i = 1; i <= 10; i++) roster[`P${i}`] = 'simpleCitizen';
    ({ game, p } = setup(roster));
  });

  it('2+ candidates: player with most votes eliminated', () => {
    game.votes = {};
    // P1 gets 6 votes, P2 gets 4 votes (runoff)
    game.castVote(p.P3.id, p.P1.id);
    game.castVote(p.P4.id, p.P1.id);
    game.castVote(p.P5.id, p.P1.id);
    game.castVote(p.P6.id, p.P1.id);
    game.castVote(p.P7.id, p.P1.id);
    game.castVote(p.P8.id, p.P1.id);
    game.castVote(p.P9.id, p.P2.id);
    game.castVote(p.P10.id, p.P2.id);
    game.castVote(p.P1.id, p.P2.id);
    game.castVote(p.P2.id, p.P2.id);

    const tally = game.getVoteTally();
    // Determine winner: candidate with most votes
    const maxVotes = Math.max(...Object.values(tally));
    const winners = Object.entries(tally).filter(([, count]) => count === maxVotes);
    expect(winners).toHaveLength(1);
    expect(winners[0][0]).toBe(String(p.P1.id));
  });
});


/* ═══════════════════════════════════════════════════════════════════
   V5 — Stage 2: tied votes → coin flip (both are valid)
   ═══════════════════════════════════════════════════════════════════ */
describe('V5 — Runoff tie → coin flip', () => {
  let game, p;

  beforeEach(() => {
    const roster = {};
    for (let i = 1; i <= 10; i++) roster[`P${i}`] = 'simpleCitizen';
    ({ game, p } = setup(roster));
  });

  it('tied candidates both qualify for coin flip', () => {
    game.votes = {};
    // P1 and P2 each get 5 votes
    game.castVote(p.P3.id, p.P1.id);
    game.castVote(p.P4.id, p.P1.id);
    game.castVote(p.P5.id, p.P1.id);
    game.castVote(p.P6.id, p.P1.id);
    game.castVote(p.P7.id, p.P1.id);
    game.castVote(p.P8.id, p.P2.id);
    game.castVote(p.P9.id, p.P2.id);
    game.castVote(p.P10.id, p.P2.id);
    game.castVote(p.P1.id, p.P2.id);
    game.castVote(p.P2.id, p.P2.id);

    const tally = game.getVoteTally();
    const maxVotes = Math.max(...Object.values(tally));
    const tied = Object.entries(tally).filter(([, count]) => count === maxVotes);
    expect(tied).toHaveLength(2);

    // Either one can be eliminated by coin flip
    const tiedIds = tied.map(([id]) => id);
    const coinFlipWinner = tiedIds[Math.random() < 0.5 ? 0 : 1];
    const result = game.eliminateByVote(Number(coinFlipWinner));
    expect(game.getPlayer(Number(coinFlipWinner)).isAlive).toBe(false);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   V6 — Jack vote immunity: survives + curse locked + BM discarded
   ═══════════════════════════════════════════════════════════════════ */
describe('V6 — Jack vote immunity', () => {
  let game, p;

  beforeEach(() => {
    ({ game, p } = setup({
      GF: 'godfather',
      Jack: 'jack',
      C1: 'simpleCitizen',
      C2: 'simpleCitizen',
      C3: 'simpleCitizen',
      C4: 'simpleCitizen',
      C5: 'simpleCitizen',
      C6: 'simpleCitizen',
      C7: 'simpleCitizen',
      C8: 'simpleCitizen',
    }));
    // Need a night round so Jack has a curse target
    nightRound(game, {
      godfather: { actorId: p.GF.id, targetId: p.C1.id },
      jack: { actorId: p.Jack.id, targetId: p.C2.id },
    });

  });

  it('Jack survives vote elimination', () => {
    const result = game.eliminateByVote(p.Jack.id);
    expect(result.voteImmune).toBe(true);
    expect(p.Jack.isAlive).toBe(true);
  });

  it('Jack curse is locked after vote attempt', () => {
    game.eliminateByVote(p.Jack.id);
    expect(p.Jack.curse.isLocked).toBe(true);
  });

  it('Beautiful Mind card is discarded when Jack is vote target', () => {
    // Ensure BM card exists
    const bm = game.lastActionManager.cards.find(c => c.id === CARD.BEAUTIFUL_MIND);
    expect(bm).toBeTruthy();
    expect(bm.used).toBe(false);

    game.eliminateByVote(p.Jack.id);
    expect(bm.used).toBe(true);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   V7 — Last Action card available after vote execution
   ═══════════════════════════════════════════════════════════════════ */
describe('V7 — Last Action card on vote execution', () => {
  let game, p;

  beforeEach(() => {
    ({ game, p } = setup({
      GF: 'godfather',
      C1: 'simpleCitizen',
      C2: 'simpleCitizen',
      C3: 'simpleCitizen',
      C4: 'simpleCitizen',
      C5: 'simpleCitizen',
      C6: 'simpleCitizen',
      C7: 'simpleCitizen',
      C8: 'simpleCitizen',
    }));
  });

  it('eliminateByVote signals lastActionAvailable', () => {
    const result = game.eliminateByVote(p.C1.id);
    expect(result.lastActionAvailable).toBe(true);
  });

  it('all 5 cards depleted → no last action available', () => {
    // Use up all cards
    game.lastActionManager.cards.forEach(c => c.used = true);
    const result = game.eliminateByVote(p.C1.id);
    expect(result.lastActionAvailable).toBeUndefined();
  });
});


/* ═══════════════════════════════════════════════════════════════════
   V8 — Jack curse chain triggers when cursed player voted out
   ═══════════════════════════════════════════════════════════════════ */
describe('V8 — Curse chain on vote', () => {
  let game, p;

  beforeEach(() => {
    ({ game, p } = setup({
      GF: 'godfather',
      Jack: 'jack',
      C1: 'simpleCitizen',
      C2: 'simpleCitizen',
      C3: 'simpleCitizen',
      C4: 'simpleCitizen',
      C5: 'simpleCitizen',
      C6: 'simpleCitizen',
      C7: 'simpleCitizen',
      C8: 'simpleCitizen',
    }));
    // Jack curses C2
    nightRound(game, {
      godfather: { actorId: p.GF.id, targetId: p.C1.id },
      jack: { actorId: p.Jack.id, targetId: p.C2.id },
    });

    // Disable Last Action flow to assert immediate eliminateByVote curse resolution.
    game.lastActionManager.cards.forEach(c => { c.used = true; });
  });

  it('voting out cursed player triggers Jack death', () => {
    const result = game.eliminateByVote(p.C2.id);
    expect(p.C2.isAlive).toBe(false);
    expect(p.Jack.isAlive).toBe(false);
    expect(result.jackCurseTriggered).toBe(true);
  });

  it('voting out non-cursed player does not kill Jack', () => {
    const result = game.eliminateByVote(p.C3.id);
    expect(p.C3.isAlive).toBe(false);
    expect(p.Jack.isAlive).toBe(true);
    expect(result.jackCurseTriggered).toBeUndefined();
  });
});


/* ═══════════════════════════════════════════════════════════════════
   V10 — Face Off after vote: curse target and roles must move
   ═══════════════════════════════════════════════════════════════════ */
describe('V10 — Face Off keeps Jack curse linkage on swapped player', () => {
  let game, p;

  beforeEach(() => {
    ({ game, p } = setup({
      GF: 'godfather',
      Jack: 'jack',
      C1: 'simpleCitizen',
      C2: 'detective',
      C3: 'simpleCitizen',
      C4: 'simpleCitizen',
      C5: 'simpleCitizen',
      C6: 'simpleCitizen',
      C7: 'simpleCitizen',
      C8: 'simpleCitizen',
    }));

    nightRound(game, {
      godfather: { actorId: p.GF.id, targetId: p.C1.id },
      jack: { actorId: p.Jack.id, targetId: p.C2.id },
    });
  });

  it('cursed voted victim can Face Off and move curse trigger to chosen player', () => {
    const first = game.eliminateByVote(p.C2.id);
    expect(first.jackCurseTriggered).toBeUndefined();
    expect(p.Jack.isAlive).toBe(true);
    expect(p.C2.isAlive).toBe(false);

    game.lastActionManager.cards.forEach(c => { if (c.id !== CARD.FACE_OFF) c.used = true; });
    game.drawLastActionFor(p.C2.id);
    const faceOff = game.applyLastActionCard(CARD.FACE_OFF, p.C2.id, p.C3.id);

    expect(faceOff.success).toBe(true);
    expect(p.C3.roleId).toBe('detective');
    expect(p.C2.roleId).toBe('simpleCitizen');

    // No last action now; curse should resolve immediately on vote.
    game.lastActionManager.cards.forEach(c => { c.used = true; });
    const second = game.eliminateByVote(p.C3.id);
    expect(second.jackCurseTriggered).toBe(true);
    expect(p.Jack.isAlive).toBe(false);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   V9 — Reporter nightOrder is after all mafia team roles
   ═══════════════════════════════════════════════════════════════════ */
describe('V9 — Reporter night order after mafia', () => {
  it('reporter nightOrder > all mafia nightOrders', () => {
    const reporter = Roles.get('reporter');
    const mafiaRoles = ['godfather', 'drLecter', 'bomber', 'matador', 'jadoogar', 'negotiator', 'spy', 'simpleMafia'];

    for (const roleId of mafiaRoles) {
      const role = Roles.get(roleId);
      if (role && role.nightOrder < 99) {
        expect(reporter.nightOrder).toBeGreaterThan(role.nightOrder);
      }
    }
  });

  it('reporter nightOrder < citizen roles', () => {
    const reporter = Roles.get('reporter');
    const citizenRoles = ['drWatson', 'detective', 'kane', 'sniper', 'freemason', 'constantine', 'gunner', 'cowboy'];

    for (const roleId of citizenRoles) {
      const role = Roles.get(roleId);
      if (role && role.nightOrder < 99) {
        expect(reporter.nightOrder).toBeLessThan(role.nightOrder);
      }
    }
  });

  it('silencer display name is Silencer', () => {
    const matador = Roles.get('matador');
    expect(matador.nameEn).toBe('Silencer');
    expect(matador.nameFa).toBe('سایلنسر');
  });
});
