package com.onekural.app.data.db

import androidx.room.*
import com.onekural.app.data.model.ChapterSummary
import com.onekural.app.data.model.Kural
import kotlinx.coroutines.flow.Flow

@Dao
interface KuralDao {
    @Query("SELECT * FROM kurals WHERE id = :id")
    suspend fun getById(id: Int): Kural?

    @Query("SELECT * FROM kurals WHERE chapter = :chapter ORDER BY id")
    suspend fun getByChapter(chapter: Int): List<Kural>

    @Query("SELECT COUNT(*) FROM kurals")
    suspend fun count(): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(kurals: List<Kural>)

    @Query("""
        SELECT * FROM kurals
        WHERE kural_tamil LIKE '%' || :q || '%'
           OR transliteration LIKE '%' || :q || '%'
           OR meaning_english LIKE '%' || :q || '%'
           OR meaning_tamil LIKE '%' || :q || '%'
           OR chapter_name_english LIKE '%' || :q || '%'
           OR chapter_name_tamil LIKE '%' || :q || '%'
        ORDER BY id
        LIMIT 50
    """)
    suspend fun search(q: String): List<Kural>

    @Query("""
        SELECT DISTINCT chapter, chapter_name_tamil, chapter_name_english, book
        FROM kurals
        WHERE book = :book
        ORDER BY chapter
    """)
    suspend fun getChaptersByBook(book: Int): List<ChapterSummary>

    @Query("SELECT * FROM kurals WHERE book = :book ORDER BY id")
    fun getByBookFlow(book: Int): Flow<List<Kural>>
}
