package com.appilico.mafiagod.engine

import kotlinx.serialization.Serializable

@Serializable
data class LastActionCardState(val id: Int, val name: String, val used: Boolean)

@Serializable
data class LastActionManagerState(val cards: List<LastActionCardState>)

/** Ported from js/models/LastActionManager.js — the 5 single-use post-vote cards. */
class LastActionManager {
    data class CardEntry(val id: Int, val name: String, var used: Boolean = false)

    private val cards: MutableList<CardEntry> = mutableListOf(
        CardEntry(LastActionCard.FINAL_SHOOT, "final_shoot"),
        CardEntry(LastActionCard.SKIP_NIGHT, "skip_night"),
        CardEntry(LastActionCard.REVEAL, "reveal"),
        CardEntry(LastActionCard.BEAUTIFUL_MIND, "beautiful_mind"),
        CardEntry(LastActionCard.FACE_OFF, "face_off"),
    )

    fun getRemainingCards(): List<CardEntry> = cards.filter { !it.used }
    fun remainingCount(): Int = cards.count { !it.used }
    fun hasRemaining(): Boolean = cards.any { !it.used }

    fun findCard(id: Int): CardEntry? = cards.firstOrNull { it.id == id }

    fun discard(id: Int) {
        cards.firstOrNull { it.id == id && !it.used }?.used = true
    }

    fun drawRandom(rng: () -> Double): CardEntry? {
        val remaining = getRemainingCards()
        if (remaining.isEmpty()) return null
        val idx = (rng() * remaining.size).toInt().coerceIn(0, remaining.size - 1)
        val chosen = remaining[idx]
        chosen.used = true
        return chosen
    }

    fun toJson(): LastActionManagerState = LastActionManagerState(cards.map { LastActionCardState(it.id, it.name, it.used) })

    companion object {
        fun needsTarget(cardId: Int) = LastActionCard.needsTarget(cardId)

        fun fromJson(state: LastActionManagerState?): LastActionManager {
            val m = LastActionManager()
            if (state == null) return m
            for (s in state.cards) {
                m.cards.firstOrNull { it.id == s.id }?.used = s.used
            }
            return m
        }
    }
}
