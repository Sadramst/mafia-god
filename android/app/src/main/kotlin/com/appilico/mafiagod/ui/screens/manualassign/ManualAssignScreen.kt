package com.appilico.mafiagod.ui.screens.manualassign

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import com.appilico.mafiagod.MafiaGodViewModel
import com.appilico.mafiagod.engine.Roles
import com.appilico.mafiagod.engine.Team
import com.appilico.mafiagod.i18n.isFa
import com.appilico.mafiagod.i18n.t
import com.appilico.mafiagod.ui.components.Chip
import com.appilico.mafiagod.ui.components.GhostButton
import com.appilico.mafiagod.ui.components.MysteryCard
import com.appilico.mafiagod.ui.components.PrimaryButton
import com.appilico.mafiagod.ui.components.RevealCard
import com.appilico.mafiagod.ui.components.RoleGridCard
import com.appilico.mafiagod.ui.theme.MafiaSpace
import com.appilico.mafiagod.ui.theme.TextPrimary
import com.appilico.mafiagod.ui.theme.TextSecondary

@Composable
fun ManualAssignScreen(
    viewModel: MafiaGodViewModel,
    modifier: Modifier = Modifier,
    onRedirectSetup: () -> Unit,
    onComplete: () -> Unit,
) {
    val rev = viewModel.revision
    val game = viewModel.game
    val fa = isFa()

    // Guard mirrors ManualAssignView.render(): a roster edit mid-flow cancels back to setup.
    LaunchedEffect(rev) {
        if (game.phase != "manualAssign" && !game.isManualAssignmentComplete()) onRedirectSetup()
    }
    if (game.phase != "manualAssign") return

    var pendingRoleId by remember { mutableStateOf<String?>(null) }
    var isBlindPick by remember { mutableStateOf(false) }

    if (game.isManualAssignmentComplete()) {
        CompleteScreen(onStart = {
            viewModel.update { startBlindDay() }
            viewModel.persistGame()
            onComplete()
        })
        return
    }

    val player = game.getManualCurrentPlayer() ?: run {
        CompleteScreen(onStart = { viewModel.update { startBlindDay() }; viewModel.persistGame(); onComplete() })
        return
    }

    Column(modifier = modifier.fillMaxSize().padding(MafiaSpace.lg), horizontalAlignment = Alignment.CenterHorizontally) {
        Chip(t("roleReveal.playerOfTotal", (game.players.indexOf(player) + 1).toString(), game.players.size.toString()))
        Text(player.nameEn, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = TextPrimary, modifier = Modifier.padding(top = MafiaSpace.sm))

        if (pendingRoleId == null) {
            Text(
                if (game.manualPickShowRoles) t("manualAssign.pickPrompt") else t("manualAssign.blindPickPrompt"),
                color = TextSecondary, modifier = Modifier.padding(top = MafiaSpace.sm, bottom = MafiaSpace.lg), textAlign = TextAlign.Center,
            )
            if (game.manualPickShowRoles) {
                val remaining = game.getManualRemainingRoles()
                    .mapNotNull { (id, c) -> Roles.get(id)?.let { Triple(id, c, it) } }
                    .sortedBy { (_, _, r) -> listOf(Team.INDEPENDENT, Team.MAFIA, Team.CITIZEN).indexOf(r.team) }
                LazyVerticalGrid(columns = GridCells.Fixed(2), verticalArrangement = Arrangement.spacedBy(MafiaSpace.sm), horizontalArrangement = Arrangement.spacedBy(MafiaSpace.sm)) {
                    items(remaining, key = { it.first }) { (id, count, role) ->
                        RoleGridCard(
                            icon = role.icon, name = role.localizedName(fa), team = role.team,
                            selected = false, count = if (count > 1) count else null, disabled = false,
                            onClick = { pendingRoleId = id; isBlindPick = false },
                        )
                    }
                }
            } else {
                val totalRemaining = game.getManualRemainingRoles().sumOf { it.second }
                LazyVerticalGrid(columns = GridCells.Fixed(2), verticalArrangement = Arrangement.spacedBy(MafiaSpace.sm), horizontalArrangement = Arrangement.spacedBy(MafiaSpace.sm)) {
                    items(totalRemaining) { i ->
                        MysteryCard(index = i, label = t("manualAssign.mysteryCard", (i + 1).toString()), onClick = {
                            pendingRoleId = viewModel.update { peekManualRandomRole() }
                            isBlindPick = true
                        })
                    }
                }
            }
        } else {
            val role = Roles.get(pendingRoleId)
            Text(t("manualAssign.confirmPrompt"), color = TextSecondary, modifier = Modifier.padding(top = MafiaSpace.sm, bottom = MafiaSpace.lg))
            RevealCard(
                flipped = true, icon = role?.icon ?: "👤", roleName = role?.localizedName(fa) ?: "—",
                teamLabel = t("teams.${role?.team ?: "citizen"}"), description = role?.localizedDescription(fa) ?: "",
                team = role?.team, frontHint = "",
            )
            PrimaryButton(t("common.confirmAndContinue"), onClick = {
                val roleId = pendingRoleId ?: return@PrimaryButton
                pendingRoleId = null
                isBlindPick = false
                viewModel.update { assignManualRole(roleId) }
                viewModel.persistGame()
            }, modifier = Modifier.padding(top = MafiaSpace.lg))
            if (!isBlindPick) {
                GhostButton(t("manualAssign.pickDifferent"), onClick = { pendingRoleId = null }, modifier = Modifier.padding(top = MafiaSpace.sm))
            }
        }
    }
}

@Composable
private fun CompleteScreen(onStart: () -> Unit) {
    Column(Modifier.fillMaxSize().padding(MafiaSpace.lg), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Text("🌙", style = MaterialTheme.typography.displayLarge)
        Text(t("roleReveal.allRevealed"), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = TextPrimary, modifier = Modifier.padding(top = MafiaSpace.md))
        Text(t("roleReveal.readyForBlindDay"), color = TextSecondary, modifier = Modifier.padding(top = MafiaSpace.xs, bottom = MafiaSpace.lg))
        PrimaryButton(t("roleReveal.startBlindDay"), onClick = onStart)
    }
}
