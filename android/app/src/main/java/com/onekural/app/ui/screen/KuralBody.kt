package com.onekural.app.ui.screen

import android.content.Context
import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.EditNote
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.IosShare
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.onekural.app.data.model.Kural
import com.onekural.app.ui.theme.NotoSerifTamil
import com.onekural.app.util.TtsManager
import kotlinx.coroutines.flow.StateFlow

private val BOOK_NAMES = mapOf(1 to "Aram", 2 to "Porul", 3 to "Inbam")

/**
 * Shared kural display composable used by both HomeScreen and KuralDetailScreen.
 * Handles swipe nav, Crossfade (kural text + insight only), action row, and sheets.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun KuralBody(
    kural: Kural,
    isFavorite: Boolean,
    journalText: String?,
    showTamil: Boolean,
    onToggleTamil: () -> Unit,
    onPrev: () -> Unit,
    onNext: () -> Unit,
    onToggleFavorite: () -> Unit,
    onSaveJournal: (String) -> Unit,
    onShare: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    val isListening by TtsManager.isPlaying.collectAsState()

    var showExplanationSheet by remember { mutableStateOf(false) }
    val explanationSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    var showJournalSheet by remember { mutableStateOf(false) }
    val journalSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    var dragAccum by remember { mutableFloatStateOf(0f) }
    val currentOnPrev by rememberUpdatedState(onPrev)
    val currentOnNext by rememberUpdatedState(onNext)

    DisposableEffect(lifecycle) {
        TtsManager.init(context)
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_PAUSE) TtsManager.stop()
        }
        lifecycle.addObserver(observer)
        onDispose { lifecycle.removeObserver(observer) }
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .pointerInput(Unit) {
                detectHorizontalDragGestures(
                    onDragStart = { dragAccum = 0f },
                    onDragEnd = {
                        if (dragAccum < -80f) currentOnNext()
                        else if (dragAccum > 80f) currentOnPrev()
                        dragAccum = 0f
                    },
                    onDragCancel = { dragAccum = 0f },
                    onHorizontalDrag = { _, delta -> dragAccum += delta }
                )
            }
    ) {
        // ── Kural content area ──
        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            val bookName = BOOK_NAMES[kural.book] ?: ""

            // STATIC: chapter badge + lang toggle (instant update, no fade)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier
                            .size(8.dp)
                            .background(MaterialTheme.colorScheme.primary, RoundedCornerShape(50))
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        text = "$bookName · ${kural.chapterNameEnglish}",
                        fontSize = 11.sp,
                        letterSpacing = 0.5.sp,
                        color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f)
                    )
                }
                Box(
                    modifier = Modifier
                        .background(
                            MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                            RoundedCornerShape(50)
                        )
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null,
                            onClick = onToggleTamil
                        )
                        .padding(horizontal = 10.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = if (showTamil) "English" else "தமிழ்",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }

            Spacer(Modifier.height(20.dp))
            EditorialDivider()
            Spacer(Modifier.height(28.dp))

            // ANIMATED: only kural text + insight fade on kural change
            Crossfade(
                targetState = kural,
                animationSpec = tween(durationMillis = 350),
                label = "kuralContent"
            ) { k ->
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    if (showTamil) {
                        Text(
                            text = k.kuralTamil,
                            fontFamily = NotoSerifTamil,
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Bold,
                            lineHeight = 38.sp,
                            letterSpacing = (-0.3).sp,
                            textAlign = TextAlign.Center,
                            color = MaterialTheme.colorScheme.onBackground
                        )
                    } else {
                        Text(
                            text = k.transliteration,
                            fontFamily = FontFamily.Serif,
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Bold,
                            lineHeight = 34.sp,
                            textAlign = TextAlign.Center,
                            color = MaterialTheme.colorScheme.onBackground
                        )
                    }

                    Spacer(Modifier.height(28.dp))
                    EditorialDivider()
                    Spacer(Modifier.height(24.dp))

                    InsightBox(
                        label = if (showTamil) "பொருள்" else "Insight",
                        text = k.meaningEnglish,
                        useTamil = showTamil
                    )
                }
            }

            Spacer(Modifier.height(16.dp))

            // STATIC: TAP FOR EXPLANATION (only if explanation exists)
            if (kural.explanationEnglish != null) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null
                        ) { showExplanationSheet = true }
                        .padding(vertical = 8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "TAP FOR EXPLANATION",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Medium,
                        letterSpacing = 2.sp,
                        color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.35f)
                    )
                }
            }
        }

        // ── Nav row ──
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                modifier = Modifier
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null
                    ) { onPrev() }
                    .padding(vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Text("<", fontSize = 14.sp, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.4f))
                val prevId = if (kural.id > 1) kural.id - 1 else 1330
                Text("#$prevId", fontSize = 11.sp, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.4f))
            }
            Text(
                "${kural.id} / 1330",
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.25f)
            )
            Row(
                modifier = Modifier
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null
                    ) { onNext() }
                    .padding(vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                val nextId = if (kural.id < 1330) kural.id + 1 else 1
                Text("#$nextId", fontSize = 11.sp, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.4f))
                Text(">", fontSize = 14.sp, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.4f))
            }
        }

        // ── Action row ──
        HorizontalDivider(
            thickness = 0.5.dp,
            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.10f)
        )
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.SpaceAround,
            verticalAlignment = Alignment.CenterVertically
        ) {
            ActionButton(
                icon = Icons.Default.VolumeUp,
                label = "Listen",
                active = isListening
            ) { TtsManager.speak(kural.kuralTamil) }

            ActionButton(
                icon = if (isFavorite) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                label = "Favourite",
                active = isFavorite,
                activeLabel = "Favourite"
            ) { onToggleFavorite() }

            ActionButton(
                icon = Icons.Default.EditNote,
                label = "Journal",
                active = journalText != null
            ) { showJournalSheet = true }

            ActionButton(icon = Icons.Default.IosShare, label = "Share") { onShare() }
        }
        Spacer(Modifier.height(6.dp))
    }

    // ── Explanation sheet (half-page, explanation text only) ──
    if (showExplanationSheet) {
        kural.explanationEnglish?.let { exp ->
            ModalBottomSheet(
                onDismissRequest = { showExplanationSheet = false },
                sheetState = explanationSheetState,
                containerColor = MaterialTheme.colorScheme.background,
                dragHandle = { SheetHandle() }
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 24.dp)
                        .padding(bottom = 48.dp)
                ) {
                    Text(
                        "EXPLANATION",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Medium,
                        letterSpacing = 2.sp,
                        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.7f),
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(Modifier.height(12.dp))
                    Text(
                        exp,
                        fontSize = 15.sp,
                        lineHeight = 26.sp,
                        color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.78f),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }
    }

    // ── Journal sheet ──
    if (showJournalSheet) {
        JournalEditorSheet(
            sheetState = journalSheetState,
            initialText = journalText ?: "",
            onDismiss = { showJournalSheet = false },
            onSave = { text ->
                onSaveJournal(text)
                showJournalSheet = false
            }
        )
    }
}

// ── Shared composables ────────────────────────────────────────────────────────

@Composable
fun SheetHandle() {
    Box(
        modifier = Modifier
            .padding(vertical = 10.dp)
            .width(32.dp)
            .height(3.dp)
            .background(
                MaterialTheme.colorScheme.onBackground.copy(alpha = 0.15f),
                RoundedCornerShape(50)
            )
    )
}

@Composable
fun EditorialDivider() {
    val emerald = MaterialTheme.colorScheme.primary
    Box(
        modifier = Modifier
            .width(48.dp)
            .height(1.dp)
            .background(
                brush = Brush.horizontalGradient(
                    colors = listOf(
                        Color.Transparent,
                        emerald.copy(alpha = 0.5f),
                        emerald.copy(alpha = 0.5f),
                        Color.Transparent
                    )
                )
            )
    )
}

@Composable
fun InsightBox(label: String, text: String, useTamil: Boolean = false) {
    val emerald = MaterialTheme.colorScheme.primary
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .border(0.5.dp, emerald.copy(alpha = 0.18f), RoundedCornerShape(8.dp))
            .background(emerald.copy(alpha = 0.07f), RoundedCornerShape(8.dp))
            .padding(horizontal = 24.dp, vertical = 20.dp)
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(
                text = label,
                fontSize = if (useTamil) 13.sp else 10.sp,
                fontWeight = FontWeight.Medium,
                letterSpacing = if (useTamil) 0.sp else 2.sp,
                color = emerald.copy(alpha = 0.7f),
                fontFamily = if (useTamil) NotoSerifTamil else null
            )
            Spacer(Modifier.height(10.dp))
            Text(
                text = text,
                fontSize = 15.sp,
                lineHeight = 24.sp,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.82f),
                fontFamily = FontFamily.Serif
            )
        }
    }
}

@Composable
internal fun ActionButton(
    icon: ImageVector,
    label: String,
    active: Boolean = false,
    activeLabel: String = "",
    onClick: () -> Unit
) {
    val color = when {
        active && activeLabel == "Favourite" -> MaterialTheme.colorScheme.secondary
        active -> MaterialTheme.colorScheme.primary
        else -> MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f)
    }
    Column(
        modifier = Modifier
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick
            )
            .padding(vertical = 6.dp, horizontal = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Icon(imageVector = icon, contentDescription = label, tint = color, modifier = Modifier.size(22.dp))
        Text(label, fontSize = 10.sp, color = color, letterSpacing = 0.3.sp)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JournalEditorSheet(
    sheetState: SheetState,
    initialText: String,
    onDismiss: () -> Unit,
    onSave: (String) -> Unit
) {
    var text by remember { mutableStateOf(initialText) }
    val focusRequester = remember { FocusRequester() }
    val view = LocalView.current

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = MaterialTheme.colorScheme.background,
        dragHandle = { SheetHandle() }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .imePadding()
                .navigationBarsPadding()
                .padding(horizontal = 24.dp)
                .padding(bottom = 16.dp)
        ) {
            Text(
                "MY REFLECTION",
                fontSize = 10.sp,
                fontWeight = FontWeight.Medium,
                letterSpacing = 2.sp,
                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.7f)
            )
            Spacer(Modifier.height(14.dp))
            OutlinedTextField(
                value = text,
                onValueChange = { text = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 120.dp)
                    .focusRequester(focusRequester),
                placeholder = {
                    Text(
                        "Write your reflection…",
                        color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.3f),
                        fontSize = 14.sp
                    )
                },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.5f),
                    unfocusedBorderColor = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.12f)
                ),
                maxLines = 8,
                textStyle = LocalTextStyle.current.copy(fontSize = 14.sp)
            )
            Spacer(Modifier.height(16.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (initialText.isNotBlank()) {
                    TextButton(onClick = { onSave("") }) {
                        Text("Delete", color = MaterialTheme.colorScheme.secondary, fontSize = 13.sp)
                    }
                    Spacer(Modifier.width(8.dp))
                }
                TextButton(onClick = onDismiss) {
                    Text(
                        "Cancel",
                        color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f),
                        fontSize = 13.sp
                    )
                }
                Spacer(Modifier.width(8.dp))
                TextButton(onClick = { onSave(text) }) {
                    Text(
                        "Save",
                        color = MaterialTheme.colorScheme.primary,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }
    }

    // Request focus + show keyboard immediately as sheet opens
    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
        ViewCompat.getWindowInsetsController(view)?.show(WindowInsetsCompat.Type.ime())
    }
}
