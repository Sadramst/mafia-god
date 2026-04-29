// Cypress E2E support file — custom commands for Mafia God testing

// ─── Clear storage & reload ───
Cypress.Commands.add('freshLoad', () => {
  cy.visit('/', {
    onBeforeLoad(win) {
      win.localStorage.clear();
      win.sessionStorage.clear();
      // Delete all caches to prevent service worker from serving stale files
      if (win.caches) {
        win.caches.keys().then((names) => {
          names.forEach((name) => win.caches.delete(name));
        });
      }
      // Unregister service workers
      if (win.navigator && win.navigator.serviceWorker) {
        win.navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((r) => r.unregister());
        });
      }
    },
  });
  cy.get('body').should('be.visible');
});

// ─── Add N players ───
Cypress.Commands.add('addPlayers', (names) => {
  cy.get('#btn-new-game').should('be.visible').click();
  cy.get('#player-name-input').should('be.visible');
  names.forEach((name) => {
    cy.get('#player-name-input').clear().type(name);
    cy.get('#btn-add-player').click();
  });
  cy.get('.player-item').should('have.length', names.length);
});

// ─── Inject roles via engine then go to roleReveal ───
Cypress.Commands.add('assignRolesViaEngine', (roleList) => {
  cy.window().then((win) => {
    const game = win.app?.game;
    if (!game) throw new Error('Game not initialized');
    const counts = {};
    roleList.forEach((r) => { counts[r] = (counts[r] || 0) + 1; });
    game.selectedRoles = counts;
    const RolesMap = win.app?.Roles || null;
    game.players.forEach((p, i) => {
      p.roleId = roleList[i];
      if (RolesMap) {
        const def = RolesMap.get(roleList[i]);
        if (def) p.initShield(def);
      }
    });
    const fmIndex = roleList.indexOf('freemason');
    if (fmIndex >= 0) game.framason.init(game.players[fmIndex].id, game.framasonMaxMembers);
    if (roleList.includes('gunner')) game.bulletManager.init(game.gunnerBlankMax, game.gunnerLiveMax);
    if (!roleList.includes('jack')) {
      game.lastActionManager?.cards?.forEach((c) => { if (c.id === 4) c.used = true; });
    }
    game.phase = 'roleReveal';
  });
});

// ─── Reveal all roles quickly ───
Cypress.Commands.add('revealAllRoles', (count) => {
  cy.window().then((win) => win.app?.navigate?.('roleReveal'));
  cy.wait(200);
  for (let i = 0; i < count; i++) {
    cy.document().then((doc) => doc.querySelector('#reveal-card')?.click());
    cy.wait(50);
    cy.document().then((doc) => doc.querySelector('#btn-next-reveal')?.click());
    cy.wait(50);
  }
  cy.wait(200);
});

// ─── Skip blind day + blind night ───
Cypress.Commands.add('doBlindDayNight', () => {
  cy.document().then((doc) => doc.querySelector('#btn-start-blind-day')?.click());
  cy.wait(100);
  cy.document().then((doc) => doc.querySelector('#btn-end-blind-day')?.click());
  cy.wait(100);
});

// ─── Resolve all night steps automatically ───
Cypress.Commands.add('resolveNightFlow', () => {
  const maxIter = 80;
  function clickNext(i) {
    if (i >= maxIter) return;
    cy.document().then((doc) => {
      const click = (sel) => {
        const el = doc.querySelector(sel);
        if (!el || el.hasAttribute('disabled')) return false;
        el.click();
        return true;
      };
      if (click('#btn-resolve-night')) return; // done
      if (click('[data-gf-mode="shoot"].btn--ghost')) { cy.wait(60); clickNext(i + 1); return; }
      if (click('.step.active [data-action="confirm-step"]:not([disabled])')) { cy.wait(60); clickNext(i + 1); return; }
      if (click('.step.active [data-bomb-pass].btn--ghost')) { cy.wait(60); clickNext(i + 1); return; }
      if (click('.step.active [data-gunner-assign]')) { cy.wait(60); clickNext(i + 1); return; }
      if (!doc.querySelector('.step.active [data-gunner-assign]')) {
        if (click('.step.active [data-gunner-type].btn--ghost:not([disabled])')) { cy.wait(60); clickNext(i + 1); return; }
      }
      if (click('.step.active .role-guess-btn:not(.selected)')) { cy.wait(60); clickNext(i + 1); return; }
      if (!doc.querySelector('.step.active .target-btn.selected')) {
        if (click('.step.active .target-btn[data-target]')) { cy.wait(60); clickNext(i + 1); return; }
      }
      if (click('.step.active [data-action="skip-step"]')) { cy.wait(60); clickNext(i + 1); return; }
      cy.wait(60);
      clickNext(i + 1);
    });
  }
  clickNext(0);
});

// ─── Full bootstrap: load → addPlayers → assignRoles → reveal → blindDayNight → nightFlow ───
Cypress.Commands.add('bootstrapGame', (names, roles) => {
  cy.freshLoad();
  cy.addPlayers(names);
  cy.assignRolesViaEngine(roles);
  cy.revealAllRoles(names.length);
  cy.doBlindDayNight();
  cy.resolveNightFlow();
});

// ─── Exhaust all last action cards ───
Cypress.Commands.add('exhaustLastActions', () => {
  cy.window().then((win) => {
    win.app?.game?.lastActionManager?.cards?.forEach((c) => { c.used = true; });
  });
});

// ─── Navigate to day discussion then voting ───
Cypress.Commands.add('goToDiscussion', () => {
  cy.document().then((doc) => doc.querySelector('#btn-go-discussion')?.click());
  cy.wait(200);
});

Cypress.Commands.add('goToVoting', () => {
  cy.document().then((doc) => doc.querySelector('#btn-go-voting')?.click());
  cy.wait(200);
});
