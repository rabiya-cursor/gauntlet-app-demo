import { describe, expect, it } from "vitest";
import type { KeyValueStore } from "./storage";
import { THEME_STORAGE_KEY, loadTheme, resolveTheme, saveTheme, toggleTheme } from "./theme";

class MemoryStore implements KeyValueStore {
  private data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.has(key) ? this.data.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

describe("theme preference", () => {
  it("follows prefers-color-scheme when nothing is saved", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme(null, false)).toBe("light");
    expect(resolveTheme("  ", true)).toBe("dark");
    expect(resolveTheme("blue", false)).toBe("light");
  });

  it("remembers a saved choice over the system preference", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");

    const store = new MemoryStore();
    expect(loadTheme(store, true)).toBe("dark");
    saveTheme(store, "light");
    expect(store.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(loadTheme(store, true)).toBe("light");
    expect(toggleTheme("light")).toBe("dark");
    expect(toggleTheme("dark")).toBe("light");
  });
});
