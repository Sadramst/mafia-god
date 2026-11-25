package com.appilico.mafiagod

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.appilico.mafiagod.data.GameRepository
import com.appilico.mafiagod.i18n.AppLanguage
import com.appilico.mafiagod.i18n.LocalLanguage
import com.appilico.mafiagod.i18n.t
import com.appilico.mafiagod.ui.components.AppShell
import com.appilico.mafiagod.ui.navigation.Routes
import com.appilico.mafiagod.ui.screens.day.DayScreen
import com.appilico.mafiagod.ui.screens.home.HomeScreen
import com.appilico.mafiagod.ui.screens.manualassign.ManualAssignScreen
import com.appilico.mafiagod.ui.screens.night.NightScreen
import com.appilico.mafiagod.ui.screens.rolereveal.RoleRevealScreen
import com.appilico.mafiagod.ui.screens.setup.SetupScreen
import com.appilico.mafiagod.ui.screens.summary.SummaryScreen
import com.appilico.mafiagod.ui.theme.MafiaGodTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val repo = GameRepository(applicationContext)
        setContent {
            MafiaGodTheme {
                val viewModel: MafiaGodViewModel = viewModel(factory = MafiaGodViewModel.factory(repo))
                CompositionLocalProvider(
                    LocalLanguage provides viewModel.language,
                    LocalLayoutDirection provides if (viewModel.language == AppLanguage.FA) LayoutDirection.Rtl else LayoutDirection.Ltr,
                ) {
                    Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                        MafiaGodApp(viewModel)
                    }
                }
            }
        }
    }
}

@Composable
fun MafiaGodApp(viewModel: MafiaGodViewModel) {
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route ?: Routes.HOME
    val rev = viewModel.revision
    val game = viewModel.game

    fun navTo(route: String) {
        navController.navigate(route) {
            popUpTo(navController.graph.startDestinationId) { saveState = false }
            launchSingleTop = true
        }
    }

    Box(Modifier.fillMaxSize()) {
        AppShell(
            currentRoute = currentRoute,
            phase = game.phase,
            hasHistory = game.history.isNotEmpty() || currentRoute in setOf(Routes.NIGHT, Routes.DAY, Routes.SUMMARY),
            onNavigate = { navTo(it) },
        ) { modifier ->
            androidx.compose.foundation.layout.Column(modifier.fillMaxSize()) {
                TopAppBar(
                    title = { Text(headerTitle(currentRoute, game.phase, game.round)) },
                    navigationIcon = {
                        if (currentRoute != Routes.HOME) {
                            IconButton(onClick = { navController.popBackStack() }) {
                                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                            }
                        }
                    },
                    actions = {
                        IconButton(onClick = { viewModel.toggleLanguage() }) {
                            Text(if (viewModel.language == AppLanguage.FA) "EN" else "FA")
                        }
                    },
                )

                NavHost(navController = navController, startDestination = Routes.HOME, modifier = Modifier.weight(1f)) {
                    composable(Routes.HOME) {
                        HomeScreen(
                            viewModel = viewModel,
                            onStartNewGame = { viewModel.startNewGame { navTo(Routes.SETUP) } },
                            onResume = { phase ->
                                val route = when (phase) {
                                    "night", "blindNight" -> Routes.NIGHT
                                    "day", "blindDay" -> Routes.DAY
                                    "ended", "handshake" -> Routes.SUMMARY
                                    "manualAssign" -> Routes.MANUAL_ASSIGN
                                    "roleReveal" -> Routes.ROLE_REVEAL
                                    else -> Routes.SETUP
                                }
                                navTo(route)
                            },
                        )
                    }
                    composable(Routes.SETUP) {
                        SetupScreen(
                            viewModel = viewModel,
                            onStartRandom = { navTo(Routes.ROLE_REVEAL) },
                            onStartManual = { navTo(Routes.MANUAL_ASSIGN) },
                            onBackHome = { navTo(Routes.HOME) },
                        )
                    }
                    composable(Routes.MANUAL_ASSIGN) {
                        ManualAssignScreen(
                            viewModel = viewModel,
                            onRedirectSetup = { navTo(Routes.SETUP) },
                            onComplete = { navTo(Routes.DAY) },
                        )
                    }
                    composable(Routes.ROLE_REVEAL) {
                        RoleRevealScreen(viewModel = viewModel, onComplete = { navTo(Routes.DAY) })
                    }
                    composable(Routes.NIGHT) {
                        NightScreen(viewModel = viewModel, onGoToDay = { navTo(Routes.DAY) }, onGoToSummary = { navTo(Routes.SUMMARY) })
                    }
                    composable(Routes.DAY) {
                        DayScreen(viewModel = viewModel, onGoToNight = { navTo(Routes.NIGHT) }, onGoToSummary = { navTo(Routes.SUMMARY) })
                    }
                    composable(Routes.SUMMARY) {
                        SummaryScreen(
                            viewModel = viewModel,
                            onNewGame = { viewModel.startNewGame { navTo(Routes.SETUP) } },
                            onHome = { viewModel.update { reset() }; navTo(Routes.HOME) },
                            onBackToGame = { phase ->
                                navTo(if (phase == "night" || phase == "blindNight") Routes.NIGHT else Routes.DAY)
                            },
                        )
                    }
                }
            }
        }
    }
}

private fun headerTitle(route: String, phase: String, round: Int): String = when (route) {
    Routes.HOME -> "Mafia God"
    Routes.SETUP -> "Setup"
    Routes.MANUAL_ASSIGN -> "Manual Role Pick"
    Routes.ROLE_REVEAL -> "Role Reveal"
    Routes.NIGHT -> if (phase == "blindNight") "Blind Night" else "Night $round"
    Routes.DAY -> if (phase == "blindDay") "Blind Day" else "Day $round"
    Routes.SUMMARY -> "Summary"
    else -> "Mafia God"
}
