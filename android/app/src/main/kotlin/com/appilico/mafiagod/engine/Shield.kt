package com.appilico.mafiagod.engine

import kotlinx.serialization.Serializable

@Serializable
data class ShieldState(val active: Boolean = false)

/** Ported from js/models/Shield.js — one-time absorb, verbatim bypass-cause set
 * including the dead 'sniper_miss' entry (never produced as a cause anywhere,
 * kept only for fidelity with the source). */
class Shield(active: Boolean = false) {
    var isActive: Boolean = active
        private set

    fun activate() {
        isActive = true
    }

    /** @return true if this absorbed the hit (and is now spent) */
    fun absorb(cause: String): Boolean {
        if (cause in BYPASS_CAUSES) return false
        if (!isActive) return false
        isActive = false
        return true
    }

    fun toJson(): ShieldState = ShieldState(isActive)

    companion object {
        val BYPASS_CAUSES = setOf("vote", "salakhi", "bomb", "live_explosion", "sniper_miss")

        fun fromJson(state: ShieldState?): Shield = Shield(state?.active ?: false)
    }
}
