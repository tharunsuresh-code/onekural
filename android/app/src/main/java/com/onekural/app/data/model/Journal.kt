package com.onekural.app.data.model

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "journals")
data class Journal(
    @PrimaryKey @ColumnInfo(name = "kural_id") val kuralId: Int,
    val reflection: String,
    @ColumnInfo(name = "updated_at") val updatedAt: Long = System.currentTimeMillis(),
    val synced: Boolean = false
)
