let depth = 0;
const callbacks: Array<() => void> = [];

export const openSheet = (onDismiss?: () => void) => {
  depth++;
  if (onDismiss) callbacks.push(onDismiss);
};
export const closeSheet = () => {
  depth = Math.max(0, depth - 1);
  callbacks.pop();
};
export const isSheetOpen = () => depth > 0;
export const dismissTopSheet = () => callbacks[callbacks.length - 1]?.();
