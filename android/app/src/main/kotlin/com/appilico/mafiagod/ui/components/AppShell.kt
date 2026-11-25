package com.appilico.mafiagod.ui.components

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.NightsStay
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.adaptive.navigationsuite.NavigationSuiteScaffold
import androidx.compose.material3.adaptive.navigationsuite.NavigationSuiteScaffoldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.appilico.mafiagod.i18n.t
import com.appilico.mafiagod.ui.navigation.Routes

data class NavDestination(val route: String, val labelKey: String, val icon: androidx.compose.ui.graphics.vector.ImageVector, val enabled: Boolean)

/**
 * Foldable-adaptive chrome: NavigationSuiteScaffold auto-switches between a bottom NavigationBar
 * (compact width — Pixel Fold folded/cover screen) and a side NavigationRail (medium+ width —
 * Pixel Fold unfolded) using the window size class. This is the single mechanism behind "works
 * folded and unfolded" for the whole app, not a one-off per-screen hack.
 */
@Composable
fun AppShell(
    currentRoute: String,
    phase: String,
    hasHistory: Boolean,
    onNavigate: (String) -> Unit,
    content: @Composable (Modifier) -> Unit,
) {
    val destinations = listOf(
        NavDestination(Routes.HOME, "nav.home", Icons.Filled.Home, true),
        NavDestination(Routes.SETUP, "nav.setup", Icons.Filled.Tune, true),
        NavDestination(Routes.NIGHT, "nav.night", Icons.Filled.NightsStay, phase == "night" || phase == "blindNight"),
        NavDestination(Routes.DAY, "nav.day", Icons.Filled.LightMode, phase == "day" || phase == "blindDay"),
        NavDestination(Routes.SUMMARY, "nav.summary", Icons.Filled.Groups, hasHistory),
    )

    NavigationSuiteScaffold(
        navigationSuiteItems = {
            destinations.forEach { dest ->
                item(
                    selected = currentRoute == dest.route,
                    onClick = { if (dest.enabled) onNavigate(dest.route) },
                    icon = { Icon(dest.icon, contentDescription = null) },
                    label = { Text(t(dest.labelKey)) },
                    enabled = dest.enabled,
                )
            }
        },
        layoutType = NavigationSuiteScaffoldDefaults.calculateFromAdaptiveInfo(androidx.compose.material3.adaptive.currentWindowAdaptiveInfo()),
    ) {
        content(Modifier)
    }
}
