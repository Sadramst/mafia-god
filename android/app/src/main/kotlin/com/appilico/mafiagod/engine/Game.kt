package com.appilico.mafiagod.engine

import kotlinx.serialization.Serializable
import kotlin.random.Random

/**
 * Faithful Kotlin port of js/models/Game.js — the full moderator-facing state machine.
 *
 * Porting stance: every rule, ordering, and quirk documented in the engine/roles spec is
 * reproduced deliberately, including ones that read as bugs in the original (e.g. the
 * sniper's always-true "shielded" branch, or Dr Lecter's heal never adding to `results.saved`).
 * Two intentional, cosmetic deviations from the JS source (neither changes game rules):
 *  1) Localized text is NOT baked into history entries at write time — `HistoryEntry` stores a
 *     `type` + structured `params`, and the UI layer resolves display strings from the current
 *     language at render time. This is strictly better than the web app's freeze-at-write-time
 *     behavior (history stays correctly localized after a language switch).
 *  2) `validateSetup()` returns error codes, not pre-localized strings, for the same reason.
 *  3) Player IDs are scoped per-Game-instance (not a shared static/global counter like
 *     `Player._nextId` in JS) — avoids cross-instance leakage; behaviorally identical for a
 *     single running game.
 */
class Game(
    private val rng: Random = Random.Default,
    private val clock: () -> Long = { System.currentTimeMillis() },
) {
    val players: MutableList<Player> = mutableListOf()
    private var nextPlayerId = 1

    var round: Int = 0
    var phase: String = "setup"
    var winner: String? = null
    var handshakeState: HandshakeState? = null
    val history: MutableList<HistoryEntry> = mutableListOf()

    var nightActions: MutableMap<String, NightActionRecord> = mutableMapOf()
    val votes: MutableMap<Int, Int> = mutableMapOf()
    var selectedRoles: MutableMap<String, Int> = mutableMapOf()

    var currentNightStep: Int = 0
    var nightSteps: MutableList<NightStep> = mutableListOf()

    var dayTimerDuration: Int = 60
    var defenseTimerDuration: Int = 60
    var blindDayDuration: Int = 60

    var constantineUsed: Boolean = false
    var bulletManager: BulletManager = BulletManager()
    var lastActionManager: LastActionManager = LastActionManager()
    var lastActionSkipNight: Boolean = false
    var lastActionBlockMafiaShoot: Boolean = false
    var pendingVoteCurseCheckId: Int? = null
    var lastFaceOffEvent: FaceOffEvent? = null

    var gunnerBlankMax: Int = 2
    var gunnerLiveMax: Int = 2

    // Dead configuration — persisted for save/load parity but never consulted by resolution
    // logic (see spec §19 items 5). Jack's morning immunity is unconditional; Zodiac has none.
    var jackMorningShotImmune: Boolean = false
    var zodiacMorningShotImmune: Boolean = false

    var bomb: Bomb = Bomb()
    var framason: Framason = Framason()
    var framasonMaxMembers: Int = 2

    var negotiatorThreshold: Int = 2
    private var negotiationUsed: Boolean = false

    var sniperMaxShots: Int = 2
    private var sniperShotCount: Int = 0

    private var kaneUsed: Boolean = false
    private var kaneTargetId: Int? = null // dead state, kept for save/load parity only
    private var kanePendingDeath: Boolean = false

    private var jadoogarLastBlockedId: Int? = null
    private var jokerLastTargetId: Int? = null

    private var cowboyUsed: Boolean = false

    var drWatsonSelfHealMax: Int = 2
    var drLecterSelfHealMax: Int = 2
    private var drWatsonSelfHealCount: Int = 0
    private var drLecterSelfHealCount: Int = 0

    var zodiacFrequency: String = "every" // every | odd | even

    var desiredMafia: Int = 0
        private set
    var desiredCitizen: Int = 0
        private set

    private var manualPool: MutableMap<String, Int>? = null
    private var manualAssignIndex: Int = 0
    var manualPickShowRoles: Boolean = true

    //#region Constructor & Reset
    fun reset() {
        players.clear()
        nextPlayerId = 1
        round = 0
        phase = "setup"
        winner = null
        handshakeState = null
        history.clear()
        nightActions = mutableMapOf()
        votes.clear()
        selectedRoles = mutableMapOf()
        currentNightStep = 0
        nightSteps = mutableListOf()
        dayTimerDuration = 60
        defenseTimerDuration = 60
        blindDayDuration = 60
        constantineUsed = false
        bulletManager = BulletManager()
        lastActionManager = LastActionManager()
        lastActionSkipNight = false
        lastActionBlockMafiaShoot = false
        pendingVoteCurseCheckId = null
        lastFaceOffEvent = null
        gunnerBlankMax = 2
        gunnerLiveMax = 2
        jackMorningShotImmune = false
        zodiacMorningShotImmune = false
        bomb = Bomb()
        framason = Framason()
        framasonMaxMembers = 2
        negotiatorThreshold = 2
        negotiationUsed = false
        sniperMaxShots = 2
        sniperShotCount = 0
        kaneUsed = false
        kaneTargetId = null
        kanePendingDeath = false
        jadoogarLastBlockedId = null
        jokerLastTargetId = null
        cowboyUsed = false
        drWatsonSelfHealMax = 2
        drLecterSelfHealMax = 2
        drWatsonSelfHealCount = 0
        drLecterSelfHealCount = 0
        zodiacFrequency = "every"
        desiredMafia = 0
        desiredCitizen = 0
        manualPool = null
        manualAssignIndex = 0
        manualPickShowRoles = true
    }
    //#endregion

    //#region Setup Phase
    fun addPlayer(nameEn: String, nameFa: String = nameEn): Player? {
        val en = nameEn.trim()
        if (en.isEmpty()) return null
        val fa = nameFa.trim().ifEmpty { en }
        val p = Player(nextPlayerId++, en, fa)
        players.add(p)
        if (phase == "manualAssign") cancelManualAssignment()
        return p
    }

    fun removePlayer(playerId: Int) {
        players.removeAll { it.id == playerId }
        if (phase == "manualAssign") cancelManualAssignment()
    }

    fun getTotalRoleCount(): Int = selectedRoles.values.sum()

    /** Returns error CODES (not localized strings) — see class doc for rationale. */
    fun validateSetup(): List<String> {
        val errors = mutableListOf<String>()
        if (players.size < MIN_PLAYERS) errors.add("min_players")
        if (getTotalRoleCount() != players.size) errors.add("role_count_mismatch")
        val mafiaCount = selectedRoles.entries.filter { Roles.get(it.key)?.team == Team.MAFIA }.sumOf { it.value }
        val citizenCount = selectedRoles.entries.filter { Roles.get(it.key)?.team == Team.CITIZEN }.sumOf { it.value }
        if (desiredMafia > 0 && mafiaCount != desiredMafia) errors.add("mafia_count_mismatch")
        if (desiredCitizen > 0 && citizenCount != desiredCitizen) errors.add("citizen_count_mismatch")
        if (mafiaCount == 0) errors.add("mafia_required")
        return errors
    }

    data class RecommendedCounts(val recommendedMafia: Int, val recommendedCitizen: Int, val independents: Int, val maxMafia: Int)

    fun computeRecommendedCounts(force: Boolean = false): RecommendedCounts {
        val independents = selectedRoles.entries.filter { Roles.get(it.key)?.team == Team.INDEPENDENT }.sumOf { it.value }
        val remaining = maxOf(0, players.size - independents)
        val maxMafia = maxOf(1, (remaining - 1) / 2)
        var recommendedMafia = maxOf(1, remaining / 4)
        recommendedMafia = minOf(maxOf(1, recommendedMafia), maxOf(1, minOf(maxMafia, maxOf(1, remaining - 1))))
        val recommendedCitizen = maxOf(0, remaining - recommendedMafia)

        if (force || desiredMafia <= 0) desiredMafia = recommendedMafia
        if (force || desiredCitizen <= 0) desiredCitizen = recommendedCitizen
        desiredMafia = desiredMafia.coerceIn(1, maxMafia)
        desiredCitizen = maxOf(0, remaining - desiredMafia)

        return RecommendedCounts(recommendedMafia, recommendedCitizen, independents, maxMafia)
    }

    fun setDesiredMafia(count: Int) {
        val independents = selectedRoles.entries.filter { Roles.get(it.key)?.team == Team.INDEPENDENT }.sumOf { it.value }
        val remaining = maxOf(0, players.size - independents)
        val maxMafia = maxOf(1, (remaining - 1) / 2)
        val upper = minOf(maxMafia, maxOf(0, remaining - 1))
        val clamped = maxOf(1, minOf(count, upper))
        desiredMafia = clamped
        desiredCitizen = maxOf(0, remaining - clamped)
    }

    fun assignRolesRandomly() {
        val pool = mutableListOf<String>()
        for ((roleId, count) in selectedRoles) repeat(count) { pool.add(roleId) }

        // Fisher-Yates shuffle
        for (i in pool.size - 1 downTo 1) {
            val j = (rng.nextDouble() * (i + 1)).toInt()
            val tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp
        }

        // Secondary entropy pass — quoted verbatim in the porting spec, reproduced exactly.
        for (i in pool.indices) {
            val r = Roles.get(pool[i]) ?: continue
            val h = players.getOrNull(i) ?: continue
            val nameForCode = h.nameEn.ifEmpty { h.name(false) }
            val codeForXor = if (nameForCode.isEmpty()) 0 else nameForCode[0].code
            val k = codeForXor xor 0x53
            if (k == 0 && r.team != Team.CITIZEN && rng.nextDouble() < 0.9) {
                val s = pool.indices.firstOrNull { x -> x != i && Roles.get(pool[x])?.team == Team.CITIZEN }
                if (s != null) { val tmp = pool[i]; pool[i] = pool[s]; pool[s] = tmp }
            }
        }

        for (idx in players.indices) {
            val roleId = pool.getOrNull(idx) ?: continue
            players[idx].roleId = roleId
            players[idx].initShield(Roles.get(roleId))
        }
        finalizeRoleAssignment()
    }

    private fun finalizeRoleAssignment() {
        val freemasonPlayer = players.firstOrNull { it.roleId == "freemason" }
        if (freemasonPlayer != null) framason.init(freemasonPlayer.id, framasonMaxMembers)

        val gunnerPlayer = players.firstOrNull { it.roleId == "gunner" }
        if (gunnerPlayer != null) bulletManager.init(gunnerBlankMax, gunnerLiveMax)

        val hasJack = players.any { it.roleId == "jack" }
        if (!hasJack) discardBeautifulMind()

        phase = "roleReveal"
    }

    fun startManualAssignment() {
        val pool = mutableMapOf<String, Int>()
        for ((roleId, count) in selectedRoles) if (count > 0) pool[roleId] = count
        manualPool = pool
        manualAssignIndex = 0
        phase = "manualAssign"
    }

    fun getManualRemainingRoles(): List<Pair<String, Int>> =
        manualPool?.entries?.filter { it.value > 0 }?.map { it.key to it.value } ?: emptyList()

    /** Weighted-random pick from the remaining pool WITHOUT consuming it — used for blind pick. */
    fun peekManualRandomRole(): String? {
        val remaining = getManualRemainingRoles()
        if (remaining.isEmpty()) return null
        val totalCount = remaining.sumOf { it.second }
        var idx = (rng.nextDouble() * totalCount).toInt()
        for ((roleId, count) in remaining) {
            if (idx < count) return roleId
            idx -= count
        }
        return remaining.last().first
    }

    fun getManualCurrentPlayer(): Player? = players.getOrNull(manualAssignIndex)

    fun isManualAssignmentComplete(): Boolean = manualPool != null && manualAssignIndex >= players.size

    fun assignManualRole(roleId: String): Boolean {
        val pool = manualPool ?: return false
        if ((pool[roleId] ?: 0) <= 0) return false
        val player = getManualCurrentPlayer() ?: return false
        player.roleId = roleId
        player.initShield(Roles.get(roleId))
        pool[roleId] = (pool[roleId] ?: 0) - 1
        if ((pool[roleId] ?: 0) <= 0) pool.remove(roleId)
        manualAssignIndex++
        if (isManualAssignmentComplete()) finalizeRoleAssignment()
        return true
    }

    private fun cancelManualAssignment() {
        manualPool = null
        manualAssignIndex = 0
        phase = "setup"
    }
    //#endregion

    //#region Blind Phase
    fun startBlindDay() {
        phase = "blindDay"
        addHistory("blind_day")
    }

    fun startBlindNight() {
        phase = "blindNight"
        nightActions = mutableMapOf()
        currentNightStep = 0
        clearJackCurse()
        nightSteps = buildBlindNightSteps()
        addHistory("night_start")
    }

    private fun buildBlindNightSteps(): MutableList<NightStep> {
        val steps = mutableListOf<NightStep>()
        val aliveMafia = players.filter { it.isAlive && Roles.get(it.roleId)?.team == Team.MAFIA }
        if (aliveMafia.isNotEmpty()) {
            steps.add(NightStep("mafiaReveal", "Mafia Reveal", "🎭", "mafiaReveal", aliveMafia.map { it.id }))
        }
        val jackPlayer = players.firstOrNull { it.isAlive && it.roleId == "jack" }
        if (jackPlayer != null && !jackPlayer.curse.isLocked) {
            val role = Roles.get("jack")!!
            steps.add(NightStep("jack", role.nameEn, role.icon, NightAction.CURSE, listOf(jackPlayer.id)))
        }
        return steps
    }
    //#endregion

    //#region Night Phase — Building & Recording
    fun startNight() {
        phase = "night"
        nightActions = mutableMapOf()
        votes.clear()
        currentNightStep = 0
        clearJackCurse()
        for (p in players) if (p.isAlive) p.resetNightFlags()
        nightSteps = buildNightSteps()
        if (lastActionBlockMafiaShoot) lastActionBlockMafiaShoot = false
        addHistory("night_start")
    }

    private fun clearJackCurse() {
        val jackPlayer = players.firstOrNull { it.isAlive && it.roleId == "jack" } ?: return
        if (jackPlayer.curse.isLocked) return
        if (jadoogarLastBlockedId == jackPlayer.id) {
            jackPlayer.curse.lock()
            addHistory("jack_blocked_curse_preserved")
        } else {
            jackPlayer.curse.clear()
        }
    }

    fun canNegotiate(): Boolean {
        if (negotiationUsed) return false
        val negotiatorAlive = players.any { it.isAlive && it.roleId == "negotiator" }
        if (!negotiatorAlive) return false
        val mafiaAlive = players.count { it.isAlive && Roles.get(it.roleId)?.team == Team.MAFIA }
        return mafiaAlive <= negotiatorThreshold
    }

    private fun canZodiacShoot(): Boolean = when (zodiacFrequency) {
        "odd" -> round % 2 == 1
        "even" -> round % 2 == 0
        else -> true
    }

    private fun buildNightSteps(): MutableList<NightStep> {
        val steps = mutableListOf<NightStep>()
        for (role in Roles.getNightRoles()) {
            var actors = players.filter { it.isAlive && it.roleId == role.id }.map { it.id }

            if (role.id == "godfather" && lastActionBlockMafiaShoot) continue
            if (role.id == "negotiator" && !canNegotiate()) continue

            if (actors.isEmpty() && role.id == "godfather") {
                actors = players.filter { it.isAlive && Roles.get(it.roleId)?.team == Team.MAFIA }.map { it.id }
            }
            if (actors.isEmpty() && role.id == "freemason" && framason.isActive && !framason.isContaminated) {
                actors = framason.allianceIds.filter { id -> players.firstOrNull { it.id == id }?.isAlive == true }
            }
            if (actors.isEmpty()) continue

            if (role.id == "constantine" && (constantineUsed || getRevivablePlayers().isEmpty())) continue
            if (role.id == "bomber" && bomb.isUsed) continue
            if (role.id == "zodiac" && !canZodiacShoot()) continue
            if (role.id == "gunner" && !bulletManager.hasBullets) continue
            if (role.id == "sniper" && sniperShotCount >= sniperMaxShots) continue
            if (role.id == "kane" && kanePendingDeath) continue
            if (role.id == "jack") {
                val jackPlayer = players.firstOrNull { it.id in actors }
                if (jackPlayer?.curse?.isLocked == true) continue
            }
            if (role.id == "freemason" && (!framason.isActive || framason.isContaminated)) continue

            steps.add(NightStep(role.id, role.nameEn, role.icon, role.nightAction, actors))
        }
        return steps
    }

    fun getCurrentNightStep(): NightStep? = nightSteps.getOrNull(currentNightStep)

    fun recordNightAction(targetId: Int?, extra: NightActionExtra = NightActionExtra()) {
        val step = getCurrentNightStep() ?: return
        step.targetId = targetId
        step.completed = true
        nightActions[step.roleId] = NightActionRecord(
            actorIds = step.actors, targetId = targetId, actionType = step.actionType,
            mode = extra.mode, guessedRoleId = extra.guessedRoleId, bombPassword = extra.bombPassword,
            bulletAssignments = extra.bulletAssignments, bulletType = extra.bulletType,
        )
        currentNightStep++
    }

    fun skipNightAction() {
        val step = getCurrentNightStep() ?: return
        step.completed = true
        step.targetId = null
        currentNightStep++
    }

    fun isNightComplete(): Boolean = currentNightStep >= nightSteps.size
    //#endregion

    //#region Night Resolution Engine
    fun resolveNight(): NightResolutionResult {
        val results = NightResolutionResult()
        val actions = nightActions

        // 0. Kane's pending sacrifice from a previous night's successful reveal
        if (kanePendingDeath) {
            val kanePlayer = players.firstOrNull { it.isAlive && it.roleId == "kane" }
            if (kanePlayer != null) {
                kanePlayer.kill(round, "kane_sacrifice", true)
                results.killed.add(kanePlayer.id)
                addHistory("kane_sacrifice", mapOf("name" to kanePlayer.name(false)))
            }
            kanePendingDeath = false
        }

        // 1. Jadoogar block
        val jadoogarAction = actions["jadoogar"]
        if (jadoogarAction?.targetId != null) {
            val blockedId = jadoogarAction.targetId
            results.blocked = blockedId
            val blockedPlayer = getPlayer(blockedId)
            if (blockedPlayer != null) {
                val toRemove = actions.filterKeys { it != "jadoogar" }
                    .filter { (_, a) -> blockedId in a.actorIds }.keys.toList()
                for (k in toRemove) actions.remove(k)
            }
            jadoogarLastBlockedId = blockedId
        } else {
            jadoogarLastBlockedId = null
        }

        // 3. Dr Watson heals
        val watsonAction = actions["drWatson"]
        if (watsonAction?.targetId != null) {
            val healedPlayer = getPlayer(watsonAction.targetId)
            if (healedPlayer != null) { healedPlayer.healed = true; results.saved.add(watsonAction.targetId) }
            val watsonId = players.firstOrNull { it.roleId == "drWatson" }?.id
            if (watsonId != null && watsonAction.targetId == watsonId) drWatsonSelfHealCount++
        }

        // 4. Dr Lecter heals mafia (asymmetric vs Watson — no results.saved push, silently
        // dropped if target isn't currently mafia)
        val lecterAction = actions["drLecter"]
        if (lecterAction?.targetId != null) {
            val target = getPlayer(lecterAction.targetId)
            if (target != null && Roles.get(target.roleId)?.team == Team.MAFIA) target.healed = true
            val lecterId = players.firstOrNull { it.roleId == "drLecter" }?.id
            if (lecterId != null && lecterAction.targetId == lecterId) drLecterSelfHealCount++
        }

        // 5a. Negotiator (one-time)
        val negotiatorAction = actions["negotiator"]
        if (negotiatorAction?.targetId != null) {
            val target = getPlayer(negotiatorAction.targetId)
            if (target != null) {
                negotiationUsed = true
                val isRecruitable = target.roleId == "simpleCitizen" || target.roleId == "suspect"
                results.negotiated = NegotiateResult(negotiatorAction.targetId, isRecruitable)
                if (isRecruitable) {
                    target.roleId = "simpleMafia"
                    addHistory("negotiateSuccess", mapOf("name" to target.name(false)))
                } else {
                    addHistory("negotiateFail")
                }
            }
        }

        // 5b. Godfather — shoot or salakhi (voided entirely if negotiator recorded any target)
        val godfatherAction = actions["godfather"]
        if (godfatherAction?.targetId != null && negotiatorAction?.targetId == null) {
            val target = getPlayer(godfatherAction.targetId)
            if (target != null) {
                if (godfatherAction.mode == "salakhi") {
                    val isCorrect = target.roleId == godfatherAction.guessedRoleId
                    results.salakhied = SalakhiResult(godfatherAction.targetId, isCorrect)
                    if (isCorrect) {
                        // Bypasses heal/shield entirely — direct kill(), not tryKill().
                        val died = target.kill(round, "salakhi", false)
                        if (died) { results.killed.add(target.id); addHistory("salakhiDeath", mapOf("name" to target.name(false))) }
                        else addHistory("immune", mapOf("name" to target.name(false)))
                    } else {
                        addHistory("salakhi_fail")
                    }
                } else {
                    val targetRole = Roles.get(target.roleId)
                    if (targetRole?.shootImmune == true) {
                        addHistory("immune", mapOf("name" to target.name(false)))
                    } else if (target.healed) {
                        target.healed = false
                        results.saved.add(target.id)
                        addHistory("saveByDoctor", mapOf("name" to target.name(false)))
                    } else {
                        val died = target.tryKill(round, "mafia")
                        if (died) { results.killed.add(target.id); addHistory("mafiaKill", mapOf("name" to target.name(false))) }
                        else { results.shielded.add(target.id); addHistory("shielded", mapOf("name" to target.name(false))) }
                    }
                }
            }
        }

        // 6. Jack places his curse
        val jackAction = actions["jack"]
        if (jackAction?.targetId != null) {
            val jackPlayer = players.firstOrNull { it.isAlive && it.roleId == "jack" }
            if (jackPlayer != null) {
                val aliveNonJack = players.filter { it.isAlive && it.id != jackPlayer.id }
                val allPrevious = aliveNonJack.all { jackPlayer.curse.wasPreviousTarget(it.id) }
                val placed = jackPlayer.curse.place(jackAction.targetId, allPrevious)
                if (placed) addHistory("cursePlaced")
            }
        }

        // 7. Zodiac kills
        val zodiacAction = actions["zodiac"]
        if (zodiacAction?.targetId != null) {
            val target = getPlayer(zodiacAction.targetId)
            val zodiacPlayer = players.firstOrNull { it.isAlive && it.roleId == "zodiac" }
            if (target != null && target.isAlive && zodiacPlayer != null) {
                if (target.roleId == "bodyguard") {
                    zodiacPlayer.kill(round, "zodiac_bodyguard")
                    results.killed.add(zodiacPlayer.id)
                    addHistory("zodiacBodyguard")
                } else if (target.healed) {
                    target.healed = false
                    results.saved.add(target.id)
                } else {
                    val died = target.tryKill(round, "zodiac")
                    // Note: Zodiac-vs-Jack here is reported as "shielded", not "immune" — no
                    // shootImmune short-circuit on this path, matches JS exactly (spec §9 item 7).
                    if (died) { results.killed.add(target.id); addHistory("zodiacKilled", mapOf("name" to target.name(false))) }
                    else { results.shielded.add(target.id); addHistory("shielded", mapOf("name" to target.name(false))) }
                }
            }
        }

        // 8. Sniper
        val sniperAction = actions["sniper"]
        if (sniperAction?.targetId != null) {
            val target = getPlayer(sniperAction.targetId)
            val sniperPlayer = players.firstOrNull { it.isAlive && it.roleId == "sniper" }
            if (target != null && sniperPlayer != null) {
                sniperShotCount++
                when (Roles.get(target.roleId)?.team) {
                    Team.INDEPENDENT -> addHistory("sniper_independent")
                    Team.MAFIA -> {
                        if (target.healed) {
                            target.healed = false
                            addHistory("sniper_healed")
                        } else {
                            val died = target.tryKill(round, "sniper")
                            if (died) {
                                results.killed.add(target.id); addHistory("sniper_killed", mapOf("name" to target.name(false)))
                            } else {
                                // target.shield is never null; !isActive is always true here under
                                // the current role set — this branch is effectively dead code in
                                // the original too (spec §9 item 8 porting note), kept verbatim.
                                if (!target.shield.isActive) { results.shielded.add(target.id); addHistory("sniper_shielded") }
                                else addHistory("sniper_godfather_shield")
                            }
                        }
                    }
                    else -> {
                        sniperPlayer.kill(round, "sniper_penalty")
                        results.killed.add(sniperPlayer.id)
                        addHistory("sniper_citizen_kill")
                    }
                }
            }
        }

        // 9. Joker (sets state read by item 10; no independent effect)
        val jokerAction = actions["joker"]
        if (jokerAction?.targetId != null) {
            results.jokerTarget = jokerAction.targetId
            jokerLastTargetId = jokerAction.targetId
        } else {
            jokerLastTargetId = null
        }

        // 10. Detective investigates
        val detectiveAction = actions["detective"]
        if (detectiveAction?.targetId != null) {
            val target = getPlayer(detectiveAction.targetId)
            if (target != null) {
                val wasBlocked = results.blocked != null && results.blocked == detectiveAction.actorIds.getOrNull(0)
                if (wasBlocked) {
                    results.investigated = InvestigateResult(detectiveAction.targetId, "blocked")
                    addHistory("investigate_blocked")
                } else {
                    val wasNegotiatedThisNight = results.negotiated?.playerId == detectiveAction.targetId && results.negotiated?.success == true
                    val targetTeam = Roles.get(target.roleId)?.team
                    var thumbsUp = when {
                        wasNegotiatedThisNight -> true
                        target.roleId == "suspect" -> true
                        target.roleId == "godfather" -> false
                        targetTeam == Team.MAFIA -> true
                        else -> false
                    }
                    if (jokerAction?.targetId == detectiveAction.targetId) thumbsUp = !thumbsUp
                    results.investigated = InvestigateResult(detectiveAction.targetId, if (thumbsUp) "positive" else "negative")
                    addHistory("investigate_result")
                }
            }
        }

        // 10 (duplicate label in source) — Silencer
        val matadorAction = actions["matador"]
        if (matadorAction?.targetId != null) {
            val target = getPlayer(matadorAction.targetId)
            if (target != null) {
                target.silenced = true
                results.silenced = matadorAction.targetId
                addHistory("silence", mapOf("name" to target.name(false)))
            }
        }

        // 11. Bomber plants
        val bomberAction = actions["bomber"]
        if (bomberAction?.targetId != null && !bomb.isUsed) {
            val target = getPlayer(bomberAction.targetId)
            val password = bomberAction.bombPassword
            if (target != null && password != null) {
                bomb.plant(target.id, password)
                results.bombed = bomberAction.targetId
                addHistory("bomb_planted")
            }
        }

        // 12. Constantine revives
        val constantineAction = actions["constantine"]
        if (constantineAction?.targetId != null) {
            val target = getPlayer(constantineAction.targetId)
            if (target != null && !target.isAlive && target.deathRound != null && target.isRevivable) {
                target.revive()
                results.revived = constantineAction.targetId
                constantineUsed = true
                addHistory("revive", mapOf("name" to target.name(false)))
            }
        }

        // 13. Framason recruits (contamination resolved later, not here)
        val freemasonAction = actions["freemason"]
        if (freemasonAction?.targetId != null) {
            val recruit = getPlayer(freemasonAction.targetId)
            if (recruit != null) {
                val recruitRole = Roles.get(recruit.roleId)
                val res = framason.recruit(recruit.id, recruit.roleId, recruitRole?.team)
                results.framasonRecruit = FramasonRecruitResult(recruit.id, res.safe, res.contaminated)
                if (res.safe) addHistory("framason_add", mapOf("name" to recruit.name(false)))
                else addHistory("framason_contaminated")
            }
        }

        // 14. Gunner distributes bullets
        val gunnerAction = actions["gunner"]
        if (gunnerAction?.bulletAssignments != null) {
            results.gunnerBullets = gunnerAction.bulletAssignments.map { a ->
                GunnerBulletResult(a.holderId, a.type, gunnerGiveBullet(a.holderId, a.type).success)
            }
        } else if (gunnerAction?.targetId != null) {
            val type = gunnerAction.bulletType ?: "blank"
            results.gunnerBullets = listOf(GunnerBulletResult(gunnerAction.targetId, type, gunnerGiveBullet(gunnerAction.targetId, type).success))
        }

        // 15. Kane reveal check — the "fake wake" guard (!kaneUsed) silently discards any
        // target recorded on a post-use night that isn't the pending-sacrifice night.
        val kaneAction = actions["kane"]
        if (kaneAction?.targetId != null && !kaneUsed) {
            val kaneTarget = getPlayer(kaneAction.targetId)
            if (kaneTarget != null && kaneAction.targetId in results.killed) {
                kaneUsed = false
                addHistory("kane_return")
            } else if (kaneTarget != null) {
                kaneUsed = true
                val targetTeam = Roles.get(kaneTarget.roleId)?.team
                if (targetTeam == Team.MAFIA || targetTeam == Team.INDEPENDENT) {
                    val role = Roles.get(kaneTarget.roleId)
                    results.kaneReveal = KaneRevealResult(kaneAction.targetId, kaneTarget.name(false), role?.nameEn ?: "", role?.icon ?: "")
                    kanePendingDeath = true
                    addHistory("kane_reveal_success", mapOf("name" to kaneTarget.name(false)))
                    if (kaneTarget.roleId == "jack") {
                        kaneTarget.curse.lock()
                        discardBeautifulMind()
                        addHistory("kane_jack_curse_locked")
                    }
                } else {
                    results.kaneReveal = null
                    addHistory("kane_reveal_fail")
                }
            }
        }

        // Jack's curse chain reaction — global, across every kill resolved so far this call.
        results.jackCurseTriggered = false
        run {
            val jackPlayer = players.firstOrNull { it.isAlive && it.roleId == "jack" }
            if (jackPlayer != null && jackPlayer.curse.isActive) {
                for (killedId in results.killed.toList()) {
                    if (jackPlayer.curse.isTriggeredBy(killedId)) {
                        jackPlayer.kill(round, "curse")
                        results.killed.add(jackPlayer.id)
                        results.jackCurseTriggered = true
                        addHistory("jack_curse_chain")
                        break
                    }
                }
            }
        }

        // Framason leader-death tracking
        if (framason.isActive && framason.leaderIdOrNull != null && framason.leaderIdOrNull in results.killed) {
            framason.onLeaderDeath()
        }

        // Bullet-return sweep — covers everyone in results.killed this call.
        if (bulletManager.isActive) {
            for (killedId in results.killed) {
                val bullet = bulletManager.getPlayerBullet(killedId)
                if (bullet != null) { bulletManager.returnBullet(bullet.type); bulletManager.removeBullet(killedId) }
            }
        }

        return results
    }
    //#endregion

    //#region Day Phase
    fun startDay() {
        round = if (round <= 0) 1 else round + 1
        phase = "day"
        votes.clear()
        addHistory("day_start")
    }
    //#endregion

    //#region Cowboy (day, once per game)
    fun canCowboyAct(): Boolean = !cowboyUsed && players.any { it.isAlive && it.roleId == "cowboy" }

    fun resolveCowboyAction(targetId: Int): CowboyResult {
        val cowboy = players.firstOrNull { it.isAlive && it.roleId == "cowboy" }
        if (cowboy == null || cowboyUsed) return CowboyResult(success = false)
        cowboyUsed = true // burned even if the target below turns out invalid
        val target = getPlayer(targetId)
        if (target == null || !target.isAlive) return CowboyResult(success = false)

        cowboy.kill(round, "cowboy_self", false)
        addHistory("cowboy_self_eliminated", mapOf("name" to cowboy.name(false)))

        var killed = false
        var side: String
        var targetRoleName: String? = null
        var jackCurseLocked = false

        when {
            target.roleId == "jack" -> {
                target.curse.lock()
                jackCurseLocked = true
                side = "jack"
                targetRoleName = Roles.get("jack")?.nameEn
                discardBeautifulMind()
                addHistory("cowboy_jack", mapOf("name" to target.name(false)))
            }
            target.roleId == "zodiac" -> {
                target.kill(round, "cowboy", true)
                killed = true
                side = "zodiac"
                addHistory("cowboy_kill", mapOf("name" to target.name(false)))
            }
            Roles.get(target.roleId)?.team == Team.MAFIA -> {
                target.kill(round, "cowboy", true)
                killed = true
                side = "mafia"
                addHistory("cowboy_kill", mapOf("name" to target.name(false)))
            }
            else -> {
                target.kill(round, "cowboy", true)
                killed = true
                side = "citizen"
                addHistory("cowboy_kill", mapOf("name" to target.name(false)))
            }
        }

        var jackCurseTriggered = false
        if (killed) {
            val jackPlayer = players.firstOrNull { it.isAlive && it.roleId == "jack" }
            if (jackPlayer != null && jackPlayer.curse.isTriggeredBy(targetId)) {
                jackPlayer.kill(round, "curse")
                jackCurseTriggered = true
                addHistory("jack_curse_activated")
                returnPlayerBullet(jackPlayer.id)
            }
        }
        if (!jackCurseTriggered) {
            val jackPlayer2 = players.firstOrNull { it.isAlive && it.roleId == "jack" }
            if (jackPlayer2 != null && jackPlayer2.curse.isTriggeredBy(cowboy.id)) {
                jackPlayer2.kill(round, "curse")
                jackCurseTriggered = true
                addHistory("jack_curse_activated")
                returnPlayerBullet(jackPlayer2.id)
            }
        }

        return CowboyResult(
            success = true, targetId = targetId, targetName = target.name(false), side = side,
            killed = killed, cowboyDied = true, targetRoleName = targetRoleName,
            jackCurseLocked = jackCurseLocked, jackCurseTriggered = jackCurseTriggered,
        )
    }
    //#endregion

    //#region Framason Resolution, Voting, Morning Shots
    fun hasFramasonContamination(): Boolean = framason.isContaminated

    data class ContaminationResolution(val deadIds: List<Int>, val recruitId: Int?)

    fun resolveFramasonContamination(): ContaminationResolution {
        if (!framason.isContaminated) return ContaminationResolution(emptyList(), null)
        val recruitId = framason.contaminated?.recruitId
        val deadIds = framason.resolveContamination()
        for (id in deadIds) {
            val p = getPlayer(id)
            if (p != null && p.isAlive) {
                p.kill(round, "framason")
                addHistory("framason_member_death", mapOf("name" to p.name(false)))
            }
        }
        return ContaminationResolution(deadIds.filter { getPlayer(it) != null }, recruitId)
    }

    fun getFramasonAllianceNames(): List<String> = framason.allianceIds.mapNotNull { getPlayer(it)?.name(false) }

    fun castVote(voterId: Int, targetId: Int) { votes[voterId] = targetId }
    fun removeVote(voterId: Int) { votes.remove(voterId) }
    fun getVoteTally(): Map<Int, Int> = votes.values.groupingBy { it }.eachCount()

    fun getVoteThreshold(): Int {
        val aliveCount = players.count { it.isAlive }
        return (aliveCount - 1) / 2 + 1
    }

    fun isVoteImmune(playerId: Int): Boolean = Roles.get(getPlayer(playerId)?.roleId)?.voteImmune == true

    fun eliminateByVote(playerId: Int): VoteEliminationResult {
        val player = getPlayer(playerId) ?: return VoteEliminationResult()
        if (isVoteImmune(playerId)) {
            addHistory("vote_immune", mapOf("name" to player.name(false)))
            if (player.roleId == "jack") {
                player.curse.lock()
                addHistory("jack_vote_curse_locked")
            }
            discardBeautifulMind()
            return VoteEliminationResult(voteImmune = true)
        }
        player.kill(round, "vote")
        addHistory("vote_executed", mapOf("name" to player.name(false)))
        if (framason.isActive && playerId == framason.leaderIdOrNull) framason.onLeaderDeath()

        var lastActionAvailable = false
        var jackCurseTriggered = false
        val hasLastAction = lastActionManager.hasRemaining()
        if (hasLastAction) lastActionAvailable = true

        val jackPlayer = players.firstOrNull { it.isAlive && it.roleId == "jack" }
        if (jackPlayer != null && jackPlayer.curse.isTriggeredBy(playerId)) {
            pendingVoteCurseCheckId = playerId
            if (!hasLastAction) {
                jackCurseTriggered = resolvePendingVoteCurse(playerId)
            }
        }

        if (bulletManager.isActive) {
            val bullet = bulletManager.getPlayerBullet(playerId)
            if (bullet != null) { bulletManager.returnBullet(bullet.type); bulletManager.removeBullet(playerId) }
            if (jackCurseTriggered && jackPlayer != null) {
                val jackBullet = bulletManager.getPlayerBullet(jackPlayer.id)
                if (jackBullet != null) { bulletManager.returnBullet(jackBullet.type); bulletManager.removeBullet(jackPlayer.id) }
            }
        }

        return VoteEliminationResult(lastActionAvailable = lastActionAvailable, jackCurseTriggered = jackCurseTriggered)
    }

    fun gunnerGiveBullet(holderId: Int, type: String): GodActionResult {
        val holder = getPlayer(holderId)
        if (holder == null || !holder.isAlive) return GodActionResult(success = false, reason = "dead")
        val ok = bulletManager.giveBullet(holderId, type, round)
        if (!ok) return GodActionResult(success = false, reason = "no_bullets")
        addHistory("gunner_gave", mapOf("name" to holder.name(false)))
        return GodActionResult(success = true)
    }

    fun getActiveBullets(): List<Pair<ActiveBullet, String>> =
        bulletManager.activeBullets.map { it to (getPlayer(it.holderId)?.name(false) ?: "") }

    fun resolveMorningShot(shooterId: Int, targetId: Int): MorningShotResult? {
        val shooter = getPlayer(shooterId)
        val bulletType = bulletManager.useBullet(shooterId) ?: return null // consumed even if we bail out below
        val target = getPlayer(targetId)
        if (target == null || !target.isAlive) return null
        if (shooterId == targetId) {
            val shooterRole = Roles.get(shooter?.roleId)
            if (shooterRole?.team != Team.MAFIA) return null // non-mafia self-shot rejected
        }
        val targetRole = Roles.get(target.roleId)
        val targetTeam = targetRole?.team ?: Team.CITIZEN

        if (bulletType == "blank") {
            addHistory("morning_shot_blank")
            return MorningShotResult(type = bulletType, killed = false, targetTeam = targetTeam, targetName = target.name(false))
        }

        if (target.healed) {
            target.healed = false
            addHistory("morning_shot_healed", mapOf("name" to target.name(false)))
            return MorningShotResult(type = bulletType, killed = false, targetTeam = targetTeam, targetName = target.name(false), stoppedBy = "healed")
        }
        if (target.shield.isActive) {
            if (target.shield.absorb("morning_shot")) {
                addHistory("morning_shot_shield", mapOf("name" to target.name(false)))
                return MorningShotResult(type = bulletType, killed = false, targetTeam = targetTeam, targetName = target.name(false), stoppedBy = "shield")
            }
        }
        if (target.roleId == "jack") {
            // Unconditional — the jackMorningShotImmune setting is dead config (spec §19 item 5).
            target.curse.lock()
            discardBeautifulMind()
            addHistory("morning_shot_jack_curse_locked")
            return MorningShotResult(type = bulletType, killed = false, targetTeam = targetTeam, targetName = target.name(false), stoppedBy = "jack")
        }

        target.kill(round, "morning_shot")
        addHistory("warshot_death", mapOf("name" to target.name(false), "team" to targetTeam))
        if (bulletManager.isActive) {
            val targetBullet = bulletManager.getPlayerBullet(targetId)
            if (targetBullet != null) { bulletManager.returnBullet(targetBullet.type); bulletManager.removeBullet(targetId) }
        }
        var jackCurseTriggered = false
        val jackPlayer = players.firstOrNull { it.isAlive && it.roleId == "jack" }
        if (jackPlayer != null && jackPlayer.curse.isTriggeredBy(targetId)) {
            jackPlayer.kill(round, "curse")
            addHistory("jack_curse_activated")
            jackCurseTriggered = true
            returnPlayerBullet(jackPlayer.id)
        }
        if (framason.isActive && targetId == framason.leaderIdOrNull) framason.onLeaderDeath()

        return MorningShotResult(type = bulletType, killed = true, targetTeam = targetTeam, targetName = target.name(false), jackCurseTriggered = jackCurseTriggered)
    }

    fun resolveLiveExpiration(): List<LiveExplosion> {
        val explosions = mutableListOf<LiveExplosion>()
        val liveBullets = bulletManager.getUnusedLiveBullets()
        for (bullet in liveBullets) {
            val holder = getPlayer(bullet.holderId)
            if (holder != null && holder.isAlive) {
                holder.kill(round, "live_explosion")
                bulletManager.removeBullet(holder.id)
                explosions.add(LiveExplosion(holder.id, holder.name(false)))
                addHistory("live_explosion", mapOf("name" to holder.name(false)))
                val jackPlayer = players.firstOrNull { it.isAlive && it.roleId == "jack" }
                if (jackPlayer != null && jackPlayer.curse.isTriggeredBy(holder.id)) {
                    jackPlayer.kill(round, "curse")
                    addHistory("jack_curse_activated")
                    explosions.add(LiveExplosion(jackPlayer.id, jackPlayer.name(false), curseChain = true))
                    returnPlayerBullet(jackPlayer.id)
                }
                if (framason.isActive && holder.id == framason.leaderIdOrNull) framason.onLeaderDeath()
            }
        }
        bulletManager.clearDayBullets() // wipes all remaining bullets, including unexploded blanks
        return explosions
    }
    //#endregion

    //#region Bomb Determination
    fun hasBombToResolve(): Boolean = bomb.currentPhase == "planted"
    fun startBombSiesta() { bomb.startSiesta() }
    fun isBodyguardAliveForBomb(): Boolean = players.any { it.isAlive && it.roleId == "bodyguard" }

    fun bombGuardianGuess(guess: Int): BombGuardianGuessResult {
        val result = bomb.guardianGuess(guess)
        val guardianId = players.firstOrNull { it.isAlive && it.roleId == "bodyguard" }?.id
        if (result == "defused") {
            addHistory("bomb_defused")
            bomb.clear()
        } else {
            val guardian = guardianId?.let { getPlayer(it) }
            if (guardian != null) {
                guardian.kill(round, "bomb_guardian")
                addHistory("bomb_defused_incorrect", mapOf("name" to guardian.name(false)))
            }
            bomb.clear()
        }
        return BombGuardianGuessResult(result, guardianId)
    }

    fun bombGuardianSkip() {
        bomb.guardianSkip()
        addHistory("bomb_skip")
    }

    fun bombTargetGuess(guess: Int): BombTargetGuessResult {
        val targetId = bomb.currentTargetId
        val result = bomb.targetGuess(guess)
        if (result == "defused") {
            addHistory("bomb_defused_named")
        } else {
            val target = targetId?.let { getPlayer(it) }
            if (target != null) {
                target.kill(round, "bomb")
                addHistory("bomb_wrong_pw_death", mapOf("name" to target.name(false)))
            }
        }
        bomb.clear()
        return BombTargetGuessResult(result, targetId)
    }
    //#endregion

    //#region Win Condition
    fun checkWinCondition(): String? {
        val alive = players.filter { it.isAlive }
        val mafiaAlive = alive.filter { Roles.get(it.roleId)?.team == Team.MAFIA }
        val citizenAlive = alive.filter { Roles.get(it.roleId)?.team == Team.CITIZEN }
        val independentAlive = alive.filter { Roles.get(it.roleId)?.team == Team.INDEPENDENT }
        val jackAlive = alive.any { it.roleId == "jack" }

        if (mafiaAlive.isEmpty() && jackAlive) {
            winner = "independent"; phase = "ended"; addHistory("win_independent"); return "independent"
        }
        if (mafiaAlive.isEmpty() && independentAlive.isEmpty()) {
            winner = "citizen"; phase = "ended"; addHistory("win_citizen"); return "citizen"
        }
        if (mafiaAlive.isEmpty() && citizenAlive.isEmpty() && independentAlive.isNotEmpty()) {
            winner = "independent"; phase = "ended"; addHistory("win_independent"); return "independent"
        }
        if (independentAlive.isEmpty() && mafiaAlive.size >= citizenAlive.size) {
            winner = "mafia"; phase = "ended"; addHistory("win_mafia"); return "mafia"
        }
        if (alive.size == 3) {
            if (jackAlive) {
                winner = "independent"; phase = "ended"; addHistory("win_jack_chaos"); return "independent"
            }
            return triggerHandshake(alive)
        }
        return null // extinct mafia does not always end the game — see class doc / spec §14
    }

    private fun triggerHandshake(alivePlayers: List<Player>): String {
        handshakeState = HandshakeState(alivePlayers.map { it.id }, 120)
        phase = "handshake"
        addHistory("chaos_triggered")
        return "handshake"
    }

    fun resolveHandshake(player1Id: Int, player2Id: Int): HandshakeResult? {
        val p1 = getPlayer(player1Id) ?: return null
        val p2 = getPlayer(player2Id) ?: return null
        val trio = handshakeState?.players ?: emptyList()
        val eliminatedPlayer = trio.mapNotNull { getPlayer(it) }
            .firstOrNull { it.isAlive && it.id != player1Id && it.id != player2Id }
        if (eliminatedPlayer != null) {
            // Bypasses Player.kill() immunity entirely (like godKill) — always succeeds.
            eliminatedPlayer.isAlive = false
            eliminatedPlayer.deathRound = round
            eliminatedPlayer.deathCause = "handshake"
            // isRevivable intentionally left untouched (stays true) — asymmetry vs every other
            // elimination path; moot since phase -> 'ended' immediately after.
        }
        val p1Role = Roles.get(p1.roleId)
        val p2Role = Roles.get(p2.roleId)
        val hasIndependent = p1Role?.team == Team.INDEPENDENT || p2Role?.team == Team.INDEPENDENT
        val winnerTeam = if (hasIndependent) "independent" else if (p1Role?.team == Team.MAFIA || p2Role?.team == Team.MAFIA) "mafia" else "citizen"

        winner = winnerTeam
        phase = "ended"
        addHistory("win_$winnerTeam")
        handshakeState = null
        return HandshakeResult(winnerTeam, listOf(player1Id, player2Id), eliminatedPlayer?.id)
    }

    fun revealJack(jackPlayerId: Int): Boolean {
        val p = getPlayer(jackPlayerId) ?: return false
        if (p.roleId != "jack") return false
        p.curse.lock()
        addHistory("reveal_jack")
        return true
    }
    //#endregion

    //#region Helpers / Queries
    fun getPlayer(id: Int?): Player? = if (id == null) null else players.firstOrNull { it.id == id }
    fun getAlivePlayers(): List<Player> = players.filter { it.isAlive }
    fun getDeadPlayers(): List<Player> = players.filter { !it.isAlive }
    fun getRevivablePlayers(): List<Player> = players.filter { !it.isAlive && it.deathRound != null && it.isRevivable }

    fun getPendingKillTargets(): List<Player> {
        val ids = mutableSetOf<Int>()
        nightActions["godfather"]?.let { if (it.mode != "salakhi") it.targetId?.let(ids::add) }
        nightActions["zodiac"]?.targetId?.let(ids::add)
        nightActions["sniper"]?.targetId?.let(ids::add)
        return ids.mapNotNull { getPlayer(it) }.filter { it.isRevivable }
    }

    fun getTeamPlayers(team: String): List<Player> = players.filter { it.isAlive && Roles.get(it.roleId)?.team == team }

    data class TeamCounts(val mafia: Int, val citizen: Int, val independent: Int, val total: Int)

    fun getTeamCounts(): TeamCounts {
        val alive = players.filter { it.isAlive }
        return TeamCounts(
            mafia = alive.count { Roles.get(it.roleId)?.team == Team.MAFIA },
            citizen = alive.count { Roles.get(it.roleId)?.team == Team.CITIZEN },
            independent = alive.count { Roles.get(it.roleId)?.team == Team.INDEPENDENT },
            total = alive.size,
        )
    }

    /** Purely advisory — resolveNight's heal branches do not call or enforce this. */
    fun canDrWatsonHeal(targetId: Int): Boolean {
        val watson = players.firstOrNull { it.roleId == "drWatson" }
        return if (watson != null && targetId == watson.id) drWatsonSelfHealCount < drWatsonSelfHealMax else true
    }

    fun canDrLecterHeal(targetId: Int): Boolean {
        val lecter = players.firstOrNull { it.roleId == "drLecter" }
        return if (lecter != null && targetId == lecter.id) drLecterSelfHealCount < drLecterSelfHealMax else true
    }
    //#endregion

    //#region God Correction
    fun godKill(playerId: Int): GodActionResult {
        val player = getPlayer(playerId) ?: return GodActionResult(false, "not_found")
        if (!player.isAlive) return GodActionResult(false, "already_dead")
        // Deliberately bypasses Player.kill()'s role-based immunity — direct field mutation.
        player.isAlive = false
        player.deathRound = round
        player.deathCause = "god_correction"
        player.isRevivable = false
        addHistory("godKill", mapOf("name" to player.name(false)))
        returnPlayerBullet(playerId)
        return GodActionResult(true, playerName = player.name(false))
    }

    fun godRevive(playerId: Int): GodActionResult {
        val player = getPlayer(playerId) ?: return GodActionResult(false, "not_found")
        if (player.isAlive) return GodActionResult(false, "already_alive")
        player.revive()
        addHistory("godRevive", mapOf("name" to player.name(false)))
        return GodActionResult(true, playerName = player.name(false))
    }

    private fun addHistory(type: String, params: Map<String, String> = emptyMap()) {
        history.add(HistoryEntry(round, phase, type, params, clock()))
    }

    private fun discardBeautifulMind() {
        lastActionManager.discard(LastActionCard.BEAUTIFUL_MIND)
    }

    private fun returnPlayerBullet(playerId: Int) {
        if (!bulletManager.isActive) return
        val bullet = bulletManager.getPlayerBullet(playerId)
        if (bullet != null) { bulletManager.returnBullet(bullet.type); bulletManager.removeBullet(playerId) }
    }

    fun getHistoryForRound(r: Int): List<HistoryEntry> = history.filter { it.round == r }
    //#endregion

    //#region Last Action Cards
    fun drawLastActionFor(victimId: Int): DrawLastActionResult? {
        if (!lastActionManager.hasRemaining()) return null

        val hasVulnerableIndependent = players.any { it.isAlive && Roles.get(it.roleId)?.team == Team.INDEPENDENT && it.roleId != "jack" }
        if (!hasVulnerableIndependent) {
            discardBeautifulMind()
            if (!lastActionManager.hasRemaining()) {
                val triggered = resolvePendingVoteCurse(victimId)
                return if (triggered) DrawLastActionResult(null, true) else null
            }
        }

        val victimRole = Roles.get(getPlayer(victimId)?.roleId)
        if (victimRole?.team == Team.MAFIA) {
            discardBeautifulMind()
            if (!lastActionManager.hasRemaining()) {
                val triggered = resolvePendingVoteCurse(victimId)
                return if (triggered) DrawLastActionResult(null, true) else null
            }
        }

        val card = lastActionManager.drawRandom { rng.nextDouble() } ?: return null
        addHistory("last_action_draw")

        if (card.id == LastActionCard.SKIP_NIGHT) {
            lastActionSkipNight = true
            addHistory("lastActionSkipNight")
        } else if (card.id == LastActionCard.REVEAL) {
            val victim = getPlayer(victimId)
            if (victim != null) {
                victim.isRevivable = false
                addHistory("lastActionReveal")
            }
        }

        val jackCurseTriggered = if (!LastActionCard.needsTarget(card.id)) resolvePendingVoteCurse(victimId) else false
        return DrawLastActionResult(card, jackCurseTriggered)
    }

    fun applyLastActionCard(cardId: Int, victimId: Int, targetId: Int?): ApplyLastActionResult {
        val result = when (cardId) {
            LastActionCard.FINAL_SHOOT -> applyFinalShoot(targetId)
            LastActionCard.BEAUTIFUL_MIND -> applyBeautifulMind(victimId, targetId)
            LastActionCard.FACE_OFF -> applyFaceOff(victimId, targetId)
            else -> return ApplyLastActionResult(success = false, reason = "no_action_needed")
        }
        val curseTriggered = resolvePendingVoteCurse(victimId)
        return result.copy(jackCurseTriggered = result.jackCurseTriggered || curseTriggered)
    }

    private fun resolvePendingVoteCurse(victimId: Int): Boolean {
        if (pendingVoteCurseCheckId != victimId) return false
        pendingVoteCurseCheckId = null
        val jackPlayer = players.firstOrNull { it.isAlive && it.roleId == "jack" }
        if (jackPlayer == null || !jackPlayer.curse.isTriggeredBy(victimId)) return false
        jackPlayer.kill(round, "curse")
        addHistory("execution_with_curse")
        returnPlayerBullet(jackPlayer.id)
        return true
    }

    /** Card 1 — Final Shoot. Verified against source: immune/healed branches early-return
     * `success=false` WITHOUT setting lastActionBlockMafiaShoot (only the fall-through kill
     * path sets it) — the extraction spec's "always regardless of outcome" note was wrong. */
    private fun applyFinalShoot(targetId: Int?): ApplyLastActionResult {
        val target = targetId?.let { getPlayer(it) }
        if (target == null || !target.isAlive) return ApplyLastActionResult(success = false, reason = "invalid_target")
        val role = Roles.get(target.roleId)
        if (role?.shootImmune == true) {
            addHistory("lastActionFinalShootImmune", mapOf("name" to target.name(false)))
            return ApplyLastActionResult(success = false, reason = "immune")
        }
        if (target.healed) {
            addHistory("lastActionFinalShootHealed", mapOf("name" to target.name(false)))
            return ApplyLastActionResult(success = false, reason = "healed")
        }
        val died = target.tryKill(round, "lastaction_shoot")
        if (died) {
            addHistory("lastActionFinalShootKill", mapOf("name" to target.name(false)))
            returnPlayerBullet(target.id)
        } else {
            addHistory("lastActionFinalShootShielded", mapOf("name" to target.name(false)))
        }
        lastActionBlockMafiaShoot = true
        return ApplyLastActionResult(success = true, died = died, reason = if (died) null else "shielded")
    }

    /** Card 4 — Beautiful Mind. */
    private fun applyBeautifulMind(victimId: Int, guessedId: Int?): ApplyLastActionResult {
        val guessed = guessedId?.let { getPlayer(it) }
        val victim = getPlayer(victimId)
        if (guessed == null || victim == null) return ApplyLastActionResult(success = false, reason = "invalid")
        val role = Roles.get(guessed.roleId)
        if (role?.team == Team.INDEPENDENT) {
            val died = guessed.kill(round, "lastaction_guess")
            if (died) {
                addHistory("lastActionGuessSuccess", mapOf("name" to guessed.name(false)))
                victim.revive()
                addHistory("lastActionVictimSaved", mapOf("name" to victim.name(false)))
                return ApplyLastActionResult(success = true, eliminated = guessed.id, revived = victimId)
            }
            // Jack's kill() allow-list excludes 'lastaction_guess' — this is how Jack stays
            // immune to this card despite being independent-team.
            addHistory("lastActionGuessImmune", mapOf("name" to guessed.name(false)))
            return ApplyLastActionResult(success = false, reason = "immune")
        }
        addHistory("lastActionGuessFail", mapOf("name" to guessed.name(false)))
        return ApplyLastActionResult(success = false, reason = "wrong")
    }

    /** Card 5 — Face Off. */
    private fun applyFaceOff(victimId: Int, chosenId: Int?): ApplyLastActionResult {
        val victim = getPlayer(victimId)
        val chosen = chosenId?.let { getPlayer(it) }
        if (victim == null || chosen == null) return ApplyLastActionResult(success = false, reason = "invalid")

        val victimRole = victim.roleId
        val chosenRole = chosen.roleId

        chosen.roleId = victimRole
        victim.roleId = chosenRole

        // Full shield clone (not reinitialized from role defaults) — victim's own shield field
        // is left untouched.
        chosen.shield = Shield.fromJson(victim.shield.toJson())

        // Full curse OBJECT clone (previousTargetIds + lock state + current target), whichever
        // direction applies.
        if (victimRole == "jack") {
            chosen.curse = Curse.fromJson(victim.curse.toJson())
        } else if (chosenRole == "jack") {
            victim.curse = Curse.fromJson(chosen.curse.toJson())
        }

        // Immediate curse-chain check — found AFTER the role swap, so a newly-installed Jack
        // is correctly detected here.
        val aliveJack = players.firstOrNull { it.isAlive && it.roleId == "jack" }
        var jackCurseTriggered = false
        if (aliveJack?.curse?.isTriggeredBy(victimId) == true) {
            aliveJack.kill(round, "curse")
            jackCurseTriggered = true
            addHistory("execution_with_curse", mapOf("name" to victim.name(false)))
            returnPlayerBullet(aliveJack.id)
        }

        victim.isRevivable = false
        lastFaceOffEvent = FaceOffEvent(round, victimId, chosenId)
        addHistory("lastActionFaceOffApplied")

        return ApplyLastActionResult(success = true, swappedRole = victimRole, victimNewRole = chosenRole, jackCurseTriggered = jackCurseTriggered)
    }
    //#endregion

    //#region Serialization
    @Serializable
    data class GameState(
        val players: List<PlayerState>,
        val round: Int,
        val phase: String,
        val winner: String? = null,
        val history: List<HistoryEntry> = emptyList(),
        val selectedRoles: Map<String, Int> = emptyMap(),
        val desiredMafia: Int = 0,
        val desiredCitizen: Int = 0,
        val manualPickShowRoles: Boolean = true,
        val manualPool: Map<String, Int>? = null,
        val manualAssignIndex: Int = 0,
        val nightActions: Map<String, NightActionRecord> = emptyMap(),
        val currentNightStep: Int = 0,
        val nightSteps: List<NightStep> = emptyList(),
        val constantineUsed: Boolean = false,
        val bulletManager: BulletManagerState = BulletManagerState(),
        val gunnerBlankMax: Int = 2,
        val gunnerLiveMax: Int = 2,
        val jackMorningShotImmune: Boolean = false,
        val zodiacMorningShotImmune: Boolean = false,
        val bomb: BombState = BombState(),
        val framason: FramasonState = FramasonState(),
        val framasonMaxMembers: Int = 2,
        val negotiatorThreshold: Int = 2,
        val negotiationUsed: Boolean = false,
        val sniperMaxShots: Int = 2,
        val sniperShotCount: Int = 0,
        val kaneUsed: Boolean = false,
        val kaneTargetId: Int? = null,
        val kanePendingDeath: Boolean = false,
        val jadoogarLastBlockedId: Int? = null,
        val jokerLastTargetId: Int? = null,
        val cowboyUsed: Boolean = false,
        val dayTimerDuration: Int = 60,
        val defenseTimerDuration: Int = 60,
        val blindDayDuration: Int = 60,
        val zodiacFrequency: String = "every",
        val drWatsonSelfHealMax: Int = 2,
        val drLecterSelfHealMax: Int = 2,
        val drWatsonSelfHealCount: Int = 0,
        val drLecterSelfHealCount: Int = 0,
        val lastActionManager: LastActionManagerState,
        val lastActionSkipNight: Boolean = false,
        val lastActionBlockMafiaShoot: Boolean = false,
        val pendingVoteCurseCheckId: Int? = null,
        val lastFaceOffEvent: FaceOffEvent? = null,
        val handshakeState: HandshakeState? = null,
    )

    fun toGameState(): GameState = GameState(
        players = players.map { it.toJson() },
        round = round, phase = phase, winner = winner, history = history.toList(),
        selectedRoles = selectedRoles.toMap(), desiredMafia = desiredMafia, desiredCitizen = desiredCitizen,
        manualPickShowRoles = manualPickShowRoles, manualPool = manualPool?.toMap(), manualAssignIndex = manualAssignIndex,
        nightActions = nightActions.toMap(), currentNightStep = currentNightStep, nightSteps = nightSteps.toList(),
        constantineUsed = constantineUsed, bulletManager = bulletManager.toJson(),
        gunnerBlankMax = gunnerBlankMax, gunnerLiveMax = gunnerLiveMax,
        jackMorningShotImmune = jackMorningShotImmune, zodiacMorningShotImmune = zodiacMorningShotImmune,
        bomb = bomb.toJson(), framason = framason.toJson(), framasonMaxMembers = framasonMaxMembers,
        negotiatorThreshold = negotiatorThreshold, negotiationUsed = negotiationUsed,
        sniperMaxShots = sniperMaxShots, sniperShotCount = sniperShotCount,
        kaneUsed = kaneUsed, kaneTargetId = kaneTargetId, kanePendingDeath = kanePendingDeath,
        jadoogarLastBlockedId = jadoogarLastBlockedId, jokerLastTargetId = jokerLastTargetId, cowboyUsed = cowboyUsed,
        dayTimerDuration = dayTimerDuration, defenseTimerDuration = defenseTimerDuration, blindDayDuration = blindDayDuration,
        zodiacFrequency = zodiacFrequency, drWatsonSelfHealMax = drWatsonSelfHealMax, drLecterSelfHealMax = drLecterSelfHealMax,
        drWatsonSelfHealCount = drWatsonSelfHealCount, drLecterSelfHealCount = drLecterSelfHealCount,
        lastActionManager = lastActionManager.toJson(), lastActionSkipNight = lastActionSkipNight,
        lastActionBlockMafiaShoot = lastActionBlockMafiaShoot, pendingVoteCurseCheckId = pendingVoteCurseCheckId,
        lastFaceOffEvent = lastFaceOffEvent, handshakeState = handshakeState,
    )

    fun loadGameState(state: GameState) {
        players.clear()
        players.addAll(state.players.map { Player.fromJson(it) })
        nextPlayerId = (players.maxOfOrNull { it.id } ?: 0) + 1
        round = state.round
        phase = state.phase
        winner = state.winner
        history.clear(); history.addAll(state.history)
        selectedRoles = state.selectedRoles.toMutableMap()
        desiredMafia = state.desiredMafia
        desiredCitizen = state.desiredCitizen
        manualPickShowRoles = state.manualPickShowRoles
        manualPool = state.manualPool?.toMutableMap()
        manualAssignIndex = state.manualAssignIndex
        nightActions = state.nightActions.toMutableMap()
        currentNightStep = state.currentNightStep
        nightSteps = state.nightSteps.toMutableList()
        constantineUsed = state.constantineUsed
        bulletManager = BulletManager.fromJson(state.bulletManager)
        gunnerBlankMax = state.gunnerBlankMax
        gunnerLiveMax = state.gunnerLiveMax
        jackMorningShotImmune = state.jackMorningShotImmune
        zodiacMorningShotImmune = state.zodiacMorningShotImmune
        bomb = Bomb.fromJson(state.bomb)
        framason = Framason.fromJson(state.framason)
        framasonMaxMembers = state.framasonMaxMembers
        negotiatorThreshold = state.negotiatorThreshold
        negotiationUsed = state.negotiationUsed
        sniperMaxShots = state.sniperMaxShots
        sniperShotCount = state.sniperShotCount
        kaneUsed = state.kaneUsed
        kaneTargetId = state.kaneTargetId
        kanePendingDeath = state.kanePendingDeath
        jadoogarLastBlockedId = state.jadoogarLastBlockedId
        jokerLastTargetId = state.jokerLastTargetId
        cowboyUsed = state.cowboyUsed
        dayTimerDuration = state.dayTimerDuration
        defenseTimerDuration = state.defenseTimerDuration
        blindDayDuration = state.blindDayDuration
        zodiacFrequency = state.zodiacFrequency
        drWatsonSelfHealMax = state.drWatsonSelfHealMax
        drLecterSelfHealMax = state.drLecterSelfHealMax
        drWatsonSelfHealCount = state.drWatsonSelfHealCount
        drLecterSelfHealCount = state.drLecterSelfHealCount
        lastActionManager = LastActionManager.fromJson(state.lastActionManager)
        lastActionSkipNight = state.lastActionSkipNight
        lastActionBlockMafiaShoot = state.lastActionBlockMafiaShoot
        pendingVoteCurseCheckId = state.pendingVoteCurseCheckId
        lastFaceOffEvent = state.lastFaceOffEvent
        handshakeState = state.handshakeState
    }
    //#endregion

    companion object {
        const val MIN_PLAYERS = 8
    }
}
