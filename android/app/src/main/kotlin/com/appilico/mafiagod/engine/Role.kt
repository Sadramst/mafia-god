package com.appilico.mafiagod.engine

/** Ported from js/models/Role.js. `nightAction` uses [NightAction] constants, null = no night action. */
data class Role(
    val id: String,
    val nameEn: String,
    val nameFa: String,
    val team: String,
    val icon: String,
    val nightAction: String?,
    val nightOrder: Int,
    val maxCount: Int,
    val unique: Boolean,
    val descEn: String,
    val descFa: String,
    val hasShield: Boolean = false,
    val shootImmune: Boolean = false,
    val voteImmune: Boolean = false,
) {
    fun hasNightAction(): Boolean = nightAction != null

    fun localizedName(fa: Boolean): String = if (fa) nameFa else nameEn
    fun localizedDescription(fa: Boolean): String = if (fa) descFa else descEn
}
