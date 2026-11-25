package com.appilico.mafiagod.engine

import kotlinx.serialization.Serializable

@Serializable
data class CurseState(
    val targetId: Int? = null,
    val previousTargetIds: List<Int> = emptyList(),
    val locked: Boolean = false,
)

/** Ported from js/models/Curse.js — Jack's curse mechanic. */
class Curse {
    private var targetId: Int? = null
    private val previousTargetIds: MutableList<Int> = mutableListOf()
    private var locked: Boolean = false

    val isActive: Boolean get() = targetId != null
    val isLocked: Boolean get() = locked
    val currentTargetId: Int? get() = targetId
    val lastTargetId: Int? get() = previousTargetIds.lastOrNull()
    fun previousTargetIdsCopy(): List<Int> = previousTargetIds.toList()

    /** @return true if the curse was actually placed. */
    fun place(playerId: Int, forceRepeat: Boolean = false): Boolean {
        if (locked) return false
        if (playerId in previousTargetIds && !forceRepeat) return false
        targetId = playerId
        return true
    }

    fun lock() {
        locked = true
    }

    fun clear() {
        if (locked) return
        val current = targetId
        if (current != null && current !in previousTargetIds) {
            previousTargetIds.add(current)
        }
        targetId = null
    }

    fun wasPreviousTarget(id: Int): Boolean = id in previousTargetIds

    fun isTriggeredBy(killedId: Int): Boolean = targetId == killedId

    fun toJson(): CurseState = CurseState(targetId, previousTargetIds.toList(), locked)

    companion object {
        fun fromJson(state: CurseState?): Curse {
            val c = Curse()
            if (state == null) return c
            c.targetId = state.targetId
            c.previousTargetIds.addAll(state.previousTargetIds)
            c.locked = state.locked
            return c
        }
    }
}
