import { test, expect } from '@playwright/test';

/**
 * Victory & Chaos E2E — Visual tests for:
 *   E2E-V1: Mafia victory screen (no independent, mafia >= citizen)
 *   E2E-V2: Chaos UI triggers at 3 alive (1M+2C)
 *   E2E-V3: Jack auto-wins in chaos → immediate independent win screen
 *   E2E-V4: Chaos handshake — citizen+citizen → citizen wins
 *   E2E-V5: Chaos handshake — citizen+mafia → mafia wins
 *   E2E-V6: Chaos handshake — citizen+zodiac → independent wins
 *   E2E-V7: 2M+1C no independent → mafia wins (no chaos screen)
 *
 * Uses page.evaluate() for direct engine manipulation + visual verification.
 */
test.describe('Victory & Chaos E2E', () => {

  /* ──── Shared Helpers ──── */

  /** Load app and clear state */
  const initApp = async (page) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
  };

  /** Start new game and add players by name */
  const addPlayers = async (page, names) => {
    await expect(page.locator('#btn-new-game')).toBeVisible();
    await page.locator('#btn-new-game').click();
    await expect(page.locator('#player-name-input')).toBeVisible();
    for (const name of names) {
      await page.locator('#player-name-input').fill(name);
      await page.locator('#btn-add-player').click();
    }
    await expect(page.locator('.player-item')).toHaveCount(names.length);
  };

  /** Inject roles via selectedRoles, deal, then force specific assignment */
  const assignRoles = async (page, roleMap) => {
    // Set selectedRoles so deal works
    const selectedRoles = {};
    for (const role of Object.values(roleMap)) {
      selectedRoles[role] = (selectedRoles[role] || 0) + 1;
    }
    const mafiaCount = Object.entries(roleMap).filter(([, r]) =>
      ['godfather', 'simpleMafia', 'negotiator', 'suspect'].includes(r)
    ).length;

    await page.evaluate(({ selected, mafiaCount }) => {
      const game = window.app?.game;
      if (!game) return;
      game.selectedRoles = selected;
      game.setDesiredMafia(mafiaCount);
    }, { selected: selectedRoles, mafiaCount });

    // Navigate to assign tab and deal
    await page.evaluate(() => {
      const sv = window.app?.views?.setup;
      if (sv) { sv.activeTab = 'assign'; sv.render(); }
    });
    await expect(page.locator('#btn-random-assign')).toBeEnabled();
    await page.locator('#btn-random-assign').click();

    // Force specific role assignments
    const roleArray = Object.values(roleMap);
    await page.evaluate((roles) => {
      const game = window.app?.game;
      if (!game) return;
      game.players.forEach((p, i) => { p.roleId = roles[i]; });
      game.bulletManager.init(2, 2);
    }, roleArray);
  };

  /** Skip through role reveal for N players */
  const skipRoleReveal = async (page, count) => {
    await expect(page.locator('#reveal-card')).toBeVisible();
    for (let i = 0; i < count; i++) {
      await page.locator('#reveal-card').click();
      await page.locator('#btn-next-reveal').click();
    }
  };

  /** Skip blind day + blind night */
  const skipBlindPhases = async (page) => {
    await expect(page.locator('#btn-start-blind-day')).toBeVisible();
    await page.locator('#btn-start-blind-day').click();
    await expect(page.locator('#btn-end-blind-day')).toBeVisible();
    await page.locator('#btn-end-blind-day').click();

    // Blind night — skip all steps
    for (let i = 0; i < 50; i++) {
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
      if (action === 'resolve') break;
      await page.waitForTimeout(150);
    }
  };


  /* ═══════════════════════════════════════════════════════════════════
     E2E-V1 — Mafia victory: engine wins → win screen displayed
     ═══════════════════════════════════════════════════════════════════ */
  test('E2E-V1: Mafia victory screen shows when mafia >= citizen, no independent', async ({ page }) => {
    test.setTimeout(120000);
    await initApp(page);

    const names = ['Ali', 'Reza', 'Sara', 'Mina', 'Hamed', 'Javad', 'Gita', 'Dara'];
    await addPlayers(page, names);

    const roleMap = {
      Ali: 'godfather', Reza: 'simpleMafia',
      Sara: 'simpleCitizen', Mina: 'simpleCitizen',
      Hamed: 'simpleCitizen', Javad: 'simpleCitizen',
      Gita: 'simpleCitizen', Dara: 'simpleCitizen',
    };
    await assignRoles(page, roleMap);
    await skipRoleReveal(page, 8);
    await skipBlindPhases(page);

    // Kill citizens until 2M >= 2C via engine, then trigger win check + navigate
    const result = await page.evaluate(() => {
      const game = window.app?.game;
      if (!game) return { error: 'no game' };

      // Kill 4 citizens so 2M == 2C
      const toKill = game.players.filter(p => ['Hamed', 'Javad', 'Gita', 'Dara'].includes(p.name));
      toKill.forEach(p => { p.isAlive = false; p.deathRound = 1; p.deathCause = 'vote'; });

      const winner = game.checkWinCondition();
      return { winner, phase: game.phase, gameWinner: game.winner };
    });

    expect(result.winner).toBe('mafia');
    expect(result.phase).toBe('ended');

    // Navigate to summary to see win screen
    await page.evaluate(() => { window.app?.navigate?.('summary'); });
    await page.waitForTimeout(500);

    // Verify mafia win screen
    const winTitle = page.locator('.win-screen__title');
    await expect(winTitle).toBeVisible();
    const titleText = await winTitle.textContent();
    expect(titleText.length).toBeGreaterThan(0);

    // Check for red mafia icon
    const winIcon = page.locator('.win-screen__icon');
    await expect(winIcon).toBeVisible();
    const iconText = await winIcon.textContent();
    expect(iconText).toContain('🔴');

    await page.screenshot({ path: 'test-results/artifacts/e2e-v1-mafia-victory.png', fullPage: true });
  });


  /* ═══════════════════════════════════════════════════════════════════
     E2E-V2 — Chaos UI appears at 3 alive (1M + 2C)
     ═══════════════════════════════════════════════════════════════════ */
  test('E2E-V2: Chaos screen with pair buttons at 3 alive (1M+2C)', async ({ page }) => {
    test.setTimeout(120000);
    await initApp(page);

    const names = ['Ali', 'Reza', 'Sara', 'Mina', 'Hamed', 'Javad', 'Gita', 'Dara'];
    await addPlayers(page, names);

    const roleMap = {
      Ali: 'godfather', Reza: 'simpleMafia',
      Sara: 'simpleCitizen', Mina: 'simpleCitizen',
      Hamed: 'simpleCitizen', Javad: 'simpleCitizen',
      Gita: 'simpleCitizen', Dara: 'simpleCitizen',
    };
    await assignRoles(page, roleMap);
    await skipRoleReveal(page, 8);
    await skipBlindPhases(page);

    // Kill until 3 remain: Ali (GF), Sara, Mina — 1M + 2C → chaos
    const result = await page.evaluate(() => {
      const game = window.app?.game;
      if (!game) return { error: 'no game' };

      const toKill = game.players.filter(p =>
        ['Reza', 'Hamed', 'Javad', 'Gita', 'Dara'].includes(p.name)
      );
      toKill.forEach(p => { p.isAlive = false; p.deathRound = 1; p.deathCause = 'vote'; });

      const winner = game.checkWinCondition();
      return {
        winner,
        phase: game.phase,
        handshakeState: game.handshakeState,
        alivePlayers: game.players.filter(p => p.isAlive).map(p => p.name),
      };
    });

    expect(result.winner).toBe('handshake');
    expect(result.phase).toBe('handshake');
    expect(result.alivePlayers).toHaveLength(3);

    // Navigate to summary to see chaos UI
    await page.evaluate(() => { window.app?.navigate?.('summary'); });
    await page.waitForTimeout(500);

    // Verify chaos screen elements
    const chaosTitle = page.locator('.win-screen__title');
    await expect(chaosTitle).toBeVisible();
    const titleText = await chaosTitle.textContent();
    expect(titleText.toLowerCase()).toMatch(/chaos|آشوب/);

    // Verify 🌀 icon
    const chaosIcon = page.locator('.win-screen__icon');
    await expect(chaosIcon).toBeVisible();
    expect(await chaosIcon.textContent()).toContain('🌀');

    // Verify 3 pair buttons (C(3,2) = 3 combinations)
    const pairButtons = page.locator('.handshake-pair');
    await expect(pairButtons).toHaveCount(3);

    // Verify all alive player names appear in buttons
    for (const name of result.alivePlayers) {
      const btnWithName = page.locator(`.handshake-pair:has-text("${name}")`);
      const count = await btnWithName.count();
      expect(count).toBeGreaterThan(0);
    }

    await page.screenshot({ path: 'test-results/artifacts/e2e-v2-chaos-screen.png', fullPage: true });
  });


  /* ═══════════════════════════════════════════════════════════════════
     E2E-V3 — Jack auto-wins in chaos → immediate independent win
     ═══════════════════════════════════════════════════════════════════ */
  test('E2E-V3: Jack in chaos → immediate independent win screen', async ({ page }) => {
    test.setTimeout(120000);
    await initApp(page);

    const names = ['Ali', 'Reza', 'Sara', 'Mina', 'Hamed', 'Javad', 'Gita', 'Dara'];
    await addPlayers(page, names);

    const roleMap = {
      Ali: 'godfather', Reza: 'simpleMafia',
      Sara: 'jack',
      Mina: 'simpleCitizen', Hamed: 'simpleCitizen',
      Javad: 'simpleCitizen', Gita: 'simpleCitizen', Dara: 'simpleCitizen',
    };
    await assignRoles(page, roleMap);
    await skipRoleReveal(page, 8);
    await skipBlindPhases(page);

    // Kill until 3 remain: Ali (GF), Sara (Jack), Mina (citizen)
    const result = await page.evaluate(() => {
      const game = window.app?.game;
      if (!game) return { error: 'no game' };

      const toKill = game.players.filter(p =>
        ['Reza', 'Hamed', 'Javad', 'Gita', 'Dara'].includes(p.name)
      );
      toKill.forEach(p => { p.isAlive = false; p.deathRound = 1; p.deathCause = 'vote'; });

      const winner = game.checkWinCondition();
      return { winner, phase: game.phase, gameWinner: game.winner };
    });

    // Jack auto-wins — no chaos screen, straight to ended
    expect(result.winner).toBe('independent');
    expect(result.phase).toBe('ended');

    // Navigate to summary to see win screen
    await page.evaluate(() => { window.app?.navigate?.('summary'); });
    await page.waitForTimeout(500);

    // Verify independent win screen (🟣)
    const winIcon = page.locator('.win-screen__icon');
    await expect(winIcon).toBeVisible();
    expect(await winIcon.textContent()).toContain('🟣');

    // No chaos pair buttons should exist
    const pairButtons = page.locator('.handshake-pair');
    expect(await pairButtons.count()).toBe(0);

    await page.screenshot({ path: 'test-results/artifacts/e2e-v3-jack-chaos-win.png', fullPage: true });
  });


  /* ═══════════════════════════════════════════════════════════════════
     E2E-V4 — Chaos: citizen+citizen pair → citizen wins
     ═══════════════════════════════════════════════════════════════════ */
  test('E2E-V4: Chaos citizen+citizen pair → citizen victory screen', async ({ page }) => {
    test.setTimeout(120000);
    await initApp(page);

    const names = ['Ali', 'Reza', 'Sara', 'Mina', 'Hamed', 'Javad', 'Gita', 'Dara'];
    await addPlayers(page, names);

    const roleMap = {
      Ali: 'godfather', Reza: 'simpleMafia',
      Sara: 'simpleCitizen', Mina: 'simpleCitizen',
      Hamed: 'simpleCitizen', Javad: 'simpleCitizen',
      Gita: 'simpleCitizen', Dara: 'simpleCitizen',
    };
    await assignRoles(page, roleMap);
    await skipRoleReveal(page, 8);
    await skipBlindPhases(page);

    // Kill until 3 remain: Ali (GF), Sara (C), Mina (C)
    await page.evaluate(() => {
      const game = window.app?.game;
      if (!game) return;
      const toKill = game.players.filter(p =>
        ['Reza', 'Hamed', 'Javad', 'Gita', 'Dara'].includes(p.name)
      );
      toKill.forEach(p => { p.isAlive = false; p.deathRound = 1; p.deathCause = 'vote'; });
      game.checkWinCondition(); // → 'handshake'
    });

    // Navigate to summary (chaos screen)
    await page.evaluate(() => { window.app?.navigate?.('summary'); });
    await page.waitForTimeout(500);

    // Find and click the citizen+citizen pair button (Sara + Mina)
    const pairBtn = page.locator('.handshake-pair').filter({ hasText: /Sara.*Mina|Mina.*Sara/ });
    await expect(pairBtn).toBeVisible();
    await pairBtn.click();
    await page.waitForTimeout(500);

    // Verify citizen win screen
    const winIcon = page.locator('.win-screen__icon');
    await expect(winIcon).toBeVisible();
    expect(await winIcon.textContent()).toContain('🔵');

    await page.screenshot({ path: 'test-results/artifacts/e2e-v4-chaos-citizen-wins.png', fullPage: true });
  });


  /* ═══════════════════════════════════════════════════════════════════
     E2E-V5 — Chaos: citizen+mafia pair → mafia wins
     ═══════════════════════════════════════════════════════════════════ */
  test('E2E-V5: Chaos citizen+mafia pair → mafia victory screen', async ({ page }) => {
    test.setTimeout(120000);
    await initApp(page);

    const names = ['Ali', 'Reza', 'Sara', 'Mina', 'Hamed', 'Javad', 'Gita', 'Dara'];
    await addPlayers(page, names);

    const roleMap = {
      Ali: 'godfather', Reza: 'simpleMafia',
      Sara: 'simpleCitizen', Mina: 'simpleCitizen',
      Hamed: 'simpleCitizen', Javad: 'simpleCitizen',
      Gita: 'simpleCitizen', Dara: 'simpleCitizen',
    };
    await assignRoles(page, roleMap);
    await skipRoleReveal(page, 8);
    await skipBlindPhases(page);

    // Kill until 3 remain: Ali (GF), Sara (C), Mina (C) → chaos
    await page.evaluate(() => {
      const game = window.app?.game;
      if (!game) return;
      const toKill = game.players.filter(p =>
        ['Reza', 'Hamed', 'Javad', 'Gita', 'Dara'].includes(p.name)
      );
      toKill.forEach(p => { p.isAlive = false; p.deathRound = 1; p.deathCause = 'vote'; });
      game.checkWinCondition();
    });

    await page.evaluate(() => { window.app?.navigate?.('summary'); });
    await page.waitForTimeout(500);

    // Click citizen+mafia pair (Sara + Ali)
    const pairBtn = page.locator('.handshake-pair').filter({ hasText: /Sara.*Ali|Ali.*Sara/ });
    await expect(pairBtn).toBeVisible();
    await pairBtn.click();
    await page.waitForTimeout(500);

    // Verify mafia win screen
    const winIcon = page.locator('.win-screen__icon');
    await expect(winIcon).toBeVisible();
    expect(await winIcon.textContent()).toContain('🔴');

    await page.screenshot({ path: 'test-results/artifacts/e2e-v5-chaos-mafia-wins.png', fullPage: true });
  });


  /* ═══════════════════════════════════════════════════════════════════
     E2E-V6 — Chaos: citizen+zodiac pair → independent wins
     ═══════════════════════════════════════════════════════════════════ */
  test('E2E-V6: Chaos citizen+zodiac pair → independent victory screen', async ({ page }) => {
    test.setTimeout(120000);
    await initApp(page);

    const names = ['Ali', 'Reza', 'Sara', 'Mina', 'Hamed', 'Javad', 'Gita', 'Dara'];
    await addPlayers(page, names);

    const roleMap = {
      Ali: 'godfather', Reza: 'simpleMafia',
      Sara: 'zodiac', Mina: 'bodyguard',
      Hamed: 'simpleCitizen', Javad: 'simpleCitizen',
      Gita: 'simpleCitizen', Dara: 'simpleCitizen',
    };
    await assignRoles(page, roleMap);
    await skipRoleReveal(page, 8);
    await skipBlindPhases(page);

    // Kill until 3 remain: Ali (GF), Sara (Zodiac), Hamed (citizen) → chaos
    await page.evaluate(() => {
      const game = window.app?.game;
      if (!game) return;
      const toKill = game.players.filter(p =>
        ['Reza', 'Mina', 'Javad', 'Gita', 'Dara'].includes(p.name)
      );
      toKill.forEach(p => { p.isAlive = false; p.deathRound = 1; p.deathCause = 'vote'; });
      game.checkWinCondition();
    });

    await page.evaluate(() => { window.app?.navigate?.('summary'); });
    await page.waitForTimeout(500);

    // Click citizen+zodiac pair (Hamed + Sara)
    const pairBtn = page.locator('.handshake-pair').filter({ hasText: /Hamed.*Sara|Sara.*Hamed/ });
    await expect(pairBtn).toBeVisible();
    await pairBtn.click();
    await page.waitForTimeout(500);

    // Verify independent win screen
    const winIcon = page.locator('.win-screen__icon');
    await expect(winIcon).toBeVisible();
    expect(await winIcon.textContent()).toContain('🟣');

    await page.screenshot({ path: 'test-results/artifacts/e2e-v6-chaos-independent-wins.png', fullPage: true });
  });


  /* ═══════════════════════════════════════════════════════════════════
     E2E-V7 — 2M+1C, no independent → mafia wins before chaos
     ═══════════════════════════════════════════════════════════════════ */
  test('E2E-V7: 2M+1C no independent → mafia wins (no chaos screen)', async ({ page }) => {
    test.setTimeout(120000);
    await initApp(page);

    const names = ['Ali', 'Reza', 'Sara', 'Mina', 'Hamed', 'Javad', 'Gita', 'Dara'];
    await addPlayers(page, names);

    const roleMap = {
      Ali: 'godfather', Reza: 'simpleMafia',
      Sara: 'simpleCitizen', Mina: 'simpleCitizen',
      Hamed: 'simpleCitizen', Javad: 'simpleCitizen',
      Gita: 'simpleCitizen', Dara: 'simpleCitizen',
    };
    await assignRoles(page, roleMap);
    await skipRoleReveal(page, 8);
    await skipBlindPhases(page);

    // Kill until 3 remain: Ali (GF), Reza (SM), Sara (C) → 2M+1C=mafia wins
    const result = await page.evaluate(() => {
      const game = window.app?.game;
      if (!game) return { error: 'no game' };

      const toKill = game.players.filter(p =>
        ['Mina', 'Hamed', 'Javad', 'Gita', 'Dara'].includes(p.name)
      );
      toKill.forEach(p => { p.isAlive = false; p.deathRound = 1; p.deathCause = 'vote'; });

      const winner = game.checkWinCondition();
      return { winner, phase: game.phase, handshakeState: game.handshakeState };
    });

    // Mafia wins — no chaos
    expect(result.winner).toBe('mafia');
    expect(result.phase).toBe('ended');
    expect(result.handshakeState).toBeNull();

    // Navigate to summary
    await page.evaluate(() => { window.app?.navigate?.('summary'); });
    await page.waitForTimeout(500);

    // Verify mafia win screen, NOT chaos screen
    const winIcon = page.locator('.win-screen__icon');
    await expect(winIcon).toBeVisible();
    expect(await winIcon.textContent()).toContain('🔴');

    // No pair buttons
    const pairButtons = page.locator('.handshake-pair');
    expect(await pairButtons.count()).toBe(0);

    await page.screenshot({ path: 'test-results/artifacts/e2e-v7-mafia-before-chaos.png', fullPage: true });
  });

});
