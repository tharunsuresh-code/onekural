package com.onekural.app.data.model

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "kurals")
data class Kural(
    @PrimaryKey val id: Int,
    val book: Int,
    val chapter: Int,
    @ColumnInfo(name = "chapter_name_tamil") val chapterNameTamil: String,
    @ColumnInfo(name = "chapter_name_english") val chapterNameEnglish: String,
    @ColumnInfo(name = "kural_tamil") val kuralTamil: String,
    val transliteration: String,
    @ColumnInfo(name = "meaning_english") val meaningEnglish: String,
    @ColumnInfo(name = "meaning_tamil") val meaningTamil: String,
    @ColumnInfo(name = "explanation_english") val explanationEnglish: String? = null,
    @ColumnInfo(name = "explanation_tamil") val explanationTamil: String? = null
)

data class ChapterSummary(
    val chapter: Int,
    @ColumnInfo(name = "chapter_name_tamil") val chapterNameTamil: String,
    @ColumnInfo(name = "chapter_name_english") val chapterNameEnglish: String,
    val book: Int
)
