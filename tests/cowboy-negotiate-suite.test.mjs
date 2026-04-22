/**
 * cowboy-negotiate-suite.test.mjs — Regression tests for cowboy & negotiator bug fixes
 *
 * CB1: Cowboy targeting Jack → cowboy dies (not revivable), Jack survives, curse locked, role announced
 * CB2: Cowboy targeting mafia → both die, cowboy not revivable, target revivable, side announced
 * CB3: Cowboy targeting citizen → both die, cowboy not revivable, target revivable, side announced
 * CB4: Cowboy targeting zodiac → both die, cowboy not revivable, target revivable, side announced
 * CB5: Cowboy not revivable by Constantine
 * CB6: Cowboy target (non-Jack) IS revivable by Constantine
 * CB7: Cowboy + Jack curse chain (cowboy is cursed, cowboy dies → Jack dies too)
 * NG1: Negotiate excludes mafia kill/salakhi same night
 * NG2: Negotiate success with simpleCitizen → becomes simpleMafia
 * NG3: Negotiate success with suspect (maznoon) → becomes simpleMafia
 * NG4: Negotiate does not block other mafia abilities (Dr Lecter, Silencer, etc.)
 * NG5: Negotiate fail (non-recruitable target) still blocks mafia shoot
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
   CB1 — Cowboy targets Jack
   ═══════════════════════════════════════════════════════════════════ */
describe('CB1 — Cowboy targets Jack: cowboy dies, Jack survives with locked curse', () => {
  let game, p;

  beforeEach(() => {
    ({ game, p } = setup({
      GF: 'godfather',
      SM: 'simpleMafia',
      Cow: 'cowboy',
      Jack: 'jack',
      C1: 'simpleCitizen',
      C2: 'simpleCitizen',
      C3: 'simpleCitizen',
      C4: 'simpleCitizen',
    }));
    game.startDay();
  });

  it('CB1.1: Cowboy dies when targeting Jack', () => {
    const result = game.resolveCowboyAction(p.Jack.id);
    expect(result.success).toBe(true);
    expect(dead(p.Cow)).toBe(true);
    expect(result.cowboyDied).toBe(true);
  });

  it('CB1.2: Jack survives and curse is locked', () => {
    const result = game.resolveCowboyAction(p.Jack.id);
    expect(alive(p.Jack)).toBe(true);
    expect(p.Jack.curse.isLocked).toBe(true);
    expect(result.jackCurseLocked).toBe(true);
    expect(result.killed).toBe(false);
  });

  it('CB1.3: Result includes Jack role name for announcement', () => {
    const result = game.resolveCowboyAction(p.Jack.id);
    expect(result.targetRoleName).toBeTruthy();
    expect(result.side).toBe('jack');
  });

  it('CB1.4: Cowboy is NOT revivable by Constantine', () => {
    game.resolveCowboyAction(p.Jack.id);
    expect(p.Cow.isRevivable).toBe(false);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   CB2 — Cowboy targets mafia member
   ═══════════════════════════════════════════════════════════════════ */
describe('CB2 — Cowboy targets mafia: both die, cowboy not revivable, target revivable', () => {
  let game, p;

  beforeEach(() => {
    ({ game, p } = setup({
      GF: 'godfather',
      SM: 'simpleMafia',
      Cow: 'cowboy',
      C1: 'simpleCitizen',
      C2: 'simpleCitizen',
      C3: 'simpleCitizen',
      C4: 'simpleCitizen',
      C5: 'simpleCitizen',
    }));
    game.startDay();
  });

  it('CB2.1: Cowboy dies when targeting mafia', () => {
    const result = game.resolveCowboyAction(p.SM.id);
    expect(dead(p.Cow)).toBe(true);
    expect(result.cowboyDied).toBe(true);
  });

  it('CB2.2: Mafia target is killed', () => {
    const result = game.resolveCowboyAction(p.SM.id);
    expect(dead(p.SM)).toBe(true);
    expect(result.killed).toBe(true);
    expect(result.side).toBe('mafia');
  });

  it('CB2.3: Cowboy is NOT revivable', () => {
    game.resolveCowboyAction(p.SM.id);
    expect(p.Cow.isRevivable).toBe(false);
  });

  it('CB2.4: Mafia target IS revivable by Constantine', () => {
    game.resolveCowboyAction(p.SM.id);
    expect(p.SM.isRevivable).toBe(true);
  });

  it('CB2.5: Side is announced (not role name)', () => {
    const result = game.resolveCowboyAction(p.SM.id);
    expect(result.side).toBe('mafia');
    expect(result.targetRoleName).toBeNull();
  });
});


/* ═══════════════════════════════════════════════════════════════════
   CB3 — Cowboy targets citizen
   ═══════════════════════════════════════════════════════════════════ */
describe('CB3 — Cowboy targets citizen: both die, target revivable', () => {
  let game, p;

  beforeEach(() => {
    ({ game, p } = setup({
      GF: 'godfather',
      SM: 'simpleMafia',
      Cow: 'cowboy',
      C1: 'simpleCitizen',
      C2: 'simpleCitizen',
      C3: 'simpleCitizen',
      C4: 'simpleCitizen',
      C5: 'simpleCitizen',
    }));
    game.startDay();
  });

  it('CB3.1: Both cowboy and citizen die', () => {
    const result = game.resolveCowboyAction(p.C1.id);
    expect(dead(p.Cow)).toBe(true);
    expect(dead(p.C1)).toBe(true);
    expect(result.cowboyDied).toBe(true);
    expect(result.killed).toBe(true);
  });

  it('CB3.2: Citizen target is revivable', () => {
    game.resolveCowboyAction(p.C1.id);
    expect(p.C1.isRevivable).toBe(true);
  });

  it('CB3.3: Side is citizen', () => {
    const result = game.resolveCowboyAction(p.C1.id);
    expect(result.side).toBe('citizen');
  });
});


/* ═══════════════════════════════════════════════════════════════════
   CB4 — Cowboy targets zodiac
   ═══════════════════════════════════════════════════════════════════ */
describe('CB4 — Cowboy targets zodiac: both die, zodiac revivable', () => {
  let game, p;

  beforeEach(() => {
    ({ game, p } = setup({
      GF: 'godfather',
      SM: 'simpleMafia',
      Cow: 'cowboy',
      Zod: 'zodiac',
      C1: 'simpleCitizen',
      C2: 'simpleCitizen',
      C3: 'simpleCitizen',
      C4: 'simpleCitizen',
    }));
    game.startDay();
  });

  it('CB4.1: Both cowboy and zodiac die', () => {
    const result = game.resolveCowboyAction(p.Zod.id);
    expect(dead(p.Cow)).toBe(true);
    expect(dead(p.Zod)).toBe(true);
    expect(result.cowboyDied).toBe(true);
    expect(result.killed).toBe(true);
  });

  it('CB4.2: Zodiac is revivable by Constantine', () => {
    game.resolveCowboyAction(p.Zod.id);
    expect(p.Zod.isRevivable).toBe(true);
  });

  it('CB4.3: Side is zodiac', () => {
    const result = game.resolveCowboyAction(p.Zod.id);
    expect(result.side).toBe('zodiac');
  });
});


/* ═══════════════════════════════════════════════════════════════════
   CB5 — Constantine cannot revive cowboy
   ═══════════════════════════════════════════════════════════════════ */
describe('CB5 — Cowboy not in revivable players list', () => {
  let game, p;

  beforeEach(() => {
    ({ game, p } = setup({
      GF: 'godfather',
      SM: 'simpleMafia',
      Cow: 'cowboy',
      Con: 'constantine',
      C1: 'simpleCitizen',
      C2: 'simpleCitizen',
      C3: 'simpleCitizen',
      C4: 'simpleCitizen',
    }));
    game.startDay();
    game.resolveCowboyAction(p.SM.id);
  });

  it('CB5.1: Cowboy not in revivable list', () => {
    const revivable = game.getRevivablePlayers();
    const cowboyInList = revivable.some(p => p.roleId === 'cowboy');
    expect(cowboyInList).toBe(false);
  });

  it('CB5.2: Target (mafia) IS in revivable list', () => {
    const revivable = game.getRevivablePlayers();
    const targetInList = revivable.some(rp => rp.id === p.SM.id);
    expect(targetInList).toBe(true);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   CB6 — Constantine CAN revive cowboy's target
   ═══════════════════════════════════════════════════════════════════ */
describe('CB6 — Constantine revives cowboy target', () => {
  let game, p;

  beforeEach(() => {
    ({ game, p } = setup({
      GF: 'godfather',
      SM: 'simpleMafia',
      Cow: 'cowboy',
      Con: 'constantine',
      C1: 'simpleCitizen',
      C2: 'simpleCitizen',
      C3: 'simpleCitizen',
      C4: 'simpleCitizen',
    }));
    game.startDay();
    game.resolveCowboyAction(p.C1.id);
  });

  it('CB6.1: Constantine can revive citizen killed by cowboy', () => {
    const results = nightRound(game, {
      constantine: { actorIds: [p.Con.id], targetId: p.C1.id, actionType: 'revive' },
    });
    expect(results.revived).toBe(p.C1.id);
    expect(alive(p.C1)).toBe(true);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   CB7 — Cowboy curse chain: if Jack cursed cowboy and cowboy uses ability
   ═══════════════════════════════════════════════════════════════════ */
describe('CB7 — Cowboy is cursed by Jack, uses ability → Jack dies', () => {
  let game, p;

  beforeEach(() => {
    ({ game, p } = setup({
      GF: 'godfather',
      SM: 'simpleMafia',
      Cow: 'cowboy',
      Jack: 'jack',
      C1: 'simpleCitizen',
      C2: 'simpleCitizen',
      C3: 'simpleCitizen',
      C4: 'simpleCitizen',
    }));

    // Night 1: Jack curses cowboy
    nightRound(game, {
      jack: { actorIds: [p.Jack.id], targetId: p.Cow.id, actionType: 'curse' },
    });
    game.startDay();
  });

  it('CB7.1: Cowboy targets mafia, cowboy dies, Jack curse triggers → Jack dies', () => {
    const result = game.resolveCowboyAction(p.SM.id);
    expect(dead(p.Cow)).toBe(true);
    expect(dead(p.Jack)).toBe(true);
    expect(result.jackCurseTriggered).toBe(true);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   NG1 — Negotiate excludes mafia kill/salakhi
   ═══════════════════════════════════════════════════════════════════ */
describe('NG1 — Negotiate and mafia kill are mutually exclusive', () => {
  let game, p;

  beforeEach(() => {
    ({ game, p } = setup({
      GF: 'godfather',
      Neg: 'negotiator',
      C1: 'simpleCitizen',
      C2: 'simpleCitizen',
      C3: 'simpleCitizen',
      C4: 'simpleCitizen',
      C5: 'simpleCitizen',
      C6: 'simpleCitizen',
    }));
    game.negotiatorThreshold = 3;
  });

  it('NG1.1: When negotiator acts, godfather kill is skipped', () => {
    const results = nightRound(game, {
      negotiator: { actorIds: [p.Neg.id], targetId: p.C1.id, actionType: 'negotiate' },
      godfather: { actorIds: [p.GF.id], targetId: p.C2.id, actionType: 'kill', mode: 'shoot' },
    });
    // C1 should be negotiated (success), C2 should NOT be killed
    expect(results.negotiated?.success).toBe(true);
    expect(alive(p.C2)).toBe(true);
  });

  it('NG1.2: When negotiator acts, salakhi is also skipped', () => {
    const results = nightRound(game, {
      negotiator: { actorIds: [p.Neg.id], targetId: p.C1.id, actionType: 'negotiate' },
      godfather: { actorIds: [p.GF.id], targetId: p.C2.id, actionType: 'kill', mode: 'salakhi', guessedRoleId: 'simpleCitizen' },
    });
    expect(alive(p.C2)).toBe(true);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   NG2 — Negotiate success with simpleCitizen
   ═══════════════════════════════════════════════════════════════════ */
describe('NG2 — Negotiate recruits simpleCitizen into mafia', () => {
  let game, p;

  beforeEach(() => {
    ({ game, p } = setup({
      GF: 'godfather',
      Neg: 'negotiator',
      C1: 'simpleCitizen',
      C2: 'simpleCitizen',
      C3: 'simpleCitizen',
      C4: 'simpleCitizen',
      C5: 'simpleCitizen',
      C6: 'simpleCitizen',
    }));
    game.negotiatorThreshold = 3;
  });

  it('NG2.1: simpleCitizen becomes simpleMafia after negotiation', () => {
    const results = nightRound(game, {
      negotiator: { actorIds: [p.Neg.id], targetId: p.C1.id, actionType: 'negotiate' },
    });
    expect(results.negotiated.success).toBe(true);
    expect(p.C1.roleId).toBe('simpleMafia');
  });

  it('NG2.2: Recruited player is alive and part of mafia team', () => {
    nightRound(game, {
      negotiator: { actorIds: [p.Neg.id], targetId: p.C1.id, actionType: 'negotiate' },
    });
    expect(alive(p.C1)).toBe(true);
    expect(Roles.get(p.C1.roleId)?.team).toBe('mafia');
  });
});


/* ═══════════════════════════════════════════════════════════════════
   NG3 — Negotiate success with suspect (maznoon)
   ═══════════════════════════════════════════════════════════════════ */
describe('NG3 — Negotiate recruits suspect (maznoon) into mafia', () => {
  let game, p;

  beforeEach(() => {
    ({ game, p } = setup({
      GF: 'godfather',
      Neg: 'negotiator',
      Sus: 'suspect',
      C1: 'simpleCitizen',
      C2: 'simpleCitizen',
      C3: 'simpleCitizen',
      C4: 'simpleCitizen',
      C5: 'simpleCitizen',
    }));
    game.negotiatorThreshold = 3;
  });

  it('NG3.1: suspect becomes simpleMafia after negotiation', () => {
    const results = nightRound(game, {
      negotiator: { actorIds: [p.Neg.id], targetId: p.Sus.id, actionType: 'negotiate' },
    });
    expect(results.negotiated.success).toBe(true);
    expect(p.Sus.roleId).toBe('simpleMafia');
    expect(Roles.get(p.Sus.roleId)?.team).toBe('mafia');
  });
});


/* ═══════════════════════════════════════════════════════════════════
   NG4 — Other mafia abilities still work during negotiate night
   ═══════════════════════════════════════════════════════════════════ */
describe('NG4 — Mafia abilities (Dr Lecter, Silencer) work on negotiate night', () => {
  let game, p;

  beforeEach(() => {
    ({ game, p } = setup({
      GF: 'godfather',
      Neg: 'negotiator',
      DL: 'drLecter',
      Mat: 'matador',
      C1: 'simpleCitizen',
      C2: 'simpleCitizen',
      C3: 'simpleCitizen',
      C4: 'simpleCitizen',
    }));
    game.negotiatorThreshold = 5;
  });

  it('NG4.1: Dr Lecter can heal on negotiate night', () => {
    const results = nightRound(game, {
      negotiator: { actorIds: [p.Neg.id], targetId: p.C1.id, actionType: 'negotiate' },
      drLecter: { actorIds: [p.DL.id], targetId: p.GF.id, actionType: 'mafiaHeal' },
    });
    expect(results.negotiated.success).toBe(true);
    expect(p.GF.healed).toBe(true);
  });

  it('NG4.2: Silencer can silence on negotiate night', () => {
    const results = nightRound(game, {
      negotiator: { actorIds: [p.Neg.id], targetId: p.C1.id, actionType: 'negotiate' },
      matador: { actorIds: [p.Mat.id], targetId: p.C2.id, actionType: 'silence' },
    });
    expect(results.silenced).toBe(p.C2.id);
    expect(p.C2.silenced).toBe(true);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   NG5 — Negotiate fail still blocks mafia shoot
   ═══════════════════════════════════════════════════════════════════ */
describe('NG5 — Failed negotiation still blocks mafia kill', () => {
  let game, p;

  beforeEach(() => {
    ({ game, p } = setup({
      GF: 'godfather',
      Neg: 'negotiator',
      Det: 'detective',
      C1: 'simpleCitizen',
      C2: 'simpleCitizen',
      C3: 'simpleCitizen',
      C4: 'simpleCitizen',
      C5: 'simpleCitizen',
    }));
    game.negotiatorThreshold = 3;
  });

  it('NG5.1: Targeting detective (not recruitable) fails but still blocks kill', () => {
    const results = nightRound(game, {
      negotiator: { actorIds: [p.Neg.id], targetId: p.Det.id, actionType: 'negotiate' },
      godfather: { actorIds: [p.GF.id], targetId: p.C1.id, actionType: 'kill', mode: 'shoot' },
    });
    expect(results.negotiated.success).toBe(false);
    expect(p.Det.roleId).toBe('detective'); // not changed
    expect(alive(p.C1)).toBe(true); // godfather kill skipped
  });
});
