package com.appilico.mafiagod.engine

import kotlinx.serialization.Serializable

@Serializable
data class ActiveBullet(val holderId: Int, val type: String, val givenRound: Int)

@Serializable
data class BulletManagerState(
    val blankMax: Int = 2,
    val liveMax: Int = 2,
    val blankRemaining: Int = 2,
    val liveRemaining: Int = 2,
    val activeBullets: List<ActiveBullet> = emptyList(),
    val active: Boolean = false,
)

/** Ported from js/models/BulletManager.js — Gunner's blank/live bullet pool.
 * Does NOT enforce "max one bullet per holder" — matches JS (UI-enforced only). */
class BulletManager {
    private var blankMax: Int = 2
    private var liveMax: Int = 2
    private var blankRemaining: Int = 2
    private var liveRemaining: Int = 2
    private val activeBulletsList: MutableList<ActiveBullet> = mutableListOf()
    var isActive: Boolean = false
        private set

    val hasBullets: Boolean get() = isActive && (blankRemaining > 0 || liveRemaining > 0)
    val activeBullets: List<ActiveBullet> get() = activeBulletsList.toList()
    val blankRemainingCount: Int get() = blankRemaining
    val liveRemainingCount: Int get() = liveRemaining

    fun init(blank: Int = 2, live: Int = 2) {
        blankMax = blank
        liveMax = live
        blankRemaining = blank
        liveRemaining = live
        activeBulletsList.clear()
        isActive = true
    }

    fun giveBullet(holderId: Int, type: String, round: Int): Boolean {
        val pool = if (type == "live") liveRemaining else blankRemaining
        if (pool <= 0) return false
        if (type == "live") liveRemaining-- else blankRemaining--
        activeBulletsList.add(ActiveBullet(holderId, type, round))
        return true
    }

    fun returnBullet(type: String) {
        if (type == "live") liveRemaining++ else blankRemaining++
    }

    fun getPlayerBullet(holderId: Int): ActiveBullet? = activeBulletsList.firstOrNull { it.holderId == holderId }

    fun useBullet(holderId: Int): String? {
        val idx = activeBulletsList.indexOfFirst { it.holderId == holderId }
        if (idx == -1) return null
        return activeBulletsList.removeAt(idx).type
    }

    fun getUnusedLiveBullets(): List<ActiveBullet> = activeBulletsList.filter { it.type == "live" }

    fun clearDayBullets() {
        activeBulletsList.clear()
    }

    fun removeBullet(holderId: Int) {
        activeBulletsList.removeAll { it.holderId == holderId }
    }

    /** No-op — bullets already distributed remain valid after the gunner dies. */
    fun onGunnerDeath() {}

    fun toJson(): BulletManagerState = BulletManagerState(blankMax, liveMax, blankRemaining, liveRemaining, activeBulletsList.toList(), isActive)

    companion object {
        fun fromJson(state: BulletManagerState?): BulletManager {
            val b = BulletManager()
            if (state == null) return b
            b.blankMax = state.blankMax
            b.liveMax = state.liveMax
            b.blankRemaining = state.blankRemaining
            b.liveRemaining = state.liveRemaining
            b.activeBulletsList.addAll(state.activeBullets)
            b.isActive = state.active
            return b
        }
    }
}
