package com.onekural.app.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.onekural.app.data.db.AppDatabase
import com.onekural.app.data.model.Favorite
import com.onekural.app.data.model.Journal
import com.onekural.app.data.model.Kural
import com.onekural.app.util.AppPrefs
import com.onekural.app.util.getDailyKuralId
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.LocalDate

data class HomeUiState(
    val kural: Kural? = null,
    val isFavorite: Boolean = false,
    val journalText: String? = null,
    val loading: Boolean = true
)

class HomeViewModel(app: Application) : AndroidViewModel(app) {
    private val db = AppDatabase.getInstance(app)
    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    val showTamil: StateFlow<Boolean> = AppPrefs.showTamilFlow(app)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), true)

    private var currentKuralId: Int = getDailyKuralId()

    init {
        loadDailyKural()
    }

    private fun loadKural(id: Int) {
        currentKuralId = id
        viewModelScope.launch {
            // Don't set loading=true on swipe — keep old kural visible until new one is ready.
            // Initial loading is handled by the default loading=true in HomeUiState.
            val kural = db.kuralDao().getById(id)
            val isFav = db.favoriteDao().isFavorite(id)
            val journal = db.journalDao().getByKuralId(id)?.reflection
            _uiState.value = HomeUiState(kural = kural, isFavorite = isFav, journalText = journal, loading = false)
        }
    }

    fun loadDailyKural(date: LocalDate = LocalDate.now()) {
        loadKural(getDailyKuralId(date))
    }

    fun loadPrev() {
        val prevId = if (currentKuralId > 1) currentKuralId - 1 else 1330
        loadKural(prevId)
    }

    fun loadNext() {
        val nextId = if (currentKuralId < 1330) currentKuralId + 1 else 1
        loadKural(nextId)
    }

    fun toggleFavorite() {
        val id = currentKuralId
        viewModelScope.launch {
            if (db.favoriteDao().isFavorite(id)) {
                db.favoriteDao().delete(id)
                _uiState.value = _uiState.value.copy(isFavorite = false)
            } else {
                db.favoriteDao().insert(Favorite(kuralId = id))
                _uiState.value = _uiState.value.copy(isFavorite = true)
            }
        }
    }

    fun saveJournal(text: String) {
        val id = currentKuralId
        viewModelScope.launch {
            if (text.isBlank()) {
                db.journalDao().delete(id)
                _uiState.value = _uiState.value.copy(journalText = null)
            } else {
                db.journalDao().upsert(Journal(kuralId = id, reflection = text.trim()))
                _uiState.value = _uiState.value.copy(journalText = text.trim())
            }
        }
    }
}
