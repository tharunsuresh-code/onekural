"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function DeleteAccountPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const { error: dbError } = await supabase.from("feedback").insert({
        name: "Account Deletion Request",
        message: `Please delete my account and all associated data. Email: ${email.trim()}`,
      });

      if (dbError) throw dbError;
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again or email us directly.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-base)] flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="text-sm text-[var(--text-subtle)] hover:text-[var(--text-base)] mb-8 inline-block"
        >
          ← Back to OneKural
        </Link>

        <h1 className="text-2xl font-bold mb-2">Delete My Account</h1>
        <p className="text-[var(--text-subtle)] text-sm mb-8">
          Submit your request below and we will delete your account and all
          associated data (journal entries, saved kurals, push subscriptions)
          within 30 days.
        </p>

        {submitted ? (
          <div className="rounded-xl border border-emerald-700/40 bg-emerald-900/20 px-6 py-5 text-sm text-emerald-400">
            Request received. Your account and data will be deleted within 30
            days. You will not receive a confirmation email.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Email address associated with your account
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="rounded-lg border border-[var(--bg-elevated)] bg-[var(--bg-elevated)] px-4 py-3 text-sm outline-none focus:border-emerald-600 transition-colors"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting || !email.trim()}
              className="rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-3 transition-colors"
            >
              {submitting ? "Submitting…" : "Request Account Deletion"}
            </button>
          </form>
        )}

        <p className="text-xs text-[var(--text-subtle)] mt-8">
          Data deleted includes: journal entries, saved kurals, push
          notification subscriptions, and your account credentials. This action
          is irreversible.
        </p>
      </div>
    </main>
  );
}
