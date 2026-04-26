package com.onekural.app

import android.Manifest
import android.content.Intent
import android.content.pm.ShortcutInfo
import android.content.pm.ShortcutManager
import android.graphics.drawable.Icon
import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.lifecycleScope
import androidx.navigation.compose.rememberNavController
import com.onekural.app.data.db.AppDatabase
import com.onekural.app.data.db.DatabaseSeeder
import com.onekural.app.ui.navigation.AppNavHost
import com.onekural.app.ui.navigation.BottomNavBar
import com.onekural.app.ui.theme.OneKuralTheme
import com.onekural.app.util.AppPrefs
import com.onekural.app.util.supabase
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.status.SessionSource
import io.github.jan.supabase.auth.user.UserSession
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    private val requestNotificationPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { /* handled silently */ }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleAuthDeepLink(intent)
    }

    private fun handleAuthDeepLink(intent: Intent?) {
        val uri = intent?.data ?: return
        if (uri.scheme != "com.onekural.app") return
        val fragment = uri.fragment ?: return
        val params = fragment.split("&").associate {
            val idx = it.indexOf('=')
            if (idx < 0) it to "" else it.substring(0, idx) to it.substring(idx + 1)
        }
        val accessToken = params["access_token"] ?: return
        val refreshToken = params["refresh_token"] ?: return
        val expiresIn = params["expires_in"]?.toLongOrNull() ?: 3600L
        val tokenType = params["token_type"] ?: "bearer"
        lifecycleScope.launch {
            try {
                supabase.auth.importSession(
                    UserSession(
                        accessToken = accessToken,
                        refreshToken = refreshToken,
                        expiresIn = expiresIn,
                        tokenType = tokenType
                    ),
                    autoRefresh = true,
                    source = SessionSource.External
                )
            } catch (e: Exception) {
                Log.e("MainActivity", "Auth deep link failed", e)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        handleAuthDeepLink(intent)

        val db = AppDatabase.getInstance(this)
        lifecycleScope.launch {
            DatabaseSeeder.seedIfNeeded(this@MainActivity, db)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            requestNotificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }

        setupAppShortcuts()

        setContent {
            val darkThemePref by AppPrefs.darkThemeFlow(this).collectAsState(initial = null)
            val isDark = darkThemePref ?: isSystemInDarkTheme()

            OneKuralTheme(darkTheme = isDark) {
                val navController = rememberNavController()
                Scaffold(
                    modifier = Modifier.fillMaxSize(),
                    bottomBar = { BottomNavBar(navController) }
                ) { innerPadding ->
                    AppNavHost(
                        navController = navController,
                        modifier = Modifier.padding(innerPadding)
                    )
                }
            }
        }
    }

    private fun setupAppShortcuts() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N_MR1) return
        val sm = getSystemService(ShortcutManager::class.java) ?: return
        if (sm.dynamicShortcuts.any { it.id == "today_kural" }) return

        val shortcut = ShortcutInfo.Builder(this, "today_kural")
            .setShortLabel("Today's Kural")
            .setLongLabel("Open Today's Kural")
            .setIcon(Icon.createWithResource(this, R.mipmap.ic_launcher))
            .setIntent(
                android.content.Intent(this, MainActivity::class.java).apply {
                    action = android.content.Intent.ACTION_VIEW
                }
            )
            .build()

        sm.dynamicShortcuts = listOf(shortcut)
    }
}
