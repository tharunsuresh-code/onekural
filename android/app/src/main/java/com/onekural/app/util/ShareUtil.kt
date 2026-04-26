package com.onekural.app.util

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import androidx.core.content.FileProvider
import androidx.core.content.res.ResourcesCompat
import com.onekural.app.R
import com.onekural.app.data.model.Kural
import java.io.File
import java.io.FileOutputStream

object ShareUtil {

    private val BOOK_NAMES = mapOf(1 to "Aram", 2 to "Porul", 3 to "Inbam")

    fun shareKural(context: Context, kural: Kural) {
        val bitmap = buildBitmap(context, kural)
        val file = saveBitmap(context, bitmap)
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)

        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "image/png"
            putExtra(Intent.EXTRA_STREAM, uri)
            putExtra(Intent.EXTRA_TEXT, "Thirukkural #${kural.id} | OneKural\nonekural.com/kural/${kural.id}")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, "Share Kural"))
    }

    private fun buildBitmap(context: Context, kural: Kural): Bitmap {
        val size = 1080
        val pad = 80f
        val cx = size / 2f
        val contentWidth = size - pad * 2  // 920px

        val tamilTypeface = try {
            ResourcesCompat.getFont(context, R.font.noto_serif_tamil) ?: Typeface.SERIF
        } catch (_: Exception) { Typeface.SERIF }

        // Paints — all ARGB, centered horizontally
        fun paint(alpha: Int, r: Int, g: Int, b: Int, size: Float, tf: Typeface? = null, bold: Boolean = false, italic: Boolean = false): Paint =
            Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.argb(alpha, r, g, b)
                textSize = size
                textAlign = Paint.Align.CENTER
                typeface = when {
                    tf != null -> tf
                    bold && italic -> Typeface.create(Typeface.SERIF, Typeface.BOLD_ITALIC)
                    bold -> Typeface.create(Typeface.DEFAULT_BOLD, Typeface.BOLD)
                    italic -> Typeface.create(Typeface.SERIF, Typeface.ITALIC)
                    else -> Typeface.SANS_SERIF
                }
            }

        val chapterPaint   = paint(128, 26, 26, 26, 28f)        // DARK 50%
        val kuralPaint     = paint(255, 26, 26, 26, 44f, tamilTypeface)
        val insightLblPaint = paint(179, 27, 94, 79, 22f)       // EMERALD 70%
        val insightTxtPaint = paint(204, 26, 26, 26, 26f, italic = true) // DARK 80%
        val watermarkPaint = paint(53, 26, 26, 26, 28f, tamilTypeface)   // DARK 21%
        val badgePaint     = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.argb(255, 27, 94, 79)
            textSize = 28f
            textAlign = Paint.Align.RIGHT
            isFakeBoldText = true
        }
        val emeraldDivPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.argb(128, 27, 94, 79)  // EMERALD 50%
        }
        val dotPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.argb(255, 27, 94, 79)
        }

        // Word-wrap helper
        fun Paint.wrapLines(text: String, maxWidth: Float): List<String> {
            val out = mutableListOf<String>()
            for (rawLine in text.split("\n")) {
                var cur = ""
                for (word in rawLine.trim().split(" ")) {
                    val test = if (cur.isEmpty()) word else "$cur $word"
                    if (measureText(test) <= maxWidth) cur = test
                    else { if (cur.isNotEmpty()) out.add(cur); cur = word }
                }
                if (cur.isNotEmpty()) out.add(cur)
            }
            return out
        }

        // Layout constants
        val kuralLineH   = 62f
        val insightLineH = 40f
        val insightPadV  = 44f
        val insightPadH  = 48f
        val innerW = contentWidth - insightPadH * 2

        val kuralLines   = kuralPaint.wrapLines(kural.kuralTamil, contentWidth)
        val meaningLines = insightTxtPaint.wrapLines(kural.meaningEnglish, innerW)

        // Measure total content height to vertically center
        val contentH = (52f                                        // dot (12) + gap (40)
                + 28f + 48f                                        // chapter badge + gap
                + 3f + 56f                                         // divider top
                + kuralLines.size * kuralLineH                     // kural text
                + 56f + 3f + 56f                                   // gap + divider bottom + gap
                + insightPadV + 24f + 24f
                + meaningLines.size * insightLineH + insightPadV)  // insight box

        val topMin = 80f
        val bottomReserved = 100f
        val startY = topMin + ((size - bottomReserved - topMin - contentH) / 2f).coerceAtLeast(0f)

        val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        canvas.drawColor(Color.WHITE)

        var y = startY

        // ── Decorative dot ──
        canvas.drawCircle(cx, y + 6f, 6f, dotPaint)
        y += 52f  // 12 + 40

        // ── Chapter badge ──
        val bookName = BOOK_NAMES[kural.book] ?: ""
        val chapterText = "$bookName · ${kural.chapterNameEnglish}"
        // drawText baseline = top - ascent (ascent is negative)
        canvas.drawText(chapterText, cx, y - chapterPaint.fontMetrics.ascent, chapterPaint)
        y += 28f + 48f

        // ── Divider top ──
        canvas.drawRect(cx - 24f, y, cx + 24f, y + 3f, emeraldDivPaint)
        y += 3f + 56f

        // ── Kural text (Tamil) ──
        val kuralBase0 = y - kuralPaint.fontMetrics.ascent
        for ((i, line) in kuralLines.withIndex()) {
            canvas.drawText(line, cx, kuralBase0 + i * kuralLineH, kuralPaint)
        }
        y += kuralLines.size * kuralLineH

        // ── Divider bottom ──
        y += 56f
        canvas.drawRect(cx - 24f, y, cx + 24f, y + 3f, emeraldDivPaint)
        y += 3f + 56f

        // ── Insight box ──
        val insightTextH = meaningLines.size * insightLineH
        val insightBoxH = insightPadV + 24f + 24f + insightTextH + insightPadV
        val boxRect = RectF(pad, y, pad + contentWidth, y + insightBoxH)

        val boxFillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.argb(20, 27, 94, 79)   // EMERALD 8%
        }
        val boxStrokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.argb(48, 27, 94, 79)   // EMERALD 19%
            style = Paint.Style.STROKE
            strokeWidth = 2f
        }
        canvas.drawRoundRect(boxRect, 20f, 20f, boxFillPaint)
        canvas.drawRoundRect(boxRect, 20f, 20f, boxStrokePaint)

        // "INSIGHT" label — baseline at boxTop + insightPadV + labelSize
        val insightLblY = y + insightPadV + 22f
        canvas.drawText("INSIGHT", cx, insightLblY, insightLblPaint)

        // Meaning text lines
        val meaningBase0 = insightLblY + 24f - insightTxtPaint.fontMetrics.ascent
        for ((i, line) in meaningLines.withIndex()) {
            canvas.drawText(line, cx, meaningBase0 + i * insightLineH, insightTxtPaint)
        }

        // ── Kural number badge — top right ──
        val badgeText = "#${kural.id}"
        val badgeWidth = badgePaint.measureText(badgeText) + 40f
        val badgeRight = size.toFloat() - pad
        val badgeLeft = badgeRight - badgeWidth
        val badgeTopY = topMin - 10f
        val badgeRect = RectF(badgeLeft, badgeTopY, badgeRight, badgeTopY + 44f)
        val badgeBgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.argb(26, 27, 94, 79) }
        val badgeBorderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.argb(77, 27, 94, 79)
            style = Paint.Style.STROKE
            strokeWidth = 1f
        }
        canvas.drawRoundRect(badgeRect, 22f, 22f, badgeBgPaint)
        canvas.drawRoundRect(badgeRect, 22f, 22f, badgeBorderPaint)
        canvas.drawText(badgeText, badgeRight - 20f, badgeTopY + 30f, badgePaint)

        // ── Watermark: அ · OneKural ──
        canvas.drawText("அ · OneKural", cx, size - 50f, watermarkPaint)

        return bmp
    }

    private fun saveBitmap(context: Context, bitmap: Bitmap): File {
        val dir = File(context.cacheDir, "shared_images").also { it.mkdirs() }
        val file = File(dir, "kural_share.png")
        FileOutputStream(file).use { bitmap.compress(Bitmap.CompressFormat.PNG, 95, it) }
        return file
    }
}
