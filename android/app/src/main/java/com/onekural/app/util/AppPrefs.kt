package com.onekural.app.util

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "app_prefs")

object AppPrefs {
    private val SHOW_TAMIL = booleanPreferencesKey("show_tamil")
    private val DARK_THEME = booleanPreferencesKey("dark_theme")
    private val PUSH_ENABLED = booleanPreferencesKey("push_enabled")

    fun showTamilFlow(context: Context): Flow<Boolean> =
        context.dataStore.data.map { prefs -> prefs[SHOW_TAMIL] ?: true }

    suspend fun toggleShowTamil(context: Context) {
        context.dataStore.edit { prefs ->
            prefs[SHOW_TAMIL] = !(prefs[SHOW_TAMIL] ?: true)
        }
    }

    fun darkThemeFlow(context: Context): Flow<Boolean?> =
        context.dataStore.data.map { prefs -> prefs[DARK_THEME] }

    suspend fun setDarkTheme(context: Context, dark: Boolean) {
        context.dataStore.edit { prefs -> prefs[DARK_THEME] = dark }
    }

    suspend fun clearDarkTheme(context: Context) {
        context.dataStore.edit { prefs -> prefs.remove(DARK_THEME) }
    }

    // Cycles: null (system) → false (light) → true (dark) → null (system)
    suspend fun cycleTheme(context: Context, current: Boolean?) {
        context.dataStore.edit { prefs ->
            when (current) {
                null  -> prefs[DARK_THEME] = false
                false -> prefs[DARK_THEME] = true
                true  -> prefs.remove(DARK_THEME)
            }
        }
    }

    fun pushEnabledFlow(context: Context): Flow<Boolean> =
        context.dataStore.data.map { prefs -> prefs[PUSH_ENABLED] ?: true }

    suspend fun setPushEnabled(context: Context, enabled: Boolean) {
        context.dataStore.edit { prefs -> prefs[PUSH_ENABLED] = enabled }
    }
}
