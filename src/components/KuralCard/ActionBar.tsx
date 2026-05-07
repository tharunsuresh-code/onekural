"use client";

interface ActionBarProps {
  isPlaying: boolean;
  audioUnavailable: boolean;
  faved: boolean;
  isSharing: boolean;
  onPlayToggle: () => void;
  onToggleFavorite: () => void;
  onJournalOpen: () => void;
  onShare: () => void;
}

export default function ActionBar({
  isPlaying,
  audioUnavailable,
  faved,
  isSharing,
  onPlayToggle,
  onToggleFavorite,
  onJournalOpen,
  onShare,
}: ActionBarProps) {
  return (
    <div className="flex-shrink-0 flex items-center justify-between pt-4 border-t border-dark/10 dark:border-dark-fg/10">
      <div className="relative">
        <button
          onClick={onPlayToggle}
          className={`text-sm flex items-center gap-1.5 transition-colors ${isPlaying ? "text-emerald" : "text-dark/50 dark:text-dark-fg/50"}`}
        >
          <span>{isPlaying ? "■" : "♪"}</span> {isPlaying ? "Stop" : "Listen"}
        </button>
        {audioUnavailable && (
          <p className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-44 text-center text-[11px] leading-tight bg-dark/90 dark:bg-dark-fg/90 text-dark-fg dark:text-dark rounded-lg px-3 py-2 pointer-events-none animate-fade-in">
            Tamil voice not available on this device
          </p>
        )}
      </div>
      <button
        onClick={onToggleFavorite}
        className={`text-sm flex items-center gap-1.5 transition-colors ${faved ? "text-deep-red dark:text-deep-red/80" : "text-dark/50 dark:text-dark-fg/50"}`}
      >
        <span>{faved ? "♥" : "♡"}</span> Favourite
      </button>
      <button
        onClick={onJournalOpen}
        className="text-sm text-dark/50 dark:text-dark-fg/50 flex items-center gap-1.5"
      >
        <span>✎</span> Journal
      </button>
      <button
        onClick={onShare}
        className="text-sm text-dark/50 dark:text-dark-fg/50 flex items-center gap-1.5"
      >
        <span>↑</span> {isSharing ? "Sharing…" : "Share"}
      </button>
    </div>
  );
}
