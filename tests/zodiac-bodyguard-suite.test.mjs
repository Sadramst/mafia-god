/**
 * zodiac-bodyguard-suite.test.mjs — Zodiac vs Bodyguard interaction tests
 *
 * ZB1: Zodiac shoots bodyguard → Zodiac dies, bodyguard survives
 * ZB2: Zodiac shoots bodyguard — Zodiac is in killed list, bodyguard is NOT
 * ZB3: Zodiac shoots bodyguard — deathCause is 'zodiac_bodyguard'
 * ZB4: Zodiac shoots non-bodyguard citizen → citizen dies, Zodiac survives
 * ZB5: Zodiac shoots healed bodyguard → Zodiac still dies (heal irrelevant)
 * ZB6: Zodiac shoots bodyguard + mafia shoots bodyguard same night → Zodiac dies, bodyguard survives mafia shot too (healed)
 * ZB7: Zodiac shoots bodyguard while other kills happen → all resolve correctly
 * ZB8: After Zodiac dies to bodyguard, citizens can win
 * ZB9: Zodiac death to bodyguard is revivable (default)
 * ZB10: Bodyguard still functions for bomb after surviving Zodiac
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
   ZB1 — Core: Zodiac shoots bodyguard → Zodiac dies, bodyguard lives
   ═══════════════════════════════════════════════════════════════════ */
describe('ZB1 — Zodiac shoots bodyguard — Zodiac dies, bodyguard survives', () => {
  let game, p;

  const roster = {
    Zodiac: 'zodiac',
    Bodyguard: 'bodyguard',
    Godfather: 'godfather',
    Lecter: 'drLecter',
    Watson: 'drWatson',
    Citizen1: 'simpleCitizen',
    Citizen2: 'simpleCitizen',
    Citizen3: 'simpleCitizen',
  };

  beforeEach(() => {
    ({ game, p } = setup(roster));
  });

  it('Zodiac dies when shooting bodyguard', () => {
    const results = nightRound(game, {
      zodiac: { actorIds: [p.Zodiac.id], targetId: p.Bodyguard.id, actionType: 'shoot' },
    });

    expect(dead(p.Zodiac)).toBe(true);
    expect(alive(p.Bodyguard)).toBe(true);
  });

  it('Zodiac is in killed list, bodyguard is NOT', () => {
    const results = nightRound(game, {
      zodiac: { actorIds: [p.Zodiac.id], targetId: p.Bodyguard.id, actionType: 'shoot' },
    });

    expect(results.killed).toContain(p.Zodiac.id);
    expect(results.killed).not.toContain(p.Bodyguard.id);
  });

  it('Zodiac deathCause is zodiac_bodyguard', () => {
    nightRound(game, {
      zodiac: { actorIds: [p.Zodiac.id], targetId: p.Bodyguard.id, actionType: 'shoot' },
    });

    expect(p.Zodiac.deathCause).toBe('zodiac_bodyguard');
    expect(p.Zodiac.deathRound).toBe(game.round);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   ZB2 — Zodiac shoots non-bodyguard → normal kill
   ═══════════════════════════════════════════════════════════════════ */
describe('ZB2 — Zodiac shoots non-bodyguard', () => {
  let game, p;

  const roster = {
    Zodiac: 'zodiac',
    Bodyguard: 'bodyguard',
    Godfather: 'godfather',
    Lecter: 'drLecter',
    Watson: 'drWatson',
    Citizen1: 'simpleCitizen',
    Citizen2: 'simpleCitizen',
    Citizen3: 'simpleCitizen',
  };

  beforeEach(() => {
    ({ game, p } = setup(roster));
  });

  it('Zodiac kills regular citizen and survives', () => {
    const results = nightRound(game, {
      zodiac: { actorIds: [p.Zodiac.id], targetId: p.Citizen1.id, actionType: 'shoot' },
    });

    expect(alive(p.Zodiac)).toBe(true);
    expect(dead(p.Citizen1)).toBe(true);
    expect(results.killed).toContain(p.Citizen1.id);
    expect(results.killed).not.toContain(p.Zodiac.id);
  });

  it('Zodiac kills mafia member and survives', () => {
    const results = nightRound(game, {
      zodiac: { actorIds: [p.Zodiac.id], targetId: p.Lecter.id, actionType: 'shoot' },
    });

    expect(alive(p.Zodiac)).toBe(true);
    expect(dead(p.Lecter)).toBe(true);
    expect(results.killed).toContain(p.Lecter.id);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   ZB3 — Zodiac shoots healed bodyguard → Zodiac still dies
   ═══════════════════════════════════════════════════════════════════ */
describe('ZB3 — Zodiac shoots healed bodyguard', () => {
  let game, p;

  const roster = {
    Zodiac: 'zodiac',
    Bodyguard: 'bodyguard',
    Godfather: 'godfather',
    Lecter: 'drLecter',
    Watson: 'drWatson',
    Citizen1: 'simpleCitizen',
    Citizen2: 'simpleCitizen',
    Citizen3: 'simpleCitizen',
  };

  beforeEach(() => {
    ({ game, p } = setup(roster));
  });

  it('Zodiac dies even if Watson healed bodyguard', () => {
    const results = nightRound(game, {
      zodiac: { actorIds: [p.Zodiac.id], targetId: p.Bodyguard.id, actionType: 'shoot' },
      drWatson: { actorIds: [p.Watson.id], targetId: p.Bodyguard.id, actionType: 'heal' },
    });

    // Bodyguard role check happens first — Zodiac dies regardless of heal
    expect(dead(p.Zodiac)).toBe(true);
    expect(alive(p.Bodyguard)).toBe(true);
    expect(results.killed).toContain(p.Zodiac.id);
    expect(results.killed).not.toContain(p.Bodyguard.id);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   ZB4 — Zodiac shoots bodyguard + mafia also targets bodyguard
   ═══════════════════════════════════════════════════════════════════ */
describe('ZB4 — Zodiac + mafia both target bodyguard', () => {
  let game, p;

  const roster = {
    Zodiac: 'zodiac',
    Bodyguard: 'bodyguard',
    Godfather: 'godfather',
    Lecter: 'drLecter',
    Watson: 'drWatson',
    Citizen1: 'simpleCitizen',
    Citizen2: 'simpleCitizen',
    Citizen3: 'simpleCitizen',
  };

  beforeEach(() => {
    ({ game, p } = setup(roster));
  });

  it('Mafia kills bodyguard first → bodyguard dead before zodiac fires → zodiac survives', () => {
    // Resolution order: mafia (step 5) kills bodyguard BEFORE zodiac (step 7)
    // So when zodiac fires, bodyguard is already dead → no interaction
    const results = nightRound(game, {
      godfather: { actorIds: [p.Godfather.id], targetId: p.Bodyguard.id, actionType: 'shoot', mode: 'shoot' },
      zodiac: { actorIds: [p.Zodiac.id], targetId: p.Bodyguard.id, actionType: 'shoot' },
    });

    // Bodyguard is dead from mafia shot
    expect(dead(p.Bodyguard)).toBe(true);
    expect(results.killed).toContain(p.Bodyguard.id);

    // Zodiac survives — bodyguard was already dead when zodiac shot fired
    expect(alive(p.Zodiac)).toBe(true);
    expect(results.killed).not.toContain(p.Zodiac.id);
  });

  it('Zodiac dies when bodyguard survives mafia via Watson heal', () => {
    // Watson heals bodyguard → survives mafia → bodyguard alive when zodiac fires → zodiac dies
    const results = nightRound(game, {
      godfather: { actorIds: [p.Godfather.id], targetId: p.Bodyguard.id, actionType: 'shoot', mode: 'shoot' },
      drWatson: { actorIds: [p.Watson.id], targetId: p.Bodyguard.id, actionType: 'heal' },
      zodiac: { actorIds: [p.Zodiac.id], targetId: p.Bodyguard.id, actionType: 'shoot' },
    });

    // Zodiac dies to bodyguard interaction (bodyguard survived mafia via heal)
    expect(dead(p.Zodiac)).toBe(true);
    expect(results.killed).toContain(p.Zodiac.id);

    // Bodyguard survives both mafia (healed) and zodiac interaction
    expect(alive(p.Bodyguard)).toBe(true);
    expect(results.saved).toContain(p.Bodyguard.id);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   ZB5 — Simultaneous kills — Zodiac dies to bodyguard while other kills happen
   ═══════════════════════════════════════════════════════════════════ */
describe('ZB5 — Zodiac shoots bodyguard amid other night actions', () => {
  let game, p;

  const roster = {
    Zodiac: 'zodiac',
    Bodyguard: 'bodyguard',
    Godfather: 'godfather',
    Lecter: 'drLecter',
    Watson: 'drWatson',
    Citizen1: 'simpleCitizen',
    Citizen2: 'simpleCitizen',
    Citizen3: 'simpleCitizen',
  };

  beforeEach(() => {
    ({ game, p } = setup(roster));
  });

  it('Zodiac dies + mafia kills citizen — both in killed list', () => {
    const results = nightRound(game, {
      godfather: { actorIds: [p.Godfather.id], targetId: p.Citizen1.id, actionType: 'shoot', mode: 'shoot' },
      zodiac: { actorIds: [p.Zodiac.id], targetId: p.Bodyguard.id, actionType: 'shoot' },
    });

    expect(dead(p.Zodiac)).toBe(true);
    expect(dead(p.Citizen1)).toBe(true);
    expect(alive(p.Bodyguard)).toBe(true);

    expect(results.killed).toContain(p.Zodiac.id);
    expect(results.killed).toContain(p.Citizen1.id);
    expect(results.killed).not.toContain(p.Bodyguard.id);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   ZB6 — After Zodiac dies to bodyguard → citizens can win
   ═══════════════════════════════════════════════════════════════════ */
describe('ZB6 — Win condition after Zodiac dies to bodyguard', () => {
  let game, p;

  const roster = {
    Zodiac: 'zodiac',
    Bodyguard: 'bodyguard',
    Godfather: 'godfather',
    Lecter: 'drLecter',
    Watson: 'drWatson',
    Citizen1: 'simpleCitizen',
    Citizen2: 'simpleCitizen',
    Citizen3: 'simpleCitizen',
  };

  beforeEach(() => {
    ({ game, p } = setup(roster));
  });

  it('all mafia + zodiac dead → citizen wins', () => {
    // Kill zodiac via bodyguard
    nightRound(game, {
      zodiac: { actorIds: [p.Zodiac.id], targetId: p.Bodyguard.id, actionType: 'shoot' },
    });
    expect(dead(p.Zodiac)).toBe(true);

    // Now kill all mafia
    p.Godfather.kill(1, 'vote');
    p.Lecter.kill(1, 'vote');

    const winner = game.checkWinCondition();
    expect(winner).toBe('citizen');
  });
});


/* ═══════════════════════════════════════════════════════════════════
   ZB7 — Zodiac death to bodyguard IS revivable (default)
   ═══════════════════════════════════════════════════════════════════ */
describe('ZB7 — Zodiac killed by bodyguard is revivable', () => {
  let game, p;

  const roster = {
    Zodiac: 'zodiac',
    Bodyguard: 'bodyguard',
    Godfather: 'godfather',
    Lecter: 'drLecter',
    Constantine: 'constantine',
    Citizen1: 'simpleCitizen',
    Citizen2: 'simpleCitizen',
    Citizen3: 'simpleCitizen',
  };

  beforeEach(() => {
    ({ game, p } = setup(roster));
  });

  it('Zodiac is revivable after dying to bodyguard', () => {
    nightRound(game, {
      zodiac: { actorIds: [p.Zodiac.id], targetId: p.Bodyguard.id, actionType: 'shoot' },
    });

    expect(dead(p.Zodiac)).toBe(true);
    expect(p.Zodiac.isRevivable).toBe(true);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   ZB8 — Bodyguard still functions (alive) after Zodiac interaction
   ═══════════════════════════════════════════════════════════════════ */
describe('ZB8 — Bodyguard alive and functional after zodiac death', () => {
  let game, p;

  const roster = {
    Zodiac: 'zodiac',
    Bodyguard: 'bodyguard',
    Godfather: 'godfather',
    Lecter: 'drLecter',
    Watson: 'drWatson',
    Citizen1: 'simpleCitizen',
    Citizen2: 'simpleCitizen',
    Citizen3: 'simpleCitizen',
  };

  beforeEach(() => {
    ({ game, p } = setup(roster));
  });

  it('bodyguard still available for bomb defuse after surviving zodiac', () => {
    // Night 1: Zodiac shoots bodyguard → zodiac dies
    nightRound(game, {
      zodiac: { actorIds: [p.Zodiac.id], targetId: p.Bodyguard.id, actionType: 'shoot' },
    });

    expect(dead(p.Zodiac)).toBe(true);
    expect(alive(p.Bodyguard)).toBe(true);

    // Bodyguard is still alive for bomb check
    expect(game.isBodyguardAliveForBomb()).toBe(true);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   ZB9 — Zodiac is immune to own night shots (cannot be killed by mafia)
   ═══════════════════════════════════════════════════════════════════ */
describe('ZB9 — Zodiac immunity to regular night shots', () => {
  let game, p;

  const roster = {
    Zodiac: 'zodiac',
    Bodyguard: 'bodyguard',
    Godfather: 'godfather',
    Lecter: 'drLecter',
    Watson: 'drWatson',
    Citizen1: 'simpleCitizen',
    Citizen2: 'simpleCitizen',
    Citizen3: 'simpleCitizen',
  };

  beforeEach(() => {
    ({ game, p } = setup(roster));
  });

  it('mafia cannot kill Zodiac with regular shoot', () => {
    const results = nightRound(game, {
      godfather: { actorIds: [p.Godfather.id], targetId: p.Zodiac.id, actionType: 'shoot', mode: 'shoot' },
    });

    expect(alive(p.Zodiac)).toBe(true);
    expect(results.killed).not.toContain(p.Zodiac.id);
  });

  it('Zodiac only dies to bodyguard interaction, not regular kill attempts', () => {
    // Mafia targets zodiac (immune), zodiac targets bodyguard (dies)
    const results = nightRound(game, {
      godfather: { actorIds: [p.Godfather.id], targetId: p.Zodiac.id, actionType: 'shoot', mode: 'shoot' },
      zodiac: { actorIds: [p.Zodiac.id], targetId: p.Bodyguard.id, actionType: 'shoot' },
    });

    expect(dead(p.Zodiac)).toBe(true);
    expect(p.Zodiac.deathCause).toBe('zodiac_bodyguard');
    expect(alive(p.Bodyguard)).toBe(true);
  });
});


/* ═══════════════════════════════════════════════════════════════════
   ZB10 — Zodiac shoots healed non-bodyguard → target saved
   ═══════════════════════════════════════════════════════════════════ */
describe('ZB10 — Zodiac shoots healed target (non-bodyguard)', () => {
  let game, p;

  const roster = {
    Zodiac: 'zodiac',
    Bodyguard: 'bodyguard',
    Godfather: 'godfather',
    Lecter: 'drLecter',
    Watson: 'drWatson',
    Citizen1: 'simpleCitizen',
    Citizen2: 'simpleCitizen',
    Citizen3: 'simpleCitizen',
  };

  beforeEach(() => {
    ({ game, p } = setup(roster));
  });

  it('Watson-healed target survives Zodiac shot', () => {
    const results = nightRound(game, {
      drWatson: { actorIds: [p.Watson.id], targetId: p.Citizen1.id, actionType: 'heal' },
      zodiac: { actorIds: [p.Zodiac.id], targetId: p.Citizen1.id, actionType: 'shoot' },
    });

    expect(alive(p.Zodiac)).toBe(true);
    expect(alive(p.Citizen1)).toBe(true);
    expect(results.saved).toContain(p.Citizen1.id);
  });
});
