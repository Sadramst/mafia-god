package com.appilico.mafiagod.ui.screens.night

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.appilico.mafiagod.MafiaGodViewModel
import com.appilico.mafiagod.engine.NightActionExtra
import com.appilico.mafiagod.engine.Player
import com.appilico.mafiagod.engine.Roles
import com.appilico.mafiagod.engine.Team
import com.appilico.mafiagod.i18n.isFa
import com.appilico.mafiagod.i18n.t
import com.appilico.mafiagod.ui.components.Chip
import com.appilico.mafiagod.ui.components.GhostButton
import com.appilico.mafiagod.ui.components.PrimaryButton
import com.appilico.mafiagod.ui.theme.Accent
import com.appilico.mafiagod.ui.theme.BgCard
import com.appilico.mafiagod.ui.theme.BgGlass
import com.appilico.mafiagod.ui.theme.MafiaRadius
import com.appilico.mafiagod.ui.theme.MafiaSpace
import com.appilico.mafiagod.ui.theme.Success
import com.appilico.mafiagod.ui.theme.TextMuted
import com.appilico.mafiagod.ui.theme.TextPrimary
import com.appilico.mafiagod.ui.theme.TextSecondary

@Composable
fun NightScreen(
    viewModel: MafiaGodViewModel,
    modifier: Modifier = Modifier,
    onGoToDay: () -> Unit,
    onGoToSummary: () -> Unit,
) {
    val rev = viewModel.revision
    val game = viewModel.game
    val fa = isFa()
    val counts = game.getTeamCounts()

    // Auto-skip the Reporter step when Negotiator didn't act — mirrors NightView's render-time
    // loop; Reporter is read-only info, never needs a real interaction.
    while (game.getCurrentNightStep()?.roleId == "reporter" && game.nightActions["negotiator"]?.targetId == null) {
        viewModel.update { skipNightAction() }
    }

    Column(modifier = modifier.fillMaxSize().padding(MafiaSpace.lg)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text(
                if (game.phase == "blindNight") "🌙 " + t("night.blindTitle") else "🌙 " + t("night.roundLabel", game.round.toString()),
                style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = TextPrimary,
            )
        }
        Row(Modifier.padding(vertical = MafiaSpace.sm), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Chip("🔴 ${counts.mafia}")
            Chip("🔵 ${counts.citizen}")
            Chip("🧡 ${counts.independent}")
        }

        LazyColumn(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(MafiaSpace.sm)) {
            itemsIndexed(game.nightSteps) { idx, step ->
                when {
                    idx < game.currentNightStep -> CompletedStepRow(step, game, fa)
                    idx == game.currentNightStep -> ActiveStepCard(viewModel, step, fa)
                    else -> PendingStepRow(step, fa)
                }
            }
        }

        if (game.isNightComplete()) {
            PrimaryButton(
                if (game.phase == "blindNight") t("night.endBlindNight") else t("night.resolveNight"),
                onClick = {
                    val results = viewModel.update { resolveNight() }
                    viewModel.setLastNightResults(results)
                    if (game.phase == "blindNight") {
                        viewModel.update { startDay() }
                        viewModel.persistGame()
                        onGoToDay()
                    } else {
                        viewModel.update { startDay() }
                        val winner = viewModel.update { checkWinCondition() }
                        viewModel.persistGame()
                        if (winner != null) onGoToSummary() else onGoToDay()
                    }
                },
                modifier = Modifier.padding(top = MafiaSpace.sm),
            )
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.itemsIndexed(
    steps: List<com.appilico.mafiagod.engine.NightStep>,
    content: @Composable (Int, com.appilico.mafiagod.engine.NightStep) -> Unit,
) {
    items(steps.size) { i -> content(i, steps[i]) }
}

@Composable
private fun CompletedStepRow(step: com.appilico.mafiagod.engine.NightStep, game: com.appilico.mafiagod.engine.Game, fa: Boolean) {
    val role = Roles.get(step.roleId)
    Card(colors = CardDefaults.cardColors(containerColor = BgCard)) {
        Row(Modifier.padding(MafiaSpace.md).fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            Text("${role?.icon ?: step.roleIcon} ${role?.localizedName(fa) ?: step.roleName}", color = TextSecondary)
            val targetName = step.targetId?.let { game.getPlayer(it)?.name(fa) }
            Text(targetName ?: t("night.skipped"), color = if (targetName != null) Success else TextMuted)
        }
    }
}

@Composable
private fun PendingStepRow(step: com.appilico.mafiagod.engine.NightStep, fa: Boolean) {
    val role = Roles.get(step.roleId)
    Card(colors = CardDefaults.cardColors(containerColor = BgGlass)) {
        Text("${role?.icon ?: step.roleIcon} ${role?.localizedName(fa) ?: step.roleName}", color = TextMuted, modifier = Modifier.padding(MafiaSpace.md))
    }
}

@Composable
private fun ActiveStepCard(viewModel: MafiaGodViewModel, step: com.appilico.mafiagod.engine.NightStep, fa: Boolean) {
    val game = viewModel.game
    val role = Roles.get(step.roleId)

    Card(colors = CardDefaults.cardColors(containerColor = Accent.copy(alpha = 0.08f)), border = androidx.compose.foundation.BorderStroke(2.dp, Accent)) {
        Column(Modifier.padding(MafiaSpace.md).fillMaxWidth()) {
            Text("${role?.icon ?: step.roleIcon} ${role?.localizedName(fa) ?: step.roleName}", fontWeight = FontWeight.Bold, color = TextPrimary, style = MaterialTheme.typography.titleMedium)

            when (step.roleId) {
                "mafiaReveal" -> MafiaRevealStep(viewModel, step)
                "godfather" -> GodfatherStep(viewModel, step, fa)
                "bomber" -> BomberStep(viewModel, step, fa)
                "gunner" -> GunnerStep(viewModel, step, fa)
                "reporter" -> ReporterStep(viewModel, step)
                "kane" -> KaneStep(viewModel, step, fa)
                else -> GenericTargetStep(viewModel, step, fa)
            }
        }
    }
}

@Composable
private fun MafiaRevealStep(viewModel: MafiaGodViewModel, step: com.appilico.mafiagod.engine.NightStep) {
    val game = viewModel.game
    val fa = isFa()
    Text(t("night.mafiaRevealPrompt"), color = TextSecondary, modifier = Modifier.padding(top = MafiaSpace.sm, bottom = MafiaSpace.sm))
    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        for (id in step.actors) {
            val p = game.getPlayer(id) ?: continue
            Chip(p.name(fa))
        }
    }
    PrimaryButton(t("night.acknowledge"), onClick = { viewModel.update { skipNightAction() } }, modifier = Modifier.padding(top = MafiaSpace.md))
}

@Composable
private fun ReporterStep(viewModel: MafiaGodViewModel, step: com.appilico.mafiagod.engine.NightStep) {
    val game = viewModel.game
    val fa = isFa()
    val negotiated = game.nightActions["negotiator"]?.targetId != null
    val success = negotiated && game.getPlayer(game.nightActions["negotiator"]?.targetId)?.roleId == "simpleMafia"
    Text(if (success) "👍" else "👎", style = MaterialTheme.typography.displaySmall, modifier = Modifier.padding(vertical = MafiaSpace.sm))
    PrimaryButton(t("night.confirm"), onClick = { viewModel.update { skipNightAction() } })
}

@Composable
private fun KaneStep(viewModel: MafiaGodViewModel, step: com.appilico.mafiagod.engine.NightStep, fa: Boolean) {
    // The engine already omits this step once pending-death; a "fake wake" (already-used) case
    // still shows here since Game deliberately keeps offering it to avoid leaking info.
    GenericTargetStep(viewModel, step, fa)
}

@Composable
private fun GodfatherStep(viewModel: MafiaGodViewModel, step: com.appilico.mafiagod.engine.NightStep, fa: Boolean) {
    val game = viewModel.game
    var mode by remember { mutableStateOf("shoot") }
    var selectedTarget by remember { mutableStateOf<Int?>(null) }
    var guessedRole by remember { mutableStateOf<String?>(null) }

    Row(Modifier.padding(top = MafiaSpace.sm), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        ModeChip(t("night.mode.shoot"), mode == "shoot") { mode = "shoot"; selectedTarget = null }
        ModeChip(t("night.mode.salakhi"), mode == "salakhi") { mode = "salakhi"; selectedTarget = null }
    }

    val candidates = if (mode == "shoot") {
        game.getAlivePlayers().filter { Roles.get(it.roleId)?.shootImmune != true }
    } else {
        game.getAlivePlayers().filter { Roles.get(it.roleId)?.team != Team.MAFIA }
    }
    TargetGrid(candidates, selectedTarget, fa) { selectedTarget = it }

    if (mode == "salakhi" && selectedTarget != null) {
        Text(t("night.guessRole"), color = TextSecondary, modifier = Modifier.padding(top = MafiaSpace.sm))
        val nonMafiaRoles = Roles.ALL.values.filter { it.team != Team.MAFIA }.sortedBy { it.localizedName(fa) }
        Row(Modifier.padding(top = 4.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            androidx.compose.foundation.layout.FlowRow(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                for (r in nonMafiaRoles) {
                    ModeChip("${r.icon} ${r.localizedName(fa)}", guessedRole == r.id) { guessedRole = r.id }
                }
            }
        }
    }

    val canConfirm = selectedTarget != null && (mode == "shoot" || guessedRole != null)
    Row(Modifier.padding(top = MafiaSpace.md), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        GhostButton(t("night.skip"), onClick = { viewModel.update { skipNightAction() } }, modifier = Modifier.weight(1f))
        PrimaryButton(t("night.confirm"), enabled = canConfirm, onClick = {
            viewModel.update { recordNightAction(selectedTarget, NightActionExtra(mode = mode, guessedRoleId = if (mode == "salakhi") guessedRole else null)) }
        }, modifier = Modifier.weight(1f))
    }
}

@Composable
private fun BomberStep(viewModel: MafiaGodViewModel, step: com.appilico.mafiagod.engine.NightStep, fa: Boolean) {
    val game = viewModel.game
    var selectedTarget by remember { mutableStateOf<Int?>(null) }
    var password by remember { mutableIntStateOf(0) }

    TargetGrid(game.getAlivePlayers(), selectedTarget, fa) { selectedTarget = it }
    Text(t("night.bombPassword"), color = TextSecondary, modifier = Modifier.padding(top = MafiaSpace.sm))
    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        for (p in 1..4) ModeChip("$p", password == p) { password = p }
    }
    Row(Modifier.padding(top = MafiaSpace.md), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        GhostButton(t("night.skip"), onClick = { viewModel.update { skipNightAction() } }, modifier = Modifier.weight(1f))
        PrimaryButton(t("night.confirm"), enabled = selectedTarget != null && password > 0, onClick = {
            viewModel.update { recordNightAction(selectedTarget, NightActionExtra(bombPassword = password)) }
        }, modifier = Modifier.weight(1f))
    }
}

@Composable
private fun GunnerStep(viewModel: MafiaGodViewModel, step: com.appilico.mafiagod.engine.NightStep, fa: Boolean) {
    val game = viewModel.game
    var assignments by remember { mutableStateOf(listOf<com.appilico.mafiagod.engine.BulletAssignment>()) }
    var pendingType by remember { mutableStateOf("blank") }

    Text("🟡 ${t("setup.gunnerBlankBullets")}: ${game.bulletManager.blankRemainingCount}   🔴 ${t("setup.gunnerLiveBullets")}: ${game.bulletManager.liveRemainingCount}", color = TextSecondary, modifier = Modifier.padding(top = MafiaSpace.sm))
    Row(Modifier.padding(top = MafiaSpace.sm), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        ModeChip(t("night.bulletBlank"), pendingType == "blank") { pendingType = "blank" }
        ModeChip(t("night.bulletLive"), pendingType == "live") { pendingType = "live" }
    }
    val assignedIds = assignments.map { it.holderId }.toSet()
    val candidates = game.getAlivePlayers().filter { it.id !in assignedIds }
    TargetGrid(candidates, null, fa) { id ->
        assignments = assignments + com.appilico.mafiagod.engine.BulletAssignment(id, pendingType)
    }
    if (assignments.isNotEmpty()) {
        Column(Modifier.padding(top = MafiaSpace.sm)) {
            for (a in assignments) {
                val name = game.getPlayer(a.holderId)?.name(fa) ?: ""
                Text("• $name — ${if (a.type == "live") t("night.bulletLive") else t("night.bulletBlank")}", color = TextSecondary)
            }
        }
    }
    Row(Modifier.padding(top = MafiaSpace.md), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        GhostButton(t("night.skip"), onClick = { viewModel.update { skipNightAction() } }, modifier = Modifier.weight(1f))
        PrimaryButton(t("night.confirm"), enabled = assignments.isNotEmpty(), onClick = {
            viewModel.update { recordNightAction(null, NightActionExtra(bulletAssignments = assignments)) }
        }, modifier = Modifier.weight(1f))
    }
}

@Composable
private fun GenericTargetStep(viewModel: MafiaGodViewModel, step: com.appilico.mafiagod.engine.NightStep, fa: Boolean) {
    val game = viewModel.game
    var selectedTarget by remember { mutableStateOf<Int?>(null) }

    val candidates: List<Player> = when (step.roleId) {
        "drLecter" -> game.getAlivePlayers().filter { Roles.get(it.roleId)?.team == Team.MAFIA && game.canDrLecterHeal(it.id) }
        "drWatson" -> game.getAlivePlayers().filter { game.canDrWatsonHeal(it.id) }
        "jadoogar" -> game.getAlivePlayers().filter { Roles.get(it.roleId)?.team != Team.MAFIA }
        "joker" -> game.getAlivePlayers().filter { it.id !in step.actors }
        "constantine" -> game.getRevivablePlayers()
        "freemason" -> game.getAlivePlayers().filter { it.id !in game.framason.allianceIds }
        else -> game.getAlivePlayers()
    }

    TargetGrid(candidates, selectedTarget, fa) { selectedTarget = it }
    Row(Modifier.padding(top = MafiaSpace.md), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        GhostButton(t("night.skip"), onClick = { viewModel.update { skipNightAction() } }, modifier = Modifier.weight(1f))
        PrimaryButton(t("night.confirm"), enabled = selectedTarget != null, onClick = {
            viewModel.update { recordNightAction(selectedTarget) }
        }, modifier = Modifier.weight(1f))
    }
}

@Composable
private fun TargetGrid(players: List<Player>, selected: Int?, fa: Boolean, onSelect: (Int) -> Unit) {
    androidx.compose.foundation.layout.FlowRow(
        modifier = Modifier.padding(top = MafiaSpace.sm),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        for (p in players) {
            ModeChip(p.name(fa), selected == p.id) { onSelect(p.id) }
        }
    }
}

@Composable
private fun ModeChip(label: String, selected: Boolean, onClick: () -> Unit) {
    Text(
        label,
        color = if (selected) Color.White else TextPrimary,
        modifier = Modifier
            .background(if (selected) Accent else BgGlass, RoundedCornerShape(MafiaRadius.full))
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 6.dp),
    )
}
