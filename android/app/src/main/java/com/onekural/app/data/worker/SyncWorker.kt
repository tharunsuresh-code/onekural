package com.onekural.app.data.worker

import android.content.Context
import android.util.Log
import androidx.work.*
import com.onekural.app.data.db.AppDatabase
import com.onekural.app.util.supabase
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import java.util.concurrent.TimeUnit

class SyncWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {

    @Serializable
    private data class FavoriteRow(val user_id: String, val kural_id: Int)

    @Serializable
    private data class JournalRow(
        val user_id: String,
        val kural_id: Int,
        val reflection: String
    )

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val userId = supabase.auth.currentUserOrNull()?.id ?: return@withContext Result.success()
        val db = AppDatabase.getInstance(applicationContext)

        try {
            // Sync unsynced favorites
            val unsyncedFavs = db.favoriteDao().getUnsynced()
            if (unsyncedFavs.isNotEmpty()) {
                supabase.postgrest["favorites"].upsert(
                    unsyncedFavs.map { FavoriteRow(user_id = userId, kural_id = it.kuralId) }
                )
                unsyncedFavs.forEach { db.favoriteDao().markSynced(it.kuralId) }
                Log.d(TAG, "Synced ${unsyncedFavs.size} favorites")
            }

            // Sync unsynced journals
            val unsyncedJournals = db.journalDao().getUnsynced()
            if (unsyncedJournals.isNotEmpty()) {
                supabase.postgrest["journals"].upsert(
                    unsyncedJournals.map {
                        JournalRow(user_id = userId, kural_id = it.kuralId, reflection = it.reflection)
                    }
                )
                unsyncedJournals.forEach { db.journalDao().markSynced(it.kuralId) }
                Log.d(TAG, "Synced ${unsyncedJournals.size} journals")
            }

            Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "Sync failed", e)
            Result.retry()
        }
    }

    companion object {
        private const val TAG = "SyncWorker"
        private const val WORK_NAME = "onekural_sync"

        fun enqueue(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val request = OneTimeWorkRequestBuilder<SyncWorker>()
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .build()

            WorkManager.getInstance(context)
                .enqueueUniqueWork(WORK_NAME, ExistingWorkPolicy.REPLACE, request)
        }
    }
}
