package com.onekural.app;

import android.os.Bundle;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.browser.trusted.TrustedWebActivityCallbackRemote;

public class DelegationService extends
        com.google.androidbrowserhelper.trusted.DelegationService {

    private static final String TAG = "OneKuralDelegation";

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "DelegationService.onCreate() — Chrome bound");
    }

    @Override
    public Bundle onExtraCommand(
            @NonNull String commandName,
            @NonNull Bundle args,
            @Nullable TrustedWebActivityCallbackRemote callback) {
        Log.d(TAG, "onExtraCommand: " + commandName + " | args=" + args);
        Bundle result = super.onExtraCommand(commandName, args, callback);
        Log.d(TAG, "onExtraCommand result: success=" + result.getBoolean("extraCommandSuccess") + " | " + result);
        return result;
    }
}
