package com.appilico.mafiagod.ui.screens.summary

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.unit.dp
import com.appilico.mafiagod.MafiaGodViewModel
import com.appilico.mafiagod.engine.Roles
import com.appilico.mafiagod.i18n.isFa
import com.appilico.mafiagod.i18n.t
import com.appilico.mafiagod.ui.components.AliveDot
import com.appilico.mafiagod.ui.components.GhostButton
import com.appilico.mafiagod.ui.components.PrimaryButton
import com.appilico.mafiagod.ui.components.RoleBadge
import com.appilico.mafiagod.ui.components.teamColor
import com.appilico.mafiagod.ui.theme.MafiaSpace
import com.appilico.mafiagod.ui.theme.TextMuted
import com.appilico.mafiagod.ui.theme.TextPrimary
import com.appilico.mafiagod.ui.theme.TextSecondary

@Composable
fun SummaryScreen(
    viewModel: MafiaGodViewModel,
    modifier: Modifier = Modifier,
    onNewGame: () -> Unit,
    onHome: () -> Unit,
    onBackToGame: (phase: String) -> Unit,
) {
    val rev = viewModel.revision
    val game = viewModel.game
    val fa = isFa()
    var historyRecorded by remember { mutableStateOf(false) }

    if (game.phase == "handshake") {
        HandshakeScreen(viewModel, modifier)
        return
    }

    if (game.phase != "ended") {
        Column(modifier.fillMaxSize().padding(MafiaSpace.lg)) {
            Text(t("summary.roundLabel", game.round.toString()), style = MaterialTheme.typography.headlineSmall, color = TextPrimary)
            Timeline(viewModel)
            PrimaryButton(t("summary.backToGame"), onClick = { onBackToGame(game.phase) }, modifier = Modifier.padding(top = MafiaSpace.md))
        }
        return
    }

    LaunchedEffect(game.winner) {
        if (!historyRecorded) {
            historyRecorded = true
            viewModel.finishGameToHistory()
        }
    }

    val winnerIcon = when (game.winner) { "mafia" -> "🔴"; "citizen" -> "🔵"; else -> "🟣" }

    Column(modifier.fillMaxSize().padding(MafiaSpace.lg)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(winnerIcon, style = MaterialTheme.typography.displayLarge)
                Text(t("summary.winTitle.${game.winner}"), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black, color = TextPrimary)
            }
        }

        LazyColumn(Modifier.weight(1f).padding(top = MafiaSpace.lg), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            items(game.players, key = { it.id }) { p ->
                val role = Roles.get(p.roleId)
                Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                    AliveDot(p.isAlive, modifier = Modifier.padding(end = 8.dp))
                    Text(p.name(fa), color = TextPrimary, modifier = Modifier.weight(1f))
                    RoleBadge(role?.icon ?: "👤", role?.localizedName(fa) ?: "—", role?.team)
                }
            }
        }

        Timeline(viewModel)

        Row(Modifier.padding(top = MafiaSpace.md), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            PrimaryButton(t("summary.newGame"), onClick = onNewGame, modifier = Modifier.weight(1f))
            GhostButton(t("summary.home"), onClick = onHome, modifier = Modifier.weight(1f))
        }
    }
}

@Composable
private fun HandshakeScreen(viewModel: MafiaGodViewModel, modifier: Modifier) {
    val game = viewModel.game
    val fa = isFa()
    val trio = game.handshakeState?.players ?: emptyList()

    Column(modifier.fillMaxSize().padding(MafiaSpace.lg), horizontalAlignment = Alignment.CenterHorizontally) {
        Text("🌀", style = MaterialTheme.typography.displayLarge)
        Text("Chaos", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = TextPrimary, modifier = Modifier.padding(bottom = MafiaSpace.lg))

        for (id in trio) {
            val p = game.getPlayer(id) ?: continue
            val role = Roles.get(p.roleId)
            Text("${p.name(fa)} — ${role?.icon ?: ""} ${role?.localizedName(fa) ?: ""}", color = TextPrimary, modifier = Modifier.padding(bottom = 4.dp))
        }

        Text("Pick an alliance:", color = TextSecondary, modifier = Modifier.padding(top = MafiaSpace.lg, bottom = MafiaSpace.sm))
        for (i in trio.indices) {
            for (j in i + 1 until trio.size) {
                val p1 = game.getPlayer(trio[i]); val p2 = game.getPlayer(trio[j])
                if (p1 == null || p2 == null) continue
                GhostButton("🤝 ${p1.name(fa)} + ${p2.name(fa)}", onClick = {
                    viewModel.update { resolveHandshake(trio[i], trio[j]) }
                    viewModel.persistGame()
                }, modifier = Modifier.padding(bottom = MafiaSpace.sm))
            }
        }
    }
}

@Composable
private fun Timeline(viewModel: MafiaGodViewModel) {
    val game = viewModel.game
    val fa = isFa()
    Text(t("summary.timeline"), fontWeight = FontWeight.Bold, color = TextPrimary, modifier = Modifier.padding(top = MafiaSpace.lg, bottom = MafiaSpace.sm))
    LazyColumn(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(2.dp)) {
        items(game.history.reversed()) { entry ->
            val isDeath = entry.type.contains("death", ignoreCase = true) || entry.type.contains("kill", ignoreCase = true) || entry.type.contains("vote", ignoreCase = true)
            Text(
                "R${entry.round} · ${entry.type}${entry.params["name"]?.let { " — $it" } ?: ""}",
                color = if (isDeath) com.appilico.mafiagod.ui.theme.Danger else TextMuted,
                style = MaterialTheme.typography.labelSmall,
                modifier = Modifier.padding(vertical = 2.dp),
            )
        }
    }
}
