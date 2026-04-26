package com.onekural.app.ui.viewmodel

import android.app.Application
import android.content.Context
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.onekural.app.data.repository.AuthRepository
import com.onekural.app.FcmTokenRegistrar
import com.onekural.app.data.worker.SyncWorker
import com.onekural.app.util.supabase
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.status.SessionStatus
import io.github.jan.supabase.auth.user.UserInfo
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class AuthUiState(
    val user: UserInfo? = null,
    val loading: Boolean = true,
    val error: String? = null,
    val otpSent: Boolean = false
)

class AuthViewModel(app: Application) : AndroidViewModel(app) {

    private val _state = MutableStateFlow(AuthUiState())
    val state: StateFlow<AuthUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            supabase.auth.sessionStatus.collect { status ->
                when (status) {
                    is SessionStatus.Authenticated -> {
                        val user = supabase.auth.currentUserOrNull()
                        _state.value = AuthUiState(user = user, loading = false)
                        SyncWorker.enqueue(getApplication())
                        val jwt = supabase.auth.currentSessionOrNull()?.accessToken
                        if (jwt != null) {
                            FcmTokenRegistrar.linkUser(getApplication(), jwt)
                        }
                    }
                    is SessionStatus.NotAuthenticated -> {
                        _state.value = AuthUiState(user = null, loading = false)
                    }
                    is SessionStatus.Initializing -> {
                        _state.value = _state.value.copy(loading = true)
                    }
                    is SessionStatus.RefreshFailure -> {
                        _state.value = _state.value.copy(
                            loading = false,
                            error = "Session refresh failed. Please sign in again."
                        )
                    }
                }
            }
        }
    }

    fun signInWithGoogle(context: Context) {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            val result = AuthRepository.signInWithGoogle(context)
            if (result.isFailure) {
                _state.value = _state.value.copy(
                    loading = false,
                    error = result.exceptionOrNull()?.message ?: "Google sign-in failed"
                )
            }
        }
    }

    fun sendOtp(email: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            val result = AuthRepository.sendOtp(email)
            _state.value = _state.value.copy(
                loading = false,
                otpSent = result.isSuccess,
                error = if (result.isFailure) result.exceptionOrNull()?.message else null
            )
        }
    }

    fun verifyOtp(email: String, token: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            val result = AuthRepository.verifyOtp(email, token)
            if (result.isFailure) {
                _state.value = _state.value.copy(
                    loading = false,
                    error = result.exceptionOrNull()?.message ?: "Invalid code. Try again."
                )
            }
        }
    }

    fun signOut() {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            AuthRepository.signOut()
        }
    }

    fun clearError() {
        _state.value = _state.value.copy(error = null)
    }

    fun resetOtp() {
        _state.value = _state.value.copy(otpSent = false)
    }
}
