"use client";

export default function GlobalError({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <html lang="ta">
      <body className="font-sans antialiased bg-cream dark:bg-dark-bg text-dark dark:text-dark-fg">
        <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
          <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
          <p className="text-sm text-muted mb-6 max-w-sm">
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-lg bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800 transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
