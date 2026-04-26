package com.onekural.app.ui.navigation

import androidx.annotation.DrawableRes
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import com.onekural.app.R
import com.onekural.app.ui.screen.*

sealed class Screen(
    val route: String,
    val label: String,
    @DrawableRes val icon: Int
) {
    object Home    : Screen("home",    "Home",    R.drawable.ic_nav_home)
    object Explore : Screen("explore", "Explore", R.drawable.ic_nav_explore)
    object Journal : Screen("journal", "Journal", R.drawable.ic_nav_journal)
    object Profile : Screen("profile", "Profile", R.drawable.ic_nav_profile)
}

val bottomNavItems = listOf(Screen.Home, Screen.Explore, Screen.Journal, Screen.Profile)

@Composable
fun AppNavHost(navController: NavHostController, modifier: Modifier = Modifier) {
    NavHost(navController = navController, startDestination = Screen.Home.route, modifier = modifier) {
        composable(Screen.Home.route) {
            HomeScreen(onKuralClick = { id -> navController.navigate("kural/$id") })
        }
        composable(Screen.Explore.route) {
            ExploreScreen(onKuralClick = { id -> navController.navigate("kural/$id") })
        }
        composable(Screen.Journal.route) {
            JournalScreen(onKuralClick = { id -> navController.navigate("kural/$id") })
        }
        composable(Screen.Profile.route) {
            ProfileScreen()
        }
        composable(
            route = "kural/{id}",
            arguments = listOf(navArgument("id") { type = NavType.IntType })
        ) { backStackEntry ->
            KuralDetailScreen(
                kuralId = backStackEntry.arguments?.getInt("id") ?: 1,
                onBack  = { navController.popBackStack() }
            )
        }
    }
}

@Composable
fun BottomNavBar(navController: NavHostController) {
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination

    val showBottomBar = bottomNavItems.any {
        currentDestination?.hierarchy?.any { dest -> dest.route == it.route } == true
    }
    if (!showBottomBar) return

    // Web: bg-cream/95 dark:bg-dark-subtle/95 backdrop-blur, border-t, h-14
    Surface(
        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.95f),
        tonalElevation = 0.dp,
        shadowElevation = 0.dp
    ) {
        Column {
            HorizontalDivider(
                thickness = 0.5.dp,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.10f)
            )
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .navigationBarsPadding()
                    .height(56.dp),
                horizontalArrangement = Arrangement.SpaceAround,
                verticalAlignment = Alignment.CenterVertically
            ) {
                bottomNavItems.forEach { screen ->
                    val selected = currentDestination?.hierarchy
                        ?.any { it.route == screen.route } == true
                    val color = if (selected)
                        MaterialTheme.colorScheme.primary
                    else
                        MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f)

                    NavItem(
                        label     = screen.label,
                        iconRes   = screen.icon,
                        color     = color,
                        selected  = selected,
                        onClick   = {
                            navController.navigate(screen.route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun NavItem(
    label: String,
    @DrawableRes iconRes: Int,
    color: Color,
    selected: Boolean,
    onClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick
            )
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        Icon(
            painter = painterResource(iconRes),
            contentDescription = label,
            tint = color,
            modifier = Modifier.size(24.dp)
        )
        Text(
            text = label,
            fontSize = 11.sp,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
            color = color
        )
    }
}
