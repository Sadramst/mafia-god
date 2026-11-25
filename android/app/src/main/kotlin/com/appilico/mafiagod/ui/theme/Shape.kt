package com.appilico.mafiagod.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

// Mirrors --radius-xs..--radius-xl from styles.css
object MafiaRadius {
    val xs = 8.dp
    val sm = 12.dp
    val md = 16.dp
    val lg = 22.dp
    val xl = 28.dp
    val full = 9999.dp
}

object MafiaSpace {
    val xs = 4.dp
    val sm = 8.dp
    val md = 16.dp
    val lg = 24.dp
    val xl = 32.dp
    val xl2 = 48.dp
}

val MafiaShapes = Shapes(
    extraSmall = RoundedCornerShape(MafiaRadius.xs),
    small = RoundedCornerShape(MafiaRadius.sm),
    medium = RoundedCornerShape(MafiaRadius.md),
    large = RoundedCornerShape(MafiaRadius.lg),
    extraLarge = RoundedCornerShape(MafiaRadius.xl),
)
