package com.appilico.mafiagod.engine

import kotlinx.serialization.Serializable

@Serializable
data class ContaminatedState(val recruitId: Int)

@Serializable
data class FramasonState(
    val leaderId: Int? = null,
    val members: List<Int> = emptyList(),
    val maxMembers: Int = 2,
    val contaminated: ContaminatedState? = null,
    val active: Boolean = false,
    val leaderDead: Boolean = false,
)

data class RecruitResult(val safe: Boolean, val contaminated: Boolean)

/** Ported from js/models/Framason.js — the Freemason alliance mechanic. */
class Framason {
    private var leaderId: Int? = null
    private val members: MutableList<Int> = mutableListOf()
    private var maxMembers: Int = 2
    var contaminated: ContaminatedState? = null
        private set
    var isActive: Boolean = false
        private set
    var isLeaderDead: Boolean = false
        private set

    val isContaminated: Boolean get() = contaminated != null
    val allianceIds: List<Int> get() = leaderId?.let { listOf(it) + members } ?: emptyList()
    val leaderIdOrNull: Int? get() = leaderId
    val membersCopy: List<Int> get() = members.toList()
    val maxMembersCount: Int get() = maxMembers

    fun init(leader: Int, max: Int = 2) {
        leaderId = leader
        members.clear()
        contaminated = null
        maxMembers = max
        isActive = true
        isLeaderDead = false
    }

    /** Note: does not enforce maxMembers here — matches JS (§3.5 porting note: UI-enforced only). */
    fun recruit(recruitId: Int, recruitRoleId: String?, recruitTeam: String?): RecruitResult {
        if (!isActive) return RecruitResult(safe = false, contaminated = false)
        val isSafe = recruitTeam == Team.CITIZEN || recruitRoleId == "spy"
        if (isSafe) {
            members.add(recruitId)
            return RecruitResult(safe = true, contaminated = false)
        }
        contaminated = ContaminatedState(recruitId)
        return RecruitResult(safe = false, contaminated = true)
    }

    /** @return [leaderId, ...members] (recruit excluded), then deactivates the alliance entirely. */
    fun resolveContamination(): List<Int> {
        val dead = allianceIds
        isActive = false
        contaminated = null
        return dead
    }

    fun onLeaderDeath() {
        isLeaderDead = true
    }

    fun toJson(): FramasonState = FramasonState(leaderId, members.toList(), maxMembers, contaminated, isActive, isLeaderDead)

    companion object {
        fun fromJson(state: FramasonState?): Framason {
            val f = Framason()
            if (state == null) return f
            f.leaderId = state.leaderId
            f.members.addAll(state.members)
            f.maxMembers = state.maxMembers
            f.contaminated = state.contaminated
            f.isActive = state.active
            f.isLeaderDead = state.leaderDead
            return f
        }
    }
}
