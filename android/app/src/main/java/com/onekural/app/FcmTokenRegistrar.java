package com.onekural.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.TimeZone;
import java.util.UUID;

/**
 * Shared utility for registering an FCM token with the OneKural backend.
 * Used by both FcmService (on token refresh) and Application (on first launch).
 */
public class FcmTokenRegistrar {

    private static final String TAG = "FcmTokenRegistrar";
    private static final String PREFS_NAME = "onekural_prefs";
    private static final String KEY_DEVICE_ID = "device_id";
    private static final String SUBSCRIBE_URL = "https://onekural.com/api/push/fcm-subscribe";

    /** Returns a stable per-device UUID, creating one on first call. */
    public static String getOrCreateDeviceId(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String deviceId = prefs.getString(KEY_DEVICE_ID, null);
        if (deviceId == null) {
            deviceId = UUID.randomUUID().toString();
            prefs.edit().putString(KEY_DEVICE_ID, deviceId).apply();
        }
        return deviceId;
    }

    /**
     * POST the FCM token to the backend on a background thread.
     * Upserts by device_id so token rotation is handled automatically.
     */
    public static void registerToken(Context context, String token) {
        if (token == null || token.isEmpty()) return;

        final String deviceId = getOrCreateDeviceId(context);
        final String timezone = TimeZone.getDefault().getID();

        new Thread(() -> {
            try {
                JSONObject body = new JSONObject();
                body.put("fcmToken", token);
                body.put("deviceId", deviceId);
                body.put("timezone", timezone);

                byte[] payload = body.toString().getBytes(StandardCharsets.UTF_8);

                HttpURLConnection conn = (HttpURLConnection) new URL(SUBSCRIBE_URL).openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("Content-Length", String.valueOf(payload.length));
                conn.setDoOutput(true);
                conn.setConnectTimeout(10_000);
                conn.setReadTimeout(10_000);

                try (OutputStream os = conn.getOutputStream()) {
                    os.write(payload);
                }

                int code = conn.getResponseCode();
                if (code == 200) {
                    Log.d(TAG, "Token registration HTTP 200 OK");
                } else {
                    Log.w(TAG, "Token registration returned HTTP " + code);
                }
                conn.disconnect();
            } catch (Exception e) {
                Log.e(TAG, "Failed to register FCM token", e);
            }
        }).start();
    }
}
