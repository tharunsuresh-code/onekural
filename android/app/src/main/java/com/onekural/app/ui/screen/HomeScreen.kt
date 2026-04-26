package com.onekural.app.ui.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.outlined.Laptop
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.onekural.app.ui.viewmodel.HomeViewModel
import com.onekural.app.util.AppPrefs
import com.onekural.app.util.ShareUtil
import com.onekural.app.util.getDailyKuralId
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onKuralClick: (Int) -> Unit,
    vm: HomeViewModel = viewModel()
) {
    val state by vm.uiState.collectAsState()
    val showTamil by vm.showTamil.collectAsState()
    val context = androidx.compose.ui.platform.LocalContext.current
    val scope = rememberCoroutineScope()

    val today = remember { LocalDate.now() }
    val dailyKuralId = remember { getDailyKuralId(today) }
    val dateText = remember(today) {
        today.format(DateTimeFormatter.ofPattern("EEEE, d MMMM"))
    }
    val darkTheme by AppPrefs.darkThemeFlow(context).collectAsState(initial = null)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .statusBarsPadding()
    ) {
        // ── Header ──
        Spacer(Modifier.height(16.dp))
        Box(modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp)) {
            IconButton(
                onClick = { scope.launch { AppPrefs.cycleTheme(context, darkTheme) } },
                modifier = Modifier.align(Alignment.CenterStart).size(40.dp)
            ) {
                Icon(
                    imageVector = when (darkTheme) {
                        null  -> Icons.Outlined.Laptop
                        false -> Icons.Default.LightMode
                        true  -> Icons.Default.DarkMode
                    },
                    contentDescription = "Theme",
                    tint = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.4f),
                    modifier = Modifier.size(20.dp)
                )
            }
            Row(modifier = Modifier.align(Alignment.Center)) {
                Text("One", fontSize = 20.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.5.sp, color = MaterialTheme.colorScheme.primary)
                Text("Kural", fontSize = 20.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.5.sp, color = MaterialTheme.colorScheme.onBackground)
            }
        }

        // ── TODAY'S KURAL label (fixed height, hides when not on daily kural) ──
        val isToday = !state.loading && state.kural?.id == dailyKuralId
        Box(
            modifier = Modifier.fillMaxWidth().height(40.dp),
            contentAlignment = Alignment.Center
        ) {
            if (isToday) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        "TODAY'S KURAL",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Medium,
                        letterSpacing = 2.sp,
                        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.8f)
                    )
                    Spacer(Modifier.height(2.dp))
                    Text(dateText, fontSize = 11.sp, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.4f))
                }
            }
        }

        // ── Body ──
        if (state.loading) {
            Box(
                modifier = Modifier.weight(1f).fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(28.dp),
                    strokeWidth = 2.dp
                )
            }
        } else {
            state.kural?.let { kural ->
                KuralBody(
                    kural = kural,
                    isFavorite = state.isFavorite,
                    journalText = state.journalText,
                    showTamil = showTamil,
                    onToggleTamil = { scope.launch { AppPrefs.toggleShowTamil(context) } },
                    onPrev = vm::loadPrev,
                    onNext = vm::loadNext,
                    onToggleFavorite = vm::toggleFavorite,
                    onSaveJournal = vm::saveJournal,
                    onShare = { ShareUtil.shareKural(context, kural) },
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}
