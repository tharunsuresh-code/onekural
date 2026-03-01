"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";

interface SignInModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SignInModal({ open, onClose }: SignInModalProps) {
  const { signInWithGoogle, signInWithOtp } = useAuth();
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSending(true);
    setError(null);
    const { error: err } = await signInWithOtp(email.trim());
    setSending(false);

    if (err) {
      setError(err);
    } else {
      setEmailSent(true);
    }
  };

  const handleClose = () => {
    setEmail("");
    setEmailSent(false);
    setError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-dark/40 z-[60]"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[60] bg-cream rounded-t-2xl px-6 pt-8 pb-10 max-w-content mx-auto"
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-dark/15 rounded-full mx-auto mb-6" />

            <h2 className="text-lg font-semibold text-dark text-center mb-1">
              Sign in to OneKural
            </h2>
            <p className="text-sm text-dark/50 text-center mb-8">
              Save favourites, journal reflections, and sync across devices
            </p>

            {/* Google button */}
            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 bg-white border border-dark/15 rounded-xl px-4 py-3 text-sm font-medium text-dark hover:bg-dark/5 transition-colors mb-4"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-dark/10" />
              <span className="text-xs text-dark/40">or</span>
              <div className="flex-1 h-px bg-dark/10" />
            </div>

            {/* Email magic link */}
            {emailSent ? (
              <div className="text-center py-4">
                <p className="text-sm text-dark/70 mb-1">
                  Check your email for a sign-in link
                </p>
                <p className="text-xs text-dark/40">{email}</p>
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit}>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-dark/15 rounded-xl px-4 py-3 text-sm text-dark placeholder:text-dark/30 focus:outline-none focus:border-saffron transition-colors mb-3"
                  required
                />
                {error && (
                  <p className="text-xs text-red-500 mb-3">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full bg-saffron text-white text-sm font-medium rounded-xl px-4 py-3 hover:bg-saffron/90 transition-colors disabled:opacity-50"
                >
                  {sending ? "Sending..." : "Send magic link"}
                </button>
              </form>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
