package com.appilico.mafiagod.ui.screens.setup

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.appilico.mafiagod.MafiaGodViewModel
import com.appilico.mafiagod.engine.Roles
import com.appilico.mafiagod.engine.Team
import com.appilico.mafiagod.i18n.isFa
import com.appilico.mafiagod.i18n.t
import com.appilico.mafiagod.ui.components.CounterButton
import com.appilico.mafiagod.ui.components.RoleGridCard
import com.appilico.mafiagod.ui.theme.MafiaSpace
import com.appilico.mafiagod.ui.theme.TextPrimary
import com.appilico.mafiagod.ui.theme.TextSecondary

@Composable
fun RolesTab(viewModel: MafiaGodViewModel) {
    val rev = viewModel.revision
    val game = viewModel.game
    val fa = isFa()
    val teams = listOf(Team.INDEPENDENT, Team.MAFIA, Team.CITIZEN)

    // Ensure desired counts are initialized, mirroring the web app's render-time call.
    game.computeRecommendedCounts()

    fun selectedCountFor(team: String) = game.selectedRoles.entries
        .filter { Roles.get(it.key)?.team == team }.sumOf { it.value }

    fun toggleRole(roleId: String) {
        val role = Roles.get(roleId) ?: return
        val selecting = (game.selectedRoles[roleId] ?: 0) <= 0
        val total = game.getTotalRoleCount()

        if (roleId == "bodyguard" && (game.selectedRoles["zodiac"] != null || game.selectedRoles["bomber"] != null)) return // disabled

        if (selecting) {
            if (total >= game.players.size) return
            if (role.team == Team.MAFIA && selectedCountFor(Team.MAFIA) >= game.desiredMafia) return
            if (role.team == Team.CITIZEN && selectedCountFor(Team.CITIZEN) >= game.desiredCitizen) return
            if (roleId == "reporter" && game.selectedRoles["negotiator"] == null) return

            game.selectedRoles[roleId] = 1
            if (roleId == "zodiac" || roleId == "bomber") {
                if (game.selectedRoles["bodyguard"] == null) game.selectedRoles["bodyguard"] = 1
            }
        } else {
            if (roleId == "negotiator") {
                game.selectedRoles.remove("reporter")
            }
            game.selectedRoles.remove(roleId)
            if ((roleId == "zodiac" || roleId == "bomber") && game.selectedRoles["zodiac"] == null && game.selectedRoles["bomber"] == null) {
                game.selectedRoles.remove("bodyguard")
            }
        }
        if (role.team == Team.INDEPENDENT) game.computeRecommendedCounts(force = true)
        viewModel.update { }
        viewModel.persistGame()
    }

    fun changeCount(roleId: String, delta: Int) {
        val role = Roles.get(roleId) ?: return
        val current = game.selectedRoles[roleId] ?: 0
        val total = game.getTotalRoleCount()
        if (delta > 0) {
            if (roleId == "reporter" && game.selectedRoles["negotiator"] == null) return
            if (total >= game.players.size) return
            if (role.team == Team.MAFIA && selectedCountFor(Team.MAFIA) >= game.desiredMafia) return
            if (role.team == Team.CITIZEN && selectedCountFor(Team.CITIZEN) >= game.desiredCitizen) return
            game.selectedRoles[roleId] = current + 1
        } else if (current > 0) {
            val next = current - 1
            if (next == 0) game.selectedRoles.remove(roleId) else game.selectedRoles[roleId] = next
        }
        viewModel.update { }
        viewModel.persistGame()
    }

    Column(Modifier.fillMaxWidth().padding(MafiaSpace.lg)) {
        Text(
            "${t("setup.playersLabel")} ${game.players.size}  ·  ${t("setup.selectedRolesLabel")} ${game.getTotalRoleCount()}" +
                if (game.getTotalRoleCount() == game.players.size) " ✓" else " ${t("setup.shouldBe", game.players.size.toString())}",
            color = if (game.getTotalRoleCount() == game.players.size) com.appilico.mafiagod.ui.theme.Success else com.appilico.mafiagod.ui.theme.Danger,
            modifier = Modifier.padding(bottom = MafiaSpace.md),
        )

        LazyVerticalGrid(columns = GridCells.Fixed(2), verticalArrangement = Arrangement.spacedBy(MafiaSpace.sm), horizontalArrangement = Arrangement.spacedBy(MafiaSpace.sm)) {
            for (team in teams) {
                item(span = { androidx.compose.foundation.lazy.grid.GridItemSpan(2) }) {
                    Row(Modifier.fillMaxWidth().padding(top = MafiaSpace.md, bottom = MafiaSpace.xs), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(
                            when (team) { Team.MAFIA -> "🔴 " + t("setup.teamMafia"); Team.CITIZEN -> "🔵 " + t("setup.teamCitizen"); else -> "🧡 " + t("setup.teamIndependent") },
                            style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = TextPrimary,
                        )
                        if (team == Team.MAFIA || team == Team.CITIZEN) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                CounterButton("−") {
                                    // Citizen count is derived (remaining - mafia), so a citizen
                                    // "-" is expressed as a mafia "+" and vice versa below.
                                    if (team == Team.MAFIA) game.setDesiredMafia(game.desiredMafia - 1) else game.setDesiredMafia(game.desiredMafia + 1)
                                    viewModel.update { }
                                }
                                Text(if (team == Team.MAFIA) "${game.desiredMafia}" else "${game.desiredCitizen}", color = TextPrimary, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 6.dp))
                                CounterButton("+") {
                                    if (team == Team.MAFIA) { game.setDesiredMafia(game.desiredMafia + 1) } else { game.setDesiredMafia(game.desiredMafia - 1) }
                                    viewModel.update { }
                                }
                            }
                        }
                    }
                }
                items(Roles.getByTeam(team), key = { it.id }) { role ->
                    val count = game.selectedRoles[role.id] ?: 0
                    val disabled = (role.id == "reporter" && game.selectedRoles["negotiator"] == null) ||
                        (role.id == "bodyguard" && game.selectedRoles["zodiac"] == null && game.selectedRoles["bomber"] == null)
                    RoleGridCard(
                        icon = role.icon, name = role.localizedName(fa), team = role.team,
                        selected = count > 0, count = if (role.unique) null else count, disabled = disabled,
                        onClick = { toggleRole(role.id) },
                        onInc = if (!role.unique) { { changeCount(role.id, 1) } } else null,
                        onDec = if (!role.unique) { { changeCount(role.id, -1) } } else null,
                    )
                }
            }
        }
    }
}
