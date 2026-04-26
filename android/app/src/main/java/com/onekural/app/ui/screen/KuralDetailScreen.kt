package com.onekural.app.ui.screen

import android.app.Application
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.onekural.app.data.db.AppDatabase
import com.onekural.app.data.model.Favorite
import com.onekural.app.data.model.Journal
import com.onekural.app.data.model.Kural
import com.onekural.app.util.AppPrefs
import com.onekural.app.util.ShareUtil
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class KuralDetailViewModel(app: Application) : AndroidViewModel(app) {
    private val db = AppDatabase.getInstance(app)
    private val _kural = MutableStateFlow<Kural?>(null)
    val kural: StateFlow<Kural?> = _kural.asStateFlow()
    private val _isFavorite = MutableStateFlow(false)
    val isFavorite: StateFlow<Boolean> = _isFavorite.asStateFlow()
    private val _journalText = MutableStateFlow<String?>(null)
    val journalText: StateFlow<String?> = _journalText.asStateFlow()

    val showTamil: StateFlow<Boolean> = AppPrefs.showTamilFlow(app)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), true)

    private var currentId: Int = 0

    fun load(id: Int) {
        currentId = id
        viewModelScope.launch {
            _kural.value = db.kuralDao().getById(id)
            _isFavorite.value = db.favoriteDao().isFavorite(id)
            _journalText.value = db.journalDao().getByKuralId(id)?.reflection
        }
    }

    fun loadPrev() { load(if (currentId > 1) currentId - 1 else 1330) }
    fun loadNext() { load(if (currentId < 1330) currentId + 1 else 1) }

    fun toggleFavorite() {
        val id = currentId
        viewModelScope.launch {
            if (db.favoriteDao().isFavorite(id)) {
                db.favoriteDao().delete(id)
                _isFavorite.value = false
            } else {
                db.favoriteDao().insert(Favorite(kuralId = id))
                _isFavorite.value = true
            }
        }
    }

    fun saveJournal(text: String) {
        val id = currentId
        viewModelScope.launch {
            if (text.isBlank()) {
                db.journalDao().delete(id)
                _journalText.value = null
            } else {
                db.journalDao().upsert(Journal(kuralId = id, reflection = text.trim()))
                _journalText.value = text.trim()
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun KuralDetailScreen(
    kuralId: Int,
    onBack: () -> Unit,
    vm: KuralDetailViewModel = viewModel()
) {
    LaunchedEffect(kuralId) { vm.load(kuralId) }

    val context = androidx.compose.ui.platform.LocalContext.current
    val scope = rememberCoroutineScope()
    val kural by vm.kural.collectAsState()
    val isFavorite by vm.isFavorite.collectAsState()
    val journalText by vm.journalText.collectAsState()
    val showTamil by vm.showTamil.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .statusBarsPadding()
    ) {
        // ── Header ──
        Spacer(Modifier.height(16.dp))
        Box(modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp)) {
            Text(
                text = "< Back",
                fontSize = 13.sp,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.45f),
                modifier = Modifier
                    .align(Alignment.CenterStart)
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null
                    ) { onBack() }
                    .padding(vertical = 8.dp)
            )
            Row(modifier = Modifier.align(Alignment.Center)) {
                Text("One", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                Text("Kural", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
            }
        }
        Spacer(Modifier.height(8.dp))

        // ── Body ──
        kural?.let { k ->
            KuralBody(
                kural = k,
                isFavorite = isFavorite,
                journalText = journalText,
                showTamil = showTamil,
                onToggleTamil = { scope.launch { AppPrefs.toggleShowTamil(context) } },
                onPrev = vm::loadPrev,
                onNext = vm::loadNext,
                onToggleFavorite = vm::toggleFavorite,
                onSaveJournal = vm::saveJournal,
                onShare = { ShareUtil.shareKural(context, k) },
                modifier = Modifier.weight(1f)
            )
        } ?: Box(
            modifier = Modifier.weight(1f).fillMaxWidth(),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator(
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(28.dp),
                strokeWidth = 2.dp
            )
        }
    }
}
