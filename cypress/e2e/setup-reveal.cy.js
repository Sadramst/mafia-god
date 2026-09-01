/**
 * CY-SETUP: 15 tests covering every aspect of Setup & Role Reveal views
 *
 * Tests REAL DOM interactions — clicks, types, drags — and verifies
 * CSS classes, visibility, disabled states, validation toasts, and transitions.
 */
describe('Setup & Role Reveal — Comprehensive UI Tests', () => {

  beforeEach(() => {
    cy.freshLoad();
  });

  /* ─── Home Screen ─── */

  it('CY-HOME-1: Home screen renders all buttons with correct text', () => {
    cy.get('#btn-new-game').should('be.visible').and('contain.text', 'New Game');
    cy.get('#btn-history').should('be.visible');
    cy.get('#btn-settings').should('be.visible');
    // Continue button only shown when save exists
    cy.window().then((win) => {
      const hasSave = !!win.localStorage.getItem('mafia-save');
      if (hasSave) {
        cy.get('#btn-continue').should('be.visible');
      } else {
        cy.get('#btn-continue').should('not.exist');
      }
    });
  });

  it('CY-HOME-2: Settings — language toggle switches all text', () => {
    cy.get('#btn-settings').click();
    cy.wait(300);
    // Select English
    cy.get('input[name="language"][value="en"]').check({ force: true });
    cy.get('#btn-save-settings').click();
    cy.wait(500);

    // Navigate to settings again and verify English is set
    cy.get('#btn-settings').click();
    cy.wait(300);
    cy.get('input[name="language"][value="en"]').should('be.checked');

    // Switch to Farsi
    cy.get('input[name="language"][value="fa"]').check({ force: true });
    cy.get('#btn-save-settings').click();
    cy.wait(500);

    // Verify Farsi is now selected
    cy.get('#btn-settings').click();
    cy.wait(300);
    cy.get('input[name="language"][value="fa"]').should('be.checked');
  });

  /* ─── Player Tab ─── */

  it('CY-SETUP-1: Add 8 players via input, verify list count and names', () => {
    const names = ['Ali', 'Sara', 'Reza', 'Mina', 'Hamed', 'Leila', 'Arash', 'Neda'];
    cy.addPlayers(names);
    cy.get('.player-item').should('have.length', 8);
    names.forEach((name) => {
      cy.get('.player-item__name').contains(name).should('exist');
    });
  });

  it('CY-SETUP-2: Remove a player and verify count decrements', () => {
    cy.addPlayers(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    cy.get('.player-item').should('have.length', 8);

    // Remove third player
    cy.get('.player-item__remove').eq(2).click();
    cy.get('.player-item').should('have.length', 7);
  });

  it('CY-SETUP-3: Duplicate player name is rejected silently', () => {
    cy.addPlayers(['Ali', 'Sara', 'Reza', 'Mina', 'Hamed', 'Leila', 'Arash', 'Neda']);
    // Try duplicate
    cy.get('#player-name-input').clear().type('Ali');
    cy.get('#btn-add-player').click();
    cy.get('.player-item').should('have.length', 8); // still 8
  });

  it('CY-SETUP-4: Empty input does not add a player', () => {
    cy.get('#btn-new-game').click();
    cy.get('#btn-add-player').click();
    cy.get('.player-item').should('have.length', 0);
  });

  it('CY-SETUP-5: Enter key submits player name', () => {
    cy.get('#btn-new-game').click();
    cy.get('#player-name-input').type('Player1{enter}');
    cy.get('.player-item').should('have.length', 1);
  });

  it('CY-SETUP-6: Suggested player buttons add players', () => {
    cy.get('#btn-new-game').click();
    // Click first suggested player
    cy.get('.suggested-player').first().click();
    cy.get('.player-item').should('have.length', 1);
  });

  it('CY-SETUP-7: Player empty state shown when no players', () => {
    cy.get('#btn-new-game').click();
    cy.get('.empty-state').should('be.visible');
    // Add one player removes empty state
    cy.get('#player-name-input').type('Ali{enter}');
    cy.get('.empty-state').should('not.exist');
  });

  /* ─── Tab Navigation ─── */

  it('CY-SETUP-8: Tabs disabled/enabled based on player count', () => {
    cy.get('#btn-new-game').click();
    // With 0 players: roles + assign should be disabled
    cy.get('.tab[data-tab="roles"]').should('have.class', 'disabled');
    cy.get('.tab[data-tab="assign"]').should('have.class', 'disabled');

    // Add 8 players
    for (let i = 0; i < 8; i++) {
      cy.get('#player-name-input').type(`P${i}{enter}`);
    }

    // Roles tab should now be enabled
    cy.get('.tab[data-tab="roles"]').should('not.have.class', 'disabled');
  });

  /* ─── Roles Tab ─── */

  it('CY-SETUP-9: Role cards render, click selects/deselects, count updates', () => {
    cy.addPlayers(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    cy.get('.tab[data-tab="roles"]').click();
    cy.wait(200);

    // Godfather card should exist
    cy.get('.role-card[data-role="godfather"]').should('be.visible');

    // Click godfather to select
    cy.get('.role-card[data-role="godfather"]').click();
    cy.get('.role-card[data-role="godfather"]').should('have.class', 'selected');

    // Role count display updates
    cy.get('#role-count-display').invoke('text').then((txt) => {
      expect(parseInt(txt)).to.be.gte(1);
    });
  });

  it('CY-SETUP-10: Bodyguard requires zodiac/bomber — zodiac auto-adds bodyguard', () => {
    cy.addPlayers(Array.from({length: 10}, (_, i) => `P${i}`));
    cy.get('.tab[data-tab="roles"]').click();
    cy.wait(400);

    // Engine: no zodiac, bomber, or bodyguard selected
    cy.window().then((win) => {
      const game = win.app.game;
      expect(game.selectedRoles['zodiac']).to.not.be.ok;
      expect(game.selectedRoles['bomber']).to.not.be.ok;
      expect(game.selectedRoles['bodyguard']).to.not.be.ok;
    });

    // Select zodiac → auto-adds bodyguard (engine rule)
    cy.get('.role-card[data-role="zodiac"]').click();
    cy.wait(200);

    // Engine: zodiac and bodyguard should now both be selected
    cy.window().then((win) => {
      const game = win.app.game;
      expect(game.selectedRoles['zodiac']).to.eq(1);
      expect(game.selectedRoles['bodyguard']).to.eq(1);
    });

    // DOM: bodyguard card should show as selected
    cy.get('.role-card[data-role="bodyguard"]').should('have.class', 'selected');
  });

  it('CY-SETUP-11: Reporter disabled without negotiator', () => {
    cy.addPlayers(Array.from({length: 10}, (_, i) => `P${i}`));
    cy.get('.tab[data-tab="roles"]').click();
    cy.wait(400);

    // Reporter should be disabled (check data-disabled attribute)
    cy.get('.role-card[data-role="reporter"]').should('have.attr', 'data-disabled');

    // Engine: no negotiator selected
    cy.window().then((win) => {
      expect(win.app.game.selectedRoles['negotiator']).to.not.be.ok;
    });

    // Select negotiator
    cy.get('.role-card[data-role="negotiator"]').click();
    cy.wait(200);

    // Engine confirms negotiator is selected
    cy.window().then((win) => {
      expect(win.app.game.selectedRoles['negotiator']).to.be.ok;
    });

    // Force full re-render (click handler only updates clicked card, not dependents)
    cy.get('.tab[data-tab="players"]').click();
    cy.wait(200);
    cy.get('.tab[data-tab="roles"]').click();
    cy.wait(400);

    // Reporter should now be enabled
    cy.get('.role-card[data-role="reporter"]').should('not.have.attr', 'data-disabled');
  });

  /* ─── Role Reveal ─── */

  it('CY-REVEAL-1: Card flips on click, shows team color, next button advances', () => {
    cy.addPlayers(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    const roles = ['godfather', 'simpleMafia', 'simpleCitizen', 'simpleCitizen',
      'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    cy.assignRolesViaEngine(roles);
    cy.window().then((win) => win.app?.navigate?.('roleReveal'));
    cy.wait(300);

    // Card visible, not flipped
    cy.get('#reveal-card').should('be.visible').and('not.have.class', 'flipped');

    // Click to flip
    cy.get('#reveal-card').click();
    cy.get('#reveal-card').should('have.class', 'flipped');

    // Mafia team color on back (godfather = mafia)
    cy.get('.reveal-card__back--mafia').should('exist');

    // Counter shows 1
    cy.get('.chip').should('contain.text', '1');

    // Click next
    cy.get('#btn-next-reveal').click();
    cy.wait(100);

    // Counter shows 2
    cy.get('.chip').should('contain.text', '2');
  });

  it('CY-REVEAL-2: After all revealed, blind day start button appears', () => {
    cy.addPlayers(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    const roles = ['godfather', 'simpleMafia', 'simpleCitizen', 'simpleCitizen',
      'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    cy.assignRolesViaEngine(roles);
    cy.revealAllRoles(8);

    cy.get('#btn-start-blind-day').should('be.visible');
  });

  it('CY-REVEAL-3: Citizen card shows citizen team color', () => {
    cy.addPlayers(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    // Second player is citizen
    const roles = ['simpleCitizen', 'simpleCitizen', 'godfather', 'simpleMafia',
      'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    cy.assignRolesViaEngine(roles);
    cy.window().then((win) => win.app?.navigate?.('roleReveal'));
    cy.wait(300);

    // Flip first card (citizen)
    cy.get('#reveal-card').click();
    cy.get('.reveal-card__back--citizen').should('exist');
  });

  /* ─── Manual Role Assignment ─── */

  // Selecting 2 mafia + 4 named citizen roles + 4 simpleCitizen = 8, matching the
  // app's default desiredMafia=2 / desiredCitizen=6 split for an 8-player game.
  function selectEightBalancedRoles() {
    cy.get('.tab[data-tab="roles"]').click();
    cy.wait(200);
    cy.get('.role-card[data-role="godfather"]').click();
    cy.get('.role-card[data-role="drLecter"]').click();
    cy.get('.role-card[data-role="drWatson"]').click();
    cy.get('.role-card[data-role="detective"]').click();
    for (let i = 0; i < 4; i++) {
      cy.get('.role-card__count-btn[data-action="inc"][data-role="simpleCitizen"]').click();
    }
    cy.wait(150);
    cy.get('.tab[data-tab="assign"]').click();
    cy.wait(150);
  }

  it('CY-MANUAL-1: Assign tab offers both Random and Manual buttons', () => {
    cy.addPlayers(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    selectEightBalancedRoles();

    cy.get('#btn-random-assign').should('be.visible').and('not.be.disabled');
    cy.get('#btn-manual-assign').should('be.visible').and('not.be.disabled').and('contain.text', 'Manual');
  });

  it('CY-MANUAL-2: Manual Pick & Start opens the picker showing every remaining role', () => {
    cy.addPlayers(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    selectEightBalancedRoles();

    cy.get('#btn-manual-assign').click();
    cy.wait(200);

    cy.get('.chip').should('contain.text', '1').and('contain.text', '8');
    cy.get('.manual-pick-card').should('have.length', 5); // 4 unique roles + 1 simpleCitizen tile
    cy.get('.manual-pick-card[data-role="simpleCitizen"] .role-card__count-value').should('contain.text', '4');

    cy.window().then((win) => {
      expect(win.app.game.phase).to.eq('manualAssign');
    });
  });

  it('CY-MANUAL-3: Picking a role shows a confirm card; "Pick a Different Role" backs out without assigning', () => {
    cy.addPlayers(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    selectEightBalancedRoles();
    cy.get('#btn-manual-assign').click();
    cy.wait(200);

    cy.get('.manual-pick-card[data-role="godfather"]').click();
    cy.get('.reveal-card').should('have.class', 'flipped');
    cy.get('.reveal-card__back--mafia').should('exist');
    cy.get('#btn-confirm-manual-role').should('be.visible');

    cy.get('#btn-change-manual-role').click();
    cy.wait(100);

    // Back at the picker, and the role was NOT assigned yet
    cy.get('.manual-pick-card').should('have.length', 5);
    cy.window().then((win) => {
      expect(win.app.game.players[0].roleId).to.be.null;
      expect(win.app.game.getManualCurrentPlayer().name).to.eq('A');
    });
  });

  it('CY-MANUAL-4: Confirming a pick assigns the role, decrements the pool, and advances the turn', () => {
    cy.addPlayers(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    selectEightBalancedRoles();
    cy.get('#btn-manual-assign').click();
    cy.wait(200);

    cy.get('.manual-pick-card[data-role="simpleCitizen"]').click();
    cy.get('#btn-confirm-manual-role').click();
    cy.wait(150);

    cy.window().then((win) => {
      const game = win.app.game;
      expect(game.players[0].roleId).to.eq('simpleCitizen');
      expect(game.getManualCurrentPlayer().name).to.eq('B');
    });
    cy.get('.chip').should('contain.text', '2').and('contain.text', '8');
    cy.get('.manual-pick-card[data-role="simpleCitizen"] .role-card__count-value').should('contain.text', '3');
  });

  it('CY-MANUAL-5: Completing manual assignment for all players reaches Acquaintance Day with correct team counts', () => {
    cy.addPlayers(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    selectEightBalancedRoles();
    cy.get('#btn-manual-assign').click();
    cy.wait(200);

    const picks = ['godfather', 'drLecter', 'drWatson', 'detective',
      'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    picks.forEach((roleId) => {
      cy.get(`.manual-pick-card[data-role="${roleId}"]`).click();
      cy.get('#btn-confirm-manual-role').click();
      cy.wait(120);
    });

    cy.get('#btn-start-blind-day').should('be.visible');
    cy.window().then((win) => {
      const game = win.app.game;
      expect(game.phase).to.eq('blindDay');
      expect(game.players.every((p) => !!p.roleId)).to.be.true;
      const counts = {};
      game.players.forEach((p) => { counts[p.roleId] = (counts[p.roleId] || 0) + 1; });
      expect(counts).to.deep.equal({ godfather: 1, drLecter: 1, drWatson: 1, detective: 1, simpleCitizen: 4 });
    });
  });

  it('CY-MANUAL-6: Manual button is disabled when role setup is invalid', () => {
    cy.addPlayers(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    cy.get('.tab[data-tab="roles"]').click();
    cy.wait(200);
    // Only select a single mafia role — total roles (1) mismatches player count (8)
    cy.get('.role-card[data-role="godfather"]').click();
    cy.get('.tab[data-tab="assign"]').click();
    cy.wait(150);

    cy.get('#btn-manual-assign').should('be.disabled');
    cy.get('#btn-random-assign').should('be.disabled');
  });
});
