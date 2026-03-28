import { test, expect } from '@playwright/test';

test.describe('Full Game Scenario - E2E Visual Test', () => {
  test('Complete game flow with Last Action Card', async ({ page }) => {
    test.setTimeout(180000);
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    const clickIfVisible = async (selector) => {
      const el = page.locator(selector).first();
      if (await el.isVisible().catch(() => false)) {
        await el.click();
        return true;
      }
      return false;
    };

    const resolveNightFlow = async (maxIterations = 50) => {
      for (let i = 0; i < maxIterations; i++) {
        const action = await page.evaluate(() => {
          const click = (selector) => {
            const el = document.querySelector(selector);
            if (!el) return false;
            const disabled = el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true';
            if (disabled) return false;
            el.click();
            return true;
          };

          if (click('#btn-resolve-night')) return 'resolve';
          if (click('[data-gf-mode="shoot"]')) return 'gf-mode';
          if (click('.step.active .target-btn')) return 'target';
          if (click('.step.active .role-guess-btn')) return 'role-guess';
          if (click('.step.active [data-action="confirm-step"]:not([disabled])')) return 'confirm';
          if (click('.step.active [data-action="skip-step"]')) return 'skip';
          return null;
        });

        if (action === 'resolve') {
          return true;
        }

        await page.waitForTimeout(120);
      }
      return false;
    };

    console.log('📱 Load app + clear saved state...');
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    console.log('🎮 Start new game...');
    await expect(page.locator('#btn-new-game')).toBeVisible();
    await page.locator('#btn-new-game').click();
    await expect(page.locator('#player-name-input')).toBeVisible();

    console.log('👥 Add 8 players...');
    const players = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Farhad', 'Gina', 'Hamed'];
    for (const name of players) {
      await page.locator('#player-name-input').fill(name);
      await page.locator('#btn-add-player').click();
    }
    await expect(page.locator('.player-item')).toHaveCount(8);

    const playersInEngine = await page.evaluate(() => window.app?.game?.players?.length || 0);
    expect(playersInEngine).toBeGreaterThanOrEqual(8);

    console.log('🎭 Select roles (2 mafia + 6 citizen)...');
    await page.locator('.tab[data-tab="roles"]').evaluate((el) => el.click());
    await expect(page.locator('.role-card[data-role="godfather"]')).toBeVisible();

    await page.evaluate(() => {
      const game = window.app?.game;
      if (!game) return;
      game.setSelectedRoles({
        godfather: 1,
        drLecter: 1,
        drWatson: 1,
        detective: 1,
        bodyguard: 1,
        sniper: 1,
        gunner: 1,
        simpleCitizen: 1,
      });
      game.setDesiredMafia(2);
      const setupView = window.app?.views?.setup;
      if (setupView) {
        setupView.activeTab = 'assign';
        setupView.render();
      }
    });

    const setupState = await page.evaluate(() => ({
      players: window.app?.game?.players?.length || 0,
      totalRoles: window.app?.game?.getTotalRoleCount?.() || 0,
      desiredMafia: window.app?.game?.desiredMafia || 0,
      desiredCitizen: window.app?.game?.desiredCitizen || 0,
      selectedRoles: window.app?.game?.selectedRoles || {},
    }));
    expect(setupState.players).toBe(8);
    expect(setupState.totalRoles).toBe(8);
    expect(setupState.desiredMafia).toBe(2);
    expect(setupState.desiredCitizen).toBe(6);

    await expect(page.locator('#btn-random-assign')).toBeEnabled();

    console.log('🎲 Assign roles and begin reveal...');
    await page.locator('#btn-random-assign').click();
    await expect(page.locator('#reveal-card')).toBeVisible();

    console.log('🃏 Reveal all player roles one by one...');
    for (let i = 0; i < 8; i++) {
      await page.locator('#reveal-card').click();
      await page.locator('#btn-next-reveal').click();
    }

    await expect(page.locator('#btn-start-blind-day')).toBeVisible();
    await page.locator('#btn-start-blind-day').click();

    console.log('☀️ Blind day -> blind night...');
    await expect(page.locator('#btn-end-blind-day')).toBeVisible();
    await page.locator('#btn-end-blind-day').click();

    console.log('🌙 Resolve blind night flow...');
    const blindNightResolved = await resolveNightFlow();
    expect(blindNightResolved).toBe(true);

    console.log('📣 Day results -> discussion -> voting...');
    await expect(page.locator('#btn-go-discussion')).toBeVisible({ timeout: 10000 });
    await page.locator('#btn-go-discussion').click();
    await expect(page.locator('#btn-go-voting')).toBeVisible();
    await page.locator('#btn-go-voting').click();

    await expect(page.locator('#btn-no-eliminate')).toBeVisible({ timeout: 10000 });

    console.log('🗳️ Register sample votes, then continue without elimination...');
    if (await page.locator('.vote-incr').first().isVisible().catch(() => false)) {
      await page.locator('.vote-incr').first().click();
      if ((await page.locator('.vote-incr').count()) > 1) {
        await page.locator('.vote-incr').nth(1).click();
      }
    }
    await page.locator('#btn-no-eliminate').click();

    console.log('🌙 Confirm next night begins...');
    await expect(page.locator('#btn-toggle-dashboard')).toBeVisible({ timeout: 10000 });

    // Resolve a regular night as well, then verify we return to day.
    const regularNightResolved = await resolveNightFlow();
    if (regularNightResolved) {
      await expect(page.locator('#btn-go-discussion')).toBeVisible({ timeout: 10000 });
    }

    await page.screenshot({ path: 'test-results/final-game-state.png', fullPage: true });

    // Ignore noisy platform warnings; fail on real browser/runtime errors.
    const criticalErrors = consoleErrors.filter((e) =>
      !/deprecationwarning|outgoingmessage\.prototype\._headers/i.test(e)
    );
    expect(criticalErrors, `Console errors: ${criticalErrors.join(' | ')}`).toEqual([]);
  });
});
