import { test, expect } from '@playwright/test';

/**
 * Jack-Kane E2E — Full game scenarios for:
 *   1. Kane reveals Jack → curse locked, cursed player dies → Jack eliminated
 *   2. Kill scenarios — all kill types properly eliminate players
 *   3. Locked curse persists across night transitions
 *   4. Day shoot / vote / cowboy locks Jack curse
 */
test.describe('Jack-Kane Curse Lock — E2E', () => {

  /** Setup a game with specific roles via engine injection */
  const setupGameWithRoles = async (page, playerNames, roles) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('#btn-new-game')).toBeVisible();
    await page.locator('#btn-new-game').click();
    await expect(page.locator('#player-name-input')).toBeVisible();

    for (const name of playerNames) {
      await page.locator('#player-name-input').fill(name);
      await page.locator('#btn-add-player').click();
    }

    // Assign roles via engine
    await page.evaluate((roleList) => {
      const game = window.app?.game;
      if (!game) return;
      game.players.forEach((p, i) => { p.roleId = roleList[i]; });
    }, roles);
  };

  /* ═══════════════════════════════════════════════════════════════
     TEST 1: Kane reveals Jack → curse locked → cursed player dies → Jack eliminated
     ═══════════════════════════════════════════════════════════════ */
  test('Kane reveals Jack → curse locked, cursed player death eliminates Jack', async ({ page }) => {
    test.setTimeout(120000);
    const consoleErrors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

    const players = ['Ali', 'Babak', 'Cyrus', 'Dara', 'Ebi', 'Farhad', 'Gita', 'Hamed'];
    const roles = ['kane', 'jack', 'godfather', 'drLecter', 'drWatson', 'simpleCitizen', 'simpleCitizen', 'simpleMafia'];
    await setupGameWithRoles(page, players, roles);

    // Run Night 1: Kane reveals Jack, Jack curses Farhad, Mafia shoots Gita
    const night1 = await page.evaluate(() => {
      const game = window.app?.game;
      if (!game) return { error: 'no game' };

      game.startNight();
      Object.assign(game.nightActions, {
        godfather: { actorIds: [game.players[2].id], targetId: game.players[6].id, actionType: 'shoot', mode: 'shoot' },
        jack: { actorIds: [game.players[1].id], targetId: game.players[5].id, actionType: 'curse' },
        kane: { actorIds: [game.players[0].id], targetId: game.players[1].id, actionType: 'kaneReveal' },
      });
      const results = game.resolveNight();

      return {
        kaneReveal: results.kaneReveal,
        jackCurseLocked: game.players[1].curse.isLocked,
        jackCurseTarget: game.players[1].curse.targetId,
        farhad: game.players[5].id,
        gitaDead: !game.players[6].isAlive,
        jackAlive: game.players[1].isAlive,
        kanePendingDeath: game._kanePendingDeath,
      };
    });

    // Verify Kane reveal
    expect(night1.kaneReveal).toBeTruthy();
    expect(night1.kaneReveal.targetName).toBe('Babak'); // Jack's player name
    expect(night1.jackCurseLocked).toBe(true);
    expect(night1.jackCurseTarget).toBe(night1.farhad); // Curse locked on Farhad
    expect(night1.gitaDead).toBe(true); // Mafia kill
    expect(night1.jackAlive).toBe(true);
    expect(night1.kanePendingDeath).toBe(true);

    // Navigate to day view
    await page.evaluate(() => { window.app.navigate('day'); });
    await page.waitForTimeout(500);

    // Verify announcement text visible
    const pageText = await page.textContent('body');
    expect(pageText).toContain('Babak'); // Jack's name shown in reveal

    // Night 2: Mafia kills Farhad (cursed target) → Jack should die too
    const night2 = await page.evaluate(() => {
      const game = window.app?.game;
      if (!game) return { error: 'no game' };

      // Verify curse survived night transition
      const jackPlayer = game.players[1];
      const cursePersisted = jackPlayer.curse.isLocked && jackPlayer.curse.targetId === game.players[5].id;

      game.startNight();
      
      // Curse should STILL be on Farhad after startNight
      const curseAfterStart = jackPlayer.curse.isLocked && jackPlayer.curse.targetId === game.players[5].id;

      Object.assign(game.nightActions, {
        godfather: { actorIds: [game.players[2].id], targetId: game.players[5].id, actionType: 'shoot', mode: 'shoot' },
      });
      const results = game.resolveNight();

      return {
        cursePersisted,
        curseAfterStart,
        farhadDead: !game.players[5].isAlive,
        jackDead: !game.players[1].isAlive,
        jackDeathCause: game.players[1].deathCause,
        jackCurseTriggered: results.jackCurseTriggered,
        kaneDead: !game.players[0].isAlive, // Kane should also die this night
        kaneDeathCause: game.players[0].deathCause,
      };
    });

    // Verify locked curse persisted through night transition
    expect(night2.cursePersisted).toBe(true);
    expect(night2.curseAfterStart).toBe(true);

    // Verify curse chain triggered
    expect(night2.farhadDead).toBe(true);
    expect(night2.jackCurseTriggered).toBe(true);
    expect(night2.jackDead).toBe(true);
    expect(night2.jackDeathCause).toBe('curse');

    // Kane also dies this night (sacrifice)
    expect(night2.kaneDead).toBe(true);
    expect(night2.kaneDeathCause).toBe('kane_sacrifice');

    console.log('✅ Kane reveals Jack → curse locked → cursed dies → Jack eliminated');
  });

  /* ═══════════════════════════════════════════════════════════════
     TEST 2: All kill types properly eliminate players
     ═══════════════════════════════════════════════════════════════ */
  test('All kill types properly eliminate non-immune players', async ({ page }) => {
    test.setTimeout(120000);

    const players = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];
    const roles = ['godfather', 'simpleMafia', 'drWatson', 'detective', 'cowboy', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    await setupGameWithRoles(page, players, roles);

    const results = await page.evaluate(() => {
      const game = window.app?.game;
      if (!game) return { error: 'no game' };

      const out = {};

      // Test 1: Mafia night shoot kills citizen
      game.startNight();
      Object.assign(game.nightActions, {
        godfather: { actorIds: [game.players[0].id], targetId: game.players[5].id, actionType: 'shoot', mode: 'shoot' },
      });
      const r1 = game.resolveNight();
      out.mafiaKill = !game.players[5].isAlive;
      out.mafiaKillCause = game.players[5].deathCause;

      // Test 2: Vote kills citizen
      game.round = 1; game.phase = 'day';
      game.lastActionManager.cards.forEach(c => c.used = true);
      game.eliminateByVote(game.players[6].id);
      out.voteKill = !game.players[6].isAlive;
      out.voteKillCause = game.players[6].deathCause;

      // Test 3: Cowboy kills mafia
      game.round = 2; game.phase = 'day';
      const cowboyResult = game.resolveCowboyAction(game.players[1].id);
      out.cowboyKill = !game.players[1].isAlive;
      out.cowboySide = cowboyResult.side;

      // Test 4: Salakhi kills correctly
      game.players[7].isAlive = true; game.players[7].deathRound = null; game.players[7].deathCause = null;
      game.startNight();
      Object.assign(game.nightActions, {
        godfather: { actorIds: [game.players[0].id], targetId: game.players[7].id, mode: 'salakhi', guessedRoleId: 'simpleCitizen' },
      });
      const r4 = game.resolveNight();
      out.salakhiKill = !game.players[7].isAlive;
      out.salakhiCorrect = r4.salakhied?.correct;

      return out;
    });

    expect(results.mafiaKill).toBe(true);
    expect(results.mafiaKillCause).toBe('mafia');
    expect(results.voteKill).toBe(true);
    expect(results.voteKillCause).toBe('vote');
    expect(results.cowboyKill).toBe(true);
    expect(results.cowboySide).toBe('mafia');
    expect(results.salakhiKill).toBe(true);
    expect(results.salakhiCorrect).toBe(true);

    console.log('✅ All kill types properly eliminate players');
  });

  /* ═══════════════════════════════════════════════════════════════
     TEST 3: Locked curse persists across multiple night transitions
     ═══════════════════════════════════════════════════════════════ */
  test('Locked curse persists across 3 night transitions', async ({ page }) => {
    test.setTimeout(120000);

    const players = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];
    const roles = ['jack', 'godfather', 'simpleMafia', 'drWatson', 'kane', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    await setupGameWithRoles(page, players, roles);

    const results = await page.evaluate(() => {
      const game = window.app?.game;
      if (!game) return { error: 'no game' };

      const jack = game.players[0];
      const cursedTarget = game.players[5]; // P6

      // Night 1: Jack curses P6, Kane reveals Jack
      game.startNight();
      Object.assign(game.nightActions, {
        godfather: { actorIds: [game.players[1].id], targetId: game.players[7].id, actionType: 'shoot', mode: 'shoot' },
        jack: { actorIds: [jack.id], targetId: cursedTarget.id, actionType: 'curse' },
        kane: { actorIds: [game.players[4].id], targetId: jack.id, actionType: 'kaneReveal' },
      });
      game.resolveNight();

      const after1 = { locked: jack.curse.isLocked, target: jack.curse.targetId === cursedTarget.id };

      // Night 2: Just mafia action
      game.startNight();
      const after2 = { locked: jack.curse.isLocked, target: jack.curse.targetId === cursedTarget.id };
      Object.assign(game.nightActions, {
        godfather: { actorIds: [game.players[1].id], targetId: game.players[6].id, actionType: 'shoot', mode: 'shoot' },
      });
      game.resolveNight();

      // Night 3: Check again
      game.startNight();
      const after3 = { locked: jack.curse.isLocked, target: jack.curse.targetId === cursedTarget.id };

      // Now kill the cursed target
      Object.assign(game.nightActions, {
        godfather: { actorIds: [game.players[1].id], targetId: cursedTarget.id, actionType: 'shoot', mode: 'shoot' },
      });
      const r3 = game.resolveNight();

      return {
        after1, after2, after3,
        cursedDead: !cursedTarget.isAlive,
        jackDead: !jack.isAlive,
        jackCurseTriggered: r3.jackCurseTriggered,
      };
    });

    // Curse stayed locked across all nights
    expect(results.after1).toEqual({ locked: true, target: true });
    expect(results.after2).toEqual({ locked: true, target: true });
    expect(results.after3).toEqual({ locked: true, target: true });

    // Curse chain triggered on Night 3
    expect(results.cursedDead).toBe(true);
    expect(results.jackCurseTriggered).toBe(true);
    expect(results.jackDead).toBe(true);

    console.log('✅ Locked curse persists across 3 nights and triggers correctly');
  });

  /* ═══════════════════════════════════════════════════════════════
     TEST 4: Day shoot locks curse, survives next night, then triggers
     ═══════════════════════════════════════════════════════════════ */
  test('Day morning shot locks Jack curse → triggers on target death', async ({ page }) => {
    test.setTimeout(120000);

    const players = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];
    const roles = ['jack', 'godfather', 'simpleMafia', 'gunner', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    await setupGameWithRoles(page, players, roles);

    const results = await page.evaluate(() => {
      const game = window.app?.game;
      if (!game) return { error: 'no game' };

      const jack = game.players[0];
      const cursedTarget = game.players[4]; // P5

      // Night 1: Jack curses P5, Gunner gives live bullet to P6
      game.bulletManager.init(2, 2);
      game.startNight();
      Object.assign(game.nightActions, {
        godfather: { actorIds: [game.players[1].id], targetId: game.players[7].id, actionType: 'shoot', mode: 'shoot' },
        jack: { actorIds: [jack.id], targetId: cursedTarget.id, actionType: 'curse' },
        gunner: { actorIds: [game.players[3].id], targetId: game.players[5].id, actionType: 'giveBullet', bulletType: 'live' },
      });
      game.resolveNight();

      // Day: Morning shot on Jack → Jack survives, curse locked
      game.round = 1; game.phase = 'day';
      game.bulletManager.giveBullet(game.players[5].id, 'live');
      const shotResult = game.resolveMorningShot(game.players[5].id, jack.id);

      const afterShot = {
        jackAlive: jack.isAlive,
        curseLocked: jack.curse.isLocked,
        curseTarget: jack.curse.targetId === cursedTarget.id,
      };

      // Night 2: Mafia kills P5 (cursed target)
      game.startNight();
      const afterNightStart = {
        curseLocked: jack.curse.isLocked,
        curseTarget: jack.curse.targetId === cursedTarget.id,
      };

      Object.assign(game.nightActions, {
        godfather: { actorIds: [game.players[1].id], targetId: cursedTarget.id, actionType: 'shoot', mode: 'shoot' },
      });
      const r2 = game.resolveNight();

      return {
        afterShot,
        afterNightStart,
        cursedDead: !cursedTarget.isAlive,
        jackDead: !jack.isAlive,
        jackCurseTriggered: r2.jackCurseTriggered,
        jackDeathCause: jack.deathCause,
      };
    });

    // Morning shot locked the curse
    expect(results.afterShot.jackAlive).toBe(true);
    expect(results.afterShot.curseLocked).toBe(true);
    expect(results.afterShot.curseTarget).toBe(true);

    // Curse persisted through night transition
    expect(results.afterNightStart.curseLocked).toBe(true);
    expect(results.afterNightStart.curseTarget).toBe(true);

    // Curse chain triggered
    expect(results.cursedDead).toBe(true);
    expect(results.jackCurseTriggered).toBe(true);
    expect(results.jackDead).toBe(true);
    expect(results.jackDeathCause).toBe('curse');

    console.log('✅ Day morning shot locks curse → triggers on target death');
  });

  /* ═══════════════════════════════════════════════════════════════
     TEST 5: Vote on Jack locks curse → triggers on target death
     ═══════════════════════════════════════════════════════════════ */
  test('Vote on Jack locks curse → cursed player voted out → Jack dies', async ({ page }) => {
    test.setTimeout(120000);

    const players = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];
    const roles = ['jack', 'godfather', 'simpleMafia', 'drWatson', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen', 'simpleCitizen'];
    await setupGameWithRoles(page, players, roles);

    const results = await page.evaluate(() => {
      const game = window.app?.game;
      if (!game) return { error: 'no game' };

      const jack = game.players[0];
      const cursedTarget = game.players[4]; // P5

      // Night 1: Jack curses P5
      game.startNight();
      Object.assign(game.nightActions, {
        godfather: { actorIds: [game.players[1].id], targetId: game.players[7].id, actionType: 'shoot', mode: 'shoot' },
        jack: { actorIds: [jack.id], targetId: cursedTarget.id, actionType: 'curse' },
      });
      game.resolveNight();

      // Day 1: Vote Jack → immune, curse locked
      game.round = 1; game.phase = 'day';
      const voteResult = game.eliminateByVote(jack.id);

      const afterVote = {
        jackAlive: jack.isAlive,
        voteImmune: voteResult.voteImmune,
        curseLocked: jack.curse.isLocked,
        curseTarget: jack.curse.targetId === cursedTarget.id,
      };

      // Day 2: Vote out P5 (cursed target)
      game.round = 2; game.phase = 'day';
      game.lastActionManager.cards.forEach(c => c.used = true);
      const voteResult2 = game.eliminateByVote(cursedTarget.id);

      return {
        afterVote,
        cursedDead: !cursedTarget.isAlive,
        jackDead: !jack.isAlive,
        jackCurseTriggered: voteResult2.jackCurseTriggered,
      };
    });

    expect(results.afterVote.jackAlive).toBe(true);
    expect(results.afterVote.voteImmune).toBe(true);
    expect(results.afterVote.curseLocked).toBe(true);
    expect(results.afterVote.curseTarget).toBe(true);

    expect(results.cursedDead).toBe(true);
    expect(results.jackCurseTriggered).toBe(true);
    expect(results.jackDead).toBe(true);

    console.log('✅ Vote locks curse → cursed dies → Jack dies');
  });

  /* ═══════════════════════════════════════════════════════════════
     TEST 6: Full multi-round game with Jack, Kane, kills, and curse chain
     ═══════════════════════════════════════════════════════════════ */
  test('Full game: Kane reveals Jack, multiple rounds, curse chain triggers', async ({ page }) => {
    test.setTimeout(180000);

    const players = ['Ali', 'Babak', 'Cyrus', 'Dara', 'Ebi', 'Farhad', 'Gita', 'Hamed', 'Iman', 'Jafar'];
    const roles = ['kane', 'jack', 'godfather', 'drLecter', 'drWatson', 'detective', 'cowboy', 'simpleCitizen', 'simpleMafia', 'simpleCitizen'];
    await setupGameWithRoles(page, players, roles);

    const results = await page.evaluate(() => {
      const game = window.app?.game;
      if (!game) return { error: 'no game' };

      const kane = game.players[0];
      const jack = game.players[1];
      const gf = game.players[2];
      const cursedPlayer = game.players[7]; // Hamed (simpleCitizen)

      // ─── Night 1: Setup ───
      game.startNight();
      Object.assign(game.nightActions, {
        godfather: { actorIds: [gf.id], targetId: game.players[9].id, actionType: 'shoot', mode: 'shoot' },
        jack: { actorIds: [jack.id], targetId: cursedPlayer.id, actionType: 'curse' },
        kane: { actorIds: [kane.id], targetId: jack.id, actionType: 'kaneReveal' },
      });
      const r1 = game.resolveNight();

      const afterNight1 = {
        kaneRevealed: !!r1.kaneReveal,
        jackCurseLocked: jack.curse.isLocked,
        jackCurseTarget: jack.curse.targetId,
        jafarDead: !game.players[9].isAlive,
        kaneAlive: kane.isAlive,
        jackAlive: jack.isAlive,
      };

      // ─── Day 1: Cowboy shoots simpleMafia ───
      game.round = 1; game.phase = 'day';
      const cowboyResult = game.resolveCowboyAction(game.players[8].id); // Iman = simpleMafia

      const afterDay1 = {
        imanDead: !game.players[8].isAlive,
        cowboySide: cowboyResult.side,
      };

      // ─── Night 2: Kane dies (sacrifice), mafia kills detective ───
      game.startNight();
      const jackCurseAfterNight2Start = {
        locked: jack.curse.isLocked,
        target: jack.curse.targetId === cursedPlayer.id,
      };
      Object.assign(game.nightActions, {
        godfather: { actorIds: [gf.id], targetId: game.players[5].id, actionType: 'shoot', mode: 'shoot' },
      });
      const r2 = game.resolveNight();

      const afterNight2 = {
        kaneDead: !kane.isAlive,
        kaneDeathCause: kane.deathCause,
        detectiveDead: !game.players[5].isAlive,
        jackAlive: jack.isAlive,
        cursePersisted: jack.curse.isLocked && jack.curse.targetId === cursedPlayer.id,
      };

      // ─── Night 3: Mafia kills Hamed (cursed target) → Jack should die ───
      game.startNight();
      Object.assign(game.nightActions, {
        godfather: { actorIds: [gf.id], targetId: cursedPlayer.id, actionType: 'shoot', mode: 'shoot' },
      });
      const r3 = game.resolveNight();

      const afterNight3 = {
        hamedDead: !cursedPlayer.isAlive,
        jackDead: !jack.isAlive,
        jackDeathCause: jack.deathCause,
        jackCurseTriggered: r3.jackCurseTriggered,
      };

      // Count alive
      const alivePlayers = game.players.filter(p => p.isAlive);

      return {
        afterNight1, afterDay1, jackCurseAfterNight2Start,
        afterNight2, afterNight3,
        aliveCount: alivePlayers.length,
        aliveNames: alivePlayers.map(p => p.nameEn),
      };
    });

    // Night 1: Kane revealed Jack, curse locked
    expect(results.afterNight1.kaneRevealed).toBe(true);
    expect(results.afterNight1.jackCurseLocked).toBe(true);
    expect(results.afterNight1.jafarDead).toBe(true);
    expect(results.afterNight1.kaneAlive).toBe(true);
    expect(results.afterNight1.jackAlive).toBe(true);

    // Day 1: Cowboy killed simpleMafia
    expect(results.afterDay1.imanDead).toBe(true);
    expect(results.afterDay1.cowboySide).toBe('mafia');

    // Night 2 start: Curse still locked
    expect(results.jackCurseAfterNight2Start).toEqual({ locked: true, target: true });

    // Night 2: Kane sacrificed, detective killed
    expect(results.afterNight2.kaneDead).toBe(true);
    expect(results.afterNight2.kaneDeathCause).toBe('kane_sacrifice');
    expect(results.afterNight2.detectiveDead).toBe(true);
    expect(results.afterNight2.cursePersisted).toBe(true);

    // Night 3: Cursed player killed → Jack dies
    expect(results.afterNight3.hamedDead).toBe(true);
    expect(results.afterNight3.jackCurseTriggered).toBe(true);
    expect(results.afterNight3.jackDead).toBe(true);
    expect(results.afterNight3.jackDeathCause).toBe('curse');

    console.log('✅ Full multi-round game completed successfully');
    console.log(`   Alive players: ${results.aliveNames.join(', ')} (${results.aliveCount} remaining)`);
  });
});
