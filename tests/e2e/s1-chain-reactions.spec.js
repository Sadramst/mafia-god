import { test, expect } from '@playwright/test';

/**
 * S1 — Chain Reactions & Misleading Signals — Full E2E Visual Test
 *
 * 16 players, full timeline:
 *   Home → Setup (16 players) → Roles → Assign → Reveal → BlindDay → BlindNight
 *   → Night 1 → Day 1 → Night 2 → Day 2 → Night 3 → Day 3 → Final victory check
 *
 * Uses page.evaluate() for clicks that are behind sticky headers/nav overlays.
 */
test.describe('S1 — Chain Reactions E2E', () => {
  test('Full 16-player game flow with chain reactions', async ({ page }) => {
    test.setTimeout(240000);
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    /* ──── Helpers ──── */

    /** Click via DOM evaluation to avoid overlay interception */
    const domClick = async (selector) => {
      return page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        el.click();
        return true;
      }, selector);
    };

    /** Resolve all night-phase steps via DOM clicks */
    /** Resolve all night-phase steps via DOM clicks.
     *  Handles: mafiaReveal, godfather mode, bomber password, gunner bullets,
     *  detective, sniper, jack curse, zodiac, standard target+confirm steps.
     */
    const resolveNightFlow = async (maxIter = 100) => {
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

    /** Wait for a selector, then click it via DOM */
    const waitAndClick = async (selector, timeout = 10000) => {
      await page.locator(selector).first().waitFor({ state: 'visible', timeout });
      await domClick(selector);
    };

    /** Resolve bomb siesta (noon nap) if it appears after voting click */
    const resolveSiestaIfPresent = async () => {
      for (let i = 0; i < 20; i++) {
        const action = await page.evaluate(() => {
          const click = (sel) => {
            const el = document.querySelector(sel);
            if (!el || el.hasAttribute('disabled')) return false;
            el.click();
            return true;
          };
          if (click('#btn-siesta-continue')) return 'done';
          if (click('#btn-guardian-skip')) return 'guardian-skip';
          if (click('#btn-target-confirm:not([disabled])')) return 'target-confirm';
          if (click('#btn-guardian-confirm:not([disabled])')) return 'guardian-confirm';
          if (!document.querySelector('[data-siesta-guess].selected')) {
            if (click('[data-siesta-guess]')) return 'guess';
          }
          return null;
        });
        if (action === 'done' || action === null) break;
        await page.waitForTimeout(200);
      }
    };

    /** Pass through an entire day phase: results → discussion → voting → no-eliminate */
    const passDayPhase = async (label = 'Day') => {
      // Check if game ended
      const phase = await page.evaluate(() => window.app?.game?.phase);
      if (phase === 'ended') { console.log(`  ${label}: game ended`); return 'ended'; }

      await waitAndClick('#btn-go-discussion');
      await waitAndClick('#btn-go-voting');

      // Handle siesta if bomb present
      const hasSiesta = await page.locator('#btn-guardian-skip, #btn-guardian-yes, [data-siesta-guess]')
        .first().isVisible({ timeout: 1000 }).catch(() => false);
      if (hasSiesta) {
        await resolveSiestaIfPresent();
      }

      // Check if game ended after siesta
      const phase2 = await page.evaluate(() => window.app?.game?.phase);
      if (phase2 === 'ended') return 'ended';

      // Now on voting tab
      await expect(page.locator('#btn-no-eliminate')).toBeVisible({ timeout: 10000 });
      await domClick('#btn-no-eliminate');
      return 'ok';
    };

    /** Resolve a night phase (wait for steps, then resolve all) */
    const passNightPhase = async () => {
      const phase = await page.evaluate(() => window.app?.game?.phase);
      if (phase === 'ended') return 'ended';

      await expect(page.locator('#btn-toggle-dashboard')).toBeVisible({ timeout: 10000 });
      await page.waitForSelector('.step.active', { timeout: 10000 });
      const ok = await resolveNightFlow();
      expect(ok).toBe(true);
      return 'ok';
    };

    /* ═══ 1. LOAD APP ═══ */
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    /* ═══ 2. START NEW GAME ═══ */
    await expect(page.locator('#btn-new-game')).toBeVisible();
    await page.locator('#btn-new-game').click();
    await expect(page.locator('#player-name-input')).toBeVisible();

    /* ═══ 3. ADD 16 PLAYERS ═══ */
    const playerNames = [
      'Arash', 'Babak', 'Cyrus', 'Dara', 'Ebi', 'Farhad',
      'Gita', 'Hamed', 'Iman', 'Javad', 'Kian', 'Lily',
      'Mina', 'Navid', 'Omid', 'Parsa',
    ];
    for (const name of playerNames) {
      await page.locator('#player-name-input').fill(name);
      await page.locator('#btn-add-player').click();
    }
    await expect(page.locator('.player-item')).toHaveCount(16);

    /* ═══ 4. SELECT S1 ROLES (inject via engine) ═══ */
    // Switch to roles tab
    await page.locator('.tab[data-tab="roles"]').evaluate((el) => el.click());
    await expect(page.locator('.role-card[data-role="godfather"]')).toBeVisible();

    // Inject exact S1 role set + desired team counts
    await page.evaluate(() => {
      const game = window.app?.game;
      if (!game) return;
      game.setSelectedRoles({
        sniper: 1,
        simpleCitizen: 2,
        suspect: 1,
        zodiac: 1,
        freemason: 1,
        gunner: 1,
        jack: 1,
        bomber: 1,
        drWatson: 1,
        bodyguard: 1,
        drLecter: 1,
        detective: 1,
        godfather: 1,
        constantine: 1,
        kane: 1,
      });
      // 4 mafia (godfather, drLecter, bomber, ???) — actually the S1 scenario has:
      // Mafia team: godfather, drLecter, bomber = 3 mafia roles
      // Let engine compute; we set 16 roles total which must equal 16 players.
      // Need 16 roles: the 15 above = 15, add 1 more simpleCitizen → 16
      game.selectedRoles.simpleCitizen = 2; // already set above
      // That's 15 roles. We need one more. Let me count:
      //   sniper(1) + simpleCitizen(2) + suspect(1) + zodiac(1) + freemason(1) + gunner(1)
      //   + jack(1) + bomber(1) + drWatson(1) + bodyguard(1) + drLecter(1) + detective(1)
      //   + godfather(1) + constantine(1) + kane(1) = 16 ✓
      game.setDesiredMafia(3);
      const setupView = window.app?.views?.setup;
      if (setupView) { setupView.activeTab = 'assign'; setupView.render(); }
    });

    // Verify: 16 players, 16 roles
    const state = await page.evaluate(() => ({
      players: window.app?.game?.players?.length || 0,
      totalRoles: window.app?.game?.getTotalRoleCount?.() || 0,
    }));
    expect(state.players).toBe(16);
    expect(state.totalRoles).toBe(16);

    /* ═══ 5. ASSIGN ROLES ═══ */
    await expect(page.locator('#btn-random-assign')).toBeEnabled();
    await page.locator('#btn-random-assign').click();

    /* ═══ 6. ROLE REVEAL ═══ */
    await expect(page.locator('#reveal-card')).toBeVisible();
    for (let i = 0; i < 16; i++) {
      await page.locator('#reveal-card').click();
      await page.locator('#btn-next-reveal').click();
    }

    /* ═══ 7. BLIND DAY ═══ */
    await expect(page.locator('#btn-start-blind-day')).toBeVisible();
    await page.locator('#btn-start-blind-day').click();
    await expect(page.locator('#btn-end-blind-day')).toBeVisible();
    await page.locator('#btn-end-blind-day').click();

    /* ═══ 8. BLIND NIGHT ═══ */
    await page.waitForSelector('.step.active', { timeout: 10000 });
    const blindOk = await resolveNightFlow();
    expect(blindOk).toBe(true);

    /* ═══ 9. DAY 1 ═══ */
    const d1 = await passDayPhase('Day 1');

    /* ═══ 10. NIGHT 1 ═══ */
    if (d1 !== 'ended') await passNightPhase('Night 1');

    /* ═══ 11. DAY 2 ═══ */
    const d2 = await passDayPhase('Day 2');

    /* ═══ 12. NIGHT 2 ═══ */
    if (d2 !== 'ended') await passNightPhase('Night 2');

    /* ═══ 13. DAY 3 ═══ */
    const d3 = await passDayPhase('Day 3');

    /* ═══ 14. NIGHT 3 ═══ */
    if (d3 !== 'ended') await passNightPhase('Night 3');

    /* ═══ 15. FINAL STATE VERIFICATION ═══ */
    const finalState = await page.evaluate(() => {
      const game = window.app?.game;
      if (!game) return null;
      const alivePlayers = game.players.filter(p => p.isAlive);
      const deadPlayers = game.players.filter(p => !p.isAlive);
      return {
        phase: game.phase,
        round: game.round,
        totalPlayers: game.players.length,
        alivePlayers: alivePlayers.length,
        deadPlayers: deadPlayers.length,
        history: game.history.length,
      };
    });

    expect(finalState).not.toBeNull();
    expect(finalState.totalPlayers).toBe(16);
    // After 3 nights + blind night, at least some players should be dead
    expect(finalState.deadPlayers).toBeGreaterThanOrEqual(1);
    // Game history should have recorded events
    expect(finalState.history).toBeGreaterThanOrEqual(3);

    await page.screenshot({ path: 'test-results/s1-chain-reactions-final.png', fullPage: true });

    // Filter noisy warnings
    const criticalErrors = consoleErrors.filter(
      (e) => !/deprecationwarning|outgoingmessage|ERR_BLOCKED_BY_RESPONSE/i.test(e)
    );
    expect(criticalErrors, `Console errors: ${criticalErrors.join(' | ')}`).toEqual([]);
  });
});
