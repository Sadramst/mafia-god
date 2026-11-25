package com.appilico.mafiagod.ui.screens.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.appilico.mafiagod.MafiaGodViewModel
import com.appilico.mafiagod.i18n.isFa
import com.appilico.mafiagod.i18n.t
import com.appilico.mafiagod.ui.components.GhostButton
import com.appilico.mafiagod.ui.components.PrimaryButton
import com.appilico.mafiagod.ui.theme.MafiaSpace
import com.appilico.mafiagod.ui.theme.TextMuted
import com.appilico.mafiagod.ui.theme.TextPrimary
import com.appilico.mafiagod.ui.theme.TextSecondary
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun HomeScreen(
    viewModel: MafiaGodViewModel,
    modifier: Modifier = Modifier,
    onStartNewGame: () -> Unit,
    onResume: (phase: String) -> Unit,
) {
    var showNewGameConfirm by remember { mutableStateOf(false) }
    val fa = isFa()

    Column(modifier = modifier.fillMaxSize().padding(MafiaSpace.lg), horizontalAlignment = Alignment.CenterHorizontally) {
        Text("🎭", style = MaterialTheme.typography.displayLarge, modifier = Modifier.padding(top = MafiaSpace.xl2))
        Text(t("app.name"), style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Black, color = TextPrimary, modifier = Modifier.padding(top = MafiaSpace.md))
        Text(t("home.tagline"), style = MaterialTheme.typography.bodyMedium, color = TextSecondary, modifier = Modifier.padding(top = MafiaSpace.xs, bottom = MafiaSpace.xl2))

        PrimaryButton(t("home.newGame"), onClick = {
            if (viewModel.hasSave) showNewGameConfirm = true else onStartNewGame()
        })

        if (viewModel.hasSave) {
            Box(Modifier.padding(top = MafiaSpace.sm)) {
                GhostButton("▶️ " + t("home.continueGame"), onClick = {
                    viewModel.resumeGame { phase -> onResume(phase) }
                })
            }
        }

        if (viewModel.history.isNotEmpty()) {
            Text(t("home.history"), style = MaterialTheme.typography.titleMedium, color = TextPrimary, modifier = Modifier.padding(top = MafiaSpace.xl, bottom = MafiaSpace.sm).fillMaxWidth())
            val dateFmt = remember { SimpleDateFormat("MMM d, HH:mm", Locale.getDefault()) }
            LazyColumn(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(MafiaSpace.sm)) {
                items(viewModel.history) { entry ->
                    Column(
                        modifier = Modifier.fillMaxWidth()
                            .padding(MafiaSpace.md),
                    ) {
                        Text(
                            "${entry.winner?.replaceFirstChar { it.uppercase() } ?: "—"} · ${entry.playerCount} players · ${entry.rounds} rounds",
                            color = TextPrimary,
                        )
                        Text(dateFmt.format(Date(entry.date)), color = TextMuted, style = MaterialTheme.typography.labelSmall)
                    }
                }
            }
        } else {
            Text(t("home.emptyHistory"), color = TextMuted, modifier = Modifier.padding(top = MafiaSpace.xl))
        }
    }

    if (showNewGameConfirm) {
        AlertDialog(
            onDismissRequest = { showNewGameConfirm = false },
            title = { Text(t("home.newGameConfirmTitle")) },
            text = { Text(t("home.newGameConfirmBody")) },
            confirmButton = {
                TextButton(onClick = { showNewGameConfirm = false; onStartNewGame() }) { Text(t("common.confirm")) }
            },
            dismissButton = {
                TextButton(onClick = { showNewGameConfirm = false }) { Text(t("common.cancel")) }
            },
        )
    }
}
