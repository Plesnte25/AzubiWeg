import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * Light/dark theme switching — reintroduces the mechanism Nocturne removed
 * on purpose when it went dark-only (see index.css's [data-theme="light"]
 * block for the actual color values). Modeled on navStack.tsx's
 * context/provider shape.
 *
 * Resolution order on first load: localStorage["azubiweg-theme"] -> OS
 * prefers-color-scheme -> "dark" (keeps today's look for anyone with no
 * stored preference and no OS signal). client/index.html has a matching
 * inline bootstrap script that reads the same key before React mounts, so
 * there's no flash of the wrong theme. The key itself predates this file —
 * index.html already had a (dead, pre-Nocturne) "azubiweg-theme"/.dark-class
 * mechanism; reused the same key rather than adding a second one.
 */

export type Theme = "light" | "dark";

const STORAGE_KEY = "azubiweg-theme";

function systemPrefersLight(): boolean {
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ?? false;
}

export function resolveInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return systemPrefersLight() ? "light" : "dark";
}

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Always writes the real preference to <html> — global chrome (Rail,
 * BottomTabBar, CommandPalette, ...) lives outside <main> and stays fully
 * theme-reactive everywhere. Page content forced-dark for not-yet-migrated
 * routes is a SEPARATE, narrower override scoped to <main> itself (see
 * Layout.tsx's own data-theme attribute) — CSS custom properties cascade
 * from the nearest ancestor, so that inner attribute wins for page content
 * without this one needing any route awareness at all. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => resolveInitialTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => setThemeState(next), []);
  const toggleTheme = useCallback(() => setThemeState((t) => (t === "dark" ? "light" : "dark")), []);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
