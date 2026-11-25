package com.appilico.mafiagod

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.appilico.mafiagod.data.GameRepository
import com.appilico.mafiagod.data.HistoryGameEntry
import com.appilico.mafiagod.data.RosterEntry
import com.appilico.mafiagod.engine.Game
import com.appilico.mafiagod.engine.NightResolutionResult
import com.appilico.mafiagod.i18n.AppLanguage
import kotlinx.coroutines.launch

/**
 * Holds the single live [Game] engine instance for the app. Game is a plain mutable class (a
 * direct port of Game.js), so every mutation goes through [update] which bumps [revision] —
 * Composables read [revision] to establish a recomposition dependency, then read live `game.*`
 * state directly, mirroring how the web app re-renders its view tree after every engine call.
 */
class MafiaGodViewModel(private val repo: GameRepository) : ViewModel() {
    val game = Game()

    var revision by mutableIntStateOf(0)
        private set

    var language by mutableStateOf(AppLanguage.FA)
        private set

    var hasSave by mutableStateOf(false)
        private set

    var history by mutableStateOf<List<HistoryGameEntry>>(emptyList())
        private set

    /** Stashed like app._nightResults in the web app — the last resolveNight() result, kept
     * around so DayView's Results tab can render it. */
    var lastNightResults: NightResolutionResult? = null
        private set

    init {
        viewModelScope.launch {
            language = if (repo.loadLanguage()) AppLanguage.FA else AppLanguage.EN
            hasSave = repo.hasSave()
            history = repo.loadHistory()
        }
    }

    /** Mutate the engine, then trigger recomposition. */
    fun <T> update(block: Game.() -> T): T {
        val result = game.block()
        revision++
        return result
    }

    fun setLastNightResults(results: NightResolutionResult?) {
        lastNightResults = results
        revision++
    }

    fun toggleLanguage() {
        language = if (language == AppLanguage.FA) AppLanguage.EN else AppLanguage.FA
        viewModelScope.launch { repo.saveLanguage(language == AppLanguage.FA) }
    }

    fun persistGame() {
        viewModelScope.launch {
            repo.saveGame(game)
            hasSave = true
        }
    }

    fun persistRoster() {
        viewModelScope.launch {
            repo.saveRoster(game.players.map { RosterEntry(it.nameEn, it.nameFa) })
        }
    }

    suspend fun loadRosterNames(): List<RosterEntry> = repo.loadRoster()

    fun startNewGame(onReady: () -> Unit) {
        viewModelScope.launch {
            repo.deleteSave()
            update { reset() }
            val roster = repo.loadRoster()
            update { for (r in roster) addPlayer(r.nameEn, r.nameFa) }
            hasSave = false
            onReady()
        }
    }

    fun resumeGame(onReady: (phase: String) -> Unit) {
        viewModelScope.launch {
            val saved = repo.loadGame()
            if (saved != null) {
                update { loadGameState(saved) }
                onReady(game.phase)
            }
        }
    }

    fun clearRoster() {
        viewModelScope.launch { repo.deleteRoster() }
    }

    fun finishGameToHistory() {
        viewModelScope.launch {
            repo.addToHistory(
                HistoryGameEntry(
                    date = System.currentTimeMillis(),
                    winner = game.winner,
                    playerCount = game.players.size,
                    rounds = game.round,
                    state = game.toGameState(),
                ),
            )
            repo.deleteSave()
            history = repo.loadHistory()
            hasSave = false
        }
    }

    companion object {
        fun factory(repo: GameRepository): androidx.lifecycle.ViewModelProvider.Factory =
            object : androidx.lifecycle.ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
                    return MafiaGodViewModel(repo) as T
                }
            }
    }
}
