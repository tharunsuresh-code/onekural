import Link from "next/link";

export default function NotFound() {
  return (
    <main className="h-dvh overflow-y-auto flex flex-col items-center justify-center px-6 text-center">
      <p className="text-6xl font-light text-dark/30 dark:text-dark-fg/30 mb-4">404</p>
      <h1 className="text-lg font-semibold text-dark dark:text-dark-fg mb-2">
        Page not found
      </h1>
      <p className="text-sm text-dark/50 dark:text-dark-fg/60 mb-8 max-w-sm">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="bg-emerald text-white text-sm font-medium px-6 py-2.5 rounded-full hover:bg-emerald/90 transition-colors"
      >
        Go Home
      </Link>
    </main>
  );
}