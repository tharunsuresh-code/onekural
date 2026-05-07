"use client";

import ThemeSwitcher from "@/components/ThemeSwitcher";

interface HeaderProps {
  isHome: boolean;
  kuralId: number;
  localDailyKuralId: number;
  dateStr: string;
  onBack: () => void;
}

export default function Header({ isHome, kuralId, localDailyKuralId, dateStr, onBack }: HeaderProps) {
  return (
    <div className="relative flex justify-center mb-6">
      {isHome ? (
        <>
          <ThemeSwitcher />
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-wide">
              <span className="text-emerald">One</span>
              <span className="text-dark dark:text-dark-fg">Kural</span>
            </h1>
            <p
              className={`text-xs uppercase tracking-widest text-emerald/80 dark:text-emerald/90 font-medium mt-1 ${kuralId === localDailyKuralId ? "" : "invisible"}`}
            >
              Today&apos;s Kural
            </p>
            <p
              className={`text-xs text-dark/40 dark:text-dark-fg/50 mt-0.5 ${kuralId === localDailyKuralId && dateStr ? "" : "invisible"}`}
            >
              {dateStr || "\u00A0"}
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-wide">
              <span className="text-emerald">One</span>
              <span className="text-dark dark:text-dark-fg">Kural</span>
            </h1>
          </div>
          <button
            onClick={onBack}
            className="absolute left-0 top-0 text-sm text-dark/50 dark:text-dark-fg/50 hover:text-emerald transition-colors"
          >
            ← Back
          </button>
        </>
      )}
    </div>
  );
}
