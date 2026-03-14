"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth";
import SignInModal from "@/components/SignInModal";
import { subscribeToPush, unsubscribeFromPush, isPushSubscribed } from "@/lib/push";

function DailyReminderToggle({ userId }: { userId?: string }) {
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
      const ok = await unsubscribeFromPush();
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
    <div className="flex items-center justify-between px-4 py-3.5 border border-dark/10 dark:border-dark-fg/20 rounded-xl">
      <div>
        <p className="text-sm text-dark/80 dark:text-dark-fg/85">Daily Reminder</p>
        <p className="text-xs text-dark/40 dark:text-dark-fg/50 mt-0.5">Morning kural notification</p>
      </div>
      <button
        onClick={toggle}
        disabled={loading}
        aria-label={subscribed ? "Disable daily reminder" : "Enable daily reminder"}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
          subscribed ? "bg-emerald" : "bg-dark/20 dark:bg-dark-fg/25"
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
  { label: "Give Feedback", href: "/profile/feedback" },
  { label: "About OneKural", href: "/about" },
];

export default function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const [showSignIn, setShowSignIn] = useState(false);

  if (loading) {
    return (
      <main className="max-w-content mx-auto px-6 pt-10 pb-24 flex items-center justify-center min-h-[60dvh]">
        <div className="w-6 h-6 border-2 border-emerald border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="max-w-content mx-auto px-6 pt-10 pb-24">
      {/* Avatar + user info / sign in */}
      <div className="flex flex-col items-center mb-10">
        {user ? (
          <div className="w-full relative">
            {/* Logout icon — top right */}
            <button
              onClick={signOut}
              aria-label="Sign out"
              className="absolute top-0 right-0 p-2 text-dark/50 dark:text-dark-fg/60 hover:text-deep-red dark:hover:text-deep-red/90 transition-colors"
              title="Sign out"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>

            {/* User info — centered */}
            <div className="flex flex-col items-center">
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
                <div className="w-20 h-20 rounded-full bg-emerald/20 dark:bg-emerald/15 flex items-center justify-center mb-4">
                  <span className="text-2xl font-semibold text-emerald">
                    {(user.user_metadata?.full_name?.[0] ?? user.email?.[0] ?? "U").toUpperCase()}
                  </span>
                </div>
              )}
              <h1 className="text-lg font-semibold text-dark dark:text-dark-fg mb-1">
                {user.user_metadata?.full_name ?? "User"}
              </h1>
              <p className="text-sm text-dark/50 dark:text-dark-fg/60 mb-4">{user.email}</p>

              {/* Favourites link */}
              <Link
                href="/profile/favorites"
                className="text-sm text-emerald font-medium hover:underline"
              >
                My Favourites
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="w-20 h-20 rounded-full bg-dark/10 dark:bg-dark-fg/10 flex items-center justify-center mb-4">
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-dark/30 dark:text-dark-fg/40"
              >
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-dark dark:text-dark-fg mb-1">Guest</h1>
            <p className="text-sm text-dark/50 dark:text-dark-fg/60 mb-4">
              Sign in to save your favourites and journal
            </p>
            <button
              onClick={() => setShowSignIn(true)}
              className="bg-emerald text-white text-sm font-medium px-6 py-2.5 rounded-full hover:bg-emerald/90 transition-colors"
            >
              Sign in
            </button>
          </>
        )}
      </div>

      {/* Daily reminder toggle — shown whenever PushManager is available */}
      <div className="mb-4">
        <DailyReminderToggle userId={user?.id} />
      </div>

      {/* Settings list */}
      <div className="border border-dark/10 dark:border-dark-fg/20 rounded-xl overflow-hidden divide-y divide-dark/10 dark:divide-dark-fg/20">
        {settingsItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center justify-between px-4 py-3.5 hover:bg-dark/5 dark:hover:bg-dark-fg/5 transition-colors"
          >
            <p className="text-sm text-dark/80 dark:text-dark-fg/85">{item.label}</p>
            <span className="text-dark/30 dark:text-dark-fg/40 text-xs">›</span>
          </Link>
        ))}
      </div>

      {/* Legal links */}
      <div className="flex items-center justify-center gap-3 mt-6 text-xs text-dark/35 dark:text-dark-fg/40">
        <Link href="/privacy" className="hover:text-emerald transition-colors">Privacy Policy</Link>
        <span>·</span>
        <Link href="/terms" className="hover:text-emerald transition-colors">Terms of Service</Link>
      </div>

      <SignInModal open={showSignIn} onClose={() => setShowSignIn(false)} />
    </main>
  );
}
