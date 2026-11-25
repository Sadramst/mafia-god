package com.appilico.mafiagod.engine

import kotlinx.serialization.Serializable

@Serializable
data class NoteState(val text: String, val timestamp: Long)

@Serializable
data class PlayerState(
    val id: Int,
    val nameEn: String,
    val nameFa: String,
    val roleId: String? = null,
    val isAlive: Boolean = true,
    val deathRound: Int? = null,
    val deathCause: String? = null,
    val isRevivable: Boolean = true,
    val silenced: Boolean = false,
    val healed: Boolean = false,
    val notes: List<NoteState> = emptyList(),
    val shield: ShieldState = ShieldState(),
    val curse: CurseState = CurseState(),
)

/** Ported from js/models/Player.js. */
class Player(val id: Int, val nameEn: String, val nameFa: String) {
    var roleId: String? = null
    var isAlive: Boolean = true
    var deathRound: Int? = null
    var deathCause: String? = null
    var isRevivable: Boolean = true
    var silenced: Boolean = false
    var healed: Boolean = false
    val notes: MutableList<NoteState> = mutableListOf()
    var shield: Shield = Shield(false)
    var curse: Curse = Curse()

    /** Mirrors Player.getDisplayName() — caller supplies whether Farsi is active. */
    fun name(fa: Boolean): String {
        val primary = if (fa) nameFa else nameEn
        val fallback = if (fa) nameEn else nameFa
        return primary.ifEmpty { fallback }
    }

    fun initShield(role: Role?) {
        if (role?.hasShield == true) shield.activate()
    }

    /** @return true if this killed the player (false = immune/absorbed). */
    fun tryKill(round: Int, cause: String, revivable: Boolean = true): Boolean {
        if (roleId == "jack" && cause != "curse" && cause != "salakhi") return false
        if (roleId == "zodiac" && cause !in ZODIAC_TRY_KILL_CAUSES) return false
        if (shield.absorb(cause)) return false
        kill(round, cause, revivable)
        return true
    }

    /** @return true if this actually killed the player. */
    fun kill(round: Int, cause: String, revivable: Boolean = true): Boolean {
        if (roleId == "jack" && cause != "curse" && cause != "salakhi") return false
        if (roleId == "zodiac" && cause !in ZODIAC_KILL_CAUSES) return false
        isAlive = false
        deathRound = round
        deathCause = cause
        isRevivable = revivable
        return true
    }

    fun revive() {
        isAlive = true
        deathRound = null
        deathCause = null
        isRevivable = true
    }

    /** Called only from Game.startNight() for alive players — NOT from startBlindNight(). */
    fun resetNightFlags() {
        silenced = false
        healed = false
    }

    fun addNote(text: String, timestamp: Long) {
        notes.add(NoteState(text, timestamp))
    }

    fun toJson(): PlayerState = PlayerState(
        id, nameEn, nameFa, roleId, isAlive, deathRound, deathCause, isRevivable,
        silenced, healed, notes.toList(), shield.toJson(), curse.toJson(),
    )

    companion object {
        // Player.tryKill()'s Zodiac allow-list (JS §3.1) — deliberately distinct from kill()'s.
        val ZODIAC_TRY_KILL_CAUSES = setOf("salakhi", "curse", "kane_sacrifice", "zodiac_bodyguard", "morning_shot", "live_explosion", "bomb")

        // Player.kill()'s Zodiac allow-list — superset of the above (adds vote/lastaction_guess/cowboy).
        val ZODIAC_KILL_CAUSES = setOf(
            "salakhi", "curse", "kane_sacrifice", "zodiac_bodyguard", "morning_shot",
            "live_explosion", "bomb", "vote", "lastaction_guess", "cowboy",
        )

        fun fromJson(state: PlayerState): Player {
            val p = Player(state.id, state.nameEn, state.nameFa)
            p.roleId = state.roleId
            p.isAlive = state.isAlive
            p.deathRound = state.deathRound
            p.deathCause = state.deathCause
            p.isRevivable = state.isRevivable
            p.silenced = state.silenced
            p.healed = state.healed
            p.notes.addAll(state.notes)
            p.shield = Shield.fromJson(state.shield)
            p.curse = Curse.fromJson(state.curse)
            return p
        }
    }
}
