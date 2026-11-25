package com.appilico.mafiagod.ui.screens.day

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
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
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
import com.appilico.mafiagod.engine.Player
import com.appilico.mafiagod.engine.Roles
import com.appilico.mafiagod.i18n.isFa
import com.appilico.mafiagod.i18n.t
import com.appilico.mafiagod.ui.components.CounterButton
import com.appilico.mafiagod.ui.components.GhostButton
import com.appilico.mafiagod.ui.components.PrimaryButton
import com.appilico.mafiagod.ui.components.RoleBadge
import com.appilico.mafiagod.ui.theme.Accent
import com.appilico.mafiagod.ui.theme.BgCard
import com.appilico.mafiagod.ui.theme.BgGlass
import com.appilico.mafiagod.ui.theme.Danger
import com.appilico.mafiagod.ui.theme.MafiaRadius
import com.appilico.mafiagod.ui.theme.MafiaSpace
import com.appilico.mafiagod.ui.theme.Success
import com.appilico.mafiagod.ui.theme.TextMuted
import com.appilico.mafiagod.ui.theme.TextPrimary
import com.appilico.mafiagod.ui.theme.TextSecondary

@Composable
fun DayScreen(
    viewModel: MafiaGodViewModel,
    modifier: Modifier = Modifier,
    onGoToNight: () -> Unit,
    onGoToSummary: () -> Unit,
) {
    val rev = viewModel.revision
    val game = viewModel.game
    val fa = isFa()

    if (game.phase == "blindDay") {
        BlindDayContent(viewModel, modifier)
        return
    }

    var tab by remember { mutableIntStateOf(0) }
    // hasBombToResolve() flips to false the instant a guess is made, but the result card must
    // stay visible until the God taps through it — so "siesta is done" is tracked explicitly
    // rather than derived live from bomb state (which would unmount SiestaTab mid-result).
    var siestaHandled by remember { mutableStateOf(false) }

    fun goToNextNight() {
        viewModel.update { startNight() }
        viewModel.persistGame()
        onGoToNight()
    }

    Column(modifier = modifier.fillMaxSize()) {
        Text(
            "☀️ " + t("day.roundLabel", game.round.toString()),
            style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = TextPrimary,
            modifier = Modifier.padding(MafiaSpace.lg),
        )
        TabRow(selectedTabIndex = tab) {
            Tab(selected = tab == 0, onClick = { tab = 0 }, text = { Text(t("day.resultsTab")) })
            Tab(selected = tab == 1, onClick = { tab = 1 }, text = { Text(t("day.discussionTab")) })
            Tab(selected = tab == 2, onClick = { tab = 2 }, text = { Text(t("day.votingTab")) })
        }

        when (tab) {
            0 -> ResultsTab(viewModel, onAdvanceToDiscussion = { tab = 1 })
            1 -> DiscussionTab(viewModel, onStartVoting = {
                viewModel.update { resolveLiveExpiration() }
                tab = 2
            })
            2 -> if (game.hasBombToResolve() && !siestaHandled) {
                SiestaTab(viewModel, onDone = { siestaHandled = true })
            } else {
                VotingTab(viewModel, onGoToNextNight = ::goToNextNight, onGoToSummary = onGoToSummary)
            }
        }
    }
}

@Composable
private fun BlindDayContent(viewModel: MafiaGodViewModel, modifier: Modifier) {
    val game = viewModel.game
    Column(modifier.fillMaxSize().padding(MafiaSpace.lg), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Text("☀️", style = MaterialTheme.typography.displayLarge)
        Text(t("day.blindTitle"), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = TextPrimary, modifier = Modifier.padding(top = MafiaSpace.md, bottom = MafiaSpace.xl))
        PrimaryButton(t("day.endBlindDay"), onClick = {
            viewModel.update { startBlindNight() }
            viewModel.persistGame()
        })
    }
}

@Composable
private fun ResultsTab(viewModel: MafiaGodViewModel, onAdvanceToDiscussion: () -> Unit) {
    val game = viewModel.game
    val fa = isFa()
    val results = viewModel.lastNightResults

    LazyColumn(Modifier.fillMaxSize().padding(MafiaSpace.lg), verticalArrangement = Arrangement.spacedBy(MafiaSpace.sm)) {
        item {
            if (results == null || results.killed.isEmpty()) {
                InfoCard(t("day.noKills"), Success)
            } else {
                Column {
                    Text(t("day.killed"), fontWeight = FontWeight.Bold, color = TextPrimary, modifier = Modifier.padding(bottom = MafiaSpace.xs))
                    for (id in results.killed) {
                        val p = game.getPlayer(id) ?: continue
                        val role = Roles.get(p.roleId)
                        Text("• ${p.name(fa)} — ${role?.icon ?: ""} ${role?.localizedName(fa) ?: ""}", color = Danger, modifier = Modifier.padding(vertical = 2.dp))
                    }
                }
            }
        }
        results?.kaneReveal?.let { kr ->
            item { InfoCard("🎖️ ${game.getPlayer(kr.targetId)?.name(fa)} — ${kr.roleIcon} ${kr.roleName}", Accent) }
        }
        if (game.hasFramasonContamination()) {
            item {
                PrimaryButton("🔺 " + t("common.confirm"), onClick = {
                    viewModel.update { resolveFramasonContamination() }
                    viewModel.update { checkWinCondition() }
                    viewModel.persistGame()
                })
            }
        }
        if (game.canCowboyAct()) {
            item { CowboySection(viewModel) }
        }
        if (game.bulletManager.activeBullets.isNotEmpty()) {
            item { MorningShotSection(viewModel) }
        }
        item {
            PrimaryButton(t("day.startDiscussion"), onClick = onAdvanceToDiscussion, modifier = Modifier.padding(top = MafiaSpace.md))
        }
    }
}

@Composable
private fun DiscussionTab(viewModel: MafiaGodViewModel, onStartVoting: () -> Unit) {
    val game = viewModel.game
    val fa = isFa()
    LazyColumn(Modifier.fillMaxSize().padding(MafiaSpace.lg), verticalArrangement = Arrangement.spacedBy(MafiaSpace.sm)) {
        item {
            Text(t("day.discussionTab"), fontWeight = FontWeight.Bold, color = TextPrimary, modifier = Modifier.padding(bottom = MafiaSpace.sm))
        }
        items(game.getAlivePlayers(), key = { it.id }) { p ->
            Text("${p.name(fa)}${if (p.silenced) " 🤐" else ""}", color = TextPrimary, modifier = Modifier.padding(vertical = 4.dp))
        }
        if (game.canCowboyAct()) item { CowboySection(viewModel) }
        if (game.bulletManager.activeBullets.isNotEmpty()) item { MorningShotSection(viewModel) }
        item { PrimaryButton(t("day.startVoting"), onClick = onStartVoting, modifier = Modifier.padding(top = MafiaSpace.md)) }
    }
}

@Composable
private fun SiestaTab(viewModel: MafiaGodViewModel, onDone: () -> Unit) {
    val game = viewModel.game
    val fa = isFa()
    var step by remember { mutableStateOf(if (game.isBodyguardAliveForBomb()) "guardian" else "target") }
    var chosenPassword by remember { mutableIntStateOf(0) }
    var resultText by remember { mutableStateOf<String?>(null) }

    androidx.compose.runtime.LaunchedEffect(Unit) { viewModel.update { startBombSiesta() } }

    Column(Modifier.fillMaxSize().padding(MafiaSpace.lg)) {
        Text("💤 " + t("day.votingTab"), fontWeight = FontWeight.Bold, color = TextPrimary, modifier = Modifier.padding(bottom = MafiaSpace.md))
        when (step) {
            "guardian" -> {
                Text("Bodyguard: guess the code?", color = TextSecondary)
                Row(Modifier.padding(top = MafiaSpace.sm), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    PrimaryButton(t("common.continue"), onClick = { step = "guardian_guess" }, modifier = Modifier.weight(1f))
                    GhostButton(t("common.skip"), onClick = {
                        viewModel.update { bombGuardianSkip() }
                        step = "target"
                    }, modifier = Modifier.weight(1f))
                }
            }
            "guardian_guess", "target" -> {
                Text(t("night.bombPassword"), color = TextSecondary)
                Row(Modifier.padding(top = MafiaSpace.sm), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    for (p in 1..4) PasswordChip(p, chosenPassword == p) { chosenPassword = p }
                }
                PrimaryButton(t("common.confirm"), enabled = chosenPassword > 0, onClick = {
                    if (step == "guardian_guess") {
                        val res = viewModel.update { bombGuardianGuess(chosenPassword) }
                        resultText = res.result
                        if (res.result != "defused") viewModel.update { checkWinCondition() }
                    } else {
                        val res = viewModel.update { bombTargetGuess(chosenPassword) }
                        resultText = res.result
                        if (res.result != "defused") viewModel.update { checkWinCondition() }
                    }
                    step = "result"
                    viewModel.persistGame()
                }, modifier = Modifier.padding(top = MafiaSpace.md))
            }
            "result" -> {
                InfoCard(resultText ?: "", if (resultText == "defused") Success else Danger)
                PrimaryButton(t("common.continue"), onClick = onDone, modifier = Modifier.padding(top = MafiaSpace.md))
            }
        }
    }
}

@Composable
private fun VotingTab(viewModel: MafiaGodViewModel, onGoToNextNight: () -> Unit, onGoToSummary: () -> Unit) {
    val game = viewModel.game
    val fa = isFa()
    var votingPhase by remember { mutableStateOf("first") }
    val voteCounts = remember { mutableStateOf(mapOf<Int, Int>()) }
    var runoffCandidates by remember { mutableStateOf(listOf<Int>()) }
    val runoffCounts = remember { mutableStateOf(mapOf<Int, Int>()) }
    var pendingElimination by remember { mutableStateOf<Int?>(null) }

    val alive = game.getAlivePlayers()
    val threshold = game.getVoteThreshold()

    fun finalizeElimination(targetId: Int) {
        if (game.isVoteImmune(targetId)) {
            viewModel.update { eliminateByVote(targetId) }
            viewModel.persistGame()
            onGoToNextNight()
            return
        }
        val elimResult = viewModel.update { eliminateByVote(targetId) }
        if (elimResult.lastActionAvailable) {
            pendingElimination = targetId
        } else {
            val winner = viewModel.update { checkWinCondition() }
            viewModel.persistGame()
            if (winner != null) onGoToSummary() else onGoToNextNight()
        }
    }

    if (pendingElimination != null) {
        LastActionFlow(
            viewModel, victimId = pendingElimination!!,
            onFinished = {
                pendingElimination = null
                val winner = viewModel.update { checkWinCondition() }
                viewModel.persistGame()
                if (winner != null) onGoToSummary() else onGoToNextNight()
            },
        )
        return
    }

    Column(Modifier.fillMaxSize().padding(MafiaSpace.lg)) {
        Text(t("day.voteThreshold", threshold.toString()), color = TextSecondary, modifier = Modifier.padding(bottom = MafiaSpace.sm))

        val activeList = if (votingPhase == "first") alive else alive.filter { it.id in runoffCandidates }
        val activeCounts = if (votingPhase == "first") voteCounts else runoffCounts

        LazyColumn(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            items(activeList, key = { it.id }) { p ->
                val count = activeCounts.value[p.id] ?: 0
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Text(p.name(fa), color = TextPrimary, modifier = Modifier.weight(1f))
                    CounterButton("−") { activeCounts.value = activeCounts.value + (p.id to maxOf(0, count - 1)) }
                    Text("$count", color = TextPrimary, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 8.dp))
                    CounterButton("+") { activeCounts.value = activeCounts.value + (p.id to minOf(alive.size - 1, count + 1)) }
                }
            }
        }

        if (votingPhase == "first") {
            val hasAboveThreshold = voteCounts.value.values.any { it >= threshold }
            Row(Modifier.padding(top = MafiaSpace.md), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                GhostButton(t("day.noElimination"), onClick = onGoToNextNight, modifier = Modifier.weight(1f))
                PrimaryButton(t("day.continueToRunoff"), enabled = hasAboveThreshold, onClick = {
                    runoffCandidates = voteCounts.value.filter { it.value >= threshold }.keys.toList()
                    runoffCounts.value = emptyMap()
                    votingPhase = "second"
                }, modifier = Modifier.weight(1f))
            }
        } else {
            Row(Modifier.padding(top = MafiaSpace.md), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                GhostButton(t("day.cancelRunoff"), onClick = { votingPhase = "first" }, modifier = Modifier.weight(1f))
                PrimaryButton(t("day.executeRunoff"), onClick = {
                    val votes = runoffCounts.value.filterValues { it > 0 }
                    when {
                        votes.isEmpty() -> onGoToNextNight()
                        votes.values.distinct().size == 1 && votes.size > 1 -> { /* tie — God picks manually via the list below; leave as-is */ }
                        else -> {
                            val winnerId = votes.maxByOrNull { it.value }!!.key
                            finalizeElimination(winnerId)
                        }
                    }
                }, modifier = Modifier.weight(1f))
            }
            if (runoffCounts.value.filterValues { it > 0 }.let { it.isNotEmpty() && it.values.distinct().size == 1 && it.size > 1 }) {
                Text("Tie — pick who to eliminate:", color = TextSecondary, modifier = Modifier.padding(top = MafiaSpace.sm))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    for (id in runoffCounts.value.filterValues { it > 0 }.keys) {
                        val p = game.getPlayer(id) ?: continue
                        GhostButton(p.name(fa), onClick = { finalizeElimination(id) }, modifier = Modifier.weight(1f))
                    }
                }
            }
        }
    }
}

@Composable
private fun CowboySection(viewModel: MafiaGodViewModel) {
    val game = viewModel.game
    val fa = isFa()
    var active by remember { mutableStateOf(false) }
    var result by remember { mutableStateOf<String?>(null) }

    Card(colors = CardDefaults.cardColors(containerColor = BgCard)) {
        Column(Modifier.padding(MafiaSpace.md)) {
            if (result != null) {
                Text(result!!, color = TextPrimary)
                GhostButton(t("day.dismiss"), onClick = { result = null }, modifier = Modifier.padding(top = MafiaSpace.sm))
            } else if (!active) {
                PrimaryButton("🤠 " + t("day.cowboyDeclare"), onClick = { active = true })
            } else {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    for (p in game.getAlivePlayers().filter { it.roleId != "cowboy" }) {
                        GhostButton(p.name(fa), onClick = {
                            val res = viewModel.update { resolveCowboyAction(p.id) }
                            result = "${res.side} — ${if (res.killed) "eliminated" else "survives"}"
                            viewModel.update { checkWinCondition() }
                            viewModel.persistGame()
                            active = false
                        }, modifier = Modifier.weight(1f))
                    }
                }
            }
        }
    }
}

@Composable
private fun MorningShotSection(viewModel: MafiaGodViewModel) {
    val game = viewModel.game
    val fa = isFa()
    var shooterId by remember { mutableStateOf<Int?>(null) }
    var result by remember { mutableStateOf<String?>(null) }

    Card(colors = CardDefaults.cardColors(containerColor = BgCard)) {
        Column(Modifier.padding(MafiaSpace.md)) {
            if (result != null) {
                Text(result!!, color = TextPrimary)
                GhostButton(t("day.dismiss"), onClick = { result = null }, modifier = Modifier.padding(top = MafiaSpace.sm))
            } else if (shooterId == null) {
                Text("🔫 " + t("day.morningShoot"), fontWeight = FontWeight.Bold, color = TextPrimary, modifier = Modifier.padding(bottom = MafiaSpace.sm))
                for (b in game.bulletManager.activeBullets) {
                    val holder = game.getPlayer(b.holderId) ?: continue
                    GhostButton(holder.name(fa), onClick = { shooterId = b.holderId }, modifier = Modifier.padding(bottom = 4.dp))
                }
            } else {
                val shooter = game.getPlayer(shooterId!!)
                val shooterTeam = Roles.get(shooter?.roleId)?.team
                val candidates = game.getAlivePlayers().filter { it.id != shooterId || shooterTeam == com.appilico.mafiagod.engine.Team.MAFIA }
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    for (p in candidates) {
                        GhostButton(p.name(fa), onClick = {
                            val res = viewModel.update { resolveMorningShot(shooterId!!, p.id) }
                            result = if (res == null) "—" else "${res.type} → ${if (res.killed) "eliminated" else res.stoppedBy ?: "no effect"}"
                            viewModel.update { checkWinCondition() }
                            viewModel.persistGame()
                            shooterId = null
                        }, modifier = Modifier.weight(1f))
                    }
                }
            }
        }
    }
}

@Composable
private fun LastActionFlow(viewModel: MafiaGodViewModel, victimId: Int, onFinished: () -> Unit) {
    val game = viewModel.game
    val fa = isFa()
    var step by remember { mutableStateOf("pick") }
    var card by remember { mutableStateOf<com.appilico.mafiagod.engine.LastActionManager.CardEntry?>(null) }

    Column(Modifier.fillMaxSize().padding(MafiaSpace.lg)) {
        when (step) {
            "pick" -> {
                Text("Draw a card:", color = TextSecondary, modifier = Modifier.padding(bottom = MafiaSpace.sm))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    for (i in 1..game.lastActionManager.remainingCount()) {
                        GhostButton("$i", onClick = {
                            val res = viewModel.update { drawLastActionFor(victimId) }
                            card = res?.card
                            step = if (card == null) "done" else "reveal"
                        }, modifier = Modifier.weight(1f))
                    }
                }
            }
            "reveal" -> {
                val c = card
                if (c == null) { step = "done" } else {
                    Text(c.name, style = MaterialTheme.typography.headlineSmall, color = TextPrimary)
                    val needsTarget = com.appilico.mafiagod.engine.LastActionCard.needsTarget(c.id)
                    PrimaryButton(if (needsTarget) "Select Target" else t("common.confirm"), onClick = {
                        if (needsTarget) step = "target" else { viewModel.persistGame(); onFinished() }
                    }, modifier = Modifier.padding(top = MafiaSpace.md))
                }
            }
            "target" -> {
                val c = card!!
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    for (p in game.getAlivePlayers().filter { it.id != victimId }) {
                        GhostButton(p.name(fa), onClick = {
                            viewModel.update { applyLastActionCard(c.id, victimId, p.id) }
                            viewModel.persistGame()
                            onFinished()
                        }, modifier = Modifier.weight(1f))
                    }
                }
            }
            "done" -> {
                Text("—", color = TextMuted)
                PrimaryButton(t("common.continue"), onClick = { viewModel.persistGame(); onFinished() })
            }
        }
    }
}

@Composable
private fun InfoCard(text: String, color: Color) {
    Card(colors = CardDefaults.cardColors(containerColor = color.copy(alpha = 0.1f))) {
        Text(text, color = color, modifier = Modifier.padding(MafiaSpace.md).fillMaxWidth())
    }
}

@Composable
private fun PasswordChip(value: Int, selected: Boolean, onClick: () -> Unit) {
    Text(
        "$value",
        color = if (selected) Color.White else TextPrimary,
        modifier = Modifier
            .background(if (selected) Accent else BgGlass, RoundedCornerShape(MafiaRadius.full))
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 8.dp),
    )
}
