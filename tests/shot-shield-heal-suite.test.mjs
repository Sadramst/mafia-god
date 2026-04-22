/**
 * shot-shield-heal-suite.test.mjs — Comprehensive tests for shot mechanics
 *
 * MS1: Morning shot blank → always harmless, shows "مشقی"
 * MS2: Morning shot live → kills target, shows "جنگی"
 * MS3: Morning shot live → healed target survives, UI shows "مشقی" (conceals live), heal consumed
 * MS4: Morning shot live → shielded target survives, UI shows "مشقی" (conceals live), shield consumed
 * MS5: Morning shot live → Jack survives, curse locked, shows "جنگی"
 * MS6: Morning shot live healed → second shot same morning kills
 * MS7: Morning shot live shielded → second shot same morning kills
 * MS8: Pedarkhandeh (godfather) shield absorbs first shot, second shot kills
 * MS9: Sniper shield absorbs first shot, second shot kills
 * MS10: Heal consumed by night mafia shoot → morning shot kills
 * MS11: Shield consumed by night mafia shoot → morning shot kills
 * MS12: Live bullet expiration kills holder at voting
 * MS13: Morning shot + Jack curse chain
 * MS14: Heal consumed by zodiac → morning shot kills
 * MS15: Heal consumed by sniper → morning shot kills
 * MS16: Live shot on zodiac (zodiac is NOT immune to morning shot)
 * COW1: Cowboy action visible (canCowboyAct returns true for alive cowboy)
 * COW2: Cowboy action hidden after use (_cowboyUsed)
 * COW3: resolveMorningShot returns correct stoppedBy values
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

/** Give a bullet and advance to day */
function giveBulletAndStartDay(game, holderId, type) {
  game.gunnerGiveBullet(holderId, type);
  game.resolveNight();
  game.startDay();
}

/* ═══════════════════════════════════════════════════════════════════
   MS1 — Morning shot blank → always harmless
   ═══════════════════════════════════════════════════════════════════ */
describe('MS1 — Morning shot blank is always harmless', () => {
  let game, p;

  beforeEach(() => {
    ({ game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Gun: 'gunner',
      C1: 'simpleCitizen', C2: 'simpleCitizen', C3: 'simpleCitizen',
      C4: 'simpleCitizen', C5: 'simpleCitizen',
    }));
  });

  it('blank bullet returns type=blank and killed=false', () => {
    game.startNight();
    game.nightActions = {
      gunner: { bulletAssignments: [{ holderId: p.C1.id, type: 'blank' }] },
    };
    game.resolveNight();
    game.startDay();

    const result = game.resolveMorningShot(p.C1.id, p.C2.id);
    expect(result.type).toBe('blank');
    expect(result.killed).toBe(false);
    expect(result.stoppedBy).toBeNull();
    expect(alive(p.C2)).toBe(true);
  });

  it('blank bullet on mafia → still harmless', () => {
    game.startNight();
    game.nightActions = {
      gunner: { bulletAssignments: [{ holderId: p.C1.id, type: 'blank' }] },
    };
    game.resolveNight();
    game.startDay();

    const result = game.resolveMorningShot(p.C1.id, p.GF.id);
    expect(result.type).toBe('blank');
    expect(result.killed).toBe(false);
    expect(alive(p.GF)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   MS2 — Morning shot live kills target
   ═══════════════════════════════════════════════════════════════════ */
describe('MS2 — Morning shot live kills unprotected target', () => {
  let game, p;

  beforeEach(() => {
    ({ game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Gun: 'gunner',
      C1: 'simpleCitizen', C2: 'simpleCitizen', C3: 'simpleCitizen',
      C4: 'simpleCitizen', C5: 'simpleCitizen',
    }));
  });

  it('live bullet kills simpleCitizen', () => {
    game.startNight();
    game.nightActions = {
      gunner: { bulletAssignments: [{ holderId: p.C1.id, type: 'live' }] },
    };
    game.resolveNight();
    game.startDay();

    const result = game.resolveMorningShot(p.C1.id, p.C2.id);
    expect(result.type).toBe('live');
    expect(result.killed).toBe(true);
    expect(result.targetTeam).toBe('citizen');
    expect(dead(p.C2)).toBe(true);
  });

  it('live bullet kills simpleMafia (no shield)', () => {
    game.startNight();
    game.nightActions = {
      gunner: { bulletAssignments: [{ holderId: p.C1.id, type: 'live' }] },
    };
    game.resolveNight();
    game.startDay();

    const result = game.resolveMorningShot(p.C1.id, p.SM.id);
    expect(result.type).toBe('live');
    expect(result.killed).toBe(true);
    expect(result.targetTeam).toBe('mafia');
    expect(dead(p.SM)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   MS3 — Morning shot live + healed → survives, heal consumed, UI shows "مشقی"
   ═══════════════════════════════════════════════════════════════════ */
describe('MS3 — Morning shot live on healed target: survives, type=live (UI shows مشقی), heal consumed', () => {
  let game, p;

  beforeEach(() => {
    ({ game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Gun: 'gunner',
      Doc: 'drWatson', C1: 'simpleCitizen', C2: 'simpleCitizen',
      C3: 'simpleCitizen', C4: 'simpleCitizen',
    }));
  });

  it('live shot on healed target returns type=live, stoppedBy=healed, NOT killed', () => {
    game.startNight();
    game.nightActions = {
      gunner: { bulletAssignments: [{ holderId: p.C1.id, type: 'live' }] },
      drWatson: { actorIds: [p.Doc.id], targetId: p.C2.id, actionType: 'heal' },
    };
    game.resolveNight();
    game.startDay();

    // C2 is healed
    expect(p.C2.healed).toBe(true);

    const result = game.resolveMorningShot(p.C1.id, p.C2.id);
    expect(result.type).toBe('live');
    expect(result.killed).toBe(false);
    expect(result.stoppedBy).toBe('healed');
    expect(alive(p.C2)).toBe(true);
  });

  it('heal is consumed after blocking morning shot', () => {
    game.startNight();
    game.nightActions = {
      gunner: { bulletAssignments: [
        { holderId: p.C1.id, type: 'live' },
        { holderId: p.C3.id, type: 'live' },
      ]},
      drWatson: { actorIds: [p.Doc.id], targetId: p.C2.id, actionType: 'heal' },
    };
    game.resolveNight();
    game.startDay();

    // First shot: healed → survives
    const r1 = game.resolveMorningShot(p.C1.id, p.C2.id);
    expect(r1.stoppedBy).toBe('healed');
    expect(alive(p.C2)).toBe(true);

    // Heal should be consumed
    expect(p.C2.healed).toBe(false);

    // Second shot: no heal → dies
    const r2 = game.resolveMorningShot(p.C3.id, p.C2.id);
    expect(r2.type).toBe('live');
    expect(r2.killed).toBe(true);
    expect(dead(p.C2)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   MS4 — Morning shot live + shielded → survives, shield consumed
   ═══════════════════════════════════════════════════════════════════ */
describe('MS4 — Morning shot live on shielded target: survives, shield consumed', () => {
  let game, p;

  beforeEach(() => {
    ({ game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Gun: 'gunner',
      C1: 'simpleCitizen', C2: 'simpleCitizen', C3: 'simpleCitizen',
      C4: 'simpleCitizen', C5: 'simpleCitizen',
    }));
  });

  it('live shot on godfather (shielded) returns type=live, stoppedBy=shield', () => {
    // Godfather has shield by default
    expect(p.GF.shield.isActive).toBe(true);

    game.startNight();
    game.nightActions = {
      gunner: { bulletAssignments: [{ holderId: p.C1.id, type: 'live' }] },
    };
    game.resolveNight();
    game.startDay();

    const result = game.resolveMorningShot(p.C1.id, p.GF.id);
    expect(result.type).toBe('live');
    expect(result.killed).toBe(false);
    expect(result.stoppedBy).toBe('shield');
    expect(alive(p.GF)).toBe(true);
    // Shield should now be consumed
    expect(p.GF.shield.isActive).toBe(false);
  });

  it('shield consumed → second shot kills godfather', () => {
    game.startNight();
    game.nightActions = {
      gunner: { bulletAssignments: [
        { holderId: p.C1.id, type: 'live' },
        { holderId: p.C2.id, type: 'live' },
      ]},
    };
    game.resolveNight();
    game.startDay();

    // First shot absorbs shield
    const r1 = game.resolveMorningShot(p.C1.id, p.GF.id);
    expect(r1.stoppedBy).toBe('shield');
    expect(alive(p.GF)).toBe(true);

    // Second shot kills
    const r2 = game.resolveMorningShot(p.C2.id, p.GF.id);
    expect(r2.killed).toBe(true);
    expect(dead(p.GF)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   MS5 — Morning shot live on Jack → survives, curse locked
   ═══════════════════════════════════════════════════════════════════ */
describe('MS5 — Morning shot live on Jack: survives, curse locked, type=live', () => {
  let game, p;

  beforeEach(() => {
    ({ game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Gun: 'gunner',
      Jack: 'jack', C1: 'simpleCitizen', C2: 'simpleCitizen',
      C3: 'simpleCitizen', C4: 'simpleCitizen',
    }));
  });

  it('live shot on Jack returns type=live, stoppedBy=jack', () => {
    game.startNight();
    game.nightActions = {
      gunner: { bulletAssignments: [{ holderId: p.C1.id, type: 'live' }] },
    };
    game.resolveNight();
    game.startDay();

    const result = game.resolveMorningShot(p.C1.id, p.Jack.id);
    expect(result.type).toBe('live');
    expect(result.killed).toBe(false);
    expect(result.stoppedBy).toBe('jack');
    expect(alive(p.Jack)).toBe(true);
    expect(p.Jack.curse.isLocked).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   MS6 — Heal consumed by morning shot → second shot kills
   ═══════════════════════════════════════════════════════════════════ */
describe('MS6 — Heal consumed: first morning shot healed, second morning shot kills', () => {
  let game, p;

  beforeEach(() => {
    ({ game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Gun: 'gunner',
      Doc: 'drWatson', C1: 'simpleCitizen', C2: 'simpleCitizen',
      C3: 'simpleCitizen', C4: 'simpleCitizen',
    }));
  });

  it('two live bullets at healed target: first blocked, second kills', () => {
    game.startNight();
    game.nightActions = {
      gunner: { bulletAssignments: [
        { holderId: p.C1.id, type: 'live' },
        { holderId: p.C3.id, type: 'live' },
      ]},
      drWatson: { actorIds: [p.Doc.id], targetId: p.C2.id, actionType: 'heal' },
    };
    game.resolveNight();
    game.startDay();

    const r1 = game.resolveMorningShot(p.C1.id, p.C2.id);
    expect(r1.stoppedBy).toBe('healed');
    expect(alive(p.C2)).toBe(true);
    expect(p.C2.healed).toBe(false);

    const r2 = game.resolveMorningShot(p.C3.id, p.C2.id);
    expect(r2.killed).toBe(true);
    expect(dead(p.C2)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   MS7 — Shield consumed by morning shot → second shot kills
   ═══════════════════════════════════════════════════════════════════ */
describe('MS7 — Shield consumed: first morning shot shielded, second kills', () => {
  it('sniper has shield, two live bullets: first absorbed, second kills', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Gun: 'gunner',
      Snipe: 'sniper', C1: 'simpleCitizen', C2: 'simpleCitizen',
      C3: 'simpleCitizen', C4: 'simpleCitizen',
    });

    expect(p.Snipe.shield.isActive).toBe(true);

    game.startNight();
    game.nightActions = {
      gunner: { bulletAssignments: [
        { holderId: p.C1.id, type: 'live' },
        { holderId: p.C2.id, type: 'live' },
      ]},
    };
    game.resolveNight();
    game.startDay();

    const r1 = game.resolveMorningShot(p.C1.id, p.Snipe.id);
    expect(r1.stoppedBy).toBe('shield');
    expect(alive(p.Snipe)).toBe(true);
    expect(p.Snipe.shield.isActive).toBe(false);

    const r2 = game.resolveMorningShot(p.C2.id, p.Snipe.id);
    expect(r2.killed).toBe(true);
    expect(dead(p.Snipe)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   MS8 — Pedarkhandeh (Godfather) shield: absorbs first hit only
   ═══════════════════════════════════════════════════════════════════ */
describe('MS8 — Godfather shield absorbs first hit, subsequent hits kill', () => {
  it('night sniper shot absorbed by shield, morning shot kills godfather', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Gun: 'gunner',
      Snipe: 'sniper', C1: 'simpleCitizen', C2: 'simpleCitizen',
      C3: 'simpleCitizen', C4: 'simpleCitizen',
    });

    expect(p.GF.shield.isActive).toBe(true);

    // Night: sniper shoots godfather → shield absorbs
    game.startNight();
    game.nightActions = {
      sniper: { actorIds: [p.Snipe.id], targetId: p.GF.id, actionType: 'snipe' },
      gunner: { bulletAssignments: [{ holderId: p.C1.id, type: 'live' }] },
    };
    const nightResults = game.resolveNight();
    expect(alive(p.GF)).toBe(true);
    expect(p.GF.shield.isActive).toBe(false); // Shield consumed

    game.startDay();

    // Morning: live shot → now no shield, dies
    const result = game.resolveMorningShot(p.C1.id, p.GF.id);
    expect(result.killed).toBe(true);
    expect(dead(p.GF)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   MS9 — Sniper shield absorbs first hit only
   ═══════════════════════════════════════════════════════════════════ */
describe('MS9 — Sniper shield absorbs first hit, then vulnerable', () => {
  it('night mafia shoot absorbed by sniper shield, morning shot kills sniper', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Gun: 'gunner',
      Snipe: 'sniper', C1: 'simpleCitizen', C2: 'simpleCitizen',
      C3: 'simpleCitizen', C4: 'simpleCitizen',
    });

    expect(p.Snipe.shield.isActive).toBe(true);

    // Night: mafia shoots sniper → shield absorbs
    game.startNight();
    game.nightActions = {
      godfather: { actorIds: [p.GF.id], targetId: p.Snipe.id, actionType: 'kill', mode: 'shoot' },
      gunner: { bulletAssignments: [{ holderId: p.C1.id, type: 'live' }] },
    };
    game.resolveNight();
    expect(alive(p.Snipe)).toBe(true);
    expect(p.Snipe.shield.isActive).toBe(false);

    game.startDay();

    // Morning: live shot → shield gone, dies
    const result = game.resolveMorningShot(p.C1.id, p.Snipe.id);
    expect(result.killed).toBe(true);
    expect(dead(p.Snipe)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   MS10 — Heal consumed by night mafia shoot → morning shot kills
   ═══════════════════════════════════════════════════════════════════ */
describe('MS10 — Heal consumed by night mafia shoot, morning shot kills', () => {
  it('doctor heals target, mafia shoots target (healed), morning shot kills', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Gun: 'gunner',
      Doc: 'drWatson', C1: 'simpleCitizen', C2: 'simpleCitizen',
      C3: 'simpleCitizen', C4: 'simpleCitizen',
    });

    game.startNight();
    game.nightActions = {
      drWatson: { actorIds: [p.Doc.id], targetId: p.C1.id, actionType: 'heal' },
      godfather: { actorIds: [p.GF.id], targetId: p.C1.id, actionType: 'kill', mode: 'shoot' },
      gunner: { bulletAssignments: [{ holderId: p.C2.id, type: 'live' }] },
    };
    game.resolveNight();

    // C1 survived the night (healed) but heal should be consumed
    expect(alive(p.C1)).toBe(true);
    expect(p.C1.healed).toBe(false);

    game.startDay();

    // Morning shot → no heal left, kills
    const result = game.resolveMorningShot(p.C2.id, p.C1.id);
    expect(result.killed).toBe(true);
    expect(dead(p.C1)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   MS11 — Shield consumed by night mafia shoot → morning shot kills
   ═══════════════════════════════════════════════════════════════════ */
describe('MS11 — Shield consumed at night, morning shot kills', () => {
  it('godfather shot at night by sniper (shield absorbs), morning shot kills', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Gun: 'gunner',
      Snipe: 'sniper', C1: 'simpleCitizen', C2: 'simpleCitizen',
      C3: 'simpleCitizen', C4: 'simpleCitizen',
    });

    game.startNight();
    game.nightActions = {
      sniper: { actorIds: [p.Snipe.id], targetId: p.GF.id, actionType: 'snipe' },
      gunner: { bulletAssignments: [{ holderId: p.C1.id, type: 'live' }] },
    };
    game.resolveNight();

    expect(alive(p.GF)).toBe(true);
    expect(p.GF.shield.isActive).toBe(false);

    game.startDay();

    const result = game.resolveMorningShot(p.C1.id, p.GF.id);
    expect(result.killed).toBe(true);
    expect(dead(p.GF)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   MS12 — Live bullet expiration kills holder at voting
   ═══════════════════════════════════════════════════════════════════ */
describe('MS12 — Unused live bullet explodes at voting start', () => {
  it('unused live bullet kills holder', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Gun: 'gunner',
      C1: 'simpleCitizen', C2: 'simpleCitizen', C3: 'simpleCitizen',
      C4: 'simpleCitizen', C5: 'simpleCitizen',
    });

    game.startNight();
    game.nightActions = {
      gunner: { bulletAssignments: [{ holderId: p.C1.id, type: 'live' }] },
    };
    game.resolveNight();
    game.startDay();

    // C1 doesn't shoot → live bullet explodes at voting
    const explosions = game.resolveLiveExpiration();
    expect(explosions.length).toBe(1);
    expect(explosions[0].holderId).toBe(p.C1.id);
    expect(dead(p.C1)).toBe(true);
  });

  it('used live bullet does NOT explode', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Gun: 'gunner',
      C1: 'simpleCitizen', C2: 'simpleCitizen', C3: 'simpleCitizen',
      C4: 'simpleCitizen', C5: 'simpleCitizen',
    });

    game.startNight();
    game.nightActions = {
      gunner: { bulletAssignments: [{ holderId: p.C1.id, type: 'live' }] },
    };
    game.resolveNight();
    game.startDay();

    // C1 shoots → bullet used
    game.resolveMorningShot(p.C1.id, p.C2.id);
    const explosions = game.resolveLiveExpiration();
    expect(explosions.length).toBe(0);
    expect(alive(p.C1)).toBe(true);
  });

  it('unused blank bullet does NOT explode', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Gun: 'gunner',
      C1: 'simpleCitizen', C2: 'simpleCitizen', C3: 'simpleCitizen',
      C4: 'simpleCitizen', C5: 'simpleCitizen',
    });

    game.startNight();
    game.nightActions = {
      gunner: { bulletAssignments: [{ holderId: p.C1.id, type: 'blank' }] },
    };
    game.resolveNight();
    game.startDay();

    const explosions = game.resolveLiveExpiration();
    expect(explosions.length).toBe(0);
    expect(alive(p.C1)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   MS13 — Morning shot + Jack curse chain
   ═══════════════════════════════════════════════════════════════════ */
describe('MS13 — Morning shot kills cursed player → Jack dies too', () => {
  it('Jack curse chain triggered by morning shot kill', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Gun: 'gunner',
      Jack: 'jack', C1: 'simpleCitizen', C2: 'simpleCitizen',
      C3: 'simpleCitizen', C4: 'simpleCitizen',
    });

    // Night: Jack curses C1, gunner gives live bullet to C2
    game.startNight();
    game.nightActions = {
      jack: { actorIds: [p.Jack.id], targetId: p.C1.id, actionType: 'curse' },
      gunner: { bulletAssignments: [{ holderId: p.C2.id, type: 'live' }] },
    };
    game.resolveNight();
    game.startDay();

    // Morning shot kills C1 → curse chain → Jack dies
    const result = game.resolveMorningShot(p.C2.id, p.C1.id);
    expect(result.killed).toBe(true);
    expect(result.jackCurseTriggered).toBe(true);
    expect(dead(p.C1)).toBe(true);
    expect(dead(p.Jack)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   MS14 — Heal consumed by zodiac → morning shot kills
   ═══════════════════════════════════════════════════════════════════ */
describe('MS14 — Heal consumed by zodiac night kill, morning shot kills', () => {
  it('doctor heals target, zodiac shoots same target, heal consumed, morning shot kills', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Gun: 'gunner',
      Doc: 'drWatson', Zod: 'zodiac', C1: 'simpleCitizen',
      C2: 'simpleCitizen', C3: 'simpleCitizen',
    });

    game.startNight();
    game.nightActions = {
      drWatson: { actorIds: [p.Doc.id], targetId: p.C1.id, actionType: 'heal' },
      zodiac: { actorIds: [p.Zod.id], targetId: p.C1.id, actionType: 'soloKill' },
      gunner: { bulletAssignments: [{ holderId: p.C2.id, type: 'live' }] },
    };
    game.resolveNight();

    expect(alive(p.C1)).toBe(true);
    expect(p.C1.healed).toBe(false); // Heal consumed by zodiac shot

    game.startDay();

    const result = game.resolveMorningShot(p.C2.id, p.C1.id);
    expect(result.killed).toBe(true);
    expect(dead(p.C1)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   MS15 — Heal consumed by sniper → morning shot kills
   ═══════════════════════════════════════════════════════════════════ */
describe('MS15 — Heal consumed by sniper night shot, morning shot kills', () => {
  it('dr lecter heals godfather, sniper shoots godfather (healed), morning shot kills', () => {
    const { game, p } = setup({
      GF: 'godfather', Lec: 'drLecter', Gun: 'gunner',
      Snipe: 'sniper', C1: 'simpleCitizen', C2: 'simpleCitizen',
      C3: 'simpleCitizen', C4: 'simpleCitizen',
    });

    // Godfather shield first — let's consume it with something else first
    // Actually sniper on healed GF: heal blocks, but shield still remains
    // Let's just test heal consumption by sniper
    // Use simpleMafia instead so shield is not a factor
    const { game: g2, p: p2 } = setup({
      GF: 'godfather', Lec: 'drLecter', Gun: 'gunner',
      SM: 'simpleMafia', Snipe: 'sniper', C1: 'simpleCitizen',
      C2: 'simpleCitizen', C3: 'simpleCitizen',
    });

    g2.startNight();
    g2.nightActions = {
      drLecter: { actorIds: [p2.Lec.id], targetId: p2.SM.id, actionType: 'heal' },
      sniper: { actorIds: [p2.Snipe.id], targetId: p2.SM.id, actionType: 'snipe' },
      gunner: { bulletAssignments: [{ holderId: p2.C1.id, type: 'live' }] },
    };
    g2.resolveNight();

    expect(alive(p2.SM)).toBe(true);
    expect(p2.SM.healed).toBe(false); // Heal consumed by sniper

    g2.startDay();

    const result = g2.resolveMorningShot(p2.C1.id, p2.SM.id);
    expect(result.killed).toBe(true);
    expect(dead(p2.SM)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   MS16 — Live shot on zodiac (zodiac NOT immune to morning shot)
   ═══════════════════════════════════════════════════════════════════ */
describe('MS16 — Zodiac is NOT immune to morning shot', () => {
  it('live morning shot kills zodiac', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Gun: 'gunner',
      Zod: 'zodiac', C1: 'simpleCitizen', C2: 'simpleCitizen',
      C3: 'simpleCitizen', C4: 'simpleCitizen',
    });

    game.startNight();
    game.nightActions = {
      gunner: { bulletAssignments: [{ holderId: p.C1.id, type: 'live' }] },
    };
    game.resolveNight();
    game.startDay();

    const result = game.resolveMorningShot(p.C1.id, p.Zod.id);
    expect(result.killed).toBe(true);
    expect(dead(p.Zod)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   COW1 — Cowboy action visible (canCowboyAct)
   ═══════════════════════════════════════════════════════════════════ */
describe('COW1 — canCowboyAct returns true when cowboy alive and unused', () => {
  it('alive cowboy → canCowboyAct is true', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Cow: 'cowboy',
      C1: 'simpleCitizen', C2: 'simpleCitizen', C3: 'simpleCitizen',
      C4: 'simpleCitizen', C5: 'simpleCitizen',
    });

    game.startNight();
    game.nightActions = {};
    game.resolveNight();
    game.startDay();

    expect(game.canCowboyAct()).toBe(true);
  });

  it('dead cowboy → canCowboyAct is false', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Cow: 'cowboy',
      C1: 'simpleCitizen', C2: 'simpleCitizen', C3: 'simpleCitizen',
      C4: 'simpleCitizen', C5: 'simpleCitizen',
    });

    game.startNight();
    game.nightActions = {
      godfather: { actorIds: [p.GF.id], targetId: p.Cow.id, actionType: 'kill', mode: 'shoot' },
    };
    game.resolveNight();
    game.startDay();

    expect(game.canCowboyAct()).toBe(false);
  });

  it('no cowboy in game → canCowboyAct is false', () => {
    const { game } = setup({
      GF: 'godfather', SM: 'simpleMafia',
      C1: 'simpleCitizen', C2: 'simpleCitizen', C3: 'simpleCitizen',
      C4: 'simpleCitizen', C5: 'simpleCitizen', C6: 'simpleCitizen',
    });

    game.startNight();
    game.nightActions = {};
    game.resolveNight();
    game.startDay();

    expect(game.canCowboyAct()).toBe(false);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   COW2 — Cowboy action hidden after use
   ═══════════════════════════════════════════════════════════════════ */
describe('COW2 — canCowboyAct false after cowboy uses ability', () => {
  it('after resolveCowboyAction, canCowboyAct is false', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Cow: 'cowboy',
      C1: 'simpleCitizen', C2: 'simpleCitizen', C3: 'simpleCitizen',
      C4: 'simpleCitizen', C5: 'simpleCitizen',
    });

    game.startNight();
    game.nightActions = {};
    game.resolveNight();
    game.startDay();

    expect(game.canCowboyAct()).toBe(true);
    game.resolveCowboyAction(p.C1.id);
    expect(game.canCowboyAct()).toBe(false);
  });

  it('_cowboyUsed persists through save/load', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Cow: 'cowboy',
      C1: 'simpleCitizen', C2: 'simpleCitizen', C3: 'simpleCitizen',
      C4: 'simpleCitizen', C5: 'simpleCitizen',
    });

    game.startNight();
    game.nightActions = {};
    game.resolveNight();
    game.startDay();
    game.resolveCowboyAction(p.C1.id);

    // Save and load
    const json = game.toJSON();
    const game2 = new Game();
    game2.loadFromJSON(json);

    expect(game2.canCowboyAct()).toBe(false);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   COW3 — resolveMorningShot returns correct stoppedBy values
   ═══════════════════════════════════════════════════════════════════ */
describe('COW3 — stoppedBy field returned correctly for all protection scenarios', () => {
  it('stoppedBy=null for blank bullet (no protection needed)', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Gun: 'gunner',
      C1: 'simpleCitizen', C2: 'simpleCitizen', C3: 'simpleCitizen',
      C4: 'simpleCitizen', C5: 'simpleCitizen',
    });

    game.startNight();
    game.nightActions = {
      gunner: { bulletAssignments: [{ holderId: p.C1.id, type: 'blank' }] },
    };
    game.resolveNight();
    game.startDay();

    const result = game.resolveMorningShot(p.C1.id, p.C2.id);
    expect(result.stoppedBy).toBeNull();
  });

  it('stoppedBy=null for live kill (no protection)', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Gun: 'gunner',
      C1: 'simpleCitizen', C2: 'simpleCitizen', C3: 'simpleCitizen',
      C4: 'simpleCitizen', C5: 'simpleCitizen',
    });

    game.startNight();
    game.nightActions = {
      gunner: { bulletAssignments: [{ holderId: p.C1.id, type: 'live' }] },
    };
    game.resolveNight();
    game.startDay();

    const result = game.resolveMorningShot(p.C1.id, p.C2.id);
    expect(result.stoppedBy).toBeNull();
    expect(result.killed).toBe(true);
  });

  it('stoppedBy=healed when healed target survives live shot', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Gun: 'gunner',
      Doc: 'drWatson', C1: 'simpleCitizen', C2: 'simpleCitizen',
      C3: 'simpleCitizen', C4: 'simpleCitizen',
    });

    game.startNight();
    game.nightActions = {
      gunner: { bulletAssignments: [{ holderId: p.C1.id, type: 'live' }] },
      drWatson: { actorIds: [p.Doc.id], targetId: p.C2.id, actionType: 'heal' },
    };
    game.resolveNight();
    game.startDay();

    const result = game.resolveMorningShot(p.C1.id, p.C2.id);
    expect(result.stoppedBy).toBe('healed');
  });

  it('stoppedBy=shield when shielded target survives live shot', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Gun: 'gunner',
      C1: 'simpleCitizen', C2: 'simpleCitizen', C3: 'simpleCitizen',
      C4: 'simpleCitizen', C5: 'simpleCitizen',
    });

    game.startNight();
    game.nightActions = {
      gunner: { bulletAssignments: [{ holderId: p.C1.id, type: 'live' }] },
    };
    game.resolveNight();
    game.startDay();

    const result = game.resolveMorningShot(p.C1.id, p.GF.id);
    expect(result.stoppedBy).toBe('shield');
  });

  it('stoppedBy=jack when Jack survives live shot', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Gun: 'gunner',
      Jack: 'jack', C1: 'simpleCitizen', C2: 'simpleCitizen',
      C3: 'simpleCitizen', C4: 'simpleCitizen',
    });

    game.startNight();
    game.nightActions = {
      gunner: { bulletAssignments: [{ holderId: p.C1.id, type: 'live' }] },
    };
    game.resolveNight();
    game.startDay();

    const result = game.resolveMorningShot(p.C1.id, p.Jack.id);
    expect(result.stoppedBy).toBe('jack');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   MS-COMBO — Combined heal + shield scenarios
   ═══════════════════════════════════════════════════════════════════ */
describe('MS-COMBO — Healed + shielded target: heal checked first', () => {
  it('healed godfather: heal blocks first, shield remains for second shot', () => {
    const { game, p } = setup({
      GF: 'godfather', SM: 'simpleMafia', Gun: 'gunner',
      Doc: 'drWatson', C1: 'simpleCitizen', C2: 'simpleCitizen',
      C3: 'simpleCitizen', C4: 'simpleCitizen',
    });

    // Increase live bullet max to allow 3 bullets
    game.gunnerLiveMax = 3;
    game.bulletManager._liveMax = 3;
    game.bulletManager._liveRemaining = 3;

    game.startNight();
    game.nightActions = {
      drWatson: { actorIds: [p.Doc.id], targetId: p.GF.id, actionType: 'heal' },
      gunner: { bulletAssignments: [
        { holderId: p.C1.id, type: 'live' },
        { holderId: p.C2.id, type: 'live' },
        { holderId: p.C3.id, type: 'live' },
      ]},
    };
    game.resolveNight();
    game.startDay();

    // First shot: heal blocks
    const r1 = game.resolveMorningShot(p.C1.id, p.GF.id);
    expect(r1.stoppedBy).toBe('healed');
    expect(alive(p.GF)).toBe(true);
    expect(p.GF.shield.isActive).toBe(true); // Shield NOT consumed

    // Second shot: shield blocks
    const r2 = game.resolveMorningShot(p.C2.id, p.GF.id);
    expect(r2.stoppedBy).toBe('shield');
    expect(alive(p.GF)).toBe(true);
    expect(p.GF.shield.isActive).toBe(false); // Shield consumed

    // Third shot: nothing left → kills
    const r3 = game.resolveMorningShot(p.C3.id, p.GF.id);
    expect(r3.killed).toBe(true);
    expect(dead(p.GF)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   MS-DRLECTER — Dr Lecter heal on mafia + shot
   ═══════════════════════════════════════════════════════════════════ */
describe('MS-DRLECTER — Dr Lecter heal consumed on mafia member', () => {
  it('Dr Lecter heals simpleMafia, morning shot blocked by heal, second shot kills', () => {
    const { game, p } = setup({
      GF: 'godfather', Lec: 'drLecter', SM: 'simpleMafia',
      Gun: 'gunner', C1: 'simpleCitizen', C2: 'simpleCitizen',
      C3: 'simpleCitizen', C4: 'simpleCitizen',
    });

    game.startNight();
    game.nightActions = {
      drLecter: { actorIds: [p.Lec.id], targetId: p.SM.id, actionType: 'heal' },
      gunner: { bulletAssignments: [
        { holderId: p.C1.id, type: 'live' },
        { holderId: p.C2.id, type: 'live' },
      ]},
    };
    game.resolveNight();
    game.startDay();

    expect(p.SM.healed).toBe(true);

    // First shot: heal blocks
    const r1 = game.resolveMorningShot(p.C1.id, p.SM.id);
    expect(r1.stoppedBy).toBe('healed');
    expect(p.SM.healed).toBe(false);

    // Second shot: kills
    const r2 = game.resolveMorningShot(p.C2.id, p.SM.id);
    expect(r2.killed).toBe(true);
    expect(dead(p.SM)).toBe(true);
  });
});
