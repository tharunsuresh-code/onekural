"use client";

interface ToastProps {
  message: string;
  show: boolean;
}

export default function Toast({ message, show }: ToastProps) {
  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] px-4 py-2 rounded-full bg-dark/90 dark:bg-dark-fg/90 text-dark-fg dark:text-dark text-sm font-medium pointer-events-none transition-all duration-300 ${
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      {message}
    </div>
  );
}
