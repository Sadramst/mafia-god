package com.appilico.mafiagod.engine

import kotlinx.serialization.Serializable

@Serializable
data class HistoryEntry(
    val round: Int,
    val phase: String,
    val type: String,
    val params: Map<String, String> = emptyMap(),
    val timestamp: Long,
)

@Serializable
data class BulletAssignment(val holderId: Int, val type: String)

/** One role's recorded action for the current night. Mirrors nightActions[roleId] in JS —
 * a single shape carries every role's extra payload (unused fields stay null). */
@Serializable
data class NightActionRecord(
    val actorIds: List<Int>,
    val targetId: Int? = null,
    val actionType: String? = null,
    val mode: String? = null, // godfather: "shoot" | "salakhi"
    val guessedRoleId: String? = null, // godfather salakhi guess
    val bombPassword: Int? = null, // bomber
    val bulletAssignments: List<BulletAssignment>? = null, // gunner (preferred, multi)
    val bulletType: String? = null, // gunner legacy single-target fallback
)

@Serializable
data class NightStep(
    val roleId: String,
    val roleName: String,
    val roleIcon: String,
    val actionType: String?,
    val actors: List<Int>,
    var targetId: Int? = null,
    var completed: Boolean = false,
)

/** Optional extra payload for Game.recordNightAction() — mirrors the `extra` bag in the JS source. */
data class NightActionExtra(
    val mode: String? = null,
    val guessedRoleId: String? = null,
    val bombPassword: Int? = null,
    val bulletAssignments: List<BulletAssignment>? = null,
    val bulletType: String? = null,
)

data class InvestigateResult(val playerId: Int, val result: String) // "blocked" | "positive" | "negative"
data class SalakhiResult(val playerId: Int, val correct: Boolean)
data class NegotiateResult(val playerId: Int, val success: Boolean)
data class FramasonRecruitResult(val recruitId: Int, val safe: Boolean, val contaminated: Boolean)
data class GunnerBulletResult(val holderId: Int, val type: String, val success: Boolean)
data class KaneRevealResult(val targetId: Int, val targetName: String, val roleName: String, val roleIcon: String)

data class NightResolutionResult(
    val killed: MutableList<Int> = mutableListOf(),
    val saved: MutableList<Int> = mutableListOf(),
    val shielded: MutableList<Int> = mutableListOf(),
    var investigated: InvestigateResult? = null,
    var silenced: Int? = null,
    var blocked: Int? = null,
    var bombed: Int? = null,
    var revived: Int? = null,
    var jokerTarget: Int? = null,
    var salakhied: SalakhiResult? = null,
    var negotiated: NegotiateResult? = null,
    var framasonRecruit: FramasonRecruitResult? = null,
    var gunnerBullets: List<GunnerBulletResult>? = null,
    var kaneReveal: KaneRevealResult? = null,
    var jackCurseTriggered: Boolean = false,
)

data class CowboyResult(
    val success: Boolean,
    val targetId: Int? = null,
    val targetName: String? = null,
    val side: String? = null, // "mafia" | "jack" | "zodiac" | "citizen"
    val killed: Boolean = false,
    val cowboyDied: Boolean = false,
    val targetRoleName: String? = null,
    val jackCurseLocked: Boolean = false,
    val jackCurseTriggered: Boolean = false,
)

data class MorningShotResult(
    val type: String, // "blank" | "live"
    val killed: Boolean = false,
    val targetTeam: String,
    val targetName: String,
    val stoppedBy: String? = null, // "healed" | "shield" | "jack" | null
    val jackCurseTriggered: Boolean = false,
)

data class LiveExplosion(val holderId: Int, val holderName: String, val curseChain: Boolean = false)

data class VoteEliminationResult(
    val voteImmune: Boolean = false,
    val lastActionAvailable: Boolean = false,
    val jackCurseTriggered: Boolean = false,
)

data class DrawLastActionResult(val card: LastActionManager.CardEntry?, val jackCurseTriggered: Boolean = false)

data class ApplyLastActionResult(
    val success: Boolean,
    val reason: String? = null,
    val died: Boolean? = null,
    val eliminated: Int? = null,
    val revived: Int? = null,
    val swappedRole: String? = null,
    val victimNewRole: String? = null,
    val jackCurseTriggered: Boolean = false,
)

data class BombGuardianGuessResult(val result: String, val guardianId: Int?) // "defused" | "wrong"
data class BombTargetGuessResult(val result: String, val targetId: Int?) // "defused" | "exploded"

@Serializable
data class FaceOffEvent(val round: Int, val victimId: Int, val chosenId: Int)

@Serializable
data class HandshakeState(val players: List<Int>, val timer: Int = 120)

data class HandshakeResult(val winner: String, val pair: List<Int>, val eliminated: Int?)

data class GodActionResult(val success: Boolean, val reason: String? = null, val playerName: String? = null)
