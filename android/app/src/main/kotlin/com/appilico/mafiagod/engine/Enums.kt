package com.appilico.mafiagod.engine

/** Mirrors js/models/Enums.js NightAction — kept as raw strings (not the enum) in
 * nightActions map values, matching the JS action-type tags exactly. */
object NightAction {
    const val KILL = "kill"
    const val MAFIA_HEAL = "mafiaHeal"
    const val BOMB = "bomb"
    const val SILENCE = "silence"
    const val BLOCK = "block"
    const val CURSE = "curse"
    const val SOLO_KILL = "soloKill"
    const val HEAL = "heal"
    const val INVESTIGATE = "investigate"
    const val KANE_REVEAL = "kaneReveal"
    const val REVIVE = "revive"
    const val GIVE_BULLET = "giveBullet"
    const val FRAMASON_RECRUIT = "framasonRecruit"
    const val CHECK_NEGOTIATION = "checkNegotiation"
    const val SNIPE = "snipe"
    const val JOKER_REVERSE = "jokerReverse"
    const val NEGOTIATE = "negotiate"
}

object Team {
    const val MAFIA = "mafia"
    const val CITIZEN = "citizen"
    const val INDEPENDENT = "independent"
}

/** Mirrors LastActionManager.js's CARD id constants. */
object LastActionCard {
    const val FINAL_SHOOT = 1
    const val SKIP_NIGHT = 2
    const val REVEAL = 3
    const val BEAUTIFUL_MIND = 4
    const val FACE_OFF = 5

    fun needsTarget(cardId: Int): Boolean = cardId == FINAL_SHOOT || cardId == BEAUTIFUL_MIND || cardId == FACE_OFF
}
