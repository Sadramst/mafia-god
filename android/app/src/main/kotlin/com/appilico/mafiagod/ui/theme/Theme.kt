package com.appilico.mafiagod.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

// The web app is dark-only by design (a moderator tool used at a dim table) —
// no light theme branch, matching that deliberate product decision.
private val MafiaColorScheme = darkColorScheme(
    primary = Accent,
    onPrimary = TextPrimary,
    primaryContainer = AccentHover,
    onPrimaryContainer = TextPrimary,
    secondary = Citizen,
    onSecondary = TextPrimary,
    tertiary = Independent,
    onTertiary = TextPrimary,
    background = BgPrimary,
    onBackground = TextPrimary,
    surface = BgSecondary,
    onSurface = TextPrimary,
    surfaceVariant = BgTertiary,
    onSurfaceVariant = TextSecondary,
    error = Danger,
    onError = TextPrimary,
    outline = BorderColor,
    outlineVariant = BorderStrong,
)

@Composable
fun MafiaGodTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = MafiaColorScheme,
        typography = MafiaTypography,
        shapes = MafiaShapes,
        content = content,
    )
}
