import { test, expect } from '@playwright/test';

/**
 * Cowboy & Negotiator E2E — Visual tests for cowboy and negotiator bug fixes:
 *
 * CB-E2E-1: Cowboy targets Jack → cowboy dies, Jack survives, role announced
 * CB-E2E-2: Cowboy targets mafia → both die, side announced, cowboy not revivable
 * CB-E2E-3: Cowboy targets citizen → both die, citizen revivable
 * NG-E2E-1: Negotiate + kill mutually exclusive, recruit works
 */
test.describe('Cowboy & Negotiator E2E — Regression Tests', () => {

  const domClick = async (page, selector) => {
    return page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el || el.hasAttribute('disabled')) return false;
      el.click();
      return true;
    }, selector);
  };

  test('CB-E2E-1: Cowboy targets Jack — cowboy dies, Jack survives, role announced', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('#btn-new-game')).toBeVisible();
    await page.locator('#btn-new-game').click();
    await expect(page.locator('#player-name-input')).toBeVisible();

    const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Hank'];
    for (const name of names) {
      await page.locator('#player-name-input').fill(name);
      await page.locator('#btn-add-player').click();
    }

    // Inject roles and go through setup
    const result = await page.evaluate(() => {
      const game = window.app?.game;
      if (!game) return { error: 'no game' };

      const roles = ['godfather', 'simpleMafia', 'cowboy', 'jack', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
      game.players.forEach((p, i) => {
        p.roleId = roles[i];
      });

      // Start game phases
      game.phase = 'night';
      game.startNight();
      game.nightActions = {};
      game.resolveNight();
      game.startDay();

      // Find cowboy and jack
      const cowboy = game.players.find(p => p.roleId === 'cowboy');
      const jack = game.players.find(p => p.roleId === 'jack');

      // Execute cowboy action on jack
      const res = game.resolveCowboyAction(jack.id);

      return {
        cowboyAlive: cowboy.isAlive,
        jackAlive: jack.isAlive,
        jackCurseLocked: jack.curse.isLocked,
        cowboyRevivable: cowboy.isRevivable,
        side: res.side,
        targetRoleName: res.targetRoleName,
        cowboyDied: res.cowboyDied,
        killed: res.killed,
      };
    });

    expect(result.cowboyAlive).toBe(false);
    expect(result.jackAlive).toBe(true);
    expect(result.jackCurseLocked).toBe(true);
    expect(result.cowboyRevivable).toBe(false);
    expect(result.side).toBe('jack');
    expect(result.targetRoleName).toBeTruthy();
    expect(result.cowboyDied).toBe(true);
    expect(result.killed).toBe(false);
  });

  test('CB-E2E-2: Cowboy targets mafia — both die, side announced, cowboy not revivable', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('#btn-new-game')).toBeVisible();
    await page.locator('#btn-new-game').click();
    await expect(page.locator('#player-name-input')).toBeVisible();

    const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Hank'];
    for (const name of names) {
      await page.locator('#player-name-input').fill(name);
      await page.locator('#btn-add-player').click();
    }

    const result = await page.evaluate(() => {
      const game = window.app?.game;
      if (!game) return { error: 'no game' };

      const roles = ['godfather', 'simpleMafia', 'cowboy', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
      game.players.forEach((p, i) => { p.roleId = roles[i]; });

      game.phase = 'night';
      game.startNight();
      game.nightActions = {};
      game.resolveNight();
      game.startDay();

      const cowboy = game.players.find(p => p.roleId === 'cowboy');
      const mafia = game.players.find(p => p.roleId === 'simpleMafia');

      const res = game.resolveCowboyAction(mafia.id);

      const revivable = game.getRevivablePlayers();
      const cowboyInRevivable = revivable.some(rp => rp.id === cowboy.id);
      const mafiaInRevivable = revivable.some(rp => rp.id === mafia.id);

      return {
        cowboyAlive: cowboy.isAlive,
        mafiaAlive: mafia.isAlive,
        cowboyRevivable: cowboy.isRevivable,
        mafiaRevivable: mafia.isRevivable,
        cowboyInRevivableList: cowboyInRevivable,
        mafiaInRevivableList: mafiaInRevivable,
        side: res.side,
        targetRoleName: res.targetRoleName,
        cowboyDied: res.cowboyDied,
        killed: res.killed,
      };
    });

    expect(result.cowboyAlive).toBe(false);
    expect(result.mafiaAlive).toBe(false);
    expect(result.cowboyRevivable).toBe(false);
    expect(result.mafiaRevivable).toBe(true);
    expect(result.cowboyInRevivableList).toBe(false);
    expect(result.mafiaInRevivableList).toBe(true);
    expect(result.side).toBe('mafia');
    expect(result.targetRoleName).toBeNull();
    expect(result.cowboyDied).toBe(true);
  });

  test('CB-E2E-3: Cowboy targets citizen — both die, citizen revivable by Constantine', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('#btn-new-game')).toBeVisible();
    await page.locator('#btn-new-game').click();
    await expect(page.locator('#player-name-input')).toBeVisible();

    const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Hank'];
    for (const name of names) {
      await page.locator('#player-name-input').fill(name);
      await page.locator('#btn-add-player').click();
    }

    const result = await page.evaluate(() => {
      const game = window.app?.game;
      if (!game) return { error: 'no game' };

      const roles = ['godfather', 'simpleMafia', 'cowboy', 'constantine', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
      game.players.forEach((p, i) => { p.roleId = roles[i]; });

      game.phase = 'night';
      game.startNight();
      game.nightActions = {};
      game.resolveNight();
      game.startDay();

      const cowboy = game.players.find(p => p.roleId === 'cowboy');
      const citizen = game.players.find(p => p.roleId === 'simpleCitizen');

      const res = game.resolveCowboyAction(citizen.id);

      return {
        cowboyAlive: cowboy.isAlive,
        citizenAlive: citizen.isAlive,
        citizenRevivable: citizen.isRevivable,
        cowboyRevivable: cowboy.isRevivable,
        side: res.side,
        cowboyDied: res.cowboyDied,
      };
    });

    expect(result.cowboyAlive).toBe(false);
    expect(result.citizenAlive).toBe(false);
    expect(result.citizenRevivable).toBe(true);
    expect(result.cowboyRevivable).toBe(false);
    expect(result.side).toBe('citizen');
    expect(result.cowboyDied).toBe(true);
  });

  test('NG-E2E-1: Negotiate + kill mutually exclusive, recruit works', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('#btn-new-game')).toBeVisible();
    await page.locator('#btn-new-game').click();
    await expect(page.locator('#player-name-input')).toBeVisible();

    const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Hank'];
    for (const name of names) {
      await page.locator('#player-name-input').fill(name);
      await page.locator('#btn-add-player').click();
    }

    const result = await page.evaluate(() => {
      const game = window.app?.game;
      if (!game) return { error: 'no game' };

      const roles = ['godfather', 'negotiator', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
      game.players.forEach((p, i) => { p.roleId = roles[i]; });
      game.negotiatorThreshold = 3;

      game.phase = 'night';
      game.startNight();

      const neg = game.players.find(p => p.roleId === 'negotiator');
      const gf = game.players.find(p => p.roleId === 'godfather');
      const target1 = game.players[2]; // simpleCitizen
      const target2 = game.players[3]; // another simpleCitizen

      game.nightActions = {
        negotiator: { actorIds: [neg.id], targetId: target1.id, actionType: 'negotiate' },
        godfather: { actorIds: [gf.id], targetId: target2.id, actionType: 'kill', mode: 'shoot' },
      };

      const results = game.resolveNight();

      return {
        negotiatedSuccess: results.negotiated?.success,
        targetNewRole: target1.roleId,
        target2Alive: target2.isAlive,
        target1Alive: target1.isAlive,
      };
    });

    expect(result.negotiatedSuccess).toBe(true);
    expect(result.targetNewRole).toBe('simpleMafia');
    expect(result.target2Alive).toBe(true); // Kill was skipped
    expect(result.target1Alive).toBe(true); // Recruit is alive
  });
});
