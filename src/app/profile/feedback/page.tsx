"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function FeedbackPage() {
  const { user, session } = useAuth();

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] ?? "";

  const [name, setName] = useState(firstName);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;
    setSubmitting(true);
    setError("");

    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        name: name.trim(),
        message: message.trim(),
      }),
    });

    if (!res.ok) {
      setError("Something went wrong. Please try again.");
    } else {
      setSubmitted(true);
    }
    setSubmitting(false);
  }

  return (
    <main className="max-w-content mx-auto px-6 pt-10 pb-24">
      <Link
        href="/profile"
        className="inline-flex items-center text-sm text-dark/50 dark:text-dark-fg/60 mb-6 hover:text-emerald transition-colors"
      >
        ← Profile
      </Link>

      <h1 className="text-xl font-semibold text-dark dark:text-dark-fg mb-2">Give Feedback</h1>
      <p className="text-sm text-dark/50 dark:text-dark-fg/60 mb-8">
        We&apos;d love to hear what you think about OneKural.
      </p>

      {submitted ? (
        <div className="text-center py-16">
          <p className="text-2xl mb-3">🙏</p>
          <p className="text-dark dark:text-dark-fg font-medium mb-1">Thank you, {name}!</p>
          <p className="text-sm text-dark/50 dark:text-dark-fg/60">Your feedback has been received.</p>
          <Link
            href="/profile"
            className="inline-block mt-6 text-sm text-emerald hover:underline"
          >
            Back to Profile
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs uppercase tracking-widest text-dark/40 dark:text-dark-fg/50 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              required
              className="w-full bg-white dark:bg-dark-subtle border border-dark/10 dark:border-dark-fg/20 rounded-xl px-4 py-3 text-sm text-dark dark:text-dark-fg placeholder:text-dark/30 dark:placeholder:text-dark-fg/40 focus:outline-none focus:border-emerald/50 focus:ring-1 focus:ring-emerald/30"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-dark/40 dark:text-dark-fg/50 mb-2">
              Feedback
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Share your thoughts, suggestions, or report an issue…"
              required
              rows={6}
              className="w-full bg-white dark:bg-dark-subtle border border-dark/10 dark:border-dark-fg/20 rounded-xl px-4 py-3 text-sm text-dark dark:text-dark-fg placeholder:text-dark/30 dark:placeholder:text-dark-fg/40 focus:outline-none focus:border-emerald/50 focus:ring-1 focus:ring-emerald/30 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-emerald">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !name.trim() || !message.trim()}
            className="w-full bg-emerald text-white text-sm font-medium py-3 rounded-xl hover:bg-emerald/90 transition-colors disabled:opacity-40"
          >
            {submitting ? "Sending…" : "Send Feedback"}
          </button>
        </form>
      )}
    </main>
  );
}
