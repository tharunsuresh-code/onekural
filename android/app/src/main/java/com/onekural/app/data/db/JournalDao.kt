package com.onekural.app.data.db

import androidx.room.*
import com.onekural.app.data.model.Journal
import kotlinx.coroutines.flow.Flow

@Dao
interface JournalDao {
    @Query("SELECT * FROM journals ORDER BY updated_at DESC")
    fun getAllFlow(): Flow<List<Journal>>

    @Query("SELECT * FROM journals WHERE kural_id = :kuralId")
    suspend fun getByKuralId(kuralId: Int): Journal?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(journal: Journal)

    @Query("DELETE FROM journals WHERE kural_id = :kuralId")
    suspend fun delete(kuralId: Int)

    @Query("SELECT * FROM journals WHERE synced = 0")
    suspend fun getUnsynced(): List<Journal>

    @Query("UPDATE journals SET synced = 1 WHERE kural_id = :kuralId")
    suspend fun markSynced(kuralId: Int)
}
