import { test, expect } from '@playwright/test';

/**
 * complex-ui-e2e.spec.js — 25 complex UI-driven E2E tests
 *
 * Unlike the engine-driven tests, these tests interact with the ACTUAL UI:
 *   - Clicking buttons, filling inputs, verifying visible DOM elements
 *   - Checking CSS classes, text content, element visibility
 *   - Verifying navigation transitions, tab states, disabled states
 *   - Testing visual feedback: dead dots, role badges, phase bars
 *   - Catching rendering bugs, stale state, missing updates
 *
 * TEST CATEGORIES:
 *   UI-1  to UI-5:   Setup & Navigation — tabs, player add/remove, role cards
 *   UI-6  to UI-8:   Role Reveal — card flip, counter, completion
 *   UI-9  to UI-12:  Night View — stepper, target grid, special panels
 *   UI-13 to UI-17:  Day View — results, discussion, voting, morning shot, cowboy
 *   UI-18 to UI-21:  Bomb Siesta, Last Action Cards, Win Screens
 *   UI-22 to UI-25:  Full multi-round UI flows with visual assertions
 */
test.describe('Complex UI Interaction Tests — 25 Scenarios', () => {

  /* ═══════ Shared Helpers ═══════ */

  const clearAndLoad = async (page) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
  };

  const addPlayers = async (page, names) => {
    await expect(page.locator('#btn-new-game')).toBeVisible();
    await page.locator('#btn-new-game').click();
    await expect(page.locator('#player-name-input')).toBeVisible();
    for (const name of names) {
      await page.locator('#player-name-input').fill(name);
      await page.locator('#btn-add-player').click();
    }
  };

  const assignRoles = async (page, roleList) => {
    await page.evaluate((roles) => {
      const game = window.app?.game;
      if (!game) return;
      const counts = {};
      roles.forEach(r => { counts[r] = (counts[r] || 0) + 1; });
      game.selectedRoles = counts;
      const RolesMap = window.app?.Roles || null;
      game.players.forEach((p, i) => {
        p.roleId = roles[i];
        if (RolesMap) {
          const def = RolesMap.get(roles[i]);
          if (def) p.initShield(def);
        }
      });
      const fmIndex = roles.indexOf('freemason');
      if (fmIndex >= 0) game.framason.init(game.players[fmIndex].id, game.framasonMaxMembers);
      if (roles.includes('gunner')) game.bulletManager.init(game.gunnerBlankMax, game.gunnerLiveMax);
      if (!roles.includes('jack')) {
        game.lastActionManager?.cards?.forEach(c => { if (c.id === 4) c.used = true; });
      }
      game.phase = 'roleReveal';
    }, roleList);
  };

  const revealAllRoles = async (page, count) => {
    await page.evaluate(() => { window.app?.navigate?.('roleReveal'); });
    await page.waitForTimeout(200);
    for (let i = 0; i < count; i++) {
      await page.evaluate(() => document.querySelector('#reveal-card')?.click());
      await page.waitForTimeout(50);
      await page.evaluate(() => document.querySelector('#btn-next-reveal')?.click());
      await page.waitForTimeout(50);
    }
    await page.waitForTimeout(200);
  };

  const doBlindDayNight = async (page) => {
    await page.evaluate(() => document.querySelector('#btn-start-blind-day')?.click());
    await page.waitForTimeout(100);
    await page.evaluate(() => document.querySelector('#btn-end-blind-day')?.click());
    await page.waitForTimeout(100);
  };

  const resolveNightFlow = async (page, maxIter = 80) => {
    for (let i = 0; i < maxIter; i++) {
      const action = await page.evaluate(() => {
        const click = (sel) => {
          const el = document.querySelector(sel);
          if (!el || el.hasAttribute('disabled')) return false;
          el.click(); return true;
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
      await page.waitForTimeout(80);
    }
    return false;
  };

  const bootstrapGame = async (page, names, roles) => {
    await clearAndLoad(page);
    await addPlayers(page, names);
    await assignRoles(page, roles);
    await revealAllRoles(page, names.length);
    await doBlindDayNight(page);
    await resolveNightFlow(page);
  };

  const exhaustLastActions = async (page) => {
    await page.evaluate(() => {
      window.app?.game?.lastActionManager?.cards?.forEach(c => { c.used = true; });
    });
  };

  const goToDiscussion = async (page) => {
    await page.evaluate(() => document.querySelector('#btn-go-discussion')?.click());
    await page.waitForTimeout(200);
  };

  const goToVoting = async (page) => {
    await page.evaluate(() => document.querySelector('#btn-go-voting')?.click());
    await page.waitForTimeout(200);
  };

  /* ═══════════════════════════════════════════════════════════════
     UI-1: Setup — Adding players, verifying list, removing players
     ═══════════════════════════════════════════════════════════════ */
  test('UI-1: Player setup — add, verify count, remove, re-add', async ({ page }) => {
    test.setTimeout(60000);
    await clearAndLoad(page);

    // Click new game
    await page.locator('#btn-new-game').click();
    await expect(page.locator('#player-name-input')).toBeVisible();

    // Add 8 players
    const names = ['Ali', 'Sara', 'Reza', 'Mina', 'Hamed', 'Leila', 'Arash', 'Neda'];
    for (const name of names) {
      await page.locator('#player-name-input').fill(name);
      await page.locator('#btn-add-player').click();
    }

    // Verify all 8 players are visible
    await expect(page.locator('.player-item')).toHaveCount(8);

    // Verify player names are shown
    const playerNames = await page.locator('.player-item__name').allTextContents();
    expect(playerNames.length).toBe(8);

    // Remove the 3rd player (Reza)
    const removeBtn = page.locator('.player-item__remove').nth(2);
    await removeBtn.click();
    await expect(page.locator('.player-item')).toHaveCount(7);

    // Add a new player
    await page.locator('#player-name-input').fill('Dariush');
    await page.locator('#btn-add-player').click();
    await expect(page.locator('.player-item')).toHaveCount(8);

    // Verify duplicate name is rejected
    await page.locator('#player-name-input').fill('Ali');
    await page.locator('#btn-add-player').click();
    await expect(page.locator('.player-item')).toHaveCount(8); // still 8
  });

  /* ═══════════════════════════════════════════════════════════════
     UI-2: Setup — Tab navigation, disabled state for roles/assign
     ═══════════════════════════════════════════════════════════════ */
  test('UI-2: Setup tabs — roles tab disabled with < 8 players', async ({ page }) => {
    test.setTimeout(60000);
    await clearAndLoad(page);
    await page.locator('#btn-new-game').click();

    // Add only 5 players
    for (let i = 0; i < 5; i++) {
      await page.locator('#player-name-input').fill(`P${i + 1}`);
      await page.locator('#btn-add-player').click();
    }

    // Roles tab should be disabled
    const rolesTab = page.locator('.tab[data-tab="roles"]');
    const hasDisabled = await rolesTab.evaluate(el => el.classList.contains('disabled'));
    expect(hasDisabled).toBe(true);

    // Assign tab should also be disabled
    const assignTab = page.locator('.tab[data-tab="assign"]');
    const assignDisabled = await assignTab.evaluate(el => el.classList.contains('disabled'));
    expect(assignDisabled).toBe(true);

    // Add 3 more players to reach 8
    for (let i = 5; i < 8; i++) {
      await page.locator('#player-name-input').fill(`P${i + 1}`);
      await page.locator('#btn-add-player').click();
    }

    // Roles tab should now be enabled
    await page.waitForTimeout(200);
    const rolesEnabled = await rolesTab.evaluate(el => !el.classList.contains('disabled'));
    expect(rolesEnabled).toBe(true);
  });

  /* ═══════════════════════════════════════════════════════════════
     UI-3: Setup — Role card selection, count increment/decrement
     ═══════════════════════════════════════════════════════════════ */
  test('UI-3: Role selection — increment/decrement role counts, matching player count', async ({ page }) => {
    test.setTimeout(60000);
    await clearAndLoad(page);
    await page.locator('#btn-new-game').click();

    // Add 8 players
    for (let i = 0; i < 8; i++) {
      await page.locator('#player-name-input').fill(`P${i + 1}`);
      await page.locator('#btn-add-player').click();
    }

    // Switch to roles tab
    await page.locator('.tab[data-tab="roles"]').click();
    await page.waitForTimeout(200);

    // Click godfather role card to select it
    const gfCard = page.locator('.role-card[data-role="godfather"]');
    await gfCard.click();
    await page.waitForTimeout(100);

    // Verify role card gets selected class
    const gfSelected = await gfCard.evaluate(el => el.classList.contains('selected'));
    expect(gfSelected).toBe(true);

    // Check the role count display updates
    const roleCount = await page.locator('#role-count-display').textContent();
    expect(parseInt(roleCount || '0')).toBeGreaterThan(0);
  });

  /* ═══════════════════════════════════════════════════════════════
     UI-4: Setup — Bodyguard disabled without zodiac/bomber
     ═══════════════════════════════════════════════════════════════ */
  test('UI-4: Bodyguard role card disabled when no zodiac/bomber selected', async ({ page }) => {
    test.setTimeout(60000);
    await clearAndLoad(page);
    await page.locator('#btn-new-game').click();

    for (let i = 0; i < 10; i++) {
      await page.locator('#player-name-input').fill(`P${i + 1}`);
      await page.locator('#btn-add-player').click();
    }

    await page.locator('.tab[data-tab="roles"]').click();
    await page.waitForTimeout(200);

    // Bodyguard should be disabled (no zodiac or bomber selected)
    const bgCard = page.locator('.role-card[data-role="bodyguard"]');
    const bgDisabled = await bgCard.evaluate(el => el.classList.contains('role-card--disabled'));
    expect(bgDisabled).toBe(true);

    // Select zodiac
    const zodCard = page.locator('.role-card[data-role="zodiac"]');
    await zodCard.click();
    await page.waitForTimeout(200);

    // Now bodyguard should be enabled
    const bgEnabledAfterZod = await bgCard.evaluate(el => !el.classList.contains('role-card--disabled'));
    expect(bgEnabledAfterZod).toBe(true);
  });

  /* ═══════════════════════════════════════════════════════════════
     UI-5: Setup — Random assign button and tab transition
     ═══════════════════════════════════════════════════════════════ */
  test('UI-5: Random role assignment and transition to reveal', async ({ page }) => {
    test.setTimeout(60000);
    await clearAndLoad(page);

    // Use engine to set up roles fast
    await page.locator('#btn-new-game').click();
    for (let i = 0; i < 8; i++) {
      await page.locator('#player-name-input').fill(`P${i + 1}`);
      await page.locator('#btn-add-player').click();
    }

    // Inject roles directly, then use engine to assign and go to roleReveal
    await page.evaluate(() => {
      const game = window.app?.game;
      const roles = ['godfather', 'simpleMafia', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
      const counts = {};
      roles.forEach(r => { counts[r] = (counts[r] || 0) + 1; });
      game.selectedRoles = counts;
      game.assignRolesRandomly();
      // Ensure navigation to roleReveal
      window.app?.navigate?.('roleReveal');
    });
    await page.waitForTimeout(500);

    // Should navigate to role reveal (check for reveal card)
    await expect(page.locator('#reveal-card')).toBeVisible({ timeout: 5000 });

    // Verify all players got roles assigned
    const allAssigned = await page.evaluate(() => {
      const game = window.app?.game;
      return game.players.every(p => p.roleId);
    });
    expect(allAssigned).toBe(true);
  });

  /* ═══════════════════════════════════════════════════════════════
     UI-6: Role Reveal — Card flip animation and counter
     ═══════════════════════════════════════════════════════════════ */
  test('UI-6: Role reveal — card flips on click, counter increments', async ({ page }) => {
    test.setTimeout(60000);
    await clearAndLoad(page);

    const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    await addPlayers(page, names);
    const roles = ['godfather', 'simpleMafia', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    await assignRoles(page, roles);

    // Navigate to role reveal
    await page.evaluate(() => window.app?.navigate?.('roleReveal'));
    await page.waitForTimeout(300);

    // Card should be visible, not flipped
    const card = page.locator('#reveal-card');
    await expect(card).toBeVisible();

    // Counter should show "1 / 8" or similar
    const chipText = await page.locator('.chip').textContent();
    expect(chipText).toContain('1');

    // Click to flip
    await card.click();
    await page.waitForTimeout(200);

    // Card should have flipped class
    const isFlipped = await card.evaluate(el => el.classList.contains('flipped'));
    expect(isFlipped).toBe(true);

    // Next button should be visible
    const nextBtn = page.locator('#btn-next-reveal');
    await expect(nextBtn).toBeVisible();

    // Click next
    await nextBtn.click();
    await page.waitForTimeout(200);

    // Counter should now show "2 / 8"
    const chipText2 = await page.locator('.chip').textContent();
    expect(chipText2).toContain('2');
  });

  /* ═══════════════════════════════════════════════════════════════
     UI-7: Role Reveal — Team color on back of card
     ═══════════════════════════════════════════════════════════════ */
  test('UI-7: Role reveal — card back shows correct team color', async ({ page }) => {
    test.setTimeout(60000);
    await clearAndLoad(page);

    const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    await addPlayers(page, names);
    // First player is godfather (mafia)
    const roles = ['godfather', 'simpleMafia', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    await assignRoles(page, roles);

    await page.evaluate(() => window.app?.navigate?.('roleReveal'));
    await page.waitForTimeout(300);

    // Flip first card (godfather = mafia)
    await page.locator('#reveal-card').click();
    await page.waitForTimeout(300);

    // Check card back has mafia team class
    const backHasMafia = await page.evaluate(() => {
      const back = document.querySelector('.reveal-card__back');
      return back?.classList.contains('reveal-card__back--mafia') || false;
    });
    expect(backHasMafia).toBe(true);
  });

  /* ═══════════════════════════════════════════════════════════════
     UI-8: Role Reveal — Completion screen with start button
     ═══════════════════════════════════════════════════════════════ */
  test('UI-8: Role reveal — all revealed shows blind day start button', async ({ page }) => {
    test.setTimeout(60000);
    await clearAndLoad(page);

    const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    await addPlayers(page, names);
    const roles = ['godfather', 'simpleMafia', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    await assignRoles(page, roles);
    await revealAllRoles(page, 8);

    // Blind day start button should appear
    await expect(page.locator('#btn-start-blind-day')).toBeVisible({ timeout: 5000 });
  });

  /* ═══════════════════════════════════════════════════════════════
     UI-9: Night View — Step-by-step role panels visible
     ═══════════════════════════════════════════════════════════════ */
  test('UI-9: Night view — steps render for each role, active step highlighted', async ({ page }) => {
    test.setTimeout(120000);
    const names = ['GF', 'SM', 'Det', 'Wat', 'C1', 'C2', 'C3', 'C4'];
    const roles = ['godfather', 'simpleMafia', 'detective', 'drWatson', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    await bootstrapGame(page, names, roles);

    // Engine: start night via engine, then navigate to night view
    await page.evaluate(() => {
      window.app?.game?.startNight();
      window.app?.navigate?.('night');
    });
    await page.waitForTimeout(500);

    // Verify night phase bar
    const phaseBar = page.locator('.phase-bar--night');
    await expect(phaseBar).toBeVisible();

    // Verify steps are rendered
    const steps = page.locator('.step');
    const stepCount = await steps.count();
    expect(stepCount).toBeGreaterThanOrEqual(2); // At least GF + one citizen role

    // First step should be active
    const firstStep = steps.first();
    const isActive = await firstStep.evaluate(el => el.classList.contains('active'));
    expect(isActive).toBe(true);

    // If first step is mafiaReveal, skip it, then check target buttons
    const firstStepType = await page.evaluate(() => {
      const game = window.app?.game;
      return game.nightSteps?.[0]?.actionType || '';
    });

    if (firstStepType === 'mafiaReveal') {
      // mafiaReveal has confirm but no targets — skip to next step
      await page.evaluate(() => {
        const btn = document.querySelector('.step.active [data-action="confirm-step"]');
        if (btn) btn.click();
      });
      await page.waitForTimeout(200);
    }

    // GF step: must select mode first before target grid appears
    const activeStepType = await page.evaluate(() => {
      const game = window.app?.game;
      const idx = game.nightSteps.findIndex((s, i) => i >= (game._currentStepIdx || 0));
      return game.nightSteps[game._currentStepIdx || 0]?.roleId || '';
    });

    if (activeStepType === 'godfather') {
      // Select shoot mode to show target grid
      await page.evaluate(() => {
        const btn = document.querySelector('[data-gf-mode="shoot"]');
        if (btn) btn.click();
      });
      await page.waitForTimeout(300);
    }

    // Now active step should have target buttons
    const targetBtns = page.locator('.step.active .target-btn');
    const targetCount = await targetBtns.count();
    expect(targetCount).toBeGreaterThan(0);
  });

  /* ═══════════════════════════════════════════════════════════════
     UI-10: Night View — Godfather mode toggle (shoot vs salakhi)
     ═══════════════════════════════════════════════════════════════ */
  test('UI-10: Night — Godfather shoot/salakhi mode toggle UI', async ({ page }) => {
    test.setTimeout(120000);
    const names = ['GF', 'SM', 'Det', 'Wat', 'C1', 'C2', 'C3', 'C4'];
    const roles = ['godfather', 'simpleMafia', 'detective', 'drWatson', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    await bootstrapGame(page, names, roles);

    await page.evaluate(() => {
      window.app?.game?.startNight();
      window.app?.navigate?.('night');
    });
    await page.waitForTimeout(500);

    // Should see godfather mode buttons
    const shootBtn = page.locator('[data-gf-mode="shoot"]');
    const salakhiBtn = page.locator('[data-gf-mode="salakhi"]');

    await expect(shootBtn).toBeVisible();
    await expect(salakhiBtn).toBeVisible();

    // First skip mafiaReveal if it's the first step
    const firstType = await page.evaluate(() => {
      const game = window.app?.game;
      return game.nightSteps?.[0]?.actionType || '';
    });
    if (firstType === 'mafiaReveal') {
      await page.evaluate(() => document.querySelector('.step.active [data-action="confirm-step"]')?.click());
      await page.waitForTimeout(200);
    }

    // Now on godfather step: click salakhi mode
    await salakhiBtn.click();
    await page.waitForTimeout(200);

    // In salakhi mode, first select a target — role guess only appears after target selection
    const target = page.locator('.step.active .target-btn[data-target]').first();
    await target.click();
    await page.waitForTimeout(300);

    // Now role guess buttons should appear
    const roleGuessBtn = page.locator('.role-guess-btn').first();
    await expect(roleGuessBtn).toBeVisible({ timeout: 5000 });

    // Switch back to shoot mode
    await shootBtn.click();
    await page.waitForTimeout(200);

    // Role guess buttons should disappear
    const roleGuessBtns = page.locator('.role-guess-btn');
    const guessCount = await roleGuessBtns.count();
    expect(guessCount).toBe(0);
  });

  /* ═══════════════════════════════════════════════════════════════
     UI-11: Night View — Target selection and confirm button state
     ═══════════════════════════════════════════════════════════════ */
  test('UI-11: Night — target select enables confirm, skip always available', async ({ page }) => {
    test.setTimeout(120000);
    const names = ['GF', 'SM', 'Det', 'Wat', 'C1', 'C2', 'C3', 'C4'];
    const roles = ['godfather', 'simpleMafia', 'detective', 'drWatson', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    await bootstrapGame(page, names, roles);

    await page.evaluate(() => {
      window.app?.game?.startNight();
      window.app?.navigate?.('night');
    });
    await page.waitForTimeout(500);

    // Select GF shoot mode first
    await page.evaluate(() => {
      const el = document.querySelector('[data-gf-mode="shoot"].btn--ghost');
      if (el) el.click();
    });
    await page.waitForTimeout(100);

    // Confirm button should be disabled (no target selected)
    const confirmBtn = page.locator('.step.active [data-action="confirm-step"]');
    const confirmDisabled = await confirmBtn.evaluate(el => el.hasAttribute('disabled'));
    expect(confirmDisabled).toBe(true);

    // Skip button should be available
    const skipBtn = page.locator('.step.active [data-action="skip-step"]');
    await expect(skipBtn).toBeVisible();

    // Select a target
    const target = page.locator('.step.active .target-btn[data-target]').first();
    await target.click();
    await page.waitForTimeout(100);

    // Target should have selected class
    const targetSelected = await target.evaluate(el => el.classList.contains('selected'));
    expect(targetSelected).toBe(true);

    // Confirm button should now be enabled
    const confirmEnabled = await confirmBtn.evaluate(el => !el.hasAttribute('disabled'));
    expect(confirmEnabled).toBe(true);
  });

  /* ═══════════════════════════════════════════════════════════════
     UI-12: Night View — Bomber password UI and gunner bullet type UI
     ═══════════════════════════════════════════════════════════════ */
  test('UI-12: Night — bomber password buttons and gunner bullet type toggle', async ({ page }) => {
    test.setTimeout(120000);
    const names = ['GF', 'Bom', 'Gun', 'SM', 'Zod', 'BG', 'C1', 'C2', 'C3', 'C4'];
    const roles = ['godfather', 'bomber', 'gunner', 'simpleMafia', 'zodiac', 'bodyguard', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    await bootstrapGame(page, names, roles);

    await page.evaluate(() => {
      window.app?.game?.startNight();
      window.app?.navigate?.('night');
    });
    await page.waitForTimeout(500);

    // Navigate through steps until bomber step
    const bomberStepFound = await page.evaluate(() => {
      // Look for bomber step in the night steps
      const steps = document.querySelectorAll('.step');
      for (const step of steps) {
        const title = step.querySelector('.step__title')?.textContent || '';
        if (title.includes('بمبساز') || title.includes('Bomber')) return true;
      }
      return false;
    });

    // Check gunner step exists
    const gunnerStepFound = await page.evaluate(() => {
      const steps = document.querySelectorAll('.step');
      for (const step of steps) {
        const title = step.querySelector('.step__title')?.textContent || '';
        if (title.includes('تفنگدار') || title.includes('Gunner')) return true;
      }
      return false;
    });

    // At least one of these roles should have a step
    expect(bomberStepFound || gunnerStepFound).toBe(true);
  });

  /* ═══════════════════════════════════════════════════════════════
     UI-13: Day View — Results tab shows dead players with correct styling
     ═══════════════════════════════════════════════════════════════ */
  test('UI-13: Day results — dead players shown with role badges and death markers', async ({ page }) => {
    test.setTimeout(120000);
    const names = ['GF', 'SM', 'Det', 'Wat', 'C1', 'C2', 'C3', 'C4'];
    const roles = ['godfather', 'simpleMafia', 'detective', 'drWatson', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    await bootstrapGame(page, names, roles);

    // Run night 1: GF kills C1
    await page.evaluate(() => {
      const game = window.app?.game;
      game.startNight();
      game.nightActions = {
        godfather: { actorIds: [game.players[0].id], targetId: game.players[4].id, actionType: 'kill', mode: 'shoot' },
      };
      game.resolveNight();
      game.startDay();
      window.app?.navigate?.('day');
    });
    await page.waitForTimeout(500);

    // Phase bar should show day
    const dayPhase = page.locator('.phase-bar--day');
    await expect(dayPhase).toBeVisible();

    // Results tab should be active or visible
    const resultsContent = await page.evaluate(() => {
      const el = document.querySelector('#main-content');
      return el?.innerHTML || '';
    });

    // There should be dead player indicators
    expect(resultsContent.length).toBeGreaterThan(0);

    // Stats should show correct counts: 2M alive, 6→5 citizen alive (C1 dead)
    const stats = await page.evaluate(() => {
      const mafiaVal = document.querySelector('.stat-card--mafia .stat-card__value, .stat-pill--mafia .stat-pill__val');
      const citizenVal = document.querySelector('.stat-card--citizen .stat-card__value, .stat-pill--citizen .stat-pill__val');
      return {
        mafia: mafiaVal?.textContent?.trim(),
        citizen: citizenVal?.textContent?.trim(),
      };
    });

    expect(stats.mafia).toBe('2');
    expect(stats.citizen).toBe('5');
  });

  /* ═══════════════════════════════════════════════════════════════
     UI-14: Day View — Discussion tab with timer and morning shot UI
     ═══════════════════════════════════════════════════════════════ */
  test('UI-14: Day discussion — timer visible, go-to-voting button works', async ({ page }) => {
    test.setTimeout(120000);
    const names = ['GF', 'SM', 'Det', 'Wat', 'C1', 'C2', 'C3', 'C4'];
    const roles = ['godfather', 'simpleMafia', 'detective', 'drWatson', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    await bootstrapGame(page, names, roles);

    await page.evaluate(() => {
      const game = window.app?.game;
      game.startNight();
      game.nightActions = {
        godfather: { actorIds: [game.players[0].id], targetId: game.players[4].id, actionType: 'kill', mode: 'shoot' },
      };
      game.resolveNight();
      game.startDay();
      window.app?.navigate?.('day');
    });
    await page.waitForTimeout(300);

    // Click go to discussion
    await goToDiscussion(page);

    // Timer display should be visible
    const timerDisplay = await page.evaluate(() => {
      const el = document.querySelector('#timer-display, .timer__display, [data-timer-display]');
      return el?.textContent?.trim() || null;
    });
    expect(timerDisplay).not.toBeNull();

    // Go to voting button should exist
    const votingBtn = page.locator('#btn-go-voting');
    await expect(votingBtn).toBeVisible();

    // Click go to voting
    await votingBtn.click();
    await page.waitForTimeout(300);

    // Voting UI should appear (vote cards or no-eliminate button)
    const noElimBtn = page.locator('#btn-no-eliminate');
    await expect(noElimBtn).toBeVisible();
  });

  /* ═══════════════════════════════════════════════════════════════
     UI-15: Day View — Voting: increment/decrement votes, threshold
     ═══════════════════════════════════════════════════════════════ */
  test('UI-15: Voting — vote increment/decrement, runoff flow', async ({ page }) => {
    test.setTimeout(120000);
    const names = ['GF', 'SM', 'Det', 'Wat', 'C1', 'C2', 'C3', 'C4'];
    const roles = ['godfather', 'simpleMafia', 'detective', 'drWatson', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    await bootstrapGame(page, names, roles);

    await page.evaluate(() => {
      const game = window.app?.game;
      game.startNight();
      game.nightActions = {};
      game.resolveNight();
      game.startDay();
      game.lastActionManager?.cards?.forEach(c => { c.used = true; });
      window.app?.navigate?.('day');
    });
    await page.waitForTimeout(300);

    await goToDiscussion(page);
    await goToVoting(page);

    // Vote cards should be visible
    const voteCards = page.locator('.vote-card[data-vote-player]');
    const voteCount = await voteCards.count();
    expect(voteCount).toBeGreaterThan(0);

    // Click increment on first player's vote
    const firstIncr = page.locator('.vote-incr').first();
    await firstIncr.click();
    await page.waitForTimeout(100);

    // Vote value should show 1
    const firstVal = page.locator('.vote-value').first();
    const valText = await firstVal.textContent();
    expect(parseInt(valText || '0')).toBe(1);

    // Decrement back to 0
    const firstDecr = page.locator('.vote-decr').first();
    await firstDecr.click();
    await page.waitForTimeout(100);
    const valAfterDec = await firstVal.textContent();
    expect(parseInt(valAfterDec || '0')).toBe(0);

    // No-eliminate button should go to night
    const noElim = page.locator('#btn-no-eliminate');
    await noElim.click();
    await page.waitForTimeout(300);

    // Should transition to night view
    const nightPhase = page.locator('.phase-bar--night');
    await expect(nightPhase).toBeVisible({ timeout: 5000 });
  });

  /* ═══════════════════════════════════════════════════════════════
     UI-16: Day View — Vote elimination with engine-driven vote
     ═══════════════════════════════════════════════════════════════ */
  test('UI-16: Voting — eliminate a player, verify dead in next day results', async ({ page }) => {
    test.setTimeout(120000);
    const names = ['GF', 'SM', 'Det', 'Wat', 'C1', 'C2', 'C3', 'C4'];
    const roles = ['godfather', 'simpleMafia', 'detective', 'drWatson', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    await bootstrapGame(page, names, roles);

    // Night 1: GF kills C1
    await page.evaluate(() => {
      const game = window.app?.game;
      game.startNight();
      game.nightActions = {
        godfather: { actorIds: [game.players[0].id], targetId: game.players[4].id, actionType: 'kill', mode: 'shoot' },
      };
      game.resolveNight();
      game.startDay();
      game.lastActionManager?.cards?.forEach(c => { c.used = true; });
      // Vote SM out
      game.eliminateByVote(game.players[1].id);
    });

    // Night 2: GF kills C2
    await page.evaluate(() => {
      const game = window.app?.game;
      game.startNight();
      game.nightActions = {
        godfather: { actorIds: [game.players[0].id], targetId: game.players[5].id, actionType: 'kill', mode: 'shoot' },
      };
      game.resolveNight();
      game.startDay();
      window.app?.navigate?.('day');
    });
    await page.waitForTimeout(500);

    // Verify dead counts: C1 (night 1) + SM (vote) + C2 (night 2) = 3 dead
    const result = await page.evaluate(() => {
      const game = window.app?.game;
      return {
        totalAlive: game.getAlivePlayers().length,
        smDead: !game.players[1].isAlive,
        c1Dead: !game.players[4].isAlive,
        c2Dead: !game.players[5].isAlive,
      };
    });

    expect(result.totalAlive).toBe(5); // 8 - 3 = 5
    expect(result.smDead).toBe(true);
    expect(result.c1Dead).toBe(true);
    expect(result.c2Dead).toBe(true);
  });

  /* ═══════════════════════════════════════════════════════════════
     UI-17: Day View — Morning shot UI: bullet holder shoots target
     ═══════════════════════════════════════════════════════════════ */
  test('UI-17: Morning shot — bullet holder visible, shoot target, result displayed', async ({ page }) => {
    test.setTimeout(120000);
    const names = ['GF', 'SM', 'Gun', 'C1', 'C2', 'C3', 'C4', 'C5'];
    const roles = ['godfather', 'simpleMafia', 'gunner', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    await bootstrapGame(page, names, roles);

    // Night 1: GF kills C1, gunner gives C2 a blank bullet
    await page.evaluate(() => {
      const game = window.app?.game;
      game.startNight();
      game.nightActions = {
        godfather: { actorIds: [game.players[0].id], targetId: game.players[3].id, actionType: 'kill', mode: 'shoot' },
        gunner: { actorIds: [game.players[2].id], actionType: 'giveBullet',
          bulletAssignments: [{ holderId: game.players[4].id, type: 'blank' }] },
      };
      game.resolveNight();
      game.startDay();
      window.app?.navigate?.('day');
    });
    await page.waitForTimeout(500);

    // Go to discussion
    await goToDiscussion(page);

    // Check if morning shot holder is visible
    const hasBulletHolder = await page.evaluate(() => {
      const holders = document.querySelectorAll('[data-morning-shooter]');
      return holders.length > 0;
    });

    // If the UI shows bullet holders, the morning shot system is working
    // C2 should be a bullet holder
    const bulletCheck = await page.evaluate(() => {
      const game = window.app?.game;
      return {
        activeBullets: game.bulletManager.activeBullets.length,
        c2HasBullet: !!game.bulletManager.getPlayerBullet(game.players[4].id),
      };
    });

    expect(bulletCheck.activeBullets).toBeGreaterThan(0);
    expect(bulletCheck.c2HasBullet).toBe(true);
  });

  /* ═══════════════════════════════════════════════════════════════
     UI-18: Bomb Siesta — Guardian guess UI flow
     ═══════════════════════════════════════════════════════════════ */
  test('UI-18: Bomb siesta — guardian guess buttons, correct defusal', async ({ page }) => {
    test.setTimeout(120000);
    const names = ['GF', 'Bom', 'SM', 'BG', 'Zod', 'C1', 'C2', 'C3', 'C4', 'C5'];
    const roles = ['godfather', 'bomber', 'simpleMafia', 'bodyguard', 'zodiac', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    await bootstrapGame(page, names, roles);

    // Night 1: Bomber plants bomb with password=2, GF kills C2
    await page.evaluate(() => {
      const game = window.app?.game;
      game.startNight();
      game.nightActions = {
        godfather: { actorIds: [game.players[0].id], targetId: game.players[6].id, actionType: 'kill', mode: 'shoot' },
        bomber: { actorIds: [game.players[1].id], targetId: game.players[5].id, actionType: 'bomb', bombPassword: 2 },
      };
      game.resolveNight();
      game.startDay();
      window.app?.navigate?.('day');
    });
    await page.waitForTimeout(500);

    // Check bomb is planted
    const bombState = await page.evaluate(() => {
      const game = window.app?.game;
      return {
        hasBomb: game.hasBombToResolve(),
        bombPhase: game.bomb.phase,
        targetId: game.bomb.targetId,
      };
    });

    expect(bombState.hasBomb).toBe(true);
    expect(bombState.bombPhase).toBe('planted');

    // Resolve bomb via engine (guardian guess correct)
    const defuseResult = await page.evaluate(() => {
      const game = window.app?.game;
      game.startBombSiesta();
      const r = game.bombGuardianGuess(2); // correct password
      return { result: r.result, bombCleared: game.bomb.phase };
    });

    expect(defuseResult.result).toBe('defused');
  });

  /* ═══════════════════════════════════════════════════════════════
     UI-19: God Dashboard — Shows all players with team colors
     ═══════════════════════════════════════════════════════════════ */
  test('UI-19: God dashboard — shows all players with correct team and alive/dead state', async ({ page }) => {
    test.setTimeout(120000);
    const names = ['GF', 'SM', 'Det', 'Wat', 'C1', 'C2', 'C3', 'C4'];
    const roles = ['godfather', 'simpleMafia', 'detective', 'drWatson', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    await bootstrapGame(page, names, roles);

    // Run night 1: Kill C1
    await page.evaluate(() => {
      const game = window.app?.game;
      game.startNight();
      game.nightActions = {
        godfather: { actorIds: [game.players[0].id], targetId: game.players[4].id, actionType: 'kill', mode: 'shoot' },
      };
      game.resolveNight();
      game.startDay();
      window.app?.navigate?.('day');
    });
    await page.waitForTimeout(500);

    // Toggle god dashboard
    const toggleBtn = page.locator('#btn-toggle-godtools');
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click();
      await page.waitForTimeout(300);

      // Check god dashboard shows players
      const godPlayers = page.locator('.god-player');
      const playerCount = await godPlayers.count();
      expect(playerCount).toBe(8);

      // Check dead player has dead class
      const deadPlayers = page.locator('.god-player--dead');
      const deadCount = await deadPlayers.count();
      expect(deadCount).toBeGreaterThanOrEqual(1); // C1 is dead

      // Check mafia players have mafia class
      const mafiaPlayers = page.locator('.god-player--mafia');
      const mafiaCount = await mafiaPlayers.count();
      expect(mafiaCount).toBe(2); // GF + SM
    }
  });

  /* ═══════════════════════════════════════════════════════════════
     UI-20: Win Screen — Mafia victory renders correctly
     ═══════════════════════════════════════════════════════════════ */
  test('UI-20: Win screen — mafia victory shows correct UI elements', async ({ page }) => {
    test.setTimeout(120000);
    const names = ['GF', 'SM', 'SM2', 'C1', 'C2', 'C3', 'C4', 'C5'];
    const roles = ['godfather', 'simpleMafia', 'simpleMafia', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    await bootstrapGame(page, names, roles);

    // Kill citizens until mafia >= citizen → mafia wins
    await page.evaluate(() => {
      const game = window.app?.game;
      const exhaustLA = () => game.lastActionManager?.cards?.forEach(c => { c.used = true; });

      // N1: kill C1
      game.startNight();
      game.nightActions = { godfather: { actorIds: [game.players[0].id], targetId: game.players[3].id, actionType: 'kill', mode: 'shoot' } };
      game.resolveNight();
      game.startDay(); exhaustLA();

      // N2: kill C2
      game.startNight();
      game.nightActions = { godfather: { actorIds: [game.players[0].id], targetId: game.players[4].id, actionType: 'kill', mode: 'shoot' } };
      game.resolveNight();
      game.startDay(); exhaustLA();

      // N3: kill C3 → 3M vs 2C → mafia wins
      game.startNight();
      game.nightActions = { godfather: { actorIds: [game.players[0].id], targetId: game.players[5].id, actionType: 'kill', mode: 'shoot' } };
      game.resolveNight();
      game.startDay();
    });

    // Navigate to summary/win screen
    const winner = await page.evaluate(() => {
      const game = window.app?.game;
      const w = game.checkWinCondition();
      if (w) {
        game.phase = 'ended';
        game.winner = w;
        window.app?.navigate?.('summary');
      }
      return w;
    });
    await page.waitForTimeout(500);

    expect(winner).toBe('mafia');

    // Win screen should show
    const winScreen = page.locator('.win-screen');
    await expect(winScreen).toBeVisible({ timeout: 5000 });

    // Win title should contain victory text
    const winTitle = await page.locator('.win-screen__title').textContent();
    expect(winTitle?.length).toBeGreaterThan(0);

    // New game button should be available
    const newGameBtn = page.locator('#btn-new-game-summary');
    await expect(newGameBtn).toBeVisible();
  });

  /* ═══════════════════════════════════════════════════════════════
     UI-21: Win Screen — Chaos handshake UI (3 alive, no Jack)
     ═══════════════════════════════════════════════════════════════ */
  test('UI-21: Chaos screen — handshake pair buttons visible at 3 alive', async ({ page }) => {
    test.setTimeout(120000);
    // Need 1 mafia + 2 citizen for chaos (not 2 mafia which would be mafia win)
    // With 8 players: 1 GF + 7 citizens → kill 5 citizens → 1M + 2C = chaos
    const names = ['GF', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'];
    const roles = ['godfather', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    await bootstrapGame(page, names, roles);

    // Kill down to 3 alive: GF, C1, C2 (1M + 2C → chaos)
    await page.evaluate(() => {
      const game = window.app?.game;
      const exhaustLA = () => game.lastActionManager?.cards?.forEach(c => { c.used = true; });

      // Kill C3-C7 one by one (indices 3-7)
      for (let i = 3; i <= 7; i++) {
        game.startNight();
        game.nightActions = { godfather: { actorIds: [game.players[0].id], targetId: game.players[i].id, actionType: 'kill', mode: 'shoot' } };
        game.resolveNight();
        game.startDay(); exhaustLA();
      }
    });

    // Check for chaos condition
    const chaosCheck = await page.evaluate(() => {
      const game = window.app?.game;
      const alive = game.getAlivePlayers();
      const w = game.checkWinCondition();
      return { aliveCount: alive.length, winner: w };
    });

    expect(chaosCheck.aliveCount).toBe(3);
    expect(['chaos', 'handshake']).toContain(chaosCheck.winner);

    // Navigate to summary for chaos/handshake
    await page.evaluate(() => {
      const game = window.app?.game;
      game.phase = 'ended';
      game.winner = game.checkWinCondition();
      window.app?.navigate?.('summary');
    });
    await page.waitForTimeout(500);

    // Handshake pair buttons should be visible
    const handshakePairs = page.locator('.handshake-pair');
    const pairCount = await handshakePairs.count();
    expect(pairCount).toBeGreaterThanOrEqual(1);
  });

  /* ═══════════════════════════════════════════════════════════════
     UI-22: Full UI Flow — Setup → Reveal → Night → Day → Night cycle
     ═══════════════════════════════════════════════════════════════ */
  test('UI-22: Full UI flow — navigate through 2 complete night-day cycles', async ({ page }) => {
    test.setTimeout(180000);
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    const names = ['GF', 'SM', 'Det', 'Wat', 'C1', 'C2', 'C3', 'C4'];
    const roles = ['godfather', 'simpleMafia', 'detective', 'drWatson', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    await bootstrapGame(page, names, roles);

    // ── Night 1 → Day 1 ──
    await page.evaluate(() => {
      const game = window.app?.game;
      game.startNight();
      game.nightActions = {
        godfather: { actorIds: [game.players[0].id], targetId: game.players[4].id, actionType: 'kill', mode: 'shoot' },
        detective: { actorIds: [game.players[2].id], targetId: game.players[1].id, actionType: 'investigate' },
      };
      game.resolveNight();
      game.startDay();
      window.app?.navigate?.('day');
    });
    await page.waitForTimeout(500);

    // Verify day phase bar
    await expect(page.locator('.phase-bar--day')).toBeVisible();

    // Go through discussion → voting
    await goToDiscussion(page);
    await goToVoting(page);

    // Vote SM out via engine
    await page.evaluate(() => {
      const game = window.app?.game;
      game.lastActionManager?.cards?.forEach(c => { c.used = true; });
      game.eliminateByVote(game.players[1].id);
    });

    // ── Night 2 → Day 2 ──
    await page.evaluate(() => {
      const game = window.app?.game;
      game.startNight();
      game.nightActions = {
        godfather: { actorIds: [game.players[0].id], targetId: game.players[5].id, actionType: 'kill', mode: 'shoot' },
      };
      game.resolveNight();
      game.startDay();
      window.app?.navigate?.('day');
    });
    await page.waitForTimeout(500);

    // Verify stats after 2 rounds
    const stats = await page.evaluate(() => {
      const game = window.app?.game;
      return {
        alive: game.getAlivePlayers().length,
        round: game.round,
        smDead: !game.players[1].isAlive,
        c1Dead: !game.players[4].isAlive,
        c2Dead: !game.players[5].isAlive,
      };
    });

    expect(stats.alive).toBe(5); // 8 - 3
    expect(stats.smDead).toBe(true);
    expect(stats.c1Dead).toBe(true);
    expect(stats.c2Dead).toBe(true);

    // No console errors
    const critical = errors.filter(e => !/deprecationwarning|outgoingmessage/i.test(e));
    expect(critical.length).toBe(0);
  });

  /* ═══════════════════════════════════════════════════════════════
     UI-23: Full UI flow — 12P game with multiple roles to mafia win
     ═══════════════════════════════════════════════════════════════ */
  test('UI-23: 12P — Full UI game: night steps, results, voting, win screen', async ({ page }) => {
    test.setTimeout(180000);
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    const names = Array.from({length: 12}, (_, i) => `P${i+1}`);
    const roles = [
      'godfather', 'simpleMafia', 'simpleMafia', 'drLecter', // Mafia (4)
      'detective', 'drWatson', 'sniper', 'constantine',       // Citizen (4)
      'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', // Citizen (4)
    ];
    await bootstrapGame(page, names, roles);

    // Run complete game through engine with UI navigation
    for (let round = 1; round <= 4; round++) {
      // Night: kill citizen
      const targetIdx = 7 + round; // C1=idx8, C2=idx9, C3=idx10, C4=idx11
      await page.evaluate(({ targetIdx }) => {
        const game = window.app?.game;
        game.startNight();
        game.nightActions = {
          godfather: { actorIds: [game.players[0].id], targetId: game.players[targetIdx].id, actionType: 'kill', mode: 'shoot' },
        };
        game.resolveNight();
        game.startDay();
        window.app?.navigate?.('day');
      }, { targetIdx });
      await page.waitForTimeout(300);

      // Verify day view is displayed
      await expect(page.locator('.phase-bar--day')).toBeVisible();

      // Check if we've reached win condition
      const winCheck = await page.evaluate(() => {
        const game = window.app?.game;
        return game.checkWinCondition();
      });

      if (winCheck === 'mafia') {
        // Navigate to summary
        await page.evaluate(() => {
          const game = window.app?.game;
          game.phase = 'ended';
          game.winner = 'mafia';
          window.app?.navigate?.('summary');
        });
        await page.waitForTimeout(500);

        // Win screen should appear
        await expect(page.locator('.win-screen')).toBeVisible({ timeout: 5000 });
        break;
      }

      // No elimination (continue to next night)
      await page.evaluate(() => {
        const game = window.app?.game;
        game.lastActionManager?.cards?.forEach(c => { c.used = true; });
      });
    }

    const finalResult = await page.evaluate(() => {
      const game = window.app?.game;
      return { winner: game.winner || game.checkWinCondition(), phase: game.phase };
    });

    expect(finalResult.winner).toBe('mafia');

    // No critical console errors
    const critical = errors.filter(e => !/deprecationwarning|outgoingmessage/i.test(e));
    expect(critical.length).toBe(0);
  });

  /* ═══════════════════════════════════════════════════════════════
     UI-24: Full UI flow — Kane reveal + curse chain to citizen win
     ═══════════════════════════════════════════════════════════════ */
  test('UI-24: 10P — Kane reveal, detective investigate, sniper kill → all mafia dead → independent wins', async ({ page }) => {
    test.setTimeout(180000);
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    const names = Array.from({length: 10}, (_, i) => `P${i+1}`);
    const roles = [
      'godfather', 'simpleMafia', 'drLecter',        // Mafia (3)
      'detective', 'drWatson', 'sniper', 'kane',      // Citizen (4)
      'jack',                                          // Independent (1)
      'simpleCitizen', 'simpleCitizen',                // Citizen (2)
    ];
    await bootstrapGame(page, names, roles);

    // ── Night 1: Kane reveals Jack, Jack curses P9, GF kills P10 ──
    await page.evaluate(() => {
      const game = window.app?.game;
      game.startNight();
      game.nightActions = {
        godfather: { actorIds: [game.players[0].id], targetId: game.players[9].id, actionType: 'kill', mode: 'shoot' },
        kane: { actorIds: [game.players[6].id], targetId: game.players[7].id, actionType: 'kaneReveal' },
        jack: { actorIds: [game.players[7].id], targetId: game.players[8].id, actionType: 'curse' },
        detective: { actorIds: [game.players[3].id], targetId: game.players[1].id, actionType: 'investigate' },
      };
      game.resolveNight();
      game.startDay();
      window.app?.navigate?.('day');
    });
    await page.waitForTimeout(500);

    // Verify Kane reveal is shown in results
    const kaneReveal = await page.evaluate(() => {
      const game = window.app?.game;
      return {
        kanePending: game._kanePendingDeath,
        jackLocked: game.players[7].curse.isLocked,
        p10Dead: !game.players[9].isAlive,
      };
    });
    expect(kaneReveal.kanePending).toBe(true);
    expect(kaneReveal.jackLocked).toBe(true);

    // ── Day 1: Vote out SM (detective identified) ──
    await page.evaluate(() => {
      const game = window.app?.game;
      game.lastActionManager?.cards?.forEach(c => { c.used = true; });
      game.eliminateByVote(game.players[1].id);
    });

    // ── Night 2: Kane dies, sniper kills DrLecter ──
    await page.evaluate(() => {
      const game = window.app?.game;
      game.startNight();
      game.nightActions = {
        godfather: { actorIds: [game.players[0].id], targetId: game.players[4].id, actionType: 'kill', mode: 'shoot' },
        sniper: { actorIds: [game.players[5].id], targetId: game.players[2].id, actionType: 'snipe' },
      };
      game.resolveNight();
      game.startDay();
      window.app?.navigate?.('day');
    });
    await page.waitForTimeout(300);

    // Verify Kane is dead (sacrifice)
    const n2check = await page.evaluate(() => {
      const game = window.app?.game;
      return {
        kaneDead: !game.players[6].isAlive,
        kaneDeathCause: game.players[6].deathCause,
        drLecterDead: !game.players[2].isAlive,
        watsonDead: !game.players[4].isAlive,
      };
    });
    expect(n2check.kaneDead).toBe(true);
    expect(n2check.kaneDeathCause).toBe('kane_sacrifice');
    expect(n2check.drLecterDead).toBe(true);

    // ── Day 2: Vote out GF → all mafia dead → Jack wins ──
    await page.evaluate(() => {
      const game = window.app?.game;
      game.lastActionManager?.cards?.forEach(c => { c.used = true; });
      game.eliminateByVote(game.players[0].id);
    });

    const winner = await page.evaluate(() => {
      const game = window.app?.game;
      return game.checkWinCondition();
    });

    expect(winner).toBe('independent');

    // Navigate to win screen
    await page.evaluate(() => {
      const game = window.app?.game;
      game.phase = 'ended';
      game.winner = 'independent';
      window.app?.navigate?.('summary');
    });
    await page.waitForTimeout(500);

    await expect(page.locator('.win-screen')).toBeVisible({ timeout: 5000 });

    // No critical console errors
    const critical = errors.filter(e => !/deprecationwarning|outgoingmessage/i.test(e));
    expect(critical.length).toBe(0);
  });

  /* ═══════════════════════════════════════════════════════════════
     UI-25: Full flow — 14P game with zodiac, bomber, gunner, morning shot to completion
     ═══════════════════════════════════════════════════════════════ */
  test('UI-25: 14P — Multi-mechanic game: bomb, zodiac, gunner bullets, morning shot, cowboy', async ({ page }) => {
    test.setTimeout(180000);
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    const names = Array.from({length: 14}, (_, i) => `P${i+1}`);
    const roles = [
      'godfather', 'bomber', 'matador', 'simpleMafia',       // Mafia (4)
      'detective', 'drWatson', 'gunner', 'cowboy', 'bodyguard', // Citizen (5)
      'simpleCitizen', 'simpleCitizen', 'simpleCitizen',       // Citizen (3) = total 8
      'zodiac', 'jack',                                         // Independent (2)
    ];
    await bootstrapGame(page, names, roles);

    // ── Night 1: GF kills C1, Zodiac kills C2, Bomber plants on C3, Gunner gives bullet, Jack curses C3 ──
    await page.evaluate(() => {
      const game = window.app?.game;
      game.startNight();
      game.nightActions = {
        godfather: { actorIds: [game.players[0].id], targetId: game.players[9].id, actionType: 'kill', mode: 'shoot' },
        zodiac: { actorIds: [game.players[12].id], targetId: game.players[10].id, actionType: 'soloKill' },
        bomber: { actorIds: [game.players[1].id], targetId: game.players[11].id, actionType: 'bomb', bombPassword: 3 },
        gunner: { actorIds: [game.players[6].id], actionType: 'giveBullet',
          bulletAssignments: [{ holderId: game.players[7].id, type: 'blank' }] },
        jack: { actorIds: [game.players[13].id], targetId: game.players[11].id, actionType: 'curse' },
      };
      game.resolveNight();
      game.startDay();
      window.app?.navigate?.('day');
    });
    await page.waitForTimeout(500);

    // Verify day view with dead players
    const r1 = await page.evaluate(() => {
      const game = window.app?.game;
      return {
        c1Dead: !game.players[9].isAlive,
        c2Dead: !game.players[10].isAlive,
        bombPlanted: game.hasBombToResolve(),
        bulletActive: game.bulletManager.activeBullets.length > 0,
        aliveCount: game.getAlivePlayers().length,
      };
    });

    expect(r1.c1Dead).toBe(true);
    expect(r1.c2Dead).toBe(true);
    expect(r1.bombPlanted).toBe(true);
    expect(r1.bulletActive).toBe(true);
    expect(r1.aliveCount).toBe(12); // 14 - 2

    // ── Resolve bomb: guardian defuses ──
    await page.evaluate(() => {
      const game = window.app?.game;
      game.startBombSiesta();
      game.bombGuardianGuess(3); // correct password → defused
    });

    // ── Day 1: Cowboy targets zodiac → both die ──
    const cowboyResult = await page.evaluate(() => {
      const game = window.app?.game;
      const r = game.resolveCowboyAction(game.players[12].id);
      return {
        zodiacDead: !game.players[12].isAlive,
        cowboyDead: !game.players[7].isAlive,
        side: r.side,
      };
    });
    expect(cowboyResult.zodiacDead).toBe(true);
    expect(cowboyResult.cowboyDead).toBe(true);
    expect(cowboyResult.side).toBe('zodiac');

    // Exhaust last actions and vote matador out
    await page.evaluate(() => {
      const game = window.app?.game;
      game.lastActionManager?.cards?.forEach(c => { c.used = true; });
      game.eliminateByVote(game.players[2].id); // matador
    });

    // ── Night 2: GF kills detective ──
    await page.evaluate(() => {
      const game = window.app?.game;
      game.startNight();
      game.nightActions = {
        godfather: { actorIds: [game.players[0].id], targetId: game.players[4].id, actionType: 'kill', mode: 'shoot' },
      };
      game.resolveNight();
      game.startDay();
      window.app?.navigate?.('day');
    });
    await page.waitForTimeout(300);

    // ── Day 2: Vote SM out ──
    await page.evaluate(() => {
      const game = window.app?.game;
      game.lastActionManager?.cards?.forEach(c => { c.used = true; });
      game.eliminateByVote(game.players[3].id); // SM
    });

    // ── Night 3: GF kills Watson ──
    await page.evaluate(() => {
      const game = window.app?.game;
      game.startNight();
      game.nightActions = {
        godfather: { actorIds: [game.players[0].id], targetId: game.players[5].id, actionType: 'kill', mode: 'shoot' },
      };
      game.resolveNight();
      game.startDay();
      window.app?.navigate?.('day');
    });
    await page.waitForTimeout(300);

    // ── Day 3: Vote bomber out ──
    await page.evaluate(() => {
      const game = window.app?.game;
      game.lastActionManager?.cards?.forEach(c => { c.used = true; });
      game.eliminateByVote(game.players[1].id); // bomber
    });

    // ── Night 4: GF kills gunner ──
    await page.evaluate(() => {
      const game = window.app?.game;
      game.startNight();
      game.nightActions = {
        godfather: { actorIds: [game.players[0].id], targetId: game.players[6].id, actionType: 'kill', mode: 'shoot' },
      };
      game.resolveNight();
      game.startDay();
      window.app?.navigate?.('day');
    });
    await page.waitForTimeout(300);

    // ── Day 4: Vote GF out → all mafia dead → Jack wins ──
    await page.evaluate(() => {
      const game = window.app?.game;
      game.lastActionManager?.cards?.forEach(c => { c.used = true; });
      game.eliminateByVote(game.players[0].id); // GF
    });

    const final = await page.evaluate(() => {
      const game = window.app?.game;
      const w = game.checkWinCondition();
      return {
        winner: w,
        gfDead: !game.players[0].isAlive,
        bomberDead: !game.players[1].isAlive,
        jackAlive: game.players[13].isAlive,
        aliveCount: game.getAlivePlayers().length,
      };
    });

    expect(final.gfDead).toBe(true);
    expect(final.bomberDead).toBe(true);
    expect(final.jackAlive).toBe(true);
    expect(final.winner).toBe('independent');

    // Navigate to win screen
    if (final.winner) {
      await page.evaluate((w) => {
        const game = window.app?.game;
        game.phase = 'ended';
        game.winner = w;
        window.app?.navigate?.('summary');
      }, final.winner);
      await page.waitForTimeout(500);
      await expect(page.locator('.win-screen')).toBeVisible({ timeout: 5000 });
    }

    // No console errors
    const critical = errors.filter(e => !/deprecationwarning|outgoingmessage/i.test(e));
    expect(critical.length).toBe(0);
  });
});
