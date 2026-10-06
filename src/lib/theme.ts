import type { KeyValueStore } from "./storage";

export const THEME_STORAGE_KEY = "ship-log.theme";

export type Theme = "light" | "dark";

export function isTheme(value: string | null | undefined): value is Theme {
  return value === "light" || value === "dark";
}

/** A saved choice wins. With nothing saved, follow prefers-color-scheme. */
export function resolveTheme(stored: string | null, prefersDark: boolean): Theme {
  if (isTheme(stored)) return stored;
  return prefersDark ? "dark" : "light";
}

export function toggleTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}

export function loadTheme(store: KeyValueStore, prefersDark: boolean): Theme {
  return resolveTheme(store.getItem(THEME_STORAGE_KEY), prefersDark);
}

export function saveTheme(store: KeyValueStore, theme: Theme): void {
  store.setItem(THEME_STORAGE_KEY, theme);
}
