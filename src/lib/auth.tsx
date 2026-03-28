"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "./supabase";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithOtp: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

// Read the cached Supabase session from localStorage synchronously so the
// initial render already knows the auth state — prevents a spinner flash.
function readCachedSession(): { user: User | null; session: Session | null } {
  if (typeof window === "undefined") return { user: null, session: null };
  try {
    const projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
    const raw = localStorage.getItem(`sb-${projectRef}-auth-token`);
    if (!raw) return { user: null, session: null };
    const parsed = JSON.parse(raw) as Session & { expires_at?: number };
    // Treat an expired session as absent — getSession() will refresh it async
    if (parsed.expires_at && Date.now() / 1000 > parsed.expires_at) {
      return { user: null, session: null };
    }
    return { user: parsed.user ?? null, session: parsed };
  } catch {
    return { user: null, session: null };
  }
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithOtp: async () => ({ error: null }),
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [{ user: initUser, session: initSession }] = useState(readCachedSession);
  const [user, setUser] = useState<User | null>(initUser);
  const [session, setSession] = useState<Session | null>(initSession);
  // If we already have a cached session we can skip the loading spinner;
  // getSession() below will still run async to refresh the token if needed.
  const [loading, setLoading] = useState(initUser === null);

  // Read ?fcmDeviceId=<uuid> injected by LauncherActivity.getLaunchingUrl() and
  // store it so we can link it to the user once the auth session is available.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fcmDeviceId = params.get("fcmDeviceId");
    if (fcmDeviceId) {
      localStorage.setItem("onekural-fcm-device-id", fcmDeviceId);
      // Persist TWA flag — presence of fcmDeviceId means we launched from the Android app.
      // Used by DailyReminderToggle to hide Web Push (FCM handles notifications instead).
      localStorage.setItem("onekural-is-twa", "true");
    }
    // Persist OS notification permission state passed by LauncherActivity.
    // Used by DailyReminderToggle to show accurate enabled/disabled status in TWA.
    // If the param is absent (e.g. permission not yet asked), clear any stale value
    // so the web falls back to the neutral null state rather than showing "Disabled".
    const notifGranted = params.get("notifGranted");
    if (notifGranted !== null) {
      localStorage.setItem("onekural-notif-granted", notifGranted);
    } else {
      localStorage.removeItem("onekural-notif-granted");
    }
  }, []);

  // When a session becomes available, link the FCM device to the user once.
  useEffect(() => {
    if (!session) return;
    const fcmDeviceId = localStorage.getItem("onekural-fcm-device-id");
    if (!fcmDeviceId) return;
    fetch("/api/push/link-fcm-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ fcmDeviceId }),
    }).then((res) => {
      if (res.ok) localStorage.removeItem("onekural-fcm-device-id");
    });
  }, [session]);

  useEffect(() => {
    // Validate / refresh the token — updates state if the cached value was stale
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes (including TOKEN_REFRESHED)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // PWA: when the app returns to foreground after being backgrounded,
    // the auto-refresh timer is gone. Re-validate the session so users
    // are not silently signed out after the access token expires.
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        supabase.auth.getSession();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
  }, []);

  const signInWithOtp = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signInWithGoogle, signInWithOtp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
