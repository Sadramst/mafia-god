package com.appilico.mafiagod.ui.screens.rolereveal

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import com.appilico.mafiagod.MafiaGodViewModel
import com.appilico.mafiagod.engine.Roles
import com.appilico.mafiagod.i18n.isFa
import com.appilico.mafiagod.i18n.t
import com.appilico.mafiagod.ui.components.Chip
import com.appilico.mafiagod.ui.components.PrimaryButton
import com.appilico.mafiagod.ui.components.RevealCard
import com.appilico.mafiagod.ui.theme.MafiaSpace
import com.appilico.mafiagod.ui.theme.TextMuted
import com.appilico.mafiagod.ui.theme.TextPrimary

@Composable
fun RoleRevealScreen(
    viewModel: MafiaGodViewModel,
    modifier: Modifier = Modifier,
    onComplete: () -> Unit,
) {
    val game = viewModel.game
    val fa = isFa()
    var index by remember { mutableIntStateOf(0) }
    var flipped by remember { mutableStateOf(false) }

    if (index >= game.players.size) {
        Column(modifier.fillMaxSize().padding(MafiaSpace.lg), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            Text("🌙", style = MaterialTheme.typography.displayLarge)
            Text(t("roleReveal.allRevealed"), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = TextPrimary, modifier = Modifier.padding(top = MafiaSpace.md))
            Text(t("roleReveal.readyForBlindDay"), color = com.appilico.mafiagod.ui.theme.TextSecondary, modifier = Modifier.padding(top = MafiaSpace.xs, bottom = MafiaSpace.lg))
            PrimaryButton(t("roleReveal.startBlindDay"), onClick = {
                viewModel.update { startBlindDay() }
                viewModel.persistGame()
                onComplete()
            })
        }
        return
    }

    val player = game.players[index]
    val role = Roles.get(player.roleId)
    val isLast = index == game.players.size - 1

    Column(modifier.fillMaxSize().padding(MafiaSpace.lg), horizontalAlignment = Alignment.CenterHorizontally) {
        Chip(t("roleReveal.playerOfTotal", (index + 1).toString(), game.players.size.toString()))
        Text(player.nameEn, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = TextPrimary, modifier = Modifier.padding(top = MafiaSpace.sm, bottom = MafiaSpace.lg))

        RevealCard(
            flipped = flipped,
            icon = role?.icon ?: "👤", roleName = role?.localizedName(fa) ?: "—",
            teamLabel = t("teams.${role?.team ?: "citizen"}"), description = role?.localizedDescription(fa) ?: "",
            team = role?.team, frontHint = t("roleReveal.tapCard"),
            onClick = if (!flipped) { { flipped = true } } else null,
        )

        if (flipped) {
            PrimaryButton(if (isLast) t("roleReveal.startGame") else t("roleReveal.nextPlayer"), onClick = {
                index++
                flipped = false
            }, modifier = Modifier.padding(top = MafiaSpace.lg))
        }

        Text(t("roleReveal.onlyPlayerShouldSee", player.nameEn), color = TextMuted, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(top = MafiaSpace.md))
    }
}
