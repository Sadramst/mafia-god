package com.appilico.mafiagod.ui.screens.setup

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.appilico.mafiagod.MafiaGodViewModel
import com.appilico.mafiagod.engine.Roles
import com.appilico.mafiagod.engine.Team
import com.appilico.mafiagod.i18n.isFa
import com.appilico.mafiagod.i18n.t
import com.appilico.mafiagod.ui.components.CounterButton
import com.appilico.mafiagod.ui.components.GhostButton
import com.appilico.mafiagod.ui.components.PrimaryButton
import com.appilico.mafiagod.ui.components.RoleBadge
import com.appilico.mafiagod.ui.components.RoleGridCard
import com.appilico.mafiagod.ui.components.SectionTitle
import com.appilico.mafiagod.ui.components.teamColor
import com.appilico.mafiagod.ui.theme.Danger
import com.appilico.mafiagod.ui.theme.MafiaSpace
import com.appilico.mafiagod.ui.theme.Success
import com.appilico.mafiagod.ui.theme.TextMuted
import com.appilico.mafiagod.ui.theme.TextPrimary
import com.appilico.mafiagod.ui.theme.TextSecondary

@Composable
fun SetupScreen(
    viewModel: MafiaGodViewModel,
    modifier: Modifier = Modifier,
    onStartRandom: () -> Unit,
    onStartManual: () -> Unit,
    onBackHome: () -> Unit,
) {
    val rev = viewModel.revision
    val game = viewModel.game
    var tab by remember { mutableIntStateOf(0) }
    val fa = isFa()

    Column(modifier = modifier.fillMaxSize()) {
        TabRow(selectedTabIndex = tab) {
            Tab(selected = tab == 0, onClick = { tab = 0 }, text = { Text("👥 ${t("setup.playersTab")} (${game.players.size})") })
            Tab(selected = tab == 1, onClick = { tab = 1 }, enabled = game.players.size >= 8, text = { Text("🎭 ${t("setup.rolesTab")} (${game.getTotalRoleCount()})") })
            Tab(
                selected = tab == 2,
                onClick = { tab = 2 },
                enabled = game.players.size >= 8 && game.getTotalRoleCount() == game.players.size,
                text = { Text("🎲 ${t("setup.assignTab")}") },
            )
        }

        when (tab) {
            0 -> PlayersTab(viewModel)
            1 -> RolesTab(viewModel)
            2 -> AssignTab(viewModel, onStartRandom, onStartManual, onBackHome)
        }
    }
}

@Composable
private fun PlayersTab(viewModel: MafiaGodViewModel) {
    val game = viewModel.game
    var name by remember { mutableStateOf("") }

    fun addPlayer() {
        val trimmed = name.trim()
        if (trimmed.isEmpty()) return
        if (game.players.any { it.nameEn == trimmed || it.nameFa == trimmed }) return
        viewModel.update { addPlayer(trimmed) }
        viewModel.persistGame()
        viewModel.persistRoster()
        name = ""
    }

    Column(Modifier.fillMaxSize().padding(MafiaSpace.lg)) {
        SectionTitle("👥 " + t("setup.playersTitle"))
        Text(t("setup.playersSubtitle"), color = TextSecondary, modifier = Modifier.padding(bottom = MafiaSpace.md))

        Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
            OutlinedTextField(
                value = name, onValueChange = { name = it },
                label = { Text(t("setup.playerName")) },
                modifier = Modifier.weight(1f),
                singleLine = true,
            )
            androidx.compose.foundation.layout.Spacer(Modifier.padding(start = MafiaSpace.sm))
            PrimaryButton(t("setup.addButton"), onClick = ::addPlayer, modifier = Modifier.padding(start = MafiaSpace.sm))
        }

        androidx.compose.foundation.layout.Spacer(Modifier.padding(top = MafiaSpace.md))

        if (game.players.isEmpty()) {
            Text(t("setup.noPlayersYet"), color = TextMuted, modifier = Modifier.padding(top = MafiaSpace.xl))
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(MafiaSpace.sm)) {
                items(game.players, key = { it.id }) { p ->
                    Card(colors = CardDefaults.cardColors()) {
                        Row(
                            Modifier.fillMaxWidth().padding(MafiaSpace.md),
                            verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Text(p.nameEn, color = TextPrimary, fontWeight = FontWeight.SemiBold)
                            Text(
                                "✕", color = Danger,
                                modifier = Modifier.padding(4.dp).clickable {
                                    viewModel.update { removePlayer(p.id) }
                                    viewModel.persistGame(); viewModel.persistRoster()
                                },
                            )
                        }
                    }
                }
            }
        }
    }
}
