package com.appilico.mafiagod.ui.components

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.appilico.mafiagod.engine.Team
import com.appilico.mafiagod.ui.theme.Accent
import com.appilico.mafiagod.ui.theme.AccentHover
import com.appilico.mafiagod.ui.theme.BgCard
import com.appilico.mafiagod.ui.theme.BgCardHover
import com.appilico.mafiagod.ui.theme.BgGlass
import com.appilico.mafiagod.ui.theme.BorderColor
import com.appilico.mafiagod.ui.theme.Citizen
import com.appilico.mafiagod.ui.theme.CitizenBg
import com.appilico.mafiagod.ui.theme.Independent
import com.appilico.mafiagod.ui.theme.IndependentBg
import com.appilico.mafiagod.ui.theme.Mafia
import com.appilico.mafiagod.ui.theme.MafiaBg
import com.appilico.mafiagod.ui.theme.MafiaRadius
import com.appilico.mafiagod.ui.theme.MafiaSpace
import com.appilico.mafiagod.ui.theme.TextMuted
import com.appilico.mafiagod.ui.theme.TextPrimary
import com.appilico.mafiagod.ui.theme.TextSecondary

fun teamColor(team: String?): Color = when (team) {
    Team.MAFIA -> Mafia
    Team.CITIZEN -> Citizen
    Team.INDEPENDENT -> Independent
    else -> TextMuted
}

fun teamBg(team: String?): Color = when (team) {
    Team.MAFIA -> MafiaBg
    Team.CITIZEN -> CitizenBg
    Team.INDEPENDENT -> IndependentBg
    else -> BgGlass
}

@Composable
fun SectionTitle(text: String, modifier: Modifier = Modifier) {
    Text(text, style = MaterialTheme.typography.headlineSmall, color = TextPrimary, modifier = modifier.padding(bottom = MafiaSpace.sm))
}

@Composable
fun Subtitle(text: String, modifier: Modifier = Modifier) {
    Text(text, style = MaterialTheme.typography.bodyMedium, color = TextSecondary, modifier = modifier.padding(bottom = MafiaSpace.md))
}

@Composable
fun PrimaryButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(MafiaRadius.sm),
        colors = ButtonDefaults.buttonColors(containerColor = Accent, contentColor = TextPrimary),
    ) { Text(text, fontWeight = FontWeight.Bold) }
}

@Composable
fun GhostButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true) {
    OutlinedButton(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(MafiaRadius.sm),
        border = androidx.compose.foundation.BorderStroke(1.dp, BorderColor),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = TextPrimary),
    ) { Text(text) }
}

@Composable
fun Chip(text: String, modifier: Modifier = Modifier, color: Color = TextSecondary, bg: Color = BgGlass) {
    Box(
        modifier = modifier
            .background(bg, RoundedCornerShape(MafiaRadius.full))
            .padding(horizontal = MafiaSpace.md, vertical = MafiaSpace.xs),
    ) {
        Text(text, color = color, style = MaterialTheme.typography.labelMedium)
    }
}

@Composable
fun RoleBadge(icon: String, name: String, team: String?, count: Int = 1, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .background(teamBg(team), RoundedCornerShape(MafiaRadius.full))
            .padding(horizontal = MafiaSpace.md, vertical = MafiaSpace.xs),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text("$icon $name${if (count > 1) " ×$count" else ""}", color = teamColor(team), style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
fun RoleGridCard(
    icon: String,
    name: String,
    team: String?,
    selected: Boolean,
    count: Int?,
    disabled: Boolean,
    onClick: () -> Unit,
    onInc: (() -> Unit)? = null,
    onDec: (() -> Unit)? = null,
    onInfo: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val borderColor = if (selected) teamColor(team) else BorderColor
    val bg = if (selected) teamBg(team) else BgCard
    Card(
        onClick = onClick,
        enabled = !disabled,
        modifier = modifier.aspectRatio(0.85f),
        shape = RoundedCornerShape(MafiaRadius.md),
        colors = CardDefaults.cardColors(containerColor = bg),
        border = androidx.compose.foundation.BorderStroke(2.dp, borderColor),
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(MafiaSpace.sm),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text(icon, style = MaterialTheme.typography.headlineMedium)
            Text(name, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center, maxLines = 2, modifier = Modifier.padding(top = MafiaSpace.xs))
            if (count != null && count > 1) {
                Text("×$count", style = MaterialTheme.typography.labelSmall, color = TextSecondary, modifier = Modifier.padding(top = 2.dp))
            }
            if (onInc != null && onDec != null) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = MafiaSpace.xs)) {
                    CounterButton("−", onDec)
                    Text("${count ?: 0}", modifier = Modifier.padding(horizontal = 6.dp), color = TextPrimary, fontWeight = FontWeight.Bold)
                    CounterButton("+", onInc)
                }
            }
        }
    }
}

@Composable
fun CounterButton(symbol: String, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(26.dp)
            .background(BgGlass, CircleShape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) { Text(symbol, color = TextPrimary, fontWeight = FontWeight.Bold) }
}

@Composable
fun MysteryCard(index: Int, label: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val infinite = rememberInfiniteTransition(label = "mystery")
    val scale by infinite.animateFloat(
        initialValue = 1f, targetValue = 1.08f,
        animationSpec = infiniteRepeatable(tween(1200), RepeatMode.Reverse),
        label = "mysteryScale",
    )
    Card(
        onClick = onClick,
        modifier = modifier.aspectRatio(0.85f),
        shape = RoundedCornerShape(MafiaRadius.md),
        colors = CardDefaults.cardColors(containerColor = BgCard),
        border = androidx.compose.foundation.BorderStroke(2.dp, Accent.copy(alpha = 0.3f)),
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(MafiaSpace.sm),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text("❓", style = MaterialTheme.typography.headlineLarge, color = Accent, modifier = Modifier.graphicsLayer(scaleX = scale, scaleY = scale))
            Text(label, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold, color = TextSecondary, modifier = Modifier.padding(top = MafiaSpace.xs))
        }
    }
}

/** Flip-card used by RoleReveal and ManualAssign confirm — [flipped] true shows the back face. */
@Composable
fun RevealCard(
    flipped: Boolean,
    icon: String,
    roleName: String,
    teamLabel: String,
    description: String,
    team: String?,
    frontHint: String,
    onClick: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .aspectRatio(0.72f)
            .let { if (onClick != null) it.clickable(onClick = onClick) else it },
        shape = RoundedCornerShape(MafiaRadius.lg),
        colors = CardDefaults.cardColors(containerColor = if (flipped) teamBg(team) else BgCard),
        border = androidx.compose.foundation.BorderStroke(2.dp, if (flipped) teamColor(team) else BorderColor),
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(MafiaSpace.lg),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            if (!flipped) {
                Text("❓", style = MaterialTheme.typography.displayLarge, color = TextMuted)
                Text(frontHint, style = MaterialTheme.typography.bodyMedium, color = TextSecondary, modifier = Modifier.padding(top = MafiaSpace.md))
            } else {
                Text(icon, style = MaterialTheme.typography.displayLarge)
                Text(roleName, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = TextPrimary, textAlign = TextAlign.Center, modifier = Modifier.padding(top = MafiaSpace.md))
                Chip(teamLabel, color = teamColor(team), bg = teamBg(team), modifier = Modifier.padding(top = MafiaSpace.sm))
                Text(description, style = MaterialTheme.typography.bodySmall, color = TextSecondary, textAlign = TextAlign.Center, modifier = Modifier.padding(top = MafiaSpace.md))
            }
        }
    }
}

@Composable
fun AliveDot(alive: Boolean, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .size(10.dp)
            .background(if (alive) com.appilico.mafiagod.ui.theme.Success else com.appilico.mafiagod.ui.theme.Danger, CircleShape),
    )
}
