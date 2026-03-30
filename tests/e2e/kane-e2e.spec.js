import { test, expect } from '@playwright/test';

/**
 * Kane E2E — Citizen Kane functionality via engine injection
 *
 * Tests the Kane reveal through the UI by directly manipulating the game engine,
 * then verifying the UI displays correctly for each scenario:
 *   1. Kane targets mafia → reveal shown in day results, Kane dies next night
 *   2. Kane targets citizen → no reveal
 *   3. Kane target dies same night → ability returns
 */
test.describe('Kane — Citizen Kane E2E', () => {

  /* ──── Helpers ──── */

  /** Click via DOM evaluation to avoid overlay interception */
  const domClick = async (page, selector) => {
    return page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el || el.hasAttribute('disabled')) return false;
      el.click();
      return true;
    }, selector);
  };

  /** Resolve all night-phase steps via DOM clicks */
  const resolveNightFlow = async (page, maxIter = 100) => {
    for (let i = 0; i < maxIter; i++) {
      const action = await page.evaluate(() => {
        const click = (sel) => {
          const el = document.querySelector(sel);
          if (!el || el.hasAttribute('disabled')) return false;
          el.click();
          return true;
        };
        if (click('#btn-resolve-night')) return 'resolve';
        if (click('[data-gf-mode="shoot"].btn--ghost')) return 'gf-mode';
        if (click('.step.active [data-action="confirm-step"]:not([disabled])')) return 'confirm';
        if (click('.step.active [data-bomb-pass].btn--ghost')) return 'bomb-pass';
        if (click('.step.active [data-gunner-assign]')) return 'gunner-assign';
        if (!document.querySelector('.step.active [data-gunner-assign]')) {
          if (click('.step.active [data-gunner-type].btn--ghost:not([disabled])')) return 'gunner-type';
        }
        if (click('.step.active .role-guess-btn:not(.selected)')) return 'role-guess';
        if (!document.querySelector('.step.active .target-btn.selected')) {
          if (click('.step.active .target-btn[data-target]')) return 'target';
        }
        if (click('.step.active [data-action="skip-step"]')) return 'skip';
        return null;
      });
      if (action === 'resolve') return true;
      await page.waitForTimeout(150);
    }
    return false;
  };

  /** Setup a game with 8 players and specific role assignments */
  const setupGame = async (page, roleMap) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Start new game
    await expect(page.locator('#btn-new-game')).toBeVisible();
    await page.locator('#btn-new-game').click();
    await expect(page.locator('#player-name-input')).toBeVisible();

    // Add players
    const names = Object.keys(roleMap);
    for (const name of names) {
      await page.locator('#player-name-input').fill(name);
      await page.locator('#btn-add-player').click();
    }

    // Assign roles directly via engine
    await page.evaluate((rm) => {
      const game = window.app?.game;
      if (!game) return;
      const names = Object.keys(rm);
      game.players.forEach((p, i) => {
        p.roleId = rm[names[i]];
        const roleDef = window.app.game.constructor.name; // just force import
      });
      // Init shields for roles that have them
      game.players.forEach(p => {
        const allRoles = {};
        // Get Roles from module
        const roleMap = game.players;
      });
    }, roleMap);

    // Use a more reliable approach: inject roles and start game through evaluate
    await page.evaluate((rm) => {
      const game = window.app?.game;
      if (!game) return;
      const Roles = game._getRolesRegistry?.() || null;
      const names = Object.keys(rm);
      game.players.forEach((p, i) => {
        p.roleId = rm[names[i]];
      });
      game.phase = 'night';
      game.round = 1;
    }, roleMap);
  };

  test('Kane reveals mafia target — reveal shown in day view', async ({ page }) => {
    test.setTimeout(120000);

    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    /* Setup: 8 players, manually assign roles + run night via engine */
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('#btn-new-game')).toBeVisible();
    await page.locator('#btn-new-game').click();
    await expect(page.locator('#player-name-input')).toBeVisible();

    // Add 8 players
    const players = ['Ali', 'Babak', 'Cyrus', 'Dara', 'Ebi', 'Farhad', 'Gita', 'Hamed'];
    for (const name of players) {
      await page.locator('#player-name-input').fill(name);
      await page.locator('#btn-add-player').click();
    }

    // Set roles and start game through engine
    const kaneResult = await page.evaluate(() => {
      const game = window.app?.game;
      if (!game) return { error: 'no game' };

      // Assign roles: Ali=kane, Babak=godfather, Cyrus=drLecter, Dara=drWatson,
      // Ebi=detective, Farhad=simpleCitizen, Gita=simpleCitizen, Hamed=simpleMafia
      const roles = ['kane', 'godfather', 'drLecter', 'drWatson', 'detective', 'simpleCitizen', 'simpleCitizen', 'simpleMafia'];
      game.players.forEach((p, i) => { p.roleId = roles[i]; });

      // Start night and resolve with Kane targeting Hamed (simpleMafia)
      game.startNight();
      Object.assign(game.nightActions, {
        godfather: { actorIds: [game.players[1].id], targetId: game.players[5].id, actionType: 'shoot', mode: 'shoot' },
        kane: { actorIds: [game.players[0].id], targetId: game.players[7].id, actionType: 'kaneReveal' },
      });
      const results = game.resolveNight();

      // Store results for day view
      window.app._nightResults = results;

      return {
        kaneReveal: results.kaneReveal,
        kanePendingDeath: game._kanePendingDeath,
        kaneUsed: game._kaneUsed,
        hamedAlive: game.players[7].isAlive,
      };
    });

    // Verify engine state
    expect(kaneResult.kaneReveal).toBeTruthy();
    expect(kaneResult.kaneReveal.targetName).toBe('Hamed');
    expect(kaneResult.kanePendingDeath).toBe(true);
    expect(kaneResult.kaneUsed).toBe(true);
    expect(kaneResult.hamedAlive).toBe(true); // Hamed survived (mafia, not targeted for kill)

    // Navigate to day view to see the kane reveal announcement
    await page.evaluate(() => { window.app.navigate('day'); });
    await page.waitForTimeout(500);

    // Check that kane reveal card is visible in the day results
    const pageContent = await page.textContent('body');
    expect(pageContent).toContain('Hamed');

    // Verify kane reveal banner is present (either localized text)
    const hasKaneLabel = pageContent.includes('Kane') || pageContent.includes('کین');
    expect(hasKaneLabel).toBe(true);

    console.log('✅ Kane mafia reveal displayed in day view');
  });

  test('Kane targets citizen — no reveal shown', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('#btn-new-game')).toBeVisible();
    await page.locator('#btn-new-game').click();
    await expect(page.locator('#player-name-input')).toBeVisible();

    const players = ['Ali', 'Babak', 'Cyrus', 'Dara', 'Ebi', 'Farhad', 'Gita', 'Hamed'];
    for (const name of players) {
      await page.locator('#player-name-input').fill(name);
      await page.locator('#btn-add-player').click();
    }

    const result = await page.evaluate(() => {
      const game = window.app?.game;
      if (!game) return { error: 'no game' };

      const roles = ['kane', 'godfather', 'drLecter', 'drWatson', 'detective', 'simpleCitizen', 'simpleCitizen', 'simpleMafia'];
      game.players.forEach((p, i) => { p.roleId = roles[i]; });

      // Kane targets Dara (drWatson = citizen team) who survives
      game.startNight();
      Object.assign(game.nightActions, {
        godfather: { actorIds: [game.players[1].id], targetId: game.players[5].id, actionType: 'shoot', mode: 'shoot' },
        kane: { actorIds: [game.players[0].id], targetId: game.players[3].id, actionType: 'kaneReveal' },
      });
      const results = game.resolveNight();
      window.app._nightResults = results;

      return {
        kaneReveal: results.kaneReveal,
        kanePendingDeath: game._kanePendingDeath,
        kaneUsed: game._kaneUsed,
        daraAlive: game.players[3].isAlive,
      };
    });

    expect(result.kaneReveal).toBeNull();
    expect(result.kanePendingDeath).toBe(false);
    expect(result.kaneUsed).toBe(true);
    expect(result.daraAlive).toBe(true);

    // Navigate to day and confirm NO kane reveal card
    await page.evaluate(() => { window.app.navigate('day'); });
    await page.waitForTimeout(500);

    // The kane reveal styled card should NOT be present
    const kaneRevealCard = await page.locator('[style*="border-color: var(--warning)"]').count();
    expect(kaneRevealCard).toBe(0);

    console.log('✅ No kane reveal for citizen target');
  });

  test('Kane target dies same night — ability returns', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('#btn-new-game')).toBeVisible();
    await page.locator('#btn-new-game').click();
    await expect(page.locator('#player-name-input')).toBeVisible();

    const players = ['Ali', 'Babak', 'Cyrus', 'Dara', 'Ebi', 'Farhad', 'Gita', 'Hamed'];
    for (const name of players) {
      await page.locator('#player-name-input').fill(name);
      await page.locator('#btn-add-player').click();
    }

    const result = await page.evaluate(() => {
      const game = window.app?.game;
      if (!game) return { error: 'no game' };

      const roles = ['kane', 'godfather', 'drLecter', 'drWatson', 'detective', 'simpleCitizen', 'simpleCitizen', 'simpleMafia'];
      game.players.forEach((p, i) => { p.roleId = roles[i]; });

      // Kane targets Farhad (simpleCitizen) who also gets killed by godfather
      game.startNight();
      Object.assign(game.nightActions, {
        godfather: { actorIds: [game.players[1].id], targetId: game.players[5].id, actionType: 'shoot', mode: 'shoot' },
        kane: { actorIds: [game.players[0].id], targetId: game.players[5].id, actionType: 'kaneReveal' },
      });
      const results = game.resolveNight();
      window.app._nightResults = results;

      return {
        kaneReveal: results.kaneReveal,
        kanePendingDeath: game._kanePendingDeath,
        kaneUsed: game._kaneUsed,
        farhadAlive: game.players[5].isAlive,
      };
    });

    // Target died → ability returns
    expect(result.farhadAlive).toBe(false);
    expect(result.kaneUsed).toBe(false);
    expect(result.kanePendingDeath).toBe(false);

    console.log('✅ Kane ability returned after target died same night');
  });

  test('Kane dies next night after successful reveal', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('#btn-new-game')).toBeVisible();
    await page.locator('#btn-new-game').click();
    await expect(page.locator('#player-name-input')).toBeVisible();

    const players = ['Ali', 'Babak', 'Cyrus', 'Dara', 'Ebi', 'Farhad', 'Gita', 'Hamed'];
    for (const name of players) {
      await page.locator('#player-name-input').fill(name);
      await page.locator('#btn-add-player').click();
    }

    const result = await page.evaluate(() => {
      const game = window.app?.game;
      if (!game) return { error: 'no game' };

      const roles = ['kane', 'godfather', 'drLecter', 'drWatson', 'detective', 'simpleCitizen', 'simpleCitizen', 'simpleMafia'];
      game.players.forEach((p, i) => { p.roleId = roles[i]; });

      // Night 1: Kane reveals Hamed (simpleMafia) successfully
      game.startNight();
      Object.assign(game.nightActions, {
        godfather: { actorIds: [game.players[1].id], targetId: game.players[5].id, actionType: 'shoot', mode: 'shoot' },
        kane: { actorIds: [game.players[0].id], targetId: game.players[7].id, actionType: 'kaneReveal' },
      });
      game.resolveNight();

      const afterNight1 = {
        kaneAlive: game.players[0].isAlive,
        kanePendingDeath: game._kanePendingDeath,
      };

      // Night 2: Kane should die at start of resolution
      game.startNight();
      Object.assign(game.nightActions, {
        godfather: { actorIds: [game.players[1].id], targetId: game.players[6].id, actionType: 'shoot', mode: 'shoot' },
      });
      const results2 = game.resolveNight();
      window.app._nightResults = results2;

      return {
        afterNight1,
        kaneAliveAfterNight2: game.players[0].isAlive,
        kaneInKilled: results2.killed.includes(game.players[0].id),
        kaneDeathCause: game.players[0].deathCause,
        kaneRevivable: game.players[0].isRevivable,
      };
    });

    // After night 1, Kane is still alive with pending death
    expect(result.afterNight1.kaneAlive).toBe(true);
    expect(result.afterNight1.kanePendingDeath).toBe(true);

    // After night 2, Kane is dead via sacrifice
    expect(result.kaneAliveAfterNight2).toBe(false);
    expect(result.kaneInKilled).toBe(true);
    expect(result.kaneDeathCause).toBe('kane_sacrifice');
    expect(result.kaneRevivable).toBe(false);

    // Navigate to day view and verify kane death is shown
    await page.evaluate(() => { window.app.navigate('day'); });
    await page.waitForTimeout(500);

    const dayContent = await page.textContent('body');
    // Ali (Kane) should appear as killed
    expect(dayContent).toContain('Ali');

    console.log('✅ Kane dies next night after successful reveal, not revivable');
  });
});
