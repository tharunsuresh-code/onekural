package com.onekural.app.ui.screen

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.onekural.app.ui.viewmodel.AuthViewModel
import com.onekural.app.util.AppPrefs
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(vm: AuthViewModel = viewModel()) {
    val context = LocalContext.current
    val state by vm.state.collectAsState()
    val pushEnabled by AppPrefs.pushEnabledFlow(context).collectAsState(initial = true)
    val scope = rememberCoroutineScope()

    var showSignInSheet by remember { mutableStateOf(false) }
    val signInSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    val borderColor = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.10f)
    val subtleText = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.45f)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .statusBarsPadding()
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(Modifier.height(40.dp))

        if (state.loading) {
            CircularProgressIndicator(color = MaterialTheme.colorScheme.primary, modifier = Modifier.size(28.dp), strokeWidth = 2.dp)
        } else if (state.user != null) {
            // ── Signed-in state ──
            val user = state.user!!
            val avatarUrl = user.userMetadata?.get("avatar_url")?.toString()?.trim('"')
            val name = user.userMetadata?.get("full_name")?.toString()?.trim('"')
                ?: user.userMetadata?.get("name")?.toString()?.trim('"')
                ?: "User"
            val email = user.email ?: ""

            if (avatarUrl != null) {
                AsyncImage(
                    model = avatarUrl,
                    contentDescription = "Avatar",
                    modifier = Modifier.size(80.dp).clip(CircleShape)
                )
            } else {
                Box(
                    modifier = Modifier
                        .size(80.dp)
                        .background(MaterialTheme.colorScheme.onBackground.copy(alpha = 0.08f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.Person, contentDescription = null, modifier = Modifier.size(40.dp), tint = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.35f))
                }
            }

            Spacer(Modifier.height(14.dp))
            Text(name, fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onBackground)
            if (email.isNotBlank()) {
                Spacer(Modifier.height(4.dp))
                Text(email, fontSize = 13.sp, color = subtleText)
            }
            Spacer(Modifier.height(20.dp))
            OutlinedButton(
                onClick = { vm.signOut() },
                shape = RoundedCornerShape(24.dp),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.onBackground)
            ) {
                Text("Sign out", fontSize = 14.sp)
            }
        } else {
            // ── Guest state ──
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .background(MaterialTheme.colorScheme.onBackground.copy(alpha = 0.08f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.Person, contentDescription = null, modifier = Modifier.size(40.dp), tint = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.35f))
            }

            Spacer(Modifier.height(14.dp))
            Text("Guest", fontSize = 20.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onBackground)
            Spacer(Modifier.height(6.dp))
            Text(
                text = "Sign in to save your favourites and journal",
                fontSize = 13.sp,
                color = subtleText,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 40.dp)
            )
            Spacer(Modifier.height(20.dp))
            Button(
                onClick = { showSignInSheet = true },
                shape = RoundedCornerShape(24.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                modifier = Modifier.padding(horizontal = 48.dp).fillMaxWidth()
            ) {
                Text("Sign in", fontSize = 15.sp, fontWeight = FontWeight.Medium)
            }
        }

        state.error?.let { err ->
            Spacer(Modifier.height(8.dp))
            Text(err, color = MaterialTheme.colorScheme.error, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 24.dp), textAlign = TextAlign.Center)
        }

        Spacer(Modifier.height(32.dp))

        // ── Notification section ──
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .border(0.5.dp, borderColor, RoundedCornerShape(12.dp))
        ) {
            SectionRow(
                title = "Daily Reminder",
                subtitle = "Morning kural notification",
                trailing = {
                    Switch(
                        checked = pushEnabled,
                        onCheckedChange = { scope.launch { AppPrefs.setPushEnabled(context, it) } },
                        colors = SwitchDefaults.colors(checkedThumbColor = MaterialTheme.colorScheme.onPrimary, checkedTrackColor = MaterialTheme.colorScheme.primary)
                    )
                }
            )
        }

        Spacer(Modifier.height(12.dp))

        // ── Links section ──
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .border(0.5.dp, borderColor, RoundedCornerShape(12.dp))
        ) {
            SectionRow(
                title = "Give Feedback",
                trailing = {
                    Icon(Icons.Default.ChevronRight, contentDescription = null, tint = subtleText, modifier = Modifier.size(20.dp))
                },
                onClick = {
                    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://onekural.com/profile/feedback")))
                }
            )
            HorizontalDivider(thickness = 0.5.dp, color = borderColor, modifier = Modifier.padding(horizontal = 16.dp))
            SectionRow(
                title = "About OneKural",
                trailing = {
                    Icon(Icons.Default.ChevronRight, contentDescription = null, tint = subtleText, modifier = Modifier.size(20.dp))
                },
                onClick = {
                    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://onekural.com/about")))
                }
            )
        }

        Spacer(Modifier.height(32.dp))

        // ── Footer: Privacy · Terms ──
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = "Privacy Policy",
                fontSize = 12.sp,
                color = subtleText,
                modifier = Modifier.clickable(interactionSource = remember { MutableInteractionSource() }, indication = null) {
                    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://onekural.com/privacy")))
                }
            )
            Text("·", fontSize = 12.sp, color = subtleText)
            Text(
                text = "Terms of Service",
                fontSize = 12.sp,
                color = subtleText,
                modifier = Modifier.clickable(interactionSource = remember { MutableInteractionSource() }, indication = null) {
                    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://onekural.com/terms")))
                }
            )
        }

        Spacer(Modifier.height(48.dp))
    }

    // ── Sign-in bottom sheet ──
    if (showSignInSheet) {
        ModalBottomSheet(
            onDismissRequest = {
                showSignInSheet = false
                vm.resetOtp()
            },
            sheetState = signInSheetState,
            containerColor = MaterialTheme.colorScheme.background,
            dragHandle = {
                Box(
                    modifier = Modifier
                        .padding(vertical = 10.dp)
                        .width(32.dp)
                        .height(3.dp)
                        .background(MaterialTheme.colorScheme.onBackground.copy(alpha = 0.15f), RoundedCornerShape(50))
                )
            }
        ) {
            if (state.otpSent) {
                MagicLinkSentContent(
                    onBack = {
                        vm.resetOtp()
                        showSignInSheet = false
                    }
                )
            } else {
                SignInSheetContent(
                    error = state.error,
                    loading = state.loading,
                    onGoogleSignIn = {
                        vm.signInWithGoogle(context)
                        showSignInSheet = false
                    },
                    onSendMagicLink = { email -> vm.sendOtp(email) }
                )
            }
        }
    }
}

@Composable
private fun SectionRow(
    title: String,
    subtitle: String? = null,
    trailing: @Composable () -> Unit,
    onClick: (() -> Unit)? = null
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable(interactionSource = remember { MutableInteractionSource() }, indication = null, onClick = onClick) else Modifier)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(Modifier.weight(1f)) {
            Text(title, fontSize = 14.sp, color = MaterialTheme.colorScheme.onBackground, fontWeight = FontWeight.Normal)
            if (subtitle != null) {
                Spacer(Modifier.height(2.dp))
                Text(subtitle, fontSize = 12.sp, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.45f))
            }
        }
        trailing()
    }
}

@Composable
private fun SignInSheetContent(
    error: String?,
    loading: Boolean,
    onGoogleSignIn: () -> Unit,
    onSendMagicLink: (String) -> Unit
) {
    var email by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp)
            .padding(bottom = 40.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "SIGN IN",
            fontSize = 10.sp,
            fontWeight = FontWeight.Medium,
            letterSpacing = 2.sp,
            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.7f)
        )
        Spacer(Modifier.height(20.dp))

        // Google button
        Button(
            onClick = onGoogleSignIn,
            modifier = Modifier.fillMaxWidth().height(48.dp),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
            enabled = !loading
        ) {
            Text("Continue with Google", fontSize = 14.sp, fontWeight = FontWeight.Medium)
        }

        Spacer(Modifier.height(16.dp))

        Row(verticalAlignment = Alignment.CenterVertically) {
            HorizontalDivider(Modifier.weight(1f), thickness = 0.5.dp, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.12f))
            Text("  or  ", fontSize = 12.sp, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.35f))
            HorizontalDivider(Modifier.weight(1f), thickness = 0.5.dp, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.12f))
        }

        Spacer(Modifier.height(16.dp))

        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            placeholder = { Text("Email address", color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.3f), fontSize = 14.sp) },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.5f),
                unfocusedBorderColor = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.12f)
            ),
            textStyle = LocalTextStyle.current.copy(fontSize = 14.sp)
        )
        Spacer(Modifier.height(10.dp))
        TextButton(
            onClick = { if (email.isNotBlank()) onSendMagicLink(email.trim()) },
            modifier = Modifier.fillMaxWidth(),
            enabled = email.isNotBlank() && !loading
        ) {
            Text(
                text = if (loading) "Sending…" else "Send sign-in link",
                color = MaterialTheme.colorScheme.primary,
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium
            )
        }

        error?.let {
            Spacer(Modifier.height(8.dp))
            Text(it, color = MaterialTheme.colorScheme.error, fontSize = 12.sp, textAlign = TextAlign.Center)
        }
    }
}

@Composable
private fun MagicLinkSentContent(onBack: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp)
            .padding(bottom = 40.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("✉", fontSize = 36.sp)
        Spacer(Modifier.height(16.dp))
        Text(
            text = "Check your email",
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onBackground
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = "We sent a sign-in link to your email. Tap it to sign in — it will open the app automatically.",
            fontSize = 13.sp,
            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.55f),
            textAlign = TextAlign.Center
        )
        Spacer(Modifier.height(24.dp))
        TextButton(onClick = onBack) {
            Text("Back", color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f), fontSize = 13.sp)
        }
    }
}
