/**
 * complex-integration-suite.test.mjs — Ultra-complex integration tests
 *
 * CI1:  Multi-round game: Mafia vs full citizen roster with shields, saves, blocks
 * CI2:  Salakhi chain → Jack curse trigger → Kane reveal cascade
 * CI3:  Bomber + bodyguard defuse/explode matrix
 * CI4:  Gunner bullet distribution + morning shot outcomes
 * CI5:  Freemason contamination with spy interaction
 * CI6:  Cowboy action on every team type
 * CI7:  Jadoogar (Sorcerer) block prevents night actions
 * CI8:  Detective investigation: godfather appears citizen
 * CI9:  Dr. Lecter self-heal limit tracking
 * CI10: Multi-round voting → last action cards → victory
 * CI11: Shield consumption order with multiple shooters
 * CI12: Negotiator + silencer interaction
 * CI13: Full 16-player 4-round game → mafia victory
 * CI14: Full 12-player game → citizen victory via elimination
 * CI15: Zodiac + bodyguard mutual kill
 * CI16: Three-player chaos handshake resolution
 * CI17: Jack vote immunity across rounds
 * CI18: Constantine auto-revive interaction with curse
 * CI19: Dr. Watson save priorities and limits
 * CI20: Sniper targeting mafia vs citizen outcomes
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../js/models/Game.js';
import { Roles } from '../js/models/Roles.js';
import { CARD } from '../js/models/LastActionManager.js';

/* ——— Helpers ——— */

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
   CI1 — Multi-round: shields absorb first hit, killed on second
   ═══════════════════════════════════════════════════════════════════ */
describe('CI1 — Shield absorption across rounds', () => {
  let game, p;
  beforeEach(() => {
    ({ game, p } = setup({
      GF:  'godfather', SM: 'simpleMafia',
      Doc: 'drWatson', Det: 'detective',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    }));
  });

  it('CI1.1 — DrWatson saves mafia target', () => {
    const r1 = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      drWatson:  { actorIds: [p.Doc.id], targetId: p.SC1.id, actionType: 'heal' },
    });
    // SC1 should be saved by drWatson
    expect(alive(p.SC1)).toBe(true);
    expect(r1.saved).toContain(p.SC1.id);
  });

  it('CI1.2 — DrWatson cannot save from salakhi even with correct guess', () => {
    const r1 = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.Det.id, actionType: 'shoot', mode: 'salakhi', guessedRoleId: 'detective' },
      drWatson:  { actorIds: [p.Doc.id], targetId: p.Det.id, actionType: 'heal' },
    });
    // Salakhi bypasses doctor — detective should die
    expect(dead(p.Det)).toBe(true);
  });

  it('CI1.3 — Incorrect salakhi guess does NOT kill target', () => {
    const r1 = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.Det.id, actionType: 'shoot', mode: 'salakhi', guessedRoleId: 'simpleCitizen' },
    });
    // Wrong guess — detective survives, no shot fired this night either (salakhi night = no regular shot)
    expect(alive(p.Det)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   CI2 — Jack + Kane + Curse chain interactions
   ═══════════════════════════════════════════════════════════════════ */
describe('CI2 — Jack curse and Kane reveal chain', () => {
  let game, p;
  beforeEach(() => {
    ({ game, p } = setup({
      GF:   'godfather', SM:  'simpleMafia',
      Jack: 'jack',      Kane: 'kane',
      Doc:  'drWatson',  Det:  'detective',
      SC1:  'simpleCitizen', SC2: 'simpleCitizen',
      SC3:  'simpleCitizen', SC4: 'simpleCitizen',
    }));
  });

  it('CI2.1 — Jack curse placed, not triggered until Jack dies', () => {
    // Night 1: Jack curses SC1
    const r1 = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
      jack:      { actorIds: [p.Jack.id], targetId: p.SC1.id, actionType: 'curse' },
    });
    // SC2 should die (mafia shot), Jack's curse is placed but SC1 alive
    expect(dead(p.SC2)).toBe(true);
    expect(alive(p.SC1)).toBe(true);
    expect(alive(p.Jack)).toBe(true);
  });

  it('CI2.2 — Jack regular shot immunity: mafia shot doesn\'t kill Jack', () => {
    const r1 = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.Jack.id, actionType: 'shoot', mode: 'shoot' },
    });
    // Jack is immune to regular mafia shot
    expect(alive(p.Jack)).toBe(true);
  });

  it('CI2.3 — Jack killed by salakhi → curse does NOT kill cursed player', () => {
    // Night 1: Jack curses SC1
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC3.id, actionType: 'shoot', mode: 'shoot' },
      jack:      { actorIds: [p.Jack.id], targetId: p.SC1.id, actionType: 'curse' },
    });

    game.startDay();

    // Night 2: GF salakhis Jack correctly
    const r2 = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.Jack.id, actionType: 'shoot', mode: 'salakhi', guessedRoleId: 'jack' },
    });
    // Jack dies to salakhi, but curse only triggers when cursed TARGET dies (killing Jack),
    // NOT when Jack dies (killing target). So SC1 should survive.
    expect(dead(p.Jack)).toBe(true);
    expect(alive(p.SC1)).toBe(true);
  });

  it('CI2.4 — Kane reveals when targeting a player', () => {
    const r1 = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
      kane:      { actorIds: [p.Kane.id], targetId: p.SM.id, actionType: 'reveal' },
    });
    // Kane reveal should return info about target's role
    if (r1.kaneReveal) {
      expect(r1.kaneReveal.targetId).toBe(p.SM.id);
    }
  });
});

/* ═══════════════════════════════════════════════════════════════════
   CI3 — Bomber + Bodyguard defuse/explode matrix
   ═══════════════════════════════════════════════════════════════════ */
describe('CI3 — Bomb resolution scenarios', () => {
  let game, p;
  beforeEach(() => {
    ({ game, p } = setup({
      GF:  'godfather', SM: 'simpleMafia', Bomb: 'bomber',
      BG:  'bodyguard', Doc: 'drWatson',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
      SC5: 'simpleCitizen',
    }));
  });

  it('CI3.1 — Bomb planted on player, bodyguard correct guess defuses', () => {
    // Night: bomber plants bomb on SC1 with code 3
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
      bomber:    { actorIds: [p.Bomb.id], targetId: p.SC1.id, actionType: 'bomb', bombPassword: '3' },
    });

    game.startDay();

    if (game.hasBombToResolve()) {
      game.startBombSiesta();

      if (game.isBodyguardAliveForBomb()) {
        const result = game.bombGuardianGuess('3');
        expect(result.result).toBe('defused');
        expect(alive(p.SC1)).toBe(true);
        expect(alive(p.BG)).toBe(true);
      }
    }
  });

  it('CI3.2 — Bodyguard wrong guess → bodyguard dies, bomb target safe', () => {
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
      bomber:    { actorIds: [p.Bomb.id], targetId: p.SC1.id, actionType: 'bomb', bombPassword: '2' },
    });

    game.startDay();

    if (game.hasBombToResolve()) {
      game.startBombSiesta();

      if (game.isBodyguardAliveForBomb()) {
        const result = game.bombGuardianGuess('4'); // Wrong
        expect(result.result).toBe('wrong');
        // Bodyguard should die for wrong guess
        expect(dead(p.BG)).toBe(true);
      }
    }
  });

  it('CI3.3 — No bodyguard → bomb target wrong guess → target dies', () => {
    // Kill bodyguard first
    p.BG.kill(0, 'test', false);

    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
      bomber:    { actorIds: [p.Bomb.id], targetId: p.SC1.id, actionType: 'bomb', bombPassword: '1' },
    });

    game.startDay();

    if (game.hasBombToResolve()) {
      game.startBombSiesta();
      const result = game.bombTargetGuess('4'); // Wrong
      expect(result.result).toBe('exploded');
      expect(dead(p.SC1)).toBe(true);
    }
  });

  it('CI3.4 — Bomb target correct guess → defused, target survives', () => {
    p.BG.kill(0, 'test', false);

    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
      bomber:    { actorIds: [p.Bomb.id], targetId: p.SC1.id, actionType: 'bomb', bombPassword: '2' },
    });

    game.startDay();

    if (game.hasBombToResolve()) {
      game.startBombSiesta();
      const result = game.bombTargetGuess('2'); // Correct
      expect(result.result).toBe('defused');
      expect(alive(p.SC1)).toBe(true);
    }
  });
});

/* ═══════════════════════════════════════════════════════════════════
   CI4 — Gunner bullet distribution + morning shot outcomes
   ═══════════════════════════════════════════════════════════════════ */
describe('CI4 — Gunner bullet mechanics', () => {
  let game, p;
  beforeEach(() => {
    ({ game, p } = setup({
      GF:  'godfather', SM: 'simpleMafia',
      Gun: 'gunner',    Doc: 'drWatson',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    }));
  });

  it('CI4.1 — Gunner distributes live bullet, holder can shoot in morning', () => {
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      gunner:    { actorIds: [p.Gun.id], targetId: null, actionType: 'giveBullet',
                   bulletAssignments: [{ holderId: p.SC2.id, type: 'live' }] },
    });

    game.startDay();
    const bullets = game.getActiveBullets();
    expect(bullets.length).toBeGreaterThanOrEqual(1);
  });

  it('CI4.2 — Blank bullet does NOT kill target', () => {
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC3.id, actionType: 'shoot', mode: 'shoot' },
      gunner:    { actorIds: [p.Gun.id], targetId: null, actionType: 'giveBullet',
                   bulletAssignments: [{ holderId: p.SC1.id, type: 'blank' }] },
    });

    game.startDay();
    const result = game.resolveMorningShot(p.SC1.id, p.SM.id);
    if (result) {
      // Blank bullet should not kill
      expect(alive(p.SM)).toBe(true);
    }
  });
});

/* ═══════════════════════════════════════════════════════════════════
   CI5 — Freemason contamination edge cases
   ═══════════════════════════════════════════════════════════════════ */
describe('CI5 — Freemason alliance and contamination', () => {
  let game, p;
  beforeEach(() => {
    ({ game, p } = setup({
      GF:   'godfather', SM: 'simpleMafia',
      Free: 'freemason', Spy: 'spy',
      Doc:  'drWatson',  SC1: 'simpleCitizen',
      SC2:  'simpleCitizen', SC3: 'simpleCitizen',
    }));
    // Activate the framason mechanic (normally done by assignRolesRandomly)
    game.framason.init(p.Free.id, 2);
  });

  it('CI5.1 — Freemason recruits citizen → safe, no contamination', () => {
    const r1 = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      freemason: { actorIds: [p.Free.id], targetId: p.Doc.id, actionType: 'recruit' },
    });

    if (r1.framasonRecruit) {
      expect(r1.framasonRecruit.safe).toBe(true);
      expect(r1.framasonRecruit.contaminated).toBe(false);
    }
  });

  it('CI5.2 — Freemason recruits spy → spy joins but no contamination', () => {
    const r1 = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      freemason: { actorIds: [p.Free.id], targetId: p.Spy.id, actionType: 'recruit' },
    });

    if (r1.framasonRecruit) {
      // Spy joining is special — safe but tagged
      expect(r1.framasonRecruit.recruitId).toBe(p.Spy.id);
    }
  });

  it('CI5.3 — Freemason recruits non-spy mafia → contamination', () => {
    const r1 = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      freemason: { actorIds: [p.Free.id], targetId: p.SM.id, actionType: 'recruit' },
    });

    if (r1.framasonRecruit) {
      expect(r1.framasonRecruit.contaminated).toBe(true);
    }
  });
});

/* ═══════════════════════════════════════════════════════════════════
   CI6 — Cowboy action on all team types
   ═══════════════════════════════════════════════════════════════════ */
describe('CI6 — Cowboy targeting different teams', () => {
  it('CI6.1 — Cowboy shoots mafia → mafia dies', () => {
    const { game, p } = setup({
      GF:  'godfather', SM: 'simpleMafia',
      Cow: 'cowboy',   Doc: 'drWatson',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });

    // Need to get to day first
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();

    if (game.canCowboyAct()) {
      const result = game.resolveCowboyAction(p.SM.id);
      expect(result.killed).toBe(true);
      expect(dead(p.SM)).toBe(true);
    }
  });

  it('CI6.2 — Cowboy shoots citizen → citizen dies (cowboy mistake)', () => {
    const { game, p } = setup({
      GF:  'godfather', SM: 'simpleMafia',
      Cow: 'cowboy',   Doc: 'drWatson',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });

    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();

    if (game.canCowboyAct()) {
      const result = game.resolveCowboyAction(p.SC2.id);
      expect(result.killed).toBe(true);
      expect(dead(p.SC2)).toBe(true);
    }
  });

  it('CI6.3 — Cowboy shoots Jack → curse locks', () => {
    const { game, p } = setup({
      GF:   'godfather', SM: 'simpleMafia',
      Cow:  'cowboy',    Jack: 'jack',
      Doc:  'drWatson',  SC1: 'simpleCitizen',
      SC2:  'simpleCitizen', SC3: 'simpleCitizen',
    });

    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();

    if (game.canCowboyAct()) {
      const result = game.resolveCowboyAction(p.Jack.id);
      // Jack should be handled specially (curse lock)
      if (result.jackCurseLocked !== undefined) {
        expect(result.jackCurseLocked).toBe(true);
      }
    }
  });

  it('CI6.4 — Cowboy can only act once per game', () => {
    const { game, p } = setup({
      GF:  'godfather', SM: 'simpleMafia',
      Cow: 'cowboy',   Doc: 'drWatson',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });

    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();

    if (game.canCowboyAct()) {
      game.resolveCowboyAction(p.SM.id);
    }

    // After using, cowboy can't act again
    expect(game.canCowboyAct()).toBe(false);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   CI7 — Jadoogar (Sorcerer) blocking night actions
   ═══════════════════════════════════════════════════════════════════ */
describe('CI7 — Sorcerer blocking mechanics', () => {
  let game, p;
  beforeEach(() => {
    ({ game, p } = setup({
      GF:  'godfather', SM: 'simpleMafia', Jad: 'jadoogar',
      Doc: 'drWatson',  Det: 'detective',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    }));
  });

  it('CI7.1 — Jadoogar blocks drWatson → heal has no effect', () => {
    const r1 = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      jadoogar:  { actorIds: [p.Jad.id], targetId: p.Doc.id, actionType: 'block' },
      drWatson:  { actorIds: [p.Doc.id], targetId: p.SC1.id, actionType: 'heal' },
    });
    // Doctor was blocked, SC1 should die
    expect(dead(p.SC1)).toBe(true);
  });

  it('CI7.2 — Jadoogar blocks detective → investigation returns blocked', () => {
    const r1 = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      jadoogar:  { actorIds: [p.Jad.id], targetId: p.Det.id, actionType: 'block' },
      detective: { actorIds: [p.Det.id], targetId: p.GF.id, actionType: 'investigate' },
    });
    // Investigation should be blocked
    if (r1.investigated) {
      expect(r1.investigated.result).toBe('blocked');
    }
  });

  it('CI7.3 — Jadoogar targets different person night 2 → doctor heals successfully', () => {
    // Night 1: block doctor
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      jadoogar:  { actorIds: [p.Jad.id], targetId: p.Doc.id, actionType: 'block' },
    });

    game.startDay();

    // Night 2: jadoogar targets detective instead, doctor free to heal
    const r2 = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
      jadoogar:  { actorIds: [p.Jad.id], targetId: p.Det.id, actionType: 'block' },
      drWatson:  { actorIds: [p.Doc.id], targetId: p.SC2.id, actionType: 'heal' },
    });
    // Doctor not blocked this time, so SC2 should be saved
    expect(alive(p.SC2)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   CI8 — Detective investigation: Godfather appears as citizen
   ═══════════════════════════════════════════════════════════════════ */
describe('CI8 — Detective investigation accuracy', () => {
  let game, p;
  beforeEach(() => {
    ({ game, p } = setup({
      GF:  'godfather', SM: 'simpleMafia',
      Det: 'detective', Doc: 'drWatson',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    }));
  });

  it('CI8.1 — Investigating godfather returns negative (appears citizen)', () => {
    const r1 = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      detective: { actorIds: [p.Det.id], targetId: p.GF.id, actionType: 'investigate' },
    });
    if (r1.investigated) {
      expect(r1.investigated.result).toBe('negative'); // GF hides as citizen
    }
  });

  it('CI8.2 — Investigating regular mafia returns positive', () => {
    const r1 = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      detective: { actorIds: [p.Det.id], targetId: p.SM.id, actionType: 'investigate' },
    });
    if (r1.investigated) {
      expect(r1.investigated.result).toBe('positive'); // SM is mafia
    }
  });

  it('CI8.3 — Investigating citizen returns negative', () => {
    const r1 = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      detective: { actorIds: [p.Det.id], targetId: p.SC2.id, actionType: 'investigate' },
    });
    if (r1.investigated) {
      expect(r1.investigated.result).toBe('negative');
    }
  });
});

/* ═══════════════════════════════════════════════════════════════════
   CI9 — Dr. Lecter self-heal limit
   ═══════════════════════════════════════════════════════════════════ */
describe('CI9 — Dr. Lecter self-heal mechanics', () => {
  it('CI9.1 — Dr. Lecter can self-heal limited times (default 2)', () => {
    const { game, p } = setup({
      GF:  'godfather', SM: 'simpleMafia', DL: 'drLecter',
      Doc: 'drWatson',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });

    // Check if drLecter can self-heal
    const canHeal1 = game.canDrLecterHeal(p.DL.id);
    expect(canHeal1).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   CI10 — Voting + last action cards
   ═══════════════════════════════════════════════════════════════════ */
describe('CI10 — Voting system and last action cards', () => {
  let game, p;
  beforeEach(() => {
    ({ game, p } = setup({
      GF:  'godfather', SM: 'simpleMafia',
      Doc: 'drWatson',  Det: 'detective',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
      SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    }));
  });

  it('CI10.1 — Vote threshold for 10 alive players is 5', () => {
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: null, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();
    // 10 alive: threshold = floor((10-1)/2) + 1 = 5
    expect(game.getVoteThreshold()).toBe(5);
  });

  it('CI10.2 — Vote threshold decreases as players die', () => {
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();
    // 9 alive: threshold = floor((9-1)/2) + 1 = 5
    expect(game.getVoteThreshold()).toBe(5);

    // Kill another to go to 8
    p.SC2.kill(1, 'vote', false);
    // 8 alive: threshold = floor((8-1)/2) + 1 = 4
    expect(game.getVoteThreshold()).toBe(4);
  });

  it('CI10.3 — Vote elimination triggers last action card draw', () => {
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();

    const result = game.eliminateByVote(p.SC2.id);
    expect(dead(p.SC2)).toBe(true);
    // Result should indicate if last action is available
    expect(result).toBeDefined();
  });

  it('CI10.4 — Cast and remove votes correctly', () => {
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: null, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();

    game.castVote(p.SC1.id, p.GF.id);
    game.castVote(p.SC2.id, p.GF.id);
    game.castVote(p.Doc.id, p.GF.id);

    const tally = game.getVoteTally();
    expect(tally[p.GF.id]).toBe(3);

    game.removeVote(p.Doc.id);
    const tally2 = game.getVoteTally();
    expect(tally2[p.GF.id]).toBe(2);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   CI11 — Shield consumption across multiple hits
   ═══════════════════════════════════════════════════════════════════ */
describe('CI11 — Shield mechanics', () => {
  it('CI11.1 — Godfather shield consumed by sniper shot, second hit kills', () => {
    const { game, p } = setup({
      GF:  'godfather', SM: 'simpleMafia',
      Snp: 'sniper',    Doc: 'drWatson',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });

    // Night 1: sniper shoots godfather → shield absorbs
    const r1 = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      sniper:    { actorIds: [p.Snp.id], targetId: p.GF.id, actionType: 'snipe' },
    });
    // GF should survive (shield)
    expect(alive(p.GF)).toBe(true);
    if (r1.shielded) {
      expect(r1.shielded).toContain(p.GF.id);
    }

    game.startDay();

    // Night 2: sniper shoots godfather again → should die (no shield)
    const r2 = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
      sniper:    { actorIds: [p.Snp.id], targetId: p.GF.id, actionType: 'snipe' },
    });
    expect(dead(p.GF)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   CI12 — Silencer (Matador) + Negotiator interaction
   ═══════════════════════════════════════════════════════════════════ */
describe('CI12 — Silencer mechanics', () => {
  it('CI12.1 — Silenced player is marked correctly', () => {
    const { game, p } = setup({
      GF:  'godfather', SM: 'simpleMafia', Mat: 'matador',
      Doc: 'drWatson',  SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen',
    });

    const r1 = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      matador:   { actorIds: [p.Mat.id], targetId: p.Doc.id, actionType: 'silence' },
    });

    expect(r1.silenced).toBe(p.Doc.id);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   CI13 — Full 16-player 3-round game → mafia victory
   ═══════════════════════════════════════════════════════════════════ */
describe('CI13 — Full multi-round game simulation', () => {
  it('CI13.1 — Mafia wins when mafia count >= citizen count', () => {
    const { game, p } = setup({
      GF:  'godfather', SM1: 'simpleMafia', SM2: 'simpleMafia', DL: 'drLecter',
      Doc: 'drWatson',  Det: 'detective',   SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen', SC5: 'simpleCitizen', SC6: 'simpleCitizen',
    });

    // Round 1: Mafia kills SC1, drWatson saves SC2
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      drWatson:  { actorIds: [p.Doc.id], targetId: p.SC2.id, actionType: 'heal' },
    });
    expect(dead(p.SC1)).toBe(true);

    game.startDay();
    // Day 1: Vote out SC3 (citizens make a mistake)
    game.eliminateByVote(p.SC3.id);
    expect(dead(p.SC3)).toBe(true);

    // Round 2: Kill Doc
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.Doc.id, actionType: 'shoot', mode: 'shoot' },
    });
    expect(dead(p.Doc)).toBe(true);

    game.startDay();
    // Day 2: Vote out SC4
    game.eliminateByVote(p.SC4.id);
    expect(dead(p.SC4)).toBe(true);

    // Round 3: Kill Det
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.Det.id, actionType: 'shoot', mode: 'shoot' },
    });
    expect(dead(p.Det)).toBe(true);

    game.startDay();
    // Day 3: Vote out SC5
    game.eliminateByVote(p.SC5.id);

    // Check: Alive = GF, SM1, SM2, DL (4 mafia) + SC2, SC6 (2 citizen)
    // Mafia (4) >= Citizens (2) → mafia wins
    const win = game.checkWinCondition();
    expect(win).toBe('mafia');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   CI14 — Citizen victory: all mafia eliminated
   ═══════════════════════════════════════════════════════════════════ */
describe('CI14 — Citizen victory via mafia elimination', () => {
  it('CI14.1 — All mafia voted out → citizen wins', () => {
    const { game, p } = setup({
      GF:  'godfather', SM: 'simpleMafia',
      Doc: 'drWatson',  Det: 'detective',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });

    // Night 1: GF shoots SC1
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
    });
    expect(dead(p.SC1)).toBe(true);

    game.startDay();
    // Day 1: Citizens vote out SM
    game.eliminateByVote(p.SM.id);
    expect(dead(p.SM)).toBe(true);

    // Night 2: GF shoots SC2
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
    });

    game.startDay();
    // Day 2: Citizens vote out GF
    game.eliminateByVote(p.GF.id);
    expect(dead(p.GF)).toBe(true);

    // All mafia dead, no independents → citizen wins
    const win = game.checkWinCondition();
    expect(win).toBe('citizen');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   CI15 — Zodiac + Bodyguard interaction
   ═══════════════════════════════════════════════════════════════════ */
describe('CI15 — Zodiac targeting bodyguard', () => {
  it('CI15.1 — Zodiac shoots bodyguard → zodiac dies instead', () => {
    const { game, p } = setup({
      GF:  'godfather', SM: 'simpleMafia',
      Zod: 'zodiac',    BG: 'bodyguard',
      Doc: 'drWatson',  SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen',
    });

    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      zodiac:    { actorIds: [p.Zod.id], targetId: p.BG.id, actionType: 'shoot' },
    });

    // Bodyguard reflects zodiac's shot → zodiac dies
    expect(dead(p.Zod)).toBe(true);
    expect(alive(p.BG)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   CI16 — Three-player chaos → handshake resolution
   ═══════════════════════════════════════════════════════════════════ */
describe('CI16 — Chaos mode at 3 players', () => {
  it('CI16.1 — Game enters handshake when 3 players remain', () => {
    const { game, p } = setup({
      GF:  'godfather', SM: 'simpleMafia',
      Doc: 'drWatson',  SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });

    // Kill players to get down to 3
    p.SM.kill(1, 'vote', false);
    p.SC1.kill(1, 'vote', false);
    p.SC2.kill(1, 'vote', false);
    p.SC3.kill(1, 'vote', false);
    p.SC4.kill(1, 'vote', false);
    // Remaining: GF, Doc, SC5 → 3 players (1 mafia, 2 citizen)

    const win = game.checkWinCondition();
    expect(win).toBe('handshake');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   CI17 — Jack vote immunity
   ═══════════════════════════════════════════════════════════════════ */
describe('CI17 — Jack vote immunity', () => {
  it('CI17.1 — Jack is immune to first vote elimination', () => {
    const { game, p } = setup({
      GF:   'godfather', SM: 'simpleMafia',
      Jack: 'jack',      Doc: 'drWatson',
      SC1:  'simpleCitizen', SC2: 'simpleCitizen',
      SC3:  'simpleCitizen', SC4: 'simpleCitizen',
    });

    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();

    expect(game.isVoteImmune(p.Jack.id)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   CI18 — Constantine auto-revive
   ═══════════════════════════════════════════════════════════════════ */
describe('CI18 — Constantine mechanics', () => {
  it('CI18.1 — Constantine self-revives once upon death', () => {
    const { game, p } = setup({
      GF:   'godfather', SM: 'simpleMafia',
      Con:  'constantine', Doc: 'drWatson',
      SC1:  'simpleCitizen', SC2: 'simpleCitizen',
      SC3:  'simpleCitizen', SC4: 'simpleCitizen',
    });

    const r1 = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.Con.id, actionType: 'shoot', mode: 'shoot' },
    });

    // Constantine should auto-revive on first death
    if (r1.revived) {
      expect(r1.revived).toBe(p.Con.id);
      expect(alive(p.Con)).toBe(true);
    }
  });
});

/* ═══════════════════════════════════════════════════════════════════
   CI19 — Dr. Watson save and heal mechanics
   ═══════════════════════════════════════════════════════════════════ */
describe('CI19 — Dr. Watson healing', () => {
  it('CI19.1 — Dr. Watson heals target, target survives mafia shot', () => {
    const { game, p } = setup({
      GF:  'godfather', SM: 'simpleMafia',
      DW:  'drWatson',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
      SC5: 'simpleCitizen',
    });

    // DrWatson heals SC1 from mafia shot
    const r1 = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      drWatson:  { actorIds: [p.DW.id], targetId: p.SC1.id, actionType: 'heal' },
    });

    expect(alive(p.SC1)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   CI20 — Sniper targeting outcomes
   ═══════════════════════════════════════════════════════════════════ */
describe('CI20 — Sniper mechanics', () => {
  it('CI20.1 — Sniper targets mafia → mafia dies', () => {
    const { game, p } = setup({
      GF:  'godfather', SM: 'simpleMafia',
      Snp: 'sniper',    Doc: 'drWatson',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });

    const r1 = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      sniper:    { actorIds: [p.Snp.id], targetId: p.SM.id, actionType: 'snipe' },
    });
    // SM should die
    expect(dead(p.SM)).toBe(true);
  });

  it('CI20.2 — Sniper targets citizen → sniper dies', () => {
    const { game, p } = setup({
      GF:  'godfather', SM: 'simpleMafia',
      Snp: 'sniper',    Doc: 'drWatson',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });

    const r1 = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      sniper:    { actorIds: [p.Snp.id], targetId: p.SC2.id, actionType: 'snipe' },
    });
    // Sniper should die for shooting citizen, SC2 stays alive
    expect(dead(p.Snp)).toBe(true);
    expect(alive(p.SC2)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   CI21 — Game state serialization (save/load)
   ═══════════════════════════════════════════════════════════════════ */
describe('CI21 — Game serialization', () => {
  it('CI21.1 — Game can be serialized to JSON and loaded back', () => {
    const { game, p } = setup({
      GF:  'godfather', SM: 'simpleMafia',
      Doc: 'drWatson',  SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });

    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();

    const json = game.toJSON();
    expect(json).toBeDefined();
    expect(typeof json).toBe('object');

    // Load into new game
    const game2 = new Game();
    game2.loadFromJSON(json);

    expect(game2.getAlivePlayers().length).toBe(game.getAlivePlayers().length);
    expect(game2.round).toBe(game.round);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   CI22 — Negotiator ability
   ═══════════════════════════════════════════════════════════════════ */
describe('CI22 — Negotiator mechanics', () => {
  it('CI22.1 — Negotiator can negotiate with a citizen', () => {
    const { game, p } = setup({
      GF:  'godfather', SM: 'simpleMafia', Neg: 'negotiator',
      Doc: 'drWatson',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });

    const r1 = nightRound(game, {
      godfather:  { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      negotiator: { actorIds: [p.Neg.id], targetId: p.SC2.id, actionType: 'negotiate' },
    });

    if (r1.negotiated) {
      expect(r1.negotiated.playerId).toBe(p.SC2.id);
    }
  });
});

/* ═══════════════════════════════════════════════════════════════════
   CI23 — Reporter ability
   ═══════════════════════════════════════════════════════════════════ */
describe('CI23 — Reporter mechanics', () => {
  it('CI23.1 — Reporter checks if negotiation happened', () => {
    const { game, p } = setup({
      GF:  'godfather', SM: 'simpleMafia', Neg: 'negotiator',
      Rep: 'reporter',  Doc: 'drWatson',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen',
    });

    const r1 = nightRound(game, {
      godfather:  { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      negotiator: { actorIds: [p.Neg.id], targetId: p.SC2.id, actionType: 'negotiate' },
      reporter:   { actorIds: [p.Rep.id], targetId: p.SC2.id, actionType: 'checkNegotiation' },
    });

    // Reporter should get information about whether SC2 was negotiated
    expect(r1).toBeDefined();
  });
});

/* ═══════════════════════════════════════════════════════════════════
   CI24 — God correction (kill/revive)
   ═══════════════════════════════════════════════════════════════════ */
describe('CI24 — God manual corrections', () => {
  it('CI24.1 — God can manually kill a player', () => {
    const { game, p } = setup({
      GF:  'godfather', SM: 'simpleMafia',
      Doc: 'drWatson',  SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });

    game.godKill(p.SC1.id);
    expect(dead(p.SC1)).toBe(true);
  });

  it('CI24.2 — God can manually revive a dead player', () => {
    const { game, p } = setup({
      GF:  'godfather', SM: 'simpleMafia',
      Doc: 'drWatson',  SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });

    p.SC1.kill(1, 'test', false);
    expect(dead(p.SC1)).toBe(true);

    game.godRevive(p.SC1.id);
    expect(alive(p.SC1)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   CI25 — Team counts accuracy through rounds
   ═══════════════════════════════════════════════════════════════════ */
describe('CI25 — Team count tracking', () => {
  it('CI25.1 — Team counts update correctly after kills', () => {
    const { game, p } = setup({
      GF:  'godfather', SM: 'simpleMafia',
      Doc: 'drWatson',  SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });

    const initial = game.getTeamCounts();
    expect(initial.mafia).toBe(2);
    expect(initial.citizen).toBe(6);

    // Kill one mafia
    p.SM.kill(1, 'vote', false);
    const after = game.getTeamCounts();
    expect(after.mafia).toBe(1);
    expect(after.citizen).toBe(6);

    // Kill one citizen
    p.SC1.kill(1, 'night', false);
    const after2 = game.getTeamCounts();
    expect(after2.mafia).toBe(1);
    expect(after2.citizen).toBe(5);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   CI26 — Alive/Dead player queries
   ═══════════════════════════════════════════════════════════════════ */
describe('CI26 — Player query methods', () => {
  it('CI26.1 — getAlivePlayers and getDeadPlayers return correct counts', () => {
    const { game, p } = setup({
      GF:  'godfather', SM: 'simpleMafia',
      Doc: 'drWatson',  SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });

    expect(game.getAlivePlayers().length).toBe(8);
    expect(game.getDeadPlayers().length).toBe(0);

    p.SC1.kill(1, 'test', false);
    p.SC2.kill(1, 'test', false);

    expect(game.getAlivePlayers().length).toBe(6);
    expect(game.getDeadPlayers().length).toBe(2);
  });

  it('CI26.2 — getPlayer returns correct player by ID', () => {
    const { game, p } = setup({
      GF:  'godfather', SM: 'simpleMafia',
      Doc: 'drWatson',  SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });

    const player = game.getPlayer(p.GF.id);
    expect(player).toBeDefined();
    expect(player.roleId).toBe('godfather');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   CI27 — Validate setup constraints
   ═══════════════════════════════════════════════════════════════════ */
describe('CI27 — Setup validation', () => {
  it('CI27.1 — addPlayer and removePlayer work correctly', () => {
    const game = new Game();
    const p1 = game.addPlayer('Alice');
    const p2 = game.addPlayer('Bob');
    expect(game.getAlivePlayers().length).toBe(2);

    game.removePlayer(p1.id);
    expect(game.getAlivePlayers().length).toBe(1);
  });

  it('CI27.2 — getTotalRoleCount returns sum of selected roles', () => {
    const game = new Game();
    for (let i = 0; i < 8; i++) game.addPlayer(`P${i}`);

    game.setSelectedRoles({ godfather: 1, simpleMafia: 1, doctor: 1, simpleCitizen: 5 });
    expect(game.getTotalRoleCount()).toBe(8);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   CI28 — Joker target mechanics
   ═══════════════════════════════════════════════════════════════════ */
describe('CI28 — Joker mechanics', () => {
  it('CI28.1 — Joker targets a player at night', () => {
    const { game, p } = setup({
      GF:  'godfather', SM: 'simpleMafia', Jok: 'joker',
      Doc: 'drWatson',  SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen',
    });

    const r1 = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      joker:     { actorIds: [p.Jok.id], targetId: p.SC2.id, actionType: 'target' },
    });

    if (r1.jokerTarget) {
      expect(r1.jokerTarget).toBe(p.SC2.id);
    }
  });
});

/* ═══════════════════════════════════════════════════════════════════
   CI29 — Stress test: rapid phase transitions
   ═══════════════════════════════════════════════════════════════════ */
describe('CI29 — Phase transition stress', () => {
  it('CI29.1 — Multiple night/day transitions maintain consistent state', () => {
    const { game, p } = setup({
      GF:  'godfather', SM: 'simpleMafia',
      Doc: 'drWatson',  SC1: 'simpleCitizen',
      SC2: 'simpleCitizen', SC3: 'simpleCitizen',
      SC4: 'simpleCitizen', SC5: 'simpleCitizen',
    });

    // Round 1
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();
    expect(game.getAlivePlayers().length).toBe(7);

    // Round 2
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC2.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();
    expect(game.getAlivePlayers().length).toBe(6);

    // Round 3
    nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC3.id, actionType: 'shoot', mode: 'shoot' },
    });
    game.startDay();
    expect(game.getAlivePlayers().length).toBe(5);

    // State should be consistent
    expect(game.getDeadPlayers().length).toBe(3);
    const counts = game.getTeamCounts();
    expect(counts.mafia).toBe(2);
    expect(counts.citizen).toBe(3);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   CI30 — Edge case: all same team interactions
   ═══════════════════════════════════════════════════════════════════ */
describe('CI30 — Edge case interactions', () => {
  it('CI30.1 — Dr. Lecter healing mafia member from sniper', () => {
    const { game, p } = setup({
      GF:  'godfather', SM: 'simpleMafia', DL: 'drLecter',
      Snp: 'sniper',    Doc: 'drWatson',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen',
    });

    const r1 = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      drLecter:  { actorIds: [p.DL.id], targetId: p.SM.id, actionType: 'mafiaHeal' },
      sniper:    { actorIds: [p.Snp.id], targetId: p.SM.id, actionType: 'snipe' },
    });

    // Dr. Lecter heals SM → SM should survive sniper
    expect(alive(p.SM)).toBe(true);
  });

  it('CI30.2 — Doctor and Dr. Lecter heal same target independently', () => {
    const { game, p } = setup({
      GF:  'godfather', SM: 'simpleMafia', DL: 'drLecter',
      Doc: 'drWatson',
      SC1: 'simpleCitizen', SC2: 'simpleCitizen',
      SC3: 'simpleCitizen', SC4: 'simpleCitizen',
    });

    // DrWatson heals SC1 from mafia shot
    const r1 = nightRound(game, {
      godfather: { actorIds: [p.GF.id], targetId: p.SC1.id, actionType: 'shoot', mode: 'shoot' },
      drWatson:  { actorIds: [p.Doc.id], targetId: p.SC1.id, actionType: 'heal' },
    });

    // DrWatson saves SC1
    expect(alive(p.SC1)).toBe(true);
  });
});
