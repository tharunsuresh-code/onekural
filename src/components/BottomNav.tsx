"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { emitNavStart } from "./NavigationProgress";

const tabs = [
  {
    label: "Home",
    href: "/",
    icon: (active: boolean) => (
      <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={active ? "text-emerald" : "text-dark/50 dark:text-dark-fg/60"}>
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: "Explore",
    href: "/explore",
    icon: (active: boolean) => (
      <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={active ? "text-emerald" : "text-dark/50 dark:text-dark-fg/60"}>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    label: "Journal",
    href: "/journal",
    icon: (active: boolean) => (
      <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={active ? "text-emerald" : "text-dark/50 dark:text-dark-fg/60"}>
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
        <line x1="8" y1="7" x2="16" y2="7" />
        <line x1="8" y1="11" x2="14" y2="11" />
      </svg>
    ),
  },
  {
    label: "Profile",
    href: "/profile",
    icon: (active: boolean) => (
      <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={active ? "text-emerald" : "text-dark/50 dark:text-dark-fg/60"}>
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-cream/95 dark:bg-dark-subtle/95 backdrop-blur-sm border-t border-dark/10 dark:border-dark-fg/10 pb-safe">
      <div className="max-w-content mx-auto flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);

          const handleClick = () => {
            if (tab.href === "/" && pathname === "/") {
              window.dispatchEvent(new CustomEvent("onekural:go-home"));
              return;
            }
            if (!isActive) emitNavStart();
          };

          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={handleClick}
              className="flex flex-col items-center gap-0.5 py-1 px-3 -mb-px"
            >
              {tab.icon(isActive)}
              <span
                className={`text-xs tracking-wide ${
                  isActive
                    ? "text-emerald font-semibold"
                    : "text-dark/60 dark:text-dark-fg/65"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
