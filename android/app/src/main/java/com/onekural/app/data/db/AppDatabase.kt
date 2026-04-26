package com.onekural.app.data.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.onekural.app.data.model.Favorite
import com.onekural.app.data.model.Journal
import com.onekural.app.data.model.Kural

@Database(
    entities = [Kural::class, Journal::class, Favorite::class],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun kuralDao(): KuralDao
    abstract fun journalDao(): JournalDao
    abstract fun favoriteDao(): FavoriteDao

    companion object {
        @Volatile private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase =
            INSTANCE ?: synchronized(this) {
                Room.databaseBuilder(context, AppDatabase::class.java, "onekural.db")
                    .build()
                    .also { INSTANCE = it }
            }
    }
}
