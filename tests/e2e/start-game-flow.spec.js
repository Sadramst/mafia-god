import { test, expect } from '@playwright/test';

async function setupEightPlayersAndRoles(page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await page.waitForLoadState('domcontentloaded');

  await expect(page.locator('#btn-new-game')).toBeVisible();
  await page.locator('#btn-new-game').click();
  await expect(page.locator('#player-name-input')).toBeVisible();

  const names = ['Ali', 'Reza', 'Sara', 'Mina', 'Omid', 'Nima', 'Tara', 'Kian'];
  for (const name of names) {
    await page.locator('#player-name-input').fill(name);
    await page.locator('#btn-add-player').click();
  }
  await expect(page.locator('.player-item')).toHaveCount(8);

  await page.locator('.tab[data-tab="roles"]').click();
  await expect(page.locator('.role-card[data-role="godfather"]')).toBeVisible();

  for (const roleId of ['godfather', 'drLecter', 'drWatson', 'detective', 'sniper']) {
    await page.locator(`.role-card[data-role="${roleId}"]`).click();
  }
  for (let i = 0; i < 3; i++) {
    await page.locator('.role-card[data-role="simpleCitizen"] [data-action="inc"]').click();
  }

  await page.locator('.tab[data-tab="assign"]').click();
  return names.length;
}

async function completeBlindDayAndBlindNight(page) {
  await expect(page.locator('#btn-start-blind-day')).toBeVisible();
  await page.locator('#btn-start-blind-day').click();

  await expect(page.locator('#btn-end-blind-day')).toBeVisible();
  await page.locator('#btn-end-blind-day').click();

  // Blind night: confirm mafiaReveal step, then resolve blind night -> Day 1
  await expect(page.locator('.step.active [data-action="confirm-step"]')).toBeVisible();
  await page.locator('.step.active [data-action="confirm-step"]').click();

  await expect(page.locator('#btn-resolve-night')).toBeVisible();
  await page.locator('#btn-resolve-night').click();

  await expect.poll(async () => {
    return page.evaluate(() => ({
      phase: window.app?.game?.phase,
      route: window.app?.currentRoute,
    }));
  }).toEqual({ phase: 'day', route: 'day' });
}

test.describe('Start Game Flow — Random, Manual Visible, Manual Blind', () => {
  test('Random assignment transitions cleanly through reveal to Day 1', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    const total = await setupEightPlayersAndRoles(page);
    await expect(page.locator('#btn-random-assign')).toBeEnabled();
    await page.locator('#btn-random-assign').click();

    for (let i = 0; i < total; i++) {
      await expect(page.locator('#reveal-card')).toBeVisible();
      await page.locator('#reveal-card').click();
      await expect(page.locator('#btn-next-reveal')).toBeVisible();
      await page.locator('#btn-next-reveal').click();
    }

    await completeBlindDayAndBlindNight(page);
    expect(pageErrors).toEqual([]);
  });

  test('Manual visible assignment transitions cleanly through completion to Day 1', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    const total = await setupEightPlayersAndRoles(page);
    await expect(page.locator('#btn-manual-assign')).toBeEnabled();
    await page.locator('#btn-manual-assign').click();

    for (let i = 0; i < total; i++) {
      await expect(page.locator('.manual-pick-card').first()).toBeVisible();
      await page.locator('.manual-pick-card').first().click();
      await expect(page.locator('#btn-confirm-manual-role')).toBeVisible();
      await page.locator('#btn-confirm-manual-role').click();
    }

    await completeBlindDayAndBlindNight(page);
    expect(pageErrors).toEqual([]);
  });

  test('Manual blind-pick assignment transitions cleanly through completion to Day 1', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    const total = await setupEightPlayersAndRoles(page);
    await page.locator('#btn-manual-visibility-off').click();
    await expect(page.locator('#btn-manual-assign')).toBeEnabled();
    await page.locator('#btn-manual-assign').click();

    for (let i = 0; i < total; i++) {
      await expect(page.locator('.manual-pick-card--blind').first()).toBeVisible();
      await page.locator('.manual-pick-card--blind').first().click();
      await expect(page.locator('#btn-confirm-manual-role')).toBeVisible();
      await page.locator('#btn-confirm-manual-role').click();
    }

    await completeBlindDayAndBlindNight(page);
    expect(pageErrors).toEqual([]);
  });
});
