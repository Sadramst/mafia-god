package com.appilico.mafiagod.ui.theme

import androidx.compose.ui.graphics.Color

// Ported 1:1 from the web app's css/styles.css :root design tokens,
// so the native app reads as the same product, not a reskin.

// Backgrounds — deep midnight navy tones
val BgPrimary = Color(0xFF060611)
val BgSecondary = Color(0xFF0C0C1D)
val BgTertiary = Color(0xFF131325)
val BgCard = Color(0x0AFFFFFF) // rgba(255,255,255,0.04)
val BgCardHover = Color(0x12FFFFFF) // rgba(255,255,255,0.07)
val BgGlass = Color(0x0BFFFFFF) // rgba(255,255,255,0.045)
val BgGlassStrong = Color(0x17FFFFFF) // rgba(255,255,255,0.09)

// Text
val TextPrimary = Color(0xFFEEEEF5)
val TextSecondary = Color(0xFF8B8BA3)
val TextMuted = Color(0xFF4A4A5E)
val TextInverse = Color(0xFF060611)

// Teams
val Mafia = Color(0xFFF43F5E)
val MafiaGlow = Color(0x59F43F5E) // 0.35
val MafiaBg = Color(0x1AF43F5E) // 0.1
val Citizen = Color(0xFF3B82F6)
val CitizenGlow = Color(0x593B82F6)
val CitizenBg = Color(0x1A3B82F6)
val Independent = Color(0xFFA855F7)
val IndependentGlow = Color(0x59A855F7)
val IndependentBg = Color(0x1AA855F7)

// Accent
val Accent = Color(0xFFE11D48)
val AccentHover = Color(0xFFBE123C)
val AccentGlow = Color(0x4DE11D48) // 0.3
val Success = Color(0xFF22C55E)
val SuccessBg = Color(0x1A22C55E)
val Warning = Color(0xFFF59E0B)
val WarningBg = Color(0x1AF59E0B)
val Danger = Color(0xFFEF4444)
val Info = Color(0xFF06B6D4)

// Borders
val BorderColor = Color(0x0FFFFFFF) // 0.06
val BorderStrong = Color(0x1FFFFFFF) // 0.12
