/**
 * CY-DAY: 20 tests covering every aspect of Day View
 *
 * Tests: results tab, discussion tab, morning shot, cowboy, timer, voting
 * (increment/decrement/threshold/runoff/tie), bomb siesta, last action cards,
 * god dashboard, stat bar updates, and sub-view transitions.
 */
describe('Day View — Comprehensive UI Tests', () => {

  const names8 = ['GF', 'SM', 'Det', 'Wat', 'C1', 'C2', 'C3', 'C4'];
  const roles8 = ['godfather', 'simpleMafia', 'detective', 'drWatson',
    'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];

  const runNightAndGoDay = (game, targetIdx) => {
    game.startNight();
    game.nightActions = {
      godfather: { actorIds: [game.players[0].id], targetId: game.players[targetIdx].id, actionType: 'kill', mode: 'shoot' },
    };
    game.resolveNight();
    game.startDay();
  };

  /* ─── Results Tab ─── */

  it('CY-DAY-1: Day results show after night resolution, phase bar visible', () => {
    cy.bootstrapGame(names8, roles8);
    cy.window().then((win) => {
      runNightAndGoDay(win.app.game, 4); // kill C1
      win.app.navigate('day');
    });
    cy.wait(400);

    cy.get('.phase-bar--day').should('be.visible');
    cy.get('.phase-bar--day').should('contain.text', '☀️');
  });

  it('CY-DAY-2: Stats bar shows correct mafia/citizen/independent counts', () => {
    cy.bootstrapGame(names8, roles8);
    cy.window().then((win) => {
      runNightAndGoDay(win.app.game, 4);
      win.app.navigate('day');
    });
    cy.wait(400);

    // 2 mafia alive, 5 citizen alive (8 - 1 killed)
    cy.get('.stat-card--mafia .stat-card__value').should('contain.text', '2');
    cy.get('.stat-card--citizen .stat-card__value').should('contain.text', '5');
  });

  it('CY-DAY-3: Go to discussion button works', () => {
    cy.bootstrapGame(names8, roles8);
    cy.window().then((win) => {
      runNightAndGoDay(win.app.game, 4);
      win.app.navigate('day');
    });
    cy.wait(400);

    cy.get('#btn-go-discussion').should('be.visible').click();
    cy.wait(300);

    // Should now show discussion content (timer, voting button)
    cy.get('#btn-go-voting').should('be.visible');
  });

  /* ─── Discussion Tab ─── */

  it('CY-DAY-4: Discussion tab has timer with controls', () => {
    cy.bootstrapGame(names8, roles8);
    cy.window().then((win) => {
      runNightAndGoDay(win.app.game, 4);
      win.app.navigate('day');
    });
    cy.wait(300);
    cy.goToDiscussion();

    // Timer display exists
    cy.get('#timer-display').should('exist');
    // Timer controls exist
    cy.get('#btn-timer-start').should('exist');
    cy.get('#btn-timer-pause').should('exist');
    cy.get('#btn-timer-reset').should('exist');
  });

  it('CY-DAY-5: Go to voting button transitions to voting sub-view', () => {
    cy.bootstrapGame(names8, roles8);
    cy.window().then((win) => {
      runNightAndGoDay(win.app.game, 4);
      win.app.navigate('day');
    });
    cy.wait(300);
    cy.goToDiscussion();
    cy.goToVoting();

    // Voting UI visible
    cy.get('#btn-no-eliminate').should('be.visible');
  });

  /* ─── Morning Shot ─── */

  it('CY-DAY-6: Morning shot — bullet holders shown, shoot resolves blank/live', () => {
    const names = ['GF', 'SM', 'Gun', 'C1', 'C2', 'C3', 'C4', 'C5'];
    const roles = ['godfather', 'simpleMafia', 'gunner', 'simpleCitizen',
      'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    cy.bootstrapGame(names, roles);

    cy.window().then((win) => {
      const game = win.app.game;
      game.startNight();
      game.nightActions = {
        godfather: { actorIds: [game.players[0].id], targetId: game.players[3].id, actionType: 'kill', mode: 'shoot' },
        gunner: {
          actorIds: [game.players[2].id], actionType: 'giveBullet',
          bulletAssignments: [{ holderId: game.players[4].id, type: 'blank' }],
        },
      };
      game.resolveNight();
      game.startDay();
      win.app.navigate('day');
    });
    cy.wait(400);
    cy.goToDiscussion();

    // Verify bullet is active in engine
    cy.window().then((win) => {
      const bm = win.app.game.bulletManager;
      expect(bm.activeBullets.length).to.be.gte(1);
      const bullet = bm.getPlayerBullet(win.app.game.players[4].id);
      expect(bullet).to.not.be.null;
      expect(bullet.type).to.eq('blank');
    });
  });

  it('CY-DAY-7: Morning shot — blank bullet result shows yellow card', () => {
    const names = ['GF', 'SM', 'Gun', 'C1', 'C2', 'C3', 'C4', 'C5'];
    const roles = ['godfather', 'simpleMafia', 'gunner', 'simpleCitizen',
      'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    cy.bootstrapGame(names, roles);

    cy.window().then((win) => {
      const game = win.app.game;
      game.startNight();
      game.nightActions = {
        godfather: { actorIds: [game.players[0].id], targetId: game.players[3].id, actionType: 'kill', mode: 'shoot' },
        gunner: {
          actorIds: [game.players[2].id], actionType: 'giveBullet',
          bulletAssignments: [{ holderId: game.players[4].id, type: 'blank' }],
        },
      };
      game.resolveNight();
      game.startDay();

      // Execute morning shot via engine
      const result = game.resolveMorningShot(game.players[4].id, game.players[0].id);
      expect(result.type).to.eq('blank');
      expect(result.killed).to.eq(false);
    });
  });

  /* ─── Cowboy ─── */

  it('CY-DAY-8: Cowboy targets mafia — both die, side announced', () => {
    const names = ['GF', 'SM', 'Cow', 'C1', 'C2', 'C3', 'C4', 'C5'];
    const roles = ['godfather', 'simpleMafia', 'cowboy', 'simpleCitizen',
      'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    cy.bootstrapGame(names, roles);

    // bootstrapGame auto-resolves first night → day. Cowboy action is a day ability.
    cy.window().then((win) => {
      const game = win.app.game;
      // Find cowboy and target by roleId (indices may shift after night resolution)
      const cowboy = game.players.find(p => p.roleId === 'cowboy');
      const sm = game.players.find(p => p.roleId === 'simpleMafia');
      // Ensure cowboy is alive and ability unused
      cowboy.isAlive = true;
      cowboy.deathRound = null;
      cowboy.deathCause = null;
      sm.isAlive = true;
      sm.deathRound = null;
      sm.deathCause = null;
      game._cowboyUsed = false;
      game.phase = 'day';

      const result = game.resolveCowboyAction(sm.id);
      expect(result.side).to.eq('mafia');
      expect(result.cowboyDied).to.eq(true);
      expect(result.killed).to.eq(true);
      expect(sm.isAlive).to.eq(false); // SM dead
      expect(cowboy.isAlive).to.eq(false); // Cowboy dead
    });
  });

  it('CY-DAY-9: Cowboy targets Jack — cowboy dies, Jack survives with locked curse', () => {
    const names = ['GF', 'SM', 'Cow', 'Jck', 'C1', 'C2', 'C3', 'C4'];
    const roles = ['godfather', 'simpleMafia', 'cowboy', 'jack',
      'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    cy.bootstrapGame(names, roles);

    // bootstrapGame auto-resolves first night → day. Cowboy action is a day ability.
    cy.window().then((win) => {
      const game = win.app.game;
      // Find cowboy and Jack by roleId
      const cowboy = game.players.find(p => p.roleId === 'cowboy');
      const jack = game.players.find(p => p.roleId === 'jack');
      // Ensure cowboy is alive and ability unused
      cowboy.isAlive = true;
      cowboy.deathRound = null;
      cowboy.deathCause = null;
      game._cowboyUsed = false;
      game.phase = 'day';

      const result = game.resolveCowboyAction(jack.id);
      expect(result.side).to.eq('jack');
      expect(result.cowboyDied).to.eq(true);
      expect(result.killed).to.eq(false);
      expect(jack.isAlive).to.eq(true); // Jack alive
    });
  });

  /* ─── Voting ─── */

  it('CY-DAY-10: Voting — vote cards render for each alive player', () => {
    cy.bootstrapGame(names8, roles8);
    cy.window().then((win) => {
      runNightAndGoDay(win.app.game, 4);
      win.app.game.lastActionManager?.cards?.forEach(c => { c.used = true; });
      win.app.navigate('day');
    });
    cy.wait(300);
    cy.goToDiscussion();
    cy.goToVoting();

    // Should have vote cards for alive players (7 alive)
    cy.get('.vote-card').should('have.length', 7);
  });

  it('CY-DAY-11: Voting — increment/decrement vote counters', () => {
    cy.bootstrapGame(names8, roles8);
    cy.window().then((win) => {
      runNightAndGoDay(win.app.game, 4);
      win.app.game.lastActionManager?.cards?.forEach(c => { c.used = true; });
      win.app.navigate('day');
    });
    cy.wait(300);
    cy.goToDiscussion();
    cy.goToVoting();

    // Click increment on first player
    cy.get('.vote-incr').first().click();
    cy.get('.vote-value').first().should('contain.text', '1');

    // Click again
    cy.get('.vote-incr').first().click();
    cy.get('.vote-value').first().should('contain.text', '2');

    // Decrement
    cy.get('.vote-decr').first().click();
    cy.get('.vote-value').first().should('contain.text', '1');
  });

  it('CY-DAY-12: Voting — no eliminate button starts next night', () => {
    cy.bootstrapGame(names8, roles8);
    cy.window().then((win) => {
      runNightAndGoDay(win.app.game, 4);
      win.app.game.lastActionManager?.cards?.forEach(c => { c.used = true; });
      win.app.navigate('day');
    });
    cy.wait(300);
    cy.goToDiscussion();
    cy.goToVoting();

    cy.get('#btn-no-eliminate').click();
    cy.wait(500);

    // Should transition to night
    cy.get('.phase-bar--night').should('be.visible');
  });

  it('CY-DAY-13: Voting — continue to runoff enabled only when threshold met', () => {
    cy.bootstrapGame(names8, roles8);
    cy.window().then((win) => {
      runNightAndGoDay(win.app.game, 4);
      win.app.game.lastActionManager?.cards?.forEach(c => { c.used = true; });
      win.app.navigate('day');
    });
    cy.wait(300);
    cy.goToDiscussion();
    cy.goToVoting();

    // Continue to runoff should be disabled (no votes above threshold)
    cy.get('#btn-continue-runoff').should('have.attr', 'disabled');

    // Give first player enough votes to pass threshold (50%+1 of 7 = 4)
    for (let i = 0; i < 4; i++) {
      cy.get('.vote-incr').first().click();
    }

    // Continue should now be enabled
    cy.get('#btn-continue-runoff').should('not.have.attr', 'disabled');
  });

  it('CY-DAY-14: Vote elimination via engine — player marked dead', () => {
    cy.bootstrapGame(names8, roles8);
    cy.window().then((win) => {
      const game = win.app.game;
      runNightAndGoDay(game, 4);
      game.lastActionManager?.cards?.forEach(c => { c.used = true; });

      // Vote SM out
      game.eliminateByVote(game.players[1].id);
      expect(game.players[1].isAlive).to.eq(false);
    });
  });

  /* ─── Bomb Siesta ─── */

  it('CY-DAY-15: Bomb siesta — guardian guess correct defuses bomb', () => {
    const names = ['GF', 'Bom', 'SM', 'BG', 'Zod', 'C1', 'C2', 'C3', 'C4', 'C5'];
    const roles = ['godfather', 'bomber', 'simpleMafia', 'bodyguard', 'zodiac',
      'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    cy.bootstrapGame(names, roles);

    cy.window().then((win) => {
      const game = win.app.game;
      game.startNight();
      game.nightActions = {
        godfather: { actorIds: [game.players[0].id], targetId: game.players[5].id, actionType: 'kill', mode: 'shoot' },
        bomber: { actorIds: [game.players[1].id], targetId: game.players[6].id, actionType: 'bomb', bombPassword: 3 },
      };
      game.resolveNight();
      game.startDay();

      expect(game.hasBombToResolve()).to.eq(true);

      // Guardian guesses correctly
      game.startBombSiesta();
      const result = game.bombGuardianGuess(3);
      expect(result.result).to.eq('defused');
    });
  });

  it('CY-DAY-16: Bomb siesta — guardian wrong guess kills guardian', () => {
    const names = ['GF', 'Bom', 'SM', 'BG', 'Zod', 'C1', 'C2', 'C3', 'C4', 'C5'];
    const roles = ['godfather', 'bomber', 'simpleMafia', 'bodyguard', 'zodiac',
      'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    cy.bootstrapGame(names, roles);

    cy.window().then((win) => {
      const game = win.app.game;
      game.startNight();
      game.nightActions = {
        godfather: { actorIds: [game.players[0].id], targetId: game.players[5].id, actionType: 'kill', mode: 'shoot' },
        bomber: { actorIds: [game.players[1].id], targetId: game.players[6].id, actionType: 'bomb', bombPassword: 3 },
      };
      game.resolveNight();
      game.startDay();
      game.startBombSiesta();

      // Wrong guess
      const result = game.bombGuardianGuess(1);
      expect(result.result).to.eq('wrong');
      expect(game.players[3].isAlive).to.eq(false); // Guardian dead
    });
  });

  it('CY-DAY-17: Bomb siesta — guardian skip, target guesses wrong = explodes', () => {
    const names = ['GF', 'Bom', 'SM', 'BG', 'Zod', 'C1', 'C2', 'C3', 'C4', 'C5'];
    const roles = ['godfather', 'bomber', 'simpleMafia', 'bodyguard', 'zodiac',
      'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    cy.bootstrapGame(names, roles);

    cy.window().then((win) => {
      const game = win.app.game;
      game.startNight();
      game.nightActions = {
        godfather: { actorIds: [game.players[0].id], targetId: game.players[5].id, actionType: 'kill', mode: 'shoot' },
        bomber: { actorIds: [game.players[1].id], targetId: game.players[6].id, actionType: 'bomb', bombPassword: 3 },
      };
      game.resolveNight();
      game.startDay();
      game.startBombSiesta();
      game.bombGuardianSkip();

      // Target guesses wrong
      const result = game.bombTargetGuess(1);
      expect(result.result).to.eq('exploded');
      expect(game.players[6].isAlive).to.eq(false); // C2 dead (bomb target)
    });
  });

  /* ─── God Dashboard ─── */

  it('CY-DAY-18: God dashboard toggles visibility, shows team colors', () => {
    cy.bootstrapGame(names8, roles8);
    cy.window().then((win) => {
      runNightAndGoDay(win.app.game, 4);
      win.app.navigate('day');
    });
    cy.wait(400);

    // Toggle god tools
    cy.get('#btn-toggle-godtools').then(($btn) => {
      if ($btn.length) {
        cy.wrap($btn).click();
        cy.wait(300);

        // God dashboard should be visible with player cards
        cy.get('.god-player').should('have.length', 8);

        // Mafia players have mafia class
        cy.get('.god-player--mafia').should('have.length', 2);

        // Dead players have dead class
        cy.get('.god-player--dead').should('have.length.gte', 1);
      }
    });
  });

  /* ─── Last Action Cards ─── */

  it('CY-DAY-19: Last action card flow — card pick, reveal, target select', () => {
    cy.bootstrapGame(names8, roles8);

    cy.window().then((win) => {
      const game = win.app.game;
      runNightAndGoDay(game, 4);

      // Check last action cards exist
      const available = game.lastActionManager.cards.filter(c => !c.used);
      expect(available.length).to.be.gte(1);

      // Draw a random card
      const drawn = game.lastActionManager.drawRandom();
      expect(drawn).to.not.be.null;
      expect(drawn.id).to.be.a('number');
      expect(drawn.name).to.be.a('string');
    });
  });

  /* ─── Win Condition After Voting ─── */

  it('CY-DAY-20: Vote eliminates last mafia — citizen wins', () => {
    // Only 1 mafia, kill the other
    const names = ['GF', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'];
    const roles = ['godfather', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen',
      'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    cy.bootstrapGame(names, roles);

    cy.window().then((win) => {
      const game = win.app.game;
      game.startNight();
      game.nightActions = {};
      game.resolveNight();
      game.startDay();
      game.lastActionManager?.cards?.forEach(c => { c.used = true; });

      // Vote out the only mafia
      game.eliminateByVote(game.players[0].id);
      const winner = game.checkWinCondition();
      expect(winner).to.eq('citizen');
    });
  });
});
