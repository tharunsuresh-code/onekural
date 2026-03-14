let depth = 0;
export const openSheet = () => depth++;
export const closeSheet = () => depth--;
export const isSheetOpen = () => depth > 0;
