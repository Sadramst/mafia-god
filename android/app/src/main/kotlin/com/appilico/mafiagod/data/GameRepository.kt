package com.appilico.mafiagod.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.appilico.mafiagod.engine.Game
import kotlinx.coroutines.flow.first
import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private val Context.dataStore by preferencesDataStore(name = "mafia_god_store")

@Serializable
data class RosterEntry(val nameEn: String, val nameFa: String)

@Serializable
data class HistoryGameEntry(
    val date: Long,
    val winner: String?,
    val playerCount: Int,
    val rounds: Int,
    val state: Game.GameState,
)

/** Mirrors js/utils/Storage.js — autosave, roster persistence, finished-game archive,
 * language preference. Backed by DataStore instead of localStorage. */
class GameRepository(private val context: Context) {
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    private val saveKey = stringPreferencesKey("game_save")
    private val rosterKey = stringPreferencesKey("roster")
    private val languageKey = stringPreferencesKey("language")
    private val historyKey = stringPreferencesKey("history_log")

    suspend fun saveGame(game: Game) {
        context.dataStore.edit { it[saveKey] = json.encodeToString(game.toGameState()) }
    }

    suspend fun loadGame(): Game.GameState? {
        val raw = context.dataStore.data.first()[saveKey] ?: return null
        return runCatching { json.decodeFromString<Game.GameState>(raw) }.getOrNull()
    }

    suspend fun hasSave(): Boolean = context.dataStore.data.first()[saveKey] != null

    suspend fun deleteSave() {
        context.dataStore.edit { it.remove(saveKey) }
    }

    suspend fun saveRoster(entries: List<RosterEntry>) {
        context.dataStore.edit { it[rosterKey] = json.encodeToString(entries) }
    }

    suspend fun loadRoster(): List<RosterEntry> {
        val raw = context.dataStore.data.first()[rosterKey] ?: return emptyList()
        return runCatching { json.decodeFromString<List<RosterEntry>>(raw) }.getOrDefault(emptyList())
    }

    suspend fun deleteRoster() {
        context.dataStore.edit { it.remove(rosterKey) }
    }

    suspend fun saveLanguage(fa: Boolean) {
        context.dataStore.edit { it[languageKey] = if (fa) "fa" else "en" }
    }

    suspend fun loadLanguage(): Boolean = (context.dataStore.data.first()[languageKey] ?: "fa") == "fa"

    suspend fun addToHistory(entry: HistoryGameEntry) {
        val list = loadHistory().toMutableList()
        list.add(0, entry)
        context.dataStore.edit { it[historyKey] = json.encodeToString(list.take(50)) }
    }

    suspend fun loadHistory(): List<HistoryGameEntry> {
        val raw = context.dataStore.data.first()[historyKey] ?: return emptyList()
        return runCatching { json.decodeFromString<List<HistoryGameEntry>>(raw) }.getOrDefault(emptyList())
    }
}
