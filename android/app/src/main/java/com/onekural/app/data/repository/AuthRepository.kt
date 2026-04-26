package com.onekural.app.data.repository

import android.content.Context
import android.util.Log
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.onekural.app.BuildConfig
import com.onekural.app.util.supabase
import io.github.jan.supabase.auth.OtpType
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.Google
import io.github.jan.supabase.auth.providers.builtin.IDToken
import io.github.jan.supabase.auth.providers.builtin.OTP
import io.github.jan.supabase.auth.user.UserInfo
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.security.MessageDigest
import java.util.UUID

object AuthRepository {

    val currentUser: Flow<UserInfo?> = supabase.auth.sessionStatus.map { status ->
        supabase.auth.currentUserOrNull()
    }

    fun currentUserOrNull(): UserInfo? = supabase.auth.currentUserOrNull()

    suspend fun signInWithGoogle(context: Context): Result<Unit> {
        val clientId = BuildConfig.GOOGLE_WEB_CLIENT_ID
        if (clientId.isBlank()) {
            return Result.failure(IllegalStateException("Google Web Client ID not configured in local.properties (google.webClientId)"))
        }

        return try {
            val rawNonce = UUID.randomUUID().toString()
            val hashedNonce = sha256(rawNonce)

            val googleIdOption = GetGoogleIdOption.Builder()
                .setFilterByAuthorizedAccounts(false)
                .setServerClientId(clientId)
                .setNonce(hashedNonce)
                .build()

            val request = GetCredentialRequest.Builder()
                .addCredentialOption(googleIdOption)
                .build()

            val credentialManager = CredentialManager.create(context)
            val result = credentialManager.getCredential(context, request)
            val credential = GoogleIdTokenCredential.createFrom(result.credential.data)

            supabase.auth.signInWith(IDToken) {
                idToken = credential.idToken
                provider = Google
                nonce = rawNonce
            }
            Result.success(Unit)
        } catch (e: GetCredentialException) {
            Log.e("AuthRepository", "Google credential error", e)
            Result.failure(e)
        } catch (e: Exception) {
            Log.e("AuthRepository", "Google sign-in error", e)
            Result.failure(e)
        }
    }

    suspend fun sendOtp(email: String): Result<Unit> = try {
        supabase.auth.signInWith(OTP) {
            this.email = email
        }
        Result.success(Unit)
    } catch (e: Exception) {
        Log.e("AuthRepository", "OTP send error", e)
        Result.failure(e)
    }

    suspend fun verifyOtp(email: String, token: String): Result<Unit> = try {
        supabase.auth.verifyEmailOtp(OtpType.Email.EMAIL, email, token)
        Result.success(Unit)
    } catch (e: Exception) {
        Log.e("AuthRepository", "OTP verify error", e)
        Result.failure(e)
    }

    suspend fun signOut(): Result<Unit> = try {
        supabase.auth.signOut()
        Result.success(Unit)
    } catch (e: Exception) {
        Log.e("AuthRepository", "Sign out error", e)
        Result.failure(e)
    }

    private fun sha256(input: String): String {
        val bytes = MessageDigest.getInstance("SHA-256").digest(input.toByteArray())
        return bytes.joinToString("") { "%02x".format(it) }
    }
}
