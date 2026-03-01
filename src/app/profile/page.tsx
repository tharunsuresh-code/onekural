"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth";
import SignInModal from "@/components/SignInModal";
import { subscribeToPush, unsubscribeFromPush, isPushSubscribed } from "@/lib/push";

function DailyReminderToggle({ userId }: { userId: string }) {
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pushAvailable, setPushAvailable] = useState(false);

  useEffect(() => {
    const available =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window;
    setPushAvailable(available);

    if (available) {
      isPushSubscribed().then((s) => {
        setSubscribed(s);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  if (!pushAvailable) return null;

  async function toggle() {
    setLoading(true);
    if (subscribed) {
      const ok = await unsubscribeFromPush(userId);
      if (ok) setSubscribed(false);
    } else {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setLoading(false);
        return;
      }
      const ok = await subscribeToPush(userId);
      if (ok) setSubscribed(true);
    }
    setLoading(false);
  }

  return (
    <div className="flex items-center justify-between px-4 py-3.5 border border-dark/10 rounded-xl">
      <div>
        <p className="text-sm text-dark/80">Daily Reminder</p>
        <p className="text-xs text-dark/40 mt-0.5">Morning kural notification</p>
      </div>
      <button
        onClick={toggle}
        disabled={loading}
        aria-label={subscribed ? "Disable daily reminder" : "Enable daily reminder"}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
          subscribed ? "bg-saffron" : "bg-dark/20"
        } ${loading ? "opacity-50" : ""}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            subscribed ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

const settingsItems = [
  { label: "Language", description: "Tamil & English" },
  { label: "About OneKural", description: "Version 0.1.0" },
  { label: "Privacy Policy", description: "" },
];

export default function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const [showSignIn, setShowSignIn] = useState(false);

  if (loading) {
    return (
      <main className="max-w-content mx-auto px-6 pt-10 pb-24 flex items-center justify-center min-h-[60dvh]">
        <div className="w-6 h-6 border-2 border-saffron border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="max-w-content mx-auto px-6 pt-10 pb-24">
      {/* Avatar + user info / sign in */}
      <div className="flex flex-col items-center mb-10">
        {user ? (
          <>
            {/* Avatar */}
            {user.user_metadata?.avatar_url ? (
              <Image
                src={user.user_metadata.avatar_url}
                alt=""
                width={80}
                height={80}
                className="rounded-full mb-4 object-cover"
                referrerPolicy="no-referrer"
                unoptimized
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-saffron/20 flex items-center justify-center mb-4">
                <span className="text-2xl font-semibold text-saffron">
                  {(user.user_metadata?.full_name?.[0] ?? user.email?.[0] ?? "U").toUpperCase()}
                </span>
              </div>
            )}
            <h1 className="text-lg font-semibold text-dark mb-1">
              {user.user_metadata?.full_name ?? "User"}
            </h1>
            <p className="text-sm text-dark/50 mb-4">{user.email}</p>

            {/* Favourites link */}
            <Link
              href="/profile/favorites"
              className="text-sm text-saffron font-medium mb-4 hover:underline"
            >
              My Favourites
            </Link>

            <button
              onClick={signOut}
              className="text-sm text-dark/50 hover:text-deep-red transition-colors"
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <div className="w-20 h-20 rounded-full bg-dark/10 flex items-center justify-center mb-4">
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1A1A1A50"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-dark mb-1">Guest</h1>
            <p className="text-sm text-dark/50 mb-4">
              Sign in to save your favourites and journal
            </p>
            <button
              onClick={() => setShowSignIn(true)}
              className="bg-saffron text-white text-sm font-medium px-6 py-2.5 rounded-full hover:bg-saffron/90 transition-colors"
            >
              Sign in
            </button>
          </>
        )}
      </div>

      {/* Daily reminder toggle (logged-in + push capable only) */}
      {user && (
        <div className="mb-4">
          <DailyReminderToggle userId={user.id} />
        </div>
      )}

      {/* Settings list */}
      <div className="border border-dark/10 rounded-xl overflow-hidden divide-y divide-dark/10">
        {settingsItems.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between px-4 py-3.5"
          >
            <div>
              <p className="text-sm text-dark/80">{item.label}</p>
              {item.description && (
                <p className="text-xs text-dark/40 mt-0.5">
                  {item.description}
                </p>
              )}
            </div>
            <span className="text-dark/30 text-xs">›</span>
          </div>
        ))}
      </div>

      <SignInModal open={showSignIn} onClose={() => setShowSignIn(false)} />
    </main>
  );
}
