package com.onekural.app.util

import java.time.LocalDate
import java.time.temporal.ChronoUnit

private const val MAX_KURAL_ID = 1330

// Exact port of the JS xorshift32 seeded Fisher-Yates shuffle from lib/kurals.ts.
// Fixed seed 0x4A9F3C2E produces the same order as the web app.
private val DAILY_ORDER: IntArray by lazy {
    var x = 0x4A9F3C2E  // Int is 32-bit in Kotlin, matches JS 32-bit bitwise ops
    fun rand(): Double {
        x = x xor (x shl 13)
        x = x xor (x ushr 17)  // ushr = unsigned right shift, matches JS >>>
        x = x xor (x shl 5)
        return (x.toLong() and 0xFFFFFFFFL).toDouble() / 0xFFFFFFFFL.toDouble()
    }
    val arr = IntArray(MAX_KURAL_ID) { it + 1 }
    for (i in MAX_KURAL_ID - 1 downTo 1) {
        val j = (rand() * (i + 1)).toInt()
        val tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp
    }
    arr
}

private val EPOCH: LocalDate = LocalDate.of(2025, 1, 1)

fun getDailyKuralId(date: LocalDate = LocalDate.now()): Int {
    val daysSinceEpoch = ChronoUnit.DAYS.between(EPOCH, date).toInt()
    val index = ((daysSinceEpoch % MAX_KURAL_ID) + MAX_KURAL_ID) % MAX_KURAL_ID
    return DAILY_ORDER[index]
}
