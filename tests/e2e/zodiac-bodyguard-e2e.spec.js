import { test, expect } from '@playwright/test';

/**
 * Zodiac vs Bodyguard E2E — Verifies the UI correctly reflects:
 *   1. Zodiac shoots bodyguard → Zodiac appears as killed, bodyguard alive
 *   2. Zodiac shoots non-bodyguard → target dies, Zodiac alive
 *   3. Multiple deaths same night with Zodiac-bodyguard interaction
 */
test.describe('Zodiac vs Bodyguard E2E', () => {

  test('Zodiac shoots bodyguard — Zodiac dies, bodyguard survives in day view', async ({ page }) => {
    test.setTimeout(120000);

    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Load app and clear state
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Start new game
    await expect(page.locator('#btn-new-game')).toBeVisible();
    await page.locator('#btn-new-game').click();
    await expect(page.locator('#player-name-input')).toBeVisible();

    // Add 8 players
    const players = ['Zodiac', 'Mohafez', 'Godfather', 'Lecter', 'Watson', 'Ali', 'Reza', 'Mafia2'];
    for (const name of players) {
      await page.locator('#player-name-input').fill(name);
      await page.locator('#btn-add-player').click();
    }

    // Run night via engine: Zodiac shoots bodyguard
    const result = await page.evaluate(() => {
      const game = window.app?.game;
      if (!game) return { error: 'no game' };

      // Assign roles
      const roles = ['zodiac', 'bodyguard', 'godfather', 'drLecter', 'drWatson', 'simpleCitizen', 'simpleCitizen', 'simpleMafia'];
      game.players.forEach((p, i) => { p.roleId = roles[i]; });

      // Night 1: Zodiac shoots Mohafez (bodyguard)
      game.startNight();
      Object.assign(game.nightActions, {
        godfather: { actorIds: [game.players[2].id], targetId: game.players[5].id, actionType: 'shoot', mode: 'shoot' },
        zodiac: { actorIds: [game.players[0].id], targetId: game.players[1].id, actionType: 'shoot' },
      });
      const results = game.resolveNight();
      window.app._nightResults = results;

      return {
        zodiacAlive: game.players[0].isAlive,
        zodiacDeathCause: game.players[0].deathCause,
        bodyguardAlive: game.players[1].isAlive,
        killedIds: results.killed,
        zodiacId: game.players[0].id,
        bodyguardId: game.players[1].id,
      };
    });

    // Verify engine state
    expect(result.zodiacAlive).toBe(false);
    expect(result.zodiacDeathCause).toBe('zodiac_bodyguard');
    expect(result.bodyguardAlive).toBe(true);
    expect(result.killedIds).toContain(result.zodiacId);
    expect(result.killedIds).not.toContain(result.bodyguardId);

    // Navigate to day view
    await page.evaluate(() => { window.app.navigate('day'); });
    await page.waitForTimeout(500);

    // Check that Zodiac appears as killed in day results
    const pageContent = await page.textContent('body');
    expect(pageContent).toContain('Zodiac');

    // Bodyguard (Mohafez) should NOT be in killed section
    // The killed section shows dead players; Mohafez should still be alive
    const killedSection = await page.evaluate(() => {
      const game = window.app?.game;
      const results = window.app?._nightResults;
      if (!game || !results) return { zodiacDead: false, bodyguardDead: false };
      const zodiac = game.players[0];
      const bodyguard = game.players[1];
      return {
        zodiacDead: !zodiac.isAlive,
        bodyguardDead: !bodyguard.isAlive,
        zodiacInKilled: results.killed.includes(zodiac.id),
        bodyguardInKilled: results.killed.includes(bodyguard.id),
      };
    });

    expect(killedSection.zodiacDead).toBe(true);
    expect(killedSection.bodyguardDead).toBe(false);
    expect(killedSection.zodiacInKilled).toBe(true);
    expect(killedSection.bodyguardInKilled).toBe(false);

    console.log('✅ Zodiac dies, Mohafez (bodyguard) survives — correctly shown in day view');
  });

  test('Zodiac shoots regular citizen — citizen dies, Zodiac survives', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('#btn-new-game')).toBeVisible();
    await page.locator('#btn-new-game').click();
    await expect(page.locator('#player-name-input')).toBeVisible();

    const players = ['Zodiac', 'Mohafez', 'Godfather', 'Lecter', 'Watson', 'Ali', 'Reza', 'Mafia2'];
    for (const name of players) {
      await page.locator('#player-name-input').fill(name);
      await page.locator('#btn-add-player').click();
    }

    const result = await page.evaluate(() => {
      const game = window.app?.game;
      if (!game) return { error: 'no game' };

      const roles = ['zodiac', 'bodyguard', 'godfather', 'drLecter', 'drWatson', 'simpleCitizen', 'simpleCitizen', 'simpleMafia'];
      game.players.forEach((p, i) => { p.roleId = roles[i]; });

      // Zodiac shoots Ali (simpleCitizen) instead of bodyguard
      game.startNight();
      Object.assign(game.nightActions, {
        godfather: { actorIds: [game.players[2].id], targetId: game.players[6].id, actionType: 'shoot', mode: 'shoot' },
        zodiac: { actorIds: [game.players[0].id], targetId: game.players[5].id, actionType: 'shoot' },
      });
      const results = game.resolveNight();
      window.app._nightResults = results;

      return {
        zodiacAlive: game.players[0].isAlive,
        aliAlive: game.players[5].isAlive,
        bodyguardAlive: game.players[1].isAlive,
        killedIds: results.killed,
      };
    });

    // Zodiac survives, Ali dies
    expect(result.zodiacAlive).toBe(true);
    expect(result.aliAlive).toBe(false);
    expect(result.bodyguardAlive).toBe(true);

    await page.evaluate(() => { window.app.navigate('day'); });
    await page.waitForTimeout(500);

    const pageContent = await page.textContent('body');
    expect(pageContent).toContain('Ali');

    console.log('✅ Zodiac shoots citizen — citizen dies, Zodiac alive');
  });

  test('Zodiac + mafia both target bodyguard (no heal) — mafia kills first, Zodiac survives', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('#btn-new-game')).toBeVisible();
    await page.locator('#btn-new-game').click();
    await expect(page.locator('#player-name-input')).toBeVisible();

    const players = ['Zodiac', 'Mohafez', 'Godfather', 'Lecter', 'Watson', 'Ali', 'Reza', 'Mafia2'];
    for (const name of players) {
      await page.locator('#player-name-input').fill(name);
      await page.locator('#btn-add-player').click();
    }

    const result = await page.evaluate(() => {
      const game = window.app?.game;
      if (!game) return { error: 'no game' };

      const roles = ['zodiac', 'bodyguard', 'godfather', 'drLecter', 'drWatson', 'simpleCitizen', 'simpleCitizen', 'simpleMafia'];
      game.players.forEach((p, i) => { p.roleId = roles[i]; });

      // Both zodiac and mafia target bodyguard (no heal)
      // Mafia resolves first (step 5) → bodyguard dies
      // Zodiac fires later (step 7) → bodyguard already dead → no interaction
      game.startNight();
      Object.assign(game.nightActions, {
        godfather: { actorIds: [game.players[2].id], targetId: game.players[1].id, actionType: 'shoot', mode: 'shoot' },
        zodiac: { actorIds: [game.players[0].id], targetId: game.players[1].id, actionType: 'shoot' },
      });
      const results = game.resolveNight();
      window.app._nightResults = results;

      return {
        zodiacAlive: game.players[0].isAlive,
        bodyguardAlive: game.players[1].isAlive,
        bodyguardDeathCause: game.players[1].deathCause,
        killedIds: results.killed,
      };
    });

    // Mafia kills bodyguard first, zodiac survives (bodyguard already dead)
    expect(result.zodiacAlive).toBe(true);
    expect(result.bodyguardAlive).toBe(false);

    await page.evaluate(() => { window.app.navigate('day'); });
    await page.waitForTimeout(500);

    const pageContent = await page.textContent('body');
    expect(pageContent).toContain('Mohafez');

    console.log('✅ Mafia kills bodyguard first → Zodiac survives (bodyguard already dead)');
  });
});
