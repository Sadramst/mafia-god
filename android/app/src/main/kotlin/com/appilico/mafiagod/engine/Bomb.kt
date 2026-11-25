package com.appilico.mafiagod.engine

import kotlinx.serialization.Serializable

@Serializable
data class BombState(
    val targetId: Int? = null,
    val password: Int? = null,
    val used: Boolean = false,
    val phase: String? = null,
)

/** Ported from js/models/Bomb.js — Bomber's single-use bomb. */
class Bomb {
    private var targetId: Int? = null
    private var password: Int? = null
    private var used: Boolean = false
    private var phase: String? = null // null | planted | siesta | defused | exploded | guardian_died

    val isUsed: Boolean get() = used
    val currentPhase: String? get() = phase
    val currentTargetId: Int? get() = targetId
    val currentPassword: Int? get() = password

    fun plant(target: Int, pw: Int): Boolean {
        if (used) return false
        targetId = target
        password = pw
        phase = "planted"
        used = true
        return true
    }

    fun startSiesta() {
        if (phase == "planted") phase = "siesta"
    }

    fun guardianGuess(guess: Int): String {
        return if (guess == password) {
            phase = "defused"
            "defused"
        } else {
            phase = "guardian_died"
            "wrong"
        }
    }

    fun targetGuess(guess: Int): String {
        return if (guess == password) {
            phase = "defused"
            "defused"
        } else {
            phase = "exploded"
            "exploded"
        }
    }

    /** No-op — kept for parity/intent with the JS source (phase stays 'siesta'). */
    fun guardianSkip() {}

    fun clear() {
        targetId = null
        password = null
        phase = null
        // `used` intentionally left true — one bomb per game.
    }

    fun toJson(): BombState = BombState(targetId, password, used, phase)

    companion object {
        fun fromJson(state: BombState?): Bomb {
            val b = Bomb()
            if (state == null) return b
            b.targetId = state.targetId
            b.password = state.password
            b.used = state.used
            b.phase = state.phase
            return b
        }
    }
}
