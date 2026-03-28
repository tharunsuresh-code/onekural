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

import android.util.Log;

import com.google.firebase.messaging.FirebaseMessaging;

public class Application extends android.app.Application {

    private static final String TAG = "Application";

    @Override
    public void onCreate() {
        super.onCreate();

        // Proactively fetch the FCM token on every launch.
        // onNewToken() in FcmService only fires when the token is first created or rotated,
        // so this handles re-installs where the token already exists but hasn't been registered yet.
        FirebaseMessaging.getInstance().getToken()
                .addOnCompleteListener(task -> {
                    if (task.isSuccessful() && task.getResult() != null) {
                        FcmTokenRegistrar.registerToken(getApplicationContext(), task.getResult());
                    } else {
                        Log.w(TAG, "Failed to fetch FCM token", task.getException());
                    }
                });
    }
}

