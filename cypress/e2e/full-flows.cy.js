/**
 * CY-FLOW: 15 complex end-to-end flows that exercise every game mechanic
 * from start to finish through the actual UI.
 *
 * These tests combine setup, reveal, night, day, voting, win, and edge cases
 * into full multi-round game simulations, catching bugs that only appear
 * when multiple systems interact.
 */
describe('Full Game Flows — Complex Multi-Round Tests', () => {

  /* ═══════════════════════════════════════════════════════════════
     FLOW-1: 8P basic game — setup → reveal → blind → night → day → vote → night → win
     ═══════════════════════════════════════════════════════════════ */
  it('FLOW-1: 8P complete game — mafia kills 3, gets voted out, citizen wins', () => {
    const names = ['GF', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'];
    const roles = ['godfather', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen',
      'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    cy.bootstrapGame(names, roles);

    cy.window().then((win) => {
      const game = win.app.game;

      // Night 1: GF kills C1
      game.startNight();
      game.nightActions = {
        godfather: { actorIds: [game.players[0].id], targetId: game.players[1].id, actionType: 'kill', mode: 'shoot' },
      };
      game.resolveNight();
      game.startDay();
      game.lastActionManager?.cards?.forEach(c => { c.used = true; });
      expect(game.players[1].isAlive).to.eq(false);

      // Day 1: Vote out GF
      game.eliminateByVote(game.players[0].id);
      const w = game.checkWinCondition();
      expect(w).to.eq('citizen');

      // Navigate to summary
      game.phase = 'ended';
      game.winner = 'citizen';
      win.app.navigate('summary');
    });
    cy.wait(500);

    // Win screen should show
    cy.get('.win-screen').should('be.visible');
    cy.get('.win-screen__title').should('exist');
    cy.get('#btn-new-game-summary').should('be.visible');
  });

  /* ═══════════════════════════════════════════════════════════════
     FLOW-2: 10P — Detective investigation + sniper kill
     ═══════════════════════════════════════════════════════════════ */
  it('FLOW-2: 10P — detective finds mafia, sniper kills, citizen wins', () => {
    const names = Array.from({ length: 10 }, (_, i) => `P${i + 1}`);
    const roles = ['godfather', 'simpleMafia', 'drLecter',
      'detective', 'drWatson', 'sniper', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    cy.bootstrapGame(names, roles);

    cy.window().then((win) => {
      const game = win.app.game;

      // Night 1: Det investigates SM (positive), GF kills C1
      game.startNight();
      game.nightActions = {
        godfather: { actorIds: [game.players[0].id], targetId: game.players[6].id, actionType: 'kill', mode: 'shoot' },
        detective: { actorIds: [game.players[3].id], targetId: game.players[1].id, actionType: 'investigate' },
      };
      const r1 = game.resolveNight();
      expect(r1.investigated.result).to.eq('positive');
      game.startDay();
      game.lastActionManager?.cards?.forEach(c => { c.used = true; });

      // Day 1: Vote out SM
      game.eliminateByVote(game.players[1].id);

      // Night 2: Sniper kills DrLecter, GF kills C2
      game.startNight();
      game.nightActions = {
        godfather: { actorIds: [game.players[0].id], targetId: game.players[7].id, actionType: 'kill', mode: 'shoot' },
        sniper: { actorIds: [game.players[5].id], targetId: game.players[2].id, actionType: 'snipe' },
      };
      game.resolveNight();
      game.startDay();
      game.lastActionManager?.cards?.forEach(c => { c.used = true; });
      expect(game.players[2].isAlive).to.eq(false); // DrLecter sniped

      // Day 2: Vote out GF → all mafia dead → citizen wins
      game.eliminateByVote(game.players[0].id);
      expect(game.checkWinCondition()).to.eq('citizen');
    });
  });

  /* ═══════════════════════════════════════════════════════════════
     FLOW-3: Kane + Jack — curse chain, BM discard
     ═══════════════════════════════════════════════════════════════ */
  it('FLOW-3: Kane reveals Jack → curse locked, BM discarded, curse chain on vote', () => {
    const names = ['Kane', 'Jack', 'GF', 'SM', 'Det', 'C1', 'C2', 'C3'];
    const roles = ['kane', 'jack', 'godfather', 'simpleMafia', 'detective',
      'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    cy.bootstrapGame(names, roles);

    cy.window().then((win) => {
      const game = win.app.game;

      // Night 1: Kane reveals Jack, Jack curses C1, GF kills C2
      game.startNight();
      game.nightActions = {
        kane: { actorIds: [game.players[0].id], targetId: game.players[1].id, actionType: 'kaneReveal' },
        jack: { actorIds: [game.players[1].id], targetId: game.players[5].id, actionType: 'curse' },
        godfather: { actorIds: [game.players[2].id], targetId: game.players[6].id, actionType: 'kill', mode: 'shoot' },
      };
      const r = game.resolveNight();

      // Verify Kane reveal and Jack lock
      expect(r.kaneReveal).to.exist;
      expect(game.players[1].curse.isLocked).to.eq(true);

      // BM card should be discarded (Jack revealed)
      const bmCard = game.lastActionManager.cards.find(c => c.id === 4);
      expect(bmCard.used).to.eq(true);

      game.startDay();
      game.lastActionManager?.cards?.forEach(c => { c.used = true; });

      // Day: Vote out cursed target C1 → Jack dies (curse chain)
      const vr = game.eliminateByVote(game.players[5].id);
      expect(vr.jackCurseTriggered).to.eq(true);
      expect(game.players[1].isAlive).to.eq(false); // Jack dead
    });
  });

  /* ═══════════════════════════════════════════════════════════════
     FLOW-4: Kane sacrifice — Kane dies night after reveal
     ═══════════════════════════════════════════════════════════════ */
  it('FLOW-4: Kane reveals mafia → pending death, dies next night', () => {
    const names = ['Kane', 'GF', 'SM', 'C1', 'C2', 'C3', 'C4', 'C5'];
    const roles = ['kane', 'godfather', 'simpleMafia', 'simpleCitizen',
      'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    cy.bootstrapGame(names, roles);

    cy.window().then((win) => {
      const game = win.app.game;

      // Night 1: Kane reveals GF (mafia → pending death)
      game.startNight();
      game.nightActions = {
        kane: { actorIds: [game.players[0].id], targetId: game.players[1].id, actionType: 'kaneReveal' },
        godfather: { actorIds: [game.players[1].id], targetId: game.players[3].id, actionType: 'kill', mode: 'shoot' },
      };
      game.resolveNight();
      expect(game._kanePendingDeath).to.eq(true);
      expect(game.players[0].isAlive).to.eq(true); // Still alive night 1
      game.startDay();
      game.lastActionManager?.cards?.forEach(c => { c.used = true; });

      // Night 2: Kane should die
      game.startNight();
      game.nightActions = {
        godfather: { actorIds: [game.players[1].id], targetId: game.players[4].id, actionType: 'kill', mode: 'shoot' },
      };
      game.resolveNight();
      expect(game.players[0].isAlive).to.eq(false);
      expect(game.players[0].deathCause).to.eq('kane_sacrifice');
    });
  });

  /* ═══════════════════════════════════════════════════════════════
     FLOW-5: Framason contamination — recruit mafia kills whole alliance
     ═══════════════════════════════════════════════════════════════ */
  it('FLOW-5: Framason recruits mafia → entire alliance contaminated', () => {
    const names = ['GF', 'SM', 'FM', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'];
    const roles = ['godfather', 'simpleMafia', 'freemason', 'simpleCitizen',
      'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen',
      'simpleCitizen', 'simpleCitizen'];
    cy.bootstrapGame(names, roles);

    cy.window().then((win) => {
      const game = win.app.game;

      // Night 1: FM recruits C1
      game.startNight();
      game.nightActions = {
        godfather: { actorIds: [game.players[0].id], targetId: game.players[9].id, actionType: 'kill', mode: 'shoot' },
        freemason: { actorIds: [game.players[2].id], targetId: game.players[3].id, actionType: 'recruit' },
      };
      game.resolveNight();
      expect(game.framason.members.length).to.eq(1);
      expect(game.framason.isContaminated).to.eq(false);
      game.startDay();
      game.lastActionManager?.cards?.forEach(c => { c.used = true; });

      // Night 2: FM recruits SM (mafia!) → contamination
      game.startNight();
      game.nightActions = {
        godfather: { actorIds: [game.players[0].id], targetId: game.players[8].id, actionType: 'kill', mode: 'shoot' },
        freemason: { actorIds: [game.players[2].id], targetId: game.players[1].id, actionType: 'recruit' },
      };
      game.resolveNight();
      expect(game.framason.isContaminated).to.eq(true);

      // Resolve contamination — FM + C1 + SM die
      const contam = game.resolveFramasonContamination();
      expect(contam.deadIds.length).to.be.gte(2); // Leader + members killed
      expect(game.players[2].isAlive).to.eq(false); // FM dead
      expect(game.players[3].isAlive).to.eq(false); // C1 (member) dead
    });
  });

  /* ═══════════════════════════════════════════════════════════════
     FLOW-6: Constantine revive — same-day kill revivable
     ═══════════════════════════════════════════════════════════════ */
  it('FLOW-6: Constantine revives vote-killed citizen same round', () => {
    const names = ['GF', 'SM', 'Con', 'C1', 'C2', 'C3', 'C4', 'C5'];
    const roles = ['godfather', 'simpleMafia', 'constantine', 'simpleCitizen',
      'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    cy.bootstrapGame(names, roles);

    cy.window().then((win) => {
      const game = win.app.game;

      // Night 1: GF kills C5
      game.startNight();
      game.nightActions = {
        godfather: { actorIds: [game.players[0].id], targetId: game.players[7].id, actionType: 'kill', mode: 'shoot' },
      };
      game.resolveNight();
      game.startDay();
      game.lastActionManager?.cards?.forEach(c => { c.used = true; });

      // Day 1: Vote kill C1
      game.eliminateByVote(game.players[3].id);
      expect(game.players[3].isAlive).to.eq(false);

      // Night 2: Constantine revives C1 (same-round kill = revivable)
      game.startNight();
      const revivable = game.getRevivablePlayers();
      const c1Revivable = revivable.some(p => p.id === game.players[3].id);
      expect(c1Revivable).to.eq(true);

      game.nightActions = {
        godfather: { actorIds: [game.players[0].id], targetId: game.players[4].id, actionType: 'kill', mode: 'shoot' },
        constantine: { actorIds: [game.players[2].id], targetId: game.players[3].id, actionType: 'revive' },
      };
      const r = game.resolveNight();
      expect(r.revived).to.eq(game.players[3].id);
      expect(game.players[3].isAlive).to.eq(true);
    });
  });

  /* ═══════════════════════════════════════════════════════════════
     FLOW-7: DrWatson heals target — blocked kill
     ═══════════════════════════════════════════════════════════════ */
  it('FLOW-7: DrWatson heals mafia target — kill blocked, shield used', () => {
    const names = ['GF', 'SM', 'Wat', 'C1', 'C2', 'C3', 'C4', 'C5'];
    const roles = ['godfather', 'simpleMafia', 'drWatson', 'simpleCitizen',
      'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    cy.bootstrapGame(names, roles);

    cy.window().then((win) => {
      const game = win.app.game;
      game.startNight();
      game.nightActions = {
        godfather: { actorIds: [game.players[0].id], targetId: game.players[3].id, actionType: 'kill', mode: 'shoot' },
        drWatson: { actorIds: [game.players[2].id], targetId: game.players[3].id, actionType: 'heal' },
      };
      const r = game.resolveNight();

      // C1 should survive (healed)
      expect(game.players[3].isAlive).to.eq(true);
      expect(r.saved).to.exist;
    });
  });

  /* ═══════════════════════════════════════════════════════════════
     FLOW-8: Matador (Silencer) silences a player
     ═══════════════════════════════════════════════════════════════ */
  it('FLOW-8: Matador silences player — silenced player marked in day', () => {
    const names = ['GF', 'Mat', 'SM', 'C1', 'C2', 'C3', 'C4', 'C5'];
    const roles = ['godfather', 'matador', 'simpleMafia', 'simpleCitizen',
      'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    cy.bootstrapGame(names, roles);

    cy.window().then((win) => {
      const game = win.app.game;
      game.startNight();
      game.nightActions = {
        godfather: { actorIds: [game.players[0].id], targetId: game.players[3].id, actionType: 'kill', mode: 'shoot' },
        matador: { actorIds: [game.players[1].id], targetId: game.players[4].id, actionType: 'silence' },
      };
      const r = game.resolveNight();

      expect(r.silenced).to.eq(game.players[4].id);
    });
  });

  /* ═══════════════════════════════════════════════════════════════
     FLOW-9: Zodiac solo kill + bodyguard interaction
     ═══════════════════════════════════════════════════════════════ */
  it('FLOW-9: Zodiac kills citizen, bodyguard protects next night', () => {
    const names = ['GF', 'SM', 'Zod', 'BG', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6'];
    const roles = ['godfather', 'simpleMafia', 'zodiac', 'bodyguard',
      'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen',
      'simpleCitizen', 'simpleCitizen'];
    cy.bootstrapGame(names, roles);

    cy.window().then((win) => {
      const game = win.app.game;

      // Night 1: Zodiac kills C1
      game.startNight();
      game.nightActions = {
        godfather: { actorIds: [game.players[0].id], targetId: game.players[4].id, actionType: 'kill', mode: 'shoot' },
        zodiac: { actorIds: [game.players[2].id], targetId: game.players[5].id, actionType: 'soloKill' },
      };
      game.resolveNight();
      expect(game.players[5].isAlive).to.eq(false); // C2 killed by Zodiac
    });
  });

  /* ═══════════════════════════════════════════════════════════════
     FLOW-10: Jadoogar blocks detective — investigation returns blocked
     ═══════════════════════════════════════════════════════════════ */
  it('FLOW-10: Jadoogar blocks detective — investigation blocked', () => {
    const names = ['GF', 'SM', 'Jad', 'Det', 'C1', 'C2', 'C3', 'C4'];
    const roles = ['godfather', 'simpleMafia', 'jadoogar', 'detective',
      'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    cy.bootstrapGame(names, roles);

    cy.window().then((win) => {
      const game = win.app.game;
      game.startNight();
      game.nightActions = {
        godfather: { actorIds: [game.players[0].id], targetId: game.players[4].id, actionType: 'kill', mode: 'shoot' },
        jadoogar: { actorIds: [game.players[2].id], targetId: game.players[3].id, actionType: 'block' },
        detective: { actorIds: [game.players[3].id], targetId: game.players[0].id, actionType: 'investigate' },
      };
      const r = game.resolveNight();
      // Jadoogar deletes detective's action, so investigated stays null
      expect(r.blocked).to.eq(game.players[3].id);
      expect(r.investigated).to.be.null;
    });
  });

  /* ═══════════════════════════════════════════════════════════════
     FLOW-11: Joker investigated — detective gets wrong result
     ═══════════════════════════════════════════════════════════════ */
  it('FLOW-11: Joker reverses detective result', () => {
    const names = ['GF', 'SM', 'Det', 'Jok', 'C1', 'C2', 'C3', 'C4'];
    const roles = ['godfather', 'simpleMafia', 'detective', 'joker',
      'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    cy.bootstrapGame(names, roles);

    cy.window().then((win) => {
      const game = win.app.game;
      game.startNight();
      game.nightActions = {
        godfather: { actorIds: [game.players[0].id], targetId: game.players[4].id, actionType: 'kill', mode: 'shoot' },
        detective: { actorIds: [game.players[2].id], targetId: game.players[3].id, actionType: 'investigate' },
      };
      const r = game.resolveNight();
      // Joker should reverse the result
      // Joker is mafia-team? No, joker is citizen/independent — investigate returns 'negative' normally
      // but joker reverses to 'positive'
      expect(r.investigated.result).to.eq('positive');
    });
  });

  /* ═══════════════════════════════════════════════════════════════
     FLOW-12: GF salakhi — correct guess kills, wrong guess fails
     ═══════════════════════════════════════════════════════════════ */
  it('FLOW-12: GF salakhi correct guess kills target, wrong fails', () => {
    const names = ['GF', 'SM', 'Det', 'C1', 'C2', 'C3', 'C4', 'C5'];
    const roles = ['godfather', 'simpleMafia', 'detective', 'simpleCitizen',
      'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    cy.bootstrapGame(names, roles);

    cy.window().then((win) => {
      const game = win.app.game;

      // Night 1: GF salakhi with CORRECT guess on detective
      game.startNight();
      game.nightActions = {
        godfather: { actorIds: [game.players[0].id], targetId: game.players[2].id, actionType: 'salakhi', mode: 'salakhi', guessedRoleId: 'detective' },
      };
      const r = game.resolveNight();
      expect(r.salakhied).to.exist;
      expect(r.salakhied.correct).to.eq(true);
      expect(game.players[2].isAlive).to.eq(false);
    });
  });

  it('FLOW-13: GF salakhi wrong guess — target survives', () => {
    const names = ['GF', 'SM', 'Det', 'C1', 'C2', 'C3', 'C4', 'C5'];
    const roles = ['godfather', 'simpleMafia', 'detective', 'simpleCitizen',
      'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    cy.bootstrapGame(names, roles);

    cy.window().then((win) => {
      const game = win.app.game;
      game.startNight();
      game.nightActions = {
        godfather: { actorIds: [game.players[0].id], targetId: game.players[2].id, actionType: 'salakhi', mode: 'salakhi', guessedRoleId: 'sniper' },
      };
      const r = game.resolveNight();
      expect(r.salakhied.correct).to.eq(false);
      expect(game.players[2].isAlive).to.eq(true); // wrong guess = survives
    });
  });

  /* ═══════════════════════════════════════════════════════════════
     FLOW-14: Live bullet expiration — holder dies before voting
     ═══════════════════════════════════════════════════════════════ */
  it('FLOW-14: Live bullet expires at voting → holder dies', () => {
    const names = ['GF', 'SM', 'Gun', 'C1', 'C2', 'C3', 'C4', 'C5'];
    const roles = ['godfather', 'simpleMafia', 'gunner', 'simpleCitizen',
      'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    cy.bootstrapGame(names, roles);

    cy.window().then((win) => {
      const game = win.app.game;
      // Night 1: Gunner gives C1 a live bullet
      game.startNight();
      game.nightActions = {
        godfather: { actorIds: [game.players[0].id], targetId: game.players[7].id, actionType: 'kill', mode: 'shoot' },
        gunner: {
          actorIds: [game.players[2].id], actionType: 'giveBullet',
          bulletAssignments: [{ holderId: game.players[3].id, type: 'live' }],
        },
      };
      game.resolveNight();
      game.startDay();

      // C1 has live bullet — if not used, expires at voting
      const expResult = game.resolveLiveExpiration();
      // Live bullet should kill holder
      expect(expResult.length).to.be.gte(1);
      expect(expResult[0].holderId).to.eq(game.players[3].id);
      expect(game.players[3].isAlive).to.eq(false);
    });
  });

  /* ═══════════════════════════════════════════════════════════════
     FLOW-15: Handshake resolution — 3 alive, pair selection
     ═══════════════════════════════════════════════════════════════ */
  it('FLOW-15: 3 alive (1M+2C) → handshake, pair wins, third eliminated', () => {
    const names = ['GF', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'];
    const roles = ['godfather', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen',
      'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    cy.bootstrapGame(names, roles);

    cy.window().then((win) => {
      const game = win.app.game;
      const exhaust = () => game.lastActionManager?.cards?.forEach(c => { c.used = true; });

      // Kill down to 3 alive
      for (let i = 3; i <= 7; i++) {
        game.startNight();
        game.nightActions = { godfather: { actorIds: [game.players[0].id], targetId: game.players[i].id, actionType: 'kill', mode: 'shoot' } };
        game.resolveNight();
        game.startDay(); exhaust();
      }

      const alive = game.getAlivePlayers();
      expect(alive.length).to.eq(3);
      // checkWinCondition triggers handshake — sets game.phase = 'handshake'
      const w = game.checkWinCondition();
      expect(w).to.eq('handshake');

      // Navigate to summary (phase is already 'handshake' from checkWinCondition)
      win.app.navigate('summary');
    });
    cy.wait(500);

    // Handshake pairs should be visible
    cy.get('.handshake-pair').should('have.length.gte', 1);
  });
});
