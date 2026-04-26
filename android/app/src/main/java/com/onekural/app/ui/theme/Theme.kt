package com.onekural.app.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColorScheme = lightColorScheme(
    primary            = EmeraldLight,
    onPrimary          = Color.White,
    background         = BackgroundLight,
    onBackground       = OnBackgroundLight,
    surface            = BackgroundLight,
    onSurface          = OnBackgroundLight,
    surfaceVariant     = ElevatedLight,
    onSurfaceVariant   = SubtleLight,
    surfaceContainerLow = ElevatedLight,
    secondary          = DeepRed,
    error              = ErrorColor,
    outline            = Color(0xFF1A1A1A).copy(alpha = 0.1f)
)

private val DarkColorScheme = darkColorScheme(
    primary            = EmeraldDark,
    onPrimary          = BackgroundDark,
    background         = BackgroundDark,
    onBackground       = OnBackgroundDark,
    surface            = BackgroundDark,
    onSurface          = OnBackgroundDark,
    surfaceVariant     = ElevatedDark,
    onSurfaceVariant   = SubtleDark,
    surfaceContainerLow = ElevatedDark,
    secondary          = DeepRed,
    error              = ErrorColor,
    outline            = OnBackgroundDark.copy(alpha = 0.1f)
)

@Composable
fun OneKuralTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            WindowCompat.setDecorFitsSystemWindows(window, false)
            val controller = WindowCompat.getInsetsController(window, view)
            controller.isAppearanceLightStatusBars    = !darkTheme
            controller.isAppearanceLightNavigationBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        shapes = Shapes(
            small  = androidx.compose.foundation.shape.RoundedCornerShape(8),
            medium = androidx.compose.foundation.shape.RoundedCornerShape(12),
            large  = androidx.compose.foundation.shape.RoundedCornerShape(16)
        ),
        typography = Typography,
        content = content
    )
}
