import Link from "next/link";

export const metadata = {
  title: "About OneKural",
  description: "OneKural delivers one verse from the Thirukkural each day with English meaning, Tamil commentary, and a personal journal.",
};

export default function AboutPage() {
  return (
    <main className="max-w-content mx-auto px-6 pt-10 pb-24">
      <Link
        href="/profile"
        className="inline-flex items-center text-sm text-dark/50 dark:text-dark-fg/60 mb-6 hover:text-emerald transition-colors"
      >
        ← Profile
      </Link>

      <h1 className="text-xl font-semibold text-dark dark:text-dark-fg mb-1">OneKural</h1>
      <p className="text-xs text-dark/40 dark:text-dark-fg/40 mb-8">Version 1.0.0</p>

      <div className="space-y-6 text-sm text-dark/75 dark:text-dark-fg/75 leading-relaxed">
        <p>
          OneKural brings the ancient wisdom of the Thirukkural into your daily life —
          one verse at a time. Written by the Tamil poet-philosopher Thiruvalluvar
          over two thousand years ago, the Thirukkural&apos;s 1330 couplets cover every
          aspect of human life: virtue, wealth, and love.
        </p>
        <p>
          Each day you receive a different kural along with its meaning, scholar
          commentaries, and a deeper explanation. You can explore all 1330 kurals
          by book and chapter, save your favourites, write personal reflections in
          the journal, and share kurals with friends.
        </p>
        <p>
          OneKural is built with love for the Tamil diaspora and for anyone curious
          about one of the world&apos;s great literary and philosophical traditions.
        </p>
      </div>
    </main>
  );
}
