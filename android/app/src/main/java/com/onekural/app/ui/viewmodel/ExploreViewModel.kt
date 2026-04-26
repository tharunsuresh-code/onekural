package com.onekural.app.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.onekural.app.data.db.AppDatabase
import com.onekural.app.data.model.ChapterSummary
import com.onekural.app.data.model.Kural
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ExploreUiState(
    val query: String = "",
    val searchResults: List<Kural> = emptyList(),
    val searching: Boolean = false,
    val selectedBook: Int = 1,
    val chapters: List<ChapterSummary> = emptyList(),
    val expandedChapter: Int? = null,
    val chapterKurals: List<Kural> = emptyList(),
    val loadingChapters: Boolean = false
)

class ExploreViewModel(app: Application) : AndroidViewModel(app) {
    private val db = AppDatabase.getInstance(app)
    private val _uiState = MutableStateFlow(ExploreUiState())
    val uiState: StateFlow<ExploreUiState> = _uiState.asStateFlow()

    private var searchJob: Job? = null

    init {
        loadChapters(1)
    }

    fun onQueryChange(q: String) {
        _uiState.value = _uiState.value.copy(query = q)
        searchJob?.cancel()
        if (q.isBlank()) {
            _uiState.value = _uiState.value.copy(searchResults = emptyList(), searching = false)
            return
        }
        searchJob = viewModelScope.launch {
            delay(300)
            _uiState.value = _uiState.value.copy(searching = true)
            val results = db.kuralDao().search(q.trim())
            _uiState.value = _uiState.value.copy(searchResults = results, searching = false)
        }
    }

    fun selectBook(book: Int) {
        _uiState.value = _uiState.value.copy(selectedBook = book, expandedChapter = null)
        loadChapters(book)
    }

    private fun loadChapters(book: Int) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(loadingChapters = true)
            val chapters = db.kuralDao().getChaptersByBook(book)
            _uiState.value = _uiState.value.copy(chapters = chapters, loadingChapters = false)
        }
    }

    fun toggleChapter(chapter: Int) {
        val current = _uiState.value.expandedChapter
        if (current == chapter) {
            _uiState.value = _uiState.value.copy(expandedChapter = null, chapterKurals = emptyList())
        } else {
            _uiState.value = _uiState.value.copy(expandedChapter = chapter)
            viewModelScope.launch {
                val kurals = db.kuralDao().getByChapter(chapter)
                _uiState.value = _uiState.value.copy(chapterKurals = kurals)
            }
        }
    }
}
