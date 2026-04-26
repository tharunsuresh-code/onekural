package com.onekural.app.data.db

import android.content.Context
import android.util.Log
import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import com.google.gson.reflect.TypeToken
import com.onekural.app.data.model.Kural
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

private data class KuralJson(
    val id: Int,
    val book: Int,
    val chapter: Int,
    @SerializedName("chapter_name_tamil") val chapterNameTamil: String,
    @SerializedName("chapter_name_english") val chapterNameEnglish: String,
    @SerializedName("kural_tamil") val kuralTamil: String,
    val transliteration: String,
    @SerializedName("meaning_english") val meaningEnglish: String,
    @SerializedName("meaning_tamil") val meaningTamil: String,
    @SerializedName("explanation_english") val explanationEnglish: String? = null,
    @SerializedName("explanation_tamil") val explanationTamil: String? = null
) {
    fun toEntity() = Kural(
        id = id,
        book = book,
        chapter = chapter,
        chapterNameTamil = chapterNameTamil,
        chapterNameEnglish = chapterNameEnglish,
        kuralTamil = kuralTamil,
        transliteration = transliteration,
        meaningEnglish = meaningEnglish,
        meaningTamil = meaningTamil,
        explanationEnglish = explanationEnglish,
        explanationTamil = explanationTamil
    )
}

object DatabaseSeeder {
    suspend fun seedIfNeeded(context: Context, db: AppDatabase) = withContext(Dispatchers.IO) {
        val count = db.kuralDao().count()
        if (count >= 1330) return@withContext

        Log.i("DatabaseSeeder", "Seeding $count/1330 kurals from asset...")
        try {
            val json = context.assets.open("kurals.json").bufferedReader().readText()
            val type = object : TypeToken<List<KuralJson>>() {}.type
            val kuralJsonList: List<KuralJson> = Gson().fromJson(json, type)
            db.kuralDao().insertAll(kuralJsonList.map { it.toEntity() })
            Log.i("DatabaseSeeder", "Seeded ${kuralJsonList.size} kurals")
        } catch (e: Exception) {
            Log.e("DatabaseSeeder", "Seeding failed", e)
        }
    }
}
