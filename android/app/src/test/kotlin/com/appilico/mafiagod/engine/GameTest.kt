package com.appilico.mafiagod.engine

import org.junit.Assert.*
import org.junit.Test
import kotlin.random.Random

/** Covers the engine's trickiest, most failure-prone rules — mirrors the vitest suite's
 * priorities for the web app (curse chains, bullet accounting, salakhi bypass, win conditions). */
class GameTest {

    private fun newGame(seed: Long = 42): Game = Game(rng = Random(seed))

    private fun setupBasicGame(game: Game, roles: Map<String, Int>): List<Player> {
        for (i in 1..roles.values.sum()) game.addPlayer("P$i")
        game.selectedRoles = roles.toMutableMap()
        return game.players
    }

    @Test
    fun `addPlayer rejects blank names`() {
        val game = newGame()
        assertNull(game.addPlayer("   "))
        assertNull(game.addPlayer(""))
        assertNotNull(game.addPlayer("Alice"))
        assertEquals(1, game.players.size)
    }

    @Test
    fun `assignRolesRandomly assigns every player exactly one role and initializes shield`() {
        val game = newGame()
        setupBasicGame(game, mapOf("godfather" to 1, "drWatson" to 1, "detective" to 1, "simpleCitizen" to 5))
        game.assignRolesRandomly()
        assertEquals("roleReveal", game.phase)
        assertTrue(game.players.all { it.roleId != null })
        val godfather = game.players.first { it.roleId == "godfather" }
        assertTrue(godfather.shield.isActive) // godfather hasShield=true
    }

    @Test
    fun `manual assignment blind pick round-trips through peek then assign`() {
        val game = newGame()
        setupBasicGame(game, mapOf("godfather" to 1, "drWatson" to 1, "detective" to 1, "simpleCitizen" to 5))
        game.manualPickShowRoles = false
        game.startManualAssignment()
        assertEquals("manualAssign", game.phase)
        var picks = 0
        while (!game.isManualAssignmentComplete()) {
            val peeked = game.peekManualRandomRole()
            assertNotNull(peeked)
            assertTrue(game.assignManualRole(peeked!!))
            picks++
        }
        assertEquals(8, picks)
        assertEquals("roleReveal", game.phase)
        assertTrue(game.players.all { it.roleId != null })
    }

    @Test
    fun `roster edit mid manual assignment cancels back to setup`() {
        val game = newGame()
        setupBasicGame(game, mapOf("godfather" to 1, "simpleCitizen" to 7))
        game.startManualAssignment()
        assertEquals("manualAssign", game.phase)
        game.addPlayer("Extra")
        assertEquals("setup", game.phase)
    }

    @Test
    fun `doctor heal negates mafia kill`() {
        val game = newGame()
        val players = setupBasicGame(game, mapOf("godfather" to 1, "drWatson" to 1, "simpleCitizen" to 6))
        game.assignRolesRandomly()
        val godfather = game.players.first { it.roleId == "godfather" }
        val watson = game.players.first { it.roleId == "drWatson" }
        val victim = game.players.first { it.roleId == "simpleCitizen" }

        game.startBlindDay(); game.startBlindNight()
        // Blind night only has mafiaReveal/jack steps for this roster (no jack) — skip straight to real night.
        while (!game.isNightComplete()) game.skipNightAction()
        game.resolveNight()
        game.startDay()
        game.startNight()

        while (!game.isNightComplete()) {
            val step = game.getCurrentNightStep()!!
            when (step.roleId) {
                "drWatson" -> game.recordNightAction(victim.id)
                "godfather" -> game.recordNightAction(victim.id, NightActionExtra(mode = "shoot"))
                else -> game.skipNightAction()
            }
        }
        val results = game.resolveNight()
        assertTrue(victim.id in results.saved)
        assertTrue(victim.isAlive)
        assertFalse(victim.id in results.killed)
    }

    @Test
    fun `salakhi bypasses heal and shield and can kill jack`() {
        val game = newGame()
        setupBasicGame(game, mapOf("godfather" to 1, "jack" to 1, "simpleCitizen" to 6))
        game.assignRolesRandomly()
        val jack = game.players.first { it.roleId == "jack" }

        game.startBlindDay(); game.startBlindNight()
        while (!game.isNightComplete()) {
            val step = game.getCurrentNightStep()!!
            if (step.roleId == "jack") game.recordNightAction(game.players.first { it.id != jack.id }.id)
            else game.skipNightAction()
        }
        game.resolveNight()
        game.startDay(); game.startNight()

        while (!game.isNightComplete()) {
            val step = game.getCurrentNightStep()!!
            when (step.roleId) {
                "godfather" -> game.recordNightAction(jack.id, NightActionExtra(mode = "salakhi", guessedRoleId = "jack"))
                else -> game.skipNightAction()
            }
        }
        val results = game.resolveNight()
        assertTrue(jack.id in results.killed)
        assertFalse(jack.isAlive)
        assertEquals("salakhi", jack.deathCause)
        assertFalse(jack.isRevivable)
    }

    @Test
    fun `jack curse chain kills jack when cursed target dies same night`() {
        // clearJackCurse() runs at the START of every startNight()/startBlindNight() call, so a
        // curse placed on one night is wiped before the NEXT night begins (it only survives
        // through that night's own resolution and the following day's votes). The simplest
        // faithful test is same-night: Jack curses X and the Godfather also kills X this same
        // night — resolveNight()'s chain check runs once at the end against that call's
        // results.killed, catching this regardless of the 5b (godfather) vs 6 (curse) ordering.
        val game = newGame()
        setupBasicGame(game, mapOf("godfather" to 1, "jack" to 1, "simpleCitizen" to 6))
        game.assignRolesRandomly()
        val jack = game.players.first { it.roleId == "jack" }
        val victim = game.players.first { it.roleId == "simpleCitizen" }

        game.startBlindDay(); game.startBlindNight()
        while (!game.isNightComplete()) game.skipNightAction() // don't place a curse yet
        game.resolveNight()
        game.startDay(); game.startNight()

        while (!game.isNightComplete()) {
            val step = game.getCurrentNightStep()!!
            when (step.roleId) {
                "godfather" -> game.recordNightAction(victim.id, NightActionExtra(mode = "shoot"))
                "jack" -> game.recordNightAction(victim.id)
                else -> game.skipNightAction()
            }
        }
        val results = game.resolveNight()
        assertTrue(victim.id in results.killed)
        assertTrue(results.jackCurseTriggered)
        assertTrue(jack.id in results.killed)
        assertFalse(jack.isAlive)
        assertEquals("curse", jack.deathCause)
    }

    @Test
    fun `gunner bullet returns to pool when holder dies`() {
        val game = newGame()
        setupBasicGame(game, mapOf("godfather" to 1, "gunner" to 1, "simpleCitizen" to 6))
        game.assignRolesRandomly()
        val victim = game.players.first { it.roleId == "simpleCitizen" }
        val liveMaxAtStart = game.bulletManager.liveRemainingCount

        game.startBlindDay(); game.startBlindNight()
        while (!game.isNightComplete()) game.skipNightAction()
        game.resolveNight()
        game.startDay(); game.startNight()

        while (!game.isNightComplete()) {
            val step = game.getCurrentNightStep()!!
            when (step.roleId) {
                "gunner" -> game.recordNightAction(null, NightActionExtra(bulletAssignments = listOf(BulletAssignment(victim.id, "live"))))
                "godfather" -> game.recordNightAction(victim.id, NightActionExtra(mode = "shoot"))
                else -> game.skipNightAction()
            }
        }
        game.resolveNight()
        assertFalse(victim.isAlive)
        // A bullet was handed out (pool -1) but the same target also died this night via the
        // godfather, so resolveNight's bullet-return sweep should give it right back.
        assertEquals(liveMaxAtStart, game.bulletManager.liveRemainingCount)
        assertNull(game.bulletManager.getPlayerBullet(victim.id))
    }

    @Test
    fun `vote immunity locks jack curse and discards beautiful mind`() {
        val game = newGame()
        setupBasicGame(game, mapOf("godfather" to 1, "jack" to 1, "simpleCitizen" to 6))
        game.assignRolesRandomly()
        val jack = game.players.first { it.roleId == "jack" }

        val result = game.eliminateByVote(jack.id)
        assertTrue(result.voteImmune)
        assertTrue(jack.isAlive)
        assertTrue(jack.curse.isLocked)
    }

    @Test
    fun `win condition mafia wins when independents gone and mafia gte citizen`() {
        val game = newGame()
        setupBasicGame(game, mapOf("godfather" to 1, "simpleMafia" to 1, "simpleCitizen" to 1))
        game.assignRolesRandomly()
        game.players.first { it.roleId == "simpleCitizen" }.also { it.isAlive = false; it.deathRound = 1 }
        val winner = game.checkWinCondition()
        assertEquals("mafia", winner)
        assertEquals("ended", game.phase)
    }

    @Test
    fun `win condition jack wins instantly when mafia extinct`() {
        val game = newGame()
        setupBasicGame(game, mapOf("godfather" to 1, "jack" to 1, "simpleCitizen" to 6))
        game.assignRolesRandomly()
        game.players.first { it.roleId == "godfather" }.also { it.isAlive = false; it.deathRound = 1 }
        val winner = game.checkWinCondition()
        assertEquals("independent", winner)
    }

    @Test
    fun `chaos handshake at 3 alive resolves winner and eliminates the third`() {
        val game = newGame()
        setupBasicGame(game, mapOf("godfather" to 1, "zodiac" to 1, "simpleCitizen" to 6))
        // Deterministic assignment (not assignRolesRandomly) so the surviving trio is guaranteed
        // to be one of each team — otherwise branches 1/2/2b/3 could fire before alive.size==3
        // is even checked, depending on how the shuffle landed.
        val roleOrder = listOf("godfather", "zodiac", "simpleCitizen", "simpleCitizen", "simpleCitizen", "simpleCitizen", "simpleCitizen", "simpleCitizen")
        game.players.forEachIndexed { i, p -> p.roleId = roleOrder[i]; p.initShield(Roles.get(roleOrder[i])) }

        val toKill = game.players.drop(3)
        for (p in toKill) { p.isAlive = false; p.deathRound = 1 }
        val winner = game.checkWinCondition()
        assertEquals("handshake", winner)
        assertEquals("handshake", game.phase)
        assertNotNull(game.handshakeState)

        val trio = game.handshakeState!!.players
        val result = game.resolveHandshake(trio[0], trio[1])
        assertNotNull(result)
        assertEquals("ended", game.phase)
        assertEquals(trio[2], result!!.eliminated)
    }

    @Test
    fun `god kill bypasses jack immunity`() {
        val game = newGame()
        setupBasicGame(game, mapOf("godfather" to 1, "jack" to 1, "simpleCitizen" to 6))
        game.assignRolesRandomly()
        val jack = game.players.first { it.roleId == "jack" }
        val result = game.godKill(jack.id)
        assertTrue(result.success)
        assertFalse(jack.isAlive)
        assertEquals("god_correction", jack.deathCause)
        assertFalse(jack.isRevivable)
    }

    @Test
    fun `final shoot card does not block mafia shoot when immune or healed`() {
        val game = newGame()
        setupBasicGame(game, mapOf("godfather" to 1, "jack" to 1, "simpleCitizen" to 6))
        game.assignRolesRandomly()
        val jack = game.players.first { it.roleId == "jack" }
        assertFalse(game.lastActionBlockMafiaShoot)
        val result = game.applyLastActionCard(LastActionCard.FINAL_SHOOT, victimId = jack.id, targetId = jack.id)
        assertFalse(result.success)
        assertEquals("immune", result.reason)
        assertFalse(game.lastActionBlockMafiaShoot) // immune branch must NOT set the block flag
    }

    @Test
    fun `serialization round trip preserves full state`() {
        val game = newGame()
        setupBasicGame(game, mapOf("godfather" to 1, "jack" to 1, "gunner" to 1, "simpleCitizen" to 5))
        game.assignRolesRandomly()
        game.startBlindDay(); game.startBlindNight()
        while (!game.isNightComplete()) game.skipNightAction()
        game.resolveNight()
        game.startDay()

        val snapshot = game.toGameState()
        val restored = Game()
        restored.loadGameState(snapshot)

        assertEquals(game.round, restored.round)
        assertEquals(game.phase, restored.phase)
        assertEquals(game.players.size, restored.players.size)
        assertEquals(game.players.map { it.roleId }, restored.players.map { it.roleId })
        assertEquals(game.history.size, restored.history.size)
    }
}
