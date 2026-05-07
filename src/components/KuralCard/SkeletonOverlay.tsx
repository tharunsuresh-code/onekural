"use client";

interface SkeletonOverlayProps {
  visible: boolean;
}

export default function SkeletonOverlay({ visible }: SkeletonOverlayProps) {
  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transitionProperty: "opacity",
        transitionDuration: "0.25s",
        transitionTimingFunction: "ease",
        transitionDelay: visible ? "0.5s" : "0s",
        pointerEvents: "none",
      }}
      className="absolute inset-0 z-10 flex flex-col bg-[var(--bg-base)] overflow-hidden"
      aria-hidden
    >
      <div className="my-auto space-y-8">
        {/* Top divider */}
        <div className="skeleton-shimmer h-px w-12 mx-auto" />

        {/* Kural text lines */}
        <div className="flex flex-col items-center gap-3 px-2">
          <div className="skeleton-shimmer h-7 w-4/5 rounded" />
          <div className="skeleton-shimmer h-7 w-3/4 rounded" />
          <div className="skeleton-shimmer h-7 w-2/3 rounded" />
        </div>

        {/* Bottom divider */}
        <div className="skeleton-shimmer h-px w-12 mx-auto" />

        {/* Insight box */}
        <div className="rounded-lg px-6 py-5 border border-emerald/10 dark:border-emerald/20 space-y-3">
          <div className="skeleton-shimmer h-3 w-14 mx-auto rounded" />
          <div className="skeleton-shimmer h-4 w-full rounded" />
          <div className="skeleton-shimmer h-4 w-5/6 mx-auto rounded" />
          <div className="skeleton-shimmer h-4 w-4/6 mx-auto rounded" />
        </div>
      </div>
    </div>
  );
}
