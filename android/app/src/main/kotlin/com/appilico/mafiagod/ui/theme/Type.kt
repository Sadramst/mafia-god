package com.appilico.mafiagod.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.appilico.mafiagod.R

// Vazirmatn — same variable font family the web app uses, chosen for its
// excellent bilingual (Farsi + Latin) shaping.
val Vazirmatn = FontFamily(
    Font(R.font.vazirmatn_regular, FontWeight.Normal),
    Font(R.font.vazirmatn_medium, FontWeight.Medium),
    Font(R.font.vazirmatn_semibold, FontWeight.SemiBold),
    Font(R.font.vazirmatn_bold, FontWeight.Bold),
    Font(R.font.vazirmatn_extrabold, FontWeight.ExtraBold),
)

// Scale mirrors --text-xs..--text-4xl from styles.css (rem * 16px base)
object MafiaTextSize {
    val xs = 12.sp
    val sm = 13.sp
    val base = 15.sp
    val md = 16.sp
    val lg = 18.sp
    val xl = 20.sp
    val xl2 = 24.sp
    val xl3 = 32.sp
    val xl4 = 44.sp
}

val MafiaTypography = Typography(
    displayLarge = TextStyle(fontFamily = Vazirmatn, fontWeight = FontWeight.ExtraBold, fontSize = MafiaTextSize.xl4),
    headlineLarge = TextStyle(fontFamily = Vazirmatn, fontWeight = FontWeight.ExtraBold, fontSize = MafiaTextSize.xl3),
    headlineMedium = TextStyle(fontFamily = Vazirmatn, fontWeight = FontWeight.Bold, fontSize = MafiaTextSize.xl2),
    headlineSmall = TextStyle(fontFamily = Vazirmatn, fontWeight = FontWeight.Bold, fontSize = MafiaTextSize.xl),
    titleLarge = TextStyle(fontFamily = Vazirmatn, fontWeight = FontWeight.SemiBold, fontSize = MafiaTextSize.lg),
    titleMedium = TextStyle(fontFamily = Vazirmatn, fontWeight = FontWeight.SemiBold, fontSize = MafiaTextSize.md),
    titleSmall = TextStyle(fontFamily = Vazirmatn, fontWeight = FontWeight.SemiBold, fontSize = MafiaTextSize.base),
    bodyLarge = TextStyle(fontFamily = Vazirmatn, fontWeight = FontWeight.Normal, fontSize = MafiaTextSize.md),
    bodyMedium = TextStyle(fontFamily = Vazirmatn, fontWeight = FontWeight.Normal, fontSize = MafiaTextSize.base),
    bodySmall = TextStyle(fontFamily = Vazirmatn, fontWeight = FontWeight.Normal, fontSize = MafiaTextSize.sm),
    labelLarge = TextStyle(fontFamily = Vazirmatn, fontWeight = FontWeight.SemiBold, fontSize = MafiaTextSize.base),
    labelMedium = TextStyle(fontFamily = Vazirmatn, fontWeight = FontWeight.Medium, fontSize = MafiaTextSize.sm),
    labelSmall = TextStyle(fontFamily = Vazirmatn, fontWeight = FontWeight.Medium, fontSize = MafiaTextSize.xs),
)
