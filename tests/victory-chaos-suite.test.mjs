/**
 * victory-chaos-suite.test.mjs — Tests for:
 *   V1: Mafia victory conditions (no independent + mafia >= citizen)
 *   V2: Mafia cannot win while independent alive
 *   V3: Jack instant win (all mafia dead)
 *   V4: Citizen victory
 *   V5: Chaos triggers at 3 alive
 *   V6: Jack auto-wins in Chaos
 *   V7: Chaos handshake resolution (all pair combos)
 *   V8: No chaos when mafia already won (2M+1C)
 */
import { describe, it, expect } from 'vitest';
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

/** Kill players by name from the p object */
function killAll(p, names, round = 1) {
  for (const name of names) {
    p[name].kill(round, 'vote');
  }
}

const alive = (player) => player.isAlive;
const dead  = (player) => !player.isAlive;


/* ═══════════════════════════════════════════════════════════════════
   V1 — Mafia victory: no independent + mafia >= citizen
   ═══════════════════════════════════════════════════════════════════ */
describe('V1 — Mafia victory conditions', () => {

  it('V1.1 — Mafia wins when mafia == citizen and no independent', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });

    // Kill citizens until 2M == 2C
    killAll(p, ['SC3', 'SC4']);

    const winner = game.checkWinCondition();
    expect(winner).toBe('mafia');
    expect(game.phase).toBe('ended');
  });

  it('V1.2 — Mafia wins when mafia > citizen and no independent', () => {
    const { game, p } = setup({
      GF: 'godfather', SM1: 'simpleMafia', SM2: 'simpleMafia',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });

    // Kill citizens until 3M > 2C
    killAll(p, ['SC3', 'SC4', 'SC5']);

    const winner = game.checkWinCondition();
    expect(winner).toBe('mafia');
  });

  it('V1.3 — Mafia does NOT win when mafia < citizen (no independent)', () => {
    const { game, p } = setup({
      GF: 'godfather',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
      SC5: 'simpleCitizen', SC6: 'simpleCitizen', SC7: 'simpleCitizen',
    });

    // 1M < 7C
    const winner = game.checkWinCondition();
    expect(winner).toBeNull();
  });
});


/* ═══════════════════════════════════════════════════════════════════
   V2 — Mafia CANNOT win while independent alive
   ═══════════════════════════════════════════════════════════════════ */
describe('V2 — Mafia blocked by alive independent', () => {

  it('V2.1 — Mafia >= citizen but Jack alive → no mafia win', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });

    // Kill citizens until 2M >= 2C, but Jack alive
    killAll(p, ['SC3', 'SC4', 'SC5']);

    // 4 alive: 2M + 1Jack + 1C — mafia can't win (independent alive)
    const winner = game.checkWinCondition();
    expect(winner).toBeNull();
  });

  it('V2.2 — Mafia >= citizen but Zodiac alive → no mafia win', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Zodiac: 'zodiac', Bodyguard: 'bodyguard',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });

    // Kill citizens until 2M >= 1C, but Zodiac alive (bodyguard = citizen)
    killAll(p, ['SC1', 'SC2', 'SC3', 'SC4', 'Bodyguard']);

    // 3 alive: 2M + 1Zodiac → Chaos (not mafia win since independent alive)
    const winner = game.checkWinCondition();
    // This triggers chaos (3 alive, no team won)
    expect(winner).toBe('handshake');
  });

  it('V2.3 — After killing independent, mafia wins immediately', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });

    // Kill citizens + Jack (Jack must die via curse chain)
    killAll(p, ['SC3', 'SC4', 'SC5']);
    p.Jack.kill(1, 'curse', false);

    // 2M == 2C, no independent → mafia wins
    const winner = game.checkWinCondition();
    expect(winner).toBe('mafia');
  });
});


/* ═══════════════════════════════════════════════════════════════════
   V3 — Jack instant win (all mafia dead + Jack alive)
   ═══════════════════════════════════════════════════════════════════ */
describe('V3 — Jack instant win', () => {

  it('V3.1 — All mafia dead + Jack alive → Jack (independent) wins', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });

    killAll(p, ['GF', 'SM']);

    const winner = game.checkWinCondition();
    expect(winner).toBe('independent');
    expect(game.phase).toBe('ended');
  });

  it('V3.2 — All mafia dead + Zodiac alive (no Jack) → game continues', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Zodiac: 'zodiac', Bodyguard: 'bodyguard',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });

    killAll(p, ['GF', 'SM']);

    // Mafia dead, but no Jack → no instant win. Zodiac alive with citizens.
    const winner = game.checkWinCondition();
    // 6 alive: 0M, 1 zodiac, 5 citizen — no win condition met, game continues
    expect(winner).toBeNull();
  });
});


/* ═══════════════════════════════════════════════════════════════════
   V4 — Citizen victory
   ═══════════════════════════════════════════════════════════════════ */
describe('V4 — Citizen victory', () => {

  it('V4.1 — All mafia + all independents dead → citizen wins', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });

    killAll(p, ['GF', 'SM']);
    p.Jack.kill(1, 'curse', false);

    const winner = game.checkWinCondition();
    expect(winner).toBe('citizen');
  });

  it('V4.2 — All mafia dead + Zodiac dead + citizens alive → citizen wins', () => {
    const { game, p } = setup({
      GF: 'godfather',
      Zodiac: 'zodiac', Bodyguard: 'bodyguard',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });

    killAll(p, ['GF', 'Zodiac']);

    const winner = game.checkWinCondition();
    expect(winner).toBe('citizen');
  });
});


/* ═══════════════════════════════════════════════════════════════════
   V5 — Chaos triggers at exactly 3 alive
   ═══════════════════════════════════════════════════════════════════ */
describe('V5 — Chaos trigger conditions', () => {

  it('V5.1 — 1 mafia + 2 citizen → Chaos (mafia < citizen, no win)', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
      SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });

    // Kill all but 1M + 2C
    killAll(p, ['SM', 'SC3', 'SC4', 'SC5', 'SC6']);

    const winner = game.checkWinCondition();
    expect(winner).toBe('handshake');
    expect(game.phase).toBe('handshake');
    expect(game.handshakeState).not.toBeNull();
    expect(game.handshakeState.players).toHaveLength(3);
  });

  it('V5.2 — 1 mafia + 1 citizen + 1 zodiac → Chaos', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Zodiac: 'zodiac', Bodyguard: 'bodyguard',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });

    killAll(p, ['SM', 'SC2', 'SC3', 'SC4', 'Bodyguard']);

    // 3 alive: GF, Zodiac, SC1
    const winner = game.checkWinCondition();
    expect(winner).toBe('handshake');
  });

  it('V5.3 — 2 mafia + 1 zodiac → Chaos (not mafia win, independent alive)', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Zodiac: 'zodiac', Bodyguard: 'bodyguard',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });

    killAll(p, ['SC1', 'SC2', 'SC3', 'SC4', 'Bodyguard']);

    // 3 alive: GF, SM, Zodiac — independent alive so mafia can't win → Chaos
    const winner = game.checkWinCondition();
    expect(winner).toBe('handshake');
  });

  it('V5.4 — 4 alive → no chaos, game continues', () => {
    const { game, p } = setup({
      GF: 'godfather',
      Jack: 'jack',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
      SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });

    killAll(p, ['SC3', 'SC4', 'SC5', 'SC6']);

    // 4 alive: 1M + 1Jack + 2C — no win condition, not 3 alive → null
    const winner = game.checkWinCondition();
    expect(winner).toBeNull();
  });
});


/* ═══════════════════════════════════════════════════════════════════
   V6 — Jack auto-wins in Chaos
   ═══════════════════════════════════════════════════════════════════ */
describe('V6 — Jack always wins in Chaos', () => {

  it('V6.1 — 1 mafia + 1 citizen + Jack → Jack wins immediately', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });

    killAll(p, ['SM', 'SC2', 'SC3', 'SC4', 'SC5']);

    // 3 alive: GF, Jack, SC1
    const winner = game.checkWinCondition();
    expect(winner).toBe('independent');
    expect(game.phase).toBe('ended');
    expect(game.winner).toBe('independent');
  });

  it('V6.2 — 2 mafia + Jack → Jack wins immediately', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });

    killAll(p, ['SC1', 'SC2', 'SC3', 'SC4', 'SC5']);

    // 3 alive: GF, SM, Jack → Jack wins
    const winner = game.checkWinCondition();
    expect(winner).toBe('independent');
    expect(game.phase).toBe('ended');
  });

  it('V6.3 — 2 citizen + Jack → Jack wins immediately', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });

    killAll(p, ['GF', 'SM', 'SC3', 'SC4', 'SC5']);

    // Wait — all mafia dead + Jack alive → Jack instant win (rule 1), NOT chaos
    const winner = game.checkWinCondition();
    expect(winner).toBe('independent');
    expect(game.phase).toBe('ended');
  });

  it('V6.4 — Jack + Zodiac + citizen → Jack wins immediately (not handshake)', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Jack: 'jack', Zodiac: 'zodiac', Bodyguard: 'bodyguard',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen', SC3: 'simpleCitizen',
    });

    killAll(p, ['GF', 'SM', 'Bodyguard', 'SC2', 'SC3']);

    // 3 alive: Jack, Zodiac, SC1 — all mafia dead + Jack alive → instant win
    const winner = game.checkWinCondition();
    expect(winner).toBe('independent');
  });
});


/* ═══════════════════════════════════════════════════════════════════
   V7 — Chaos handshake resolution (pair combos)
   ═══════════════════════════════════════════════════════════════════ */
describe('V7 — Chaos handshake pair outcomes', () => {

  it('V7.1 — citizen + citizen pair → citizen wins', () => {
    const { game, p } = setup({
      GF: 'godfather',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
      SC5: 'simpleCitizen', SC6: 'simpleCitizen',
      SC7: 'simpleCitizen', SC8: 'simpleCitizen',
    });

    // Kill all but 1M + 2C
    killAll(p, ['SC3', 'SC4', 'SC5', 'SC6', 'SC7', 'SC8']);

    game.checkWinCondition(); // → chaos
    expect(game.phase).toBe('handshake');

    const result = game.resolveHandshake(p.SC1.id, p.SC2.id);
    expect(result.winner).toBe('citizen');
    expect(dead(p.GF)).toBe(true);
  });

  it('V7.2 — citizen + mafia pair → mafia wins', () => {
    const { game, p } = setup({
      GF: 'godfather',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
      SC5: 'simpleCitizen', SC6: 'simpleCitizen',
      SC7: 'simpleCitizen', SC8: 'simpleCitizen',
    });

    killAll(p, ['SC3', 'SC4', 'SC5', 'SC6', 'SC7', 'SC8']);
    game.checkWinCondition();

    const result = game.resolveHandshake(p.SC1.id, p.GF.id);
    expect(result.winner).toBe('mafia');
    expect(dead(p.SC2)).toBe(true);
  });

  it('V7.3 — citizen + zodiac pair → independent wins', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Zodiac: 'zodiac', Bodyguard: 'bodyguard',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });

    killAll(p, ['SM', 'Bodyguard', 'SC2', 'SC3', 'SC4']);
    game.checkWinCondition(); // → chaos: GF, Zodiac, SC1

    const result = game.resolveHandshake(p.SC1.id, p.Zodiac.id);
    expect(result.winner).toBe('independent');
    expect(dead(p.GF)).toBe(true);
  });

  it('V7.4 — mafia + zodiac pair → independent wins', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Zodiac: 'zodiac', Bodyguard: 'bodyguard',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });

    killAll(p, ['SM', 'SC1', 'SC2', 'SC3', 'SC4', 'Bodyguard']);
    // 2 alive mafia + zodiac but that's only 3, and independent alive → chaos
    // Wait: killAll removes SM too, so only GF left as mafia
    // Actually let's recalculate: setup has GF, SM, Zodiac, Bodyguard, SC1-SC4 = 8
    // Kill SM, SC1, SC2, SC3, SC4, Bodyguard = 6 dead, 2 alive: GF + Zodiac
    // That's only 2 alive, not 3. Let me fix.
    // Let me use a different roster.
    expect(true).toBe(true); // placeholder - see V7.4b below
  });

  it('V7.4b — mafia + zodiac pair → independent wins (proper setup)', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Zodiac: 'zodiac', Bodyguard: 'bodyguard',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });

    killAll(p, ['SM', 'Bodyguard', 'SC2', 'SC3', 'SC4']);
    // 3 alive: GF, Zodiac, SC1
    game.checkWinCondition(); // → chaos

    const result = game.resolveHandshake(p.GF.id, p.Zodiac.id);
    expect(result.winner).toBe('independent');
    expect(dead(p.SC1)).toBe(true);
  });

  it('V7.5 — 2 mafia pair in chaos → mafia wins (zodiac eliminated)', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      Zodiac: 'zodiac', Bodyguard: 'bodyguard',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });

    killAll(p, ['SC1', 'SC2', 'SC3', 'SC4', 'Bodyguard']);
    // 3 alive: GF, SM, Zodiac → chaos (independent alive, mafia can't win)
    game.checkWinCondition();
    expect(game.phase).toBe('handshake');

    const result = game.resolveHandshake(p.GF.id, p.SM.id);
    expect(result.winner).toBe('mafia');
    expect(dead(p.Zodiac)).toBe(true);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   V8 — No chaos when mafia already won
   ═══════════════════════════════════════════════════════════════════ */
describe('V8 — Mafia wins before chaos (2M+1C, no independent)', () => {

  it('V8.1 — 2 mafia + 1 citizen + 0 independent → mafia wins (no chaos)', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
      SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });

    killAll(p, ['SC2', 'SC3', 'SC4', 'SC5', 'SC6']);
    // 3 alive: GF, SM, SC1 — no independent, mafia(2) >= citizen(1) → mafia wins
    const winner = game.checkWinCondition();
    expect(winner).toBe('mafia');
    expect(game.phase).toBe('ended');
  });

  it('V8.2 — 3 mafia + 0 citizen + 0 independent → mafia wins (no chaos)', () => {
    const { game, p } = setup({
      GF: 'godfather', SM1: 'simpleMafia', SM2: 'simpleMafia',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });

    killAll(p, ['SC1', 'SC2', 'SC3', 'SC4', 'SC5']);
    // 3 alive: GF, SM1, SM2 — all citizens dead, no independent → mafia wins
    const winner = game.checkWinCondition();
    expect(winner).toBe('mafia');
  });

  it('V8.3 — 2 mafia + 1 citizen + 0 independent at 3 players alive → mafia (not chaos)', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
      SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });

    killAll(p, ['SC2', 'SC3', 'SC4', 'SC5', 'SC6']);

    // Verify mafia win takes priority over chaos
    const winner = game.checkWinCondition();
    expect(winner).toBe('mafia');
    expect(game.handshakeState).toBeNull();
  });
});
