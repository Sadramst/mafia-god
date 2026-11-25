package com.appilico.mafiagod.ui.screens.setup

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
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
import androidx.compose.material3.Text
import com.appilico.mafiagod.ui.theme.Accent
import com.appilico.mafiagod.ui.theme.BgGlass
import com.appilico.mafiagod.ui.theme.Danger
import com.appilico.mafiagod.ui.theme.MafiaRadius
import com.appilico.mafiagod.ui.theme.MafiaSpace
import com.appilico.mafiagod.ui.theme.TextMuted
import com.appilico.mafiagod.ui.theme.TextPrimary

@Composable
private fun ToggleChip(label: String, selected: Boolean, onClick: () -> Unit) {
    Text(
        label,
        color = if (selected) Color.White else TextMuted,
        modifier = Modifier
            .background(if (selected) Accent else BgGlass, RoundedCornerShape(MafiaRadius.full))
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 6.dp),
    )
}

@Composable
fun AssignTab(
    viewModel: MafiaGodViewModel,
    onStartRandom: () -> Unit,
    onStartManual: () -> Unit,
    onBackHome: () -> Unit,
) {
    val rev = viewModel.revision
    val game = viewModel.game
    val fa = isFa()
    val errors = game.validateSetup()
    val mafiaCount = game.selectedRoles.entries.filter { Roles.get(it.key)?.team == Team.MAFIA }.sumOf { it.value }
    val citizenCount = game.selectedRoles.entries.filter { Roles.get(it.key)?.team == Team.CITIZEN }.sumOf { it.value }
    val rec = game.computeRecommendedCounts()

    LazyColumn(Modifier.fillMaxWidth().padding(MafiaSpace.lg), verticalArrangement = Arrangement.spacedBy(MafiaSpace.md)) {
        item {
            Card(colors = CardDefaults.cardColors()) {
                Column(Modifier.padding(MafiaSpace.md)) {
                    Row {
                        Text("🔴 ${t("setup.mafia")}: $mafiaCount", color = TextPrimary)
                        Text("   🔵 ${t("setup.citizen")}: $citizenCount", color = TextPrimary)
                        if (rec.independents > 0) Text("   🧡 ${t("setup.independent")}: ${rec.independents}", color = TextPrimary)
                    }
                    Row(modifier = Modifier.padding(top = MafiaSpace.sm), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        for ((roleId, count) in game.selectedRoles) {
                            val role = Roles.get(roleId) ?: continue
                            RoleBadge(role.icon, role.localizedName(fa), role.team, count)
                        }
                    }
                }
            }
        }

        if (game.selectedRoles.containsKey("zodiac")) {
            item {
                Card(colors = CardDefaults.cardColors()) {
                    Column(Modifier.padding(MafiaSpace.md)) {
                        Text("♈ " + t("setup.zodiacSettings"), fontWeight = FontWeight.Bold, color = TextPrimary)
                        Row(Modifier.padding(top = MafiaSpace.sm), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            listOf("every" to t("setup.everyNight"), "odd" to t("setup.oddNights"), "even" to t("setup.evenNights")).forEach { (v, label) ->
                                ToggleChip(label, game.zodiacFrequency == v) { game.zodiacFrequency = v; viewModel.update {} }
                            }
                        }
                    }
                }
            }
        }

        if (game.selectedRoles.containsKey("drWatson")) {
            item { SelfHealCard(t("setup.drWatsonSettings"), game.drWatsonSelfHealMax, { game.drWatsonSelfHealMax = maxOf(0, game.drWatsonSelfHealMax - 1); viewModel.update {} }, { game.drWatsonSelfHealMax = minOf(10, game.drWatsonSelfHealMax + 1); viewModel.update {} }) }
        }
        if (game.selectedRoles.containsKey("drLecter")) {
            item { SelfHealCard(t("setup.drLecterSettings"), game.drLecterSelfHealMax, { game.drLecterSelfHealMax = maxOf(0, game.drLecterSelfHealMax - 1); viewModel.update {} }, { game.drLecterSelfHealMax = minOf(10, game.drLecterSelfHealMax + 1); viewModel.update {} }) }
        }

        if (errors.isNotEmpty()) {
            item {
                Card(colors = CardDefaults.cardColors()) {
                    Column(Modifier.padding(MafiaSpace.md)) {
                        for (e in errors) Text("⚠️ $e", color = Danger, modifier = Modifier.padding(bottom = 2.dp))
                    }
                }
            }
        }

        item {
            PrimaryButton("🎲 " + t("setup.randomAssignAndStart"), onClick = {
                viewModel.update { assignRolesRandomly() }
                viewModel.persistGame()
                onStartRandom()
            }, enabled = errors.isEmpty())
        }
        item {
            Text("— " + t("setup.orDivider") + " —", color = TextMuted, modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center)
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                Text(t("manualAssign.visibilityLabel"), color = TextMuted, modifier = Modifier.padding(end = 8.dp))
                ToggleChip(t("manualAssign.visibilityOn"), game.manualPickShowRoles) { game.manualPickShowRoles = true; viewModel.update {} }
                androidx.compose.foundation.layout.Spacer(Modifier.padding(start = 6.dp))
                ToggleChip(t("manualAssign.visibilityOff"), !game.manualPickShowRoles) { game.manualPickShowRoles = false; viewModel.update {} }
            }
        }
        item {
            PrimaryButton("🖐️ " + t("setup.manualAssignAndStart"), onClick = {
                viewModel.update { startManualAssignment() }
                viewModel.persistGame()
                onStartManual()
            }, enabled = errors.isEmpty())
        }
        item {
            GhostButton("← " + t("setup.backHome"), onClick = onBackHome)
        }
    }
}

@Composable
private fun SelfHealCard(title: String, value: Int, onDec: () -> Unit, onInc: () -> Unit) {
    Card(colors = CardDefaults.cardColors()) {
        Row(Modifier.padding(MafiaSpace.md).fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            Text(title, fontWeight = FontWeight.Bold, color = TextPrimary)
            Row(verticalAlignment = Alignment.CenterVertically) {
                CounterButton("−", onDec)
                Text("$value", color = TextPrimary, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 8.dp))
                CounterButton("+", onInc)
            }
        }
    }
}
