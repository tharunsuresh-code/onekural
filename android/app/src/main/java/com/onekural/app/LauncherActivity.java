/*
 * Copyright 2020 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.onekural.app;

import android.Manifest;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;



public class LauncherActivity
        extends com.google.androidbrowserhelper.trusted.LauncherActivity {

    // Key used by FCM data payload (background notification click)
    private static final String FCM_DATA_URL_KEY = "url";
    private static final String FCM_DATA_DATE_KEY = "date";

    private static String getTodayLocal() {
        return new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
                .format(new java.util.Date());
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Setting an orientation crashes the app due to the transparent background on Android 8.0
        // Oreo and below. We only set the orientation on Oreo and above. This only affects the
        // splash screen and Chrome will still respect the orientation.
        // See https://github.com/GoogleChromeLabs/bubblewrap/issues/496 for details.
        if (Build.VERSION.SDK_INT > Build.VERSION_CODES.O) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_USER_PORTRAIT);
        } else {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        }

        // Android 13+ (API 33) requires explicit runtime permission for notifications.
        // Delayed 2s so the TWA has time to load before the dialog appears.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() ->
                    ActivityCompat.requestPermissions(
                            this,
                            new String[]{Manifest.permission.POST_NOTIFICATIONS},
                            /* requestCode= */ 100
                    ), 2000);
            }
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // Update the stored intent so getLaunchingUrl() reads the new notification data
        // when the app is already running and a notification is tapped.
        setIntent(intent);
    }

    @Override
    protected Uri getLaunchingUrl() {
        Uri uri = super.getLaunchingUrl();

        // Check if launched from a notification with a specific kural deep link.
        // Works for both:
        //   - Foreground: FcmService passes EXTRA_KURAL_URL ("kural_url")
        //   - Background: FCM data payload key "url" (passed as Intent extras by system)
        String kuralUrl = getIntent().getStringExtra(FcmService.EXTRA_KURAL_URL);
        if (kuralUrl == null || kuralUrl.isEmpty()) {
            kuralUrl = getIntent().getStringExtra(FCM_DATA_URL_KEY);
        }

        if (kuralUrl != null && !kuralUrl.isEmpty()) {
            // Determine if this notification is from today or stale.
            // Fresh notification → open homepage (shows today's kural).
            // Stale notification (opened from tray on a later day) → open specific kural.
            String kuralDate = getIntent().getStringExtra(FcmService.EXTRA_KURAL_DATE);
            if (kuralDate == null || kuralDate.isEmpty()) {
                kuralDate = getIntent().getStringExtra(FCM_DATA_DATE_KEY);
            }
            if (kuralDate != null && kuralDate.equals(getTodayLocal())) {
                // Today's notification — homepage
                uri = Uri.parse("https://onekural.com/");
            } else {
                // Stale notification — specific kural page
                uri = Uri.parse("https://onekural.com" + kuralUrl);
            }
        }

        // Append FCM device ID as a query param so the web app can link it to the
        // authenticated user on load (see /api/push/link-fcm-user).
        String deviceId = FcmTokenRegistrar.getOrCreateDeviceId(this);
        // Pass notification permission state to the web layer — but only when we
        // know it for certain. Omitting the param leaves the web in a neutral state
        // (no "Disabled" badge before the user has even been asked).
        Uri.Builder builder = uri.buildUpon()
                .appendQueryParameter("fcmDeviceId", deviceId);
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
                ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                        == PackageManager.PERMISSION_GRANTED) {
            builder.appendQueryParameter("notifGranted", "true");
        } else if (ActivityCompat.shouldShowRequestPermissionRationale(
                this, Manifest.permission.POST_NOTIFICATIONS)) {
            // shouldShowRequestPermissionRationale returns true only after at least
            // one explicit denial — safe to show "Disabled" in the web layer.
            builder.appendQueryParameter("notifGranted", "false");
        }
        // else: never asked yet — omit param, web stays neutral (null state)
        return builder.build();
    }
}
