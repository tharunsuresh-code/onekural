package com.onekural.app.data.db

import androidx.room.*
import com.onekural.app.data.model.Favorite
import kotlinx.coroutines.flow.Flow

@Dao
interface FavoriteDao {
    @Query("SELECT * FROM favorites ORDER BY created_at DESC")
    fun getAllFlow(): Flow<List<Favorite>>

    @Query("SELECT EXISTS(SELECT 1 FROM favorites WHERE kural_id = :kuralId)")
    fun isFavoriteFlow(kuralId: Int): Flow<Boolean>

    @Query("SELECT EXISTS(SELECT 1 FROM favorites WHERE kural_id = :kuralId)")
    suspend fun isFavorite(kuralId: Int): Boolean

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(favorite: Favorite)

    @Query("DELETE FROM favorites WHERE kural_id = :kuralId")
    suspend fun delete(kuralId: Int)

    @Query("SELECT * FROM favorites WHERE synced = 0")
    suspend fun getUnsynced(): List<Favorite>

    @Query("UPDATE favorites SET synced = 1 WHERE kural_id = :kuralId")
    suspend fun markSynced(kuralId: Int)
}
