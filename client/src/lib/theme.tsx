import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * Bento light/dark theme (handoff README §1.5): the default follows the OS `prefers-color-scheme` and updates live
 * when it changes; the toggle sets an explicit override that persists in localStorage.
 *
 * `preference` is what the user chose ("system" unless they've toggled); `theme` is what's actually showing. Only
 * the resolved theme is ever written to <html data-theme>, which index.css's Bento token blocks key off.
 * client/index.html has a matching inline bootstrap script that resolves the same key before React mounts, so
 * there's no flash of the wrong theme. The key predates Bento and is reused; an absent key means "system".
 */

export type Theme = "light" | "dark";
export type ThemePreference = Theme | "system";

const STORAGE_KEY = "azubiweg-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // storage blocked (private mode, sandboxed preview): fall back to the OS
  }
  return "system";
}

function systemTheme(): Theme {
  return window.matchMedia?.(DARK_QUERY).matches ? "dark" : "light";
}

interface ThemeContextValue {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  /** Flips the showing theme and pins it as an explicit override. */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference);
  const [system, setSystem] = useState<Theme>(systemTheme);
  const theme = preference === "system" ? system : preference;

  // Live OS listener: always subscribed, so switching back to "system" picks up the current OS value immediately.
  useEffect(() => {
    const mq = window.matchMedia?.(DARK_QUERY);
    if (!mq) return;
    const onChange = () => setSystem(mq.matches ? "dark" : "light");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      if (next === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // not persisted; still applies for this session
    }
  }, []);

  const toggleTheme = useCallback(() => setPreference(theme === "dark" ? "light" : "dark"), [setPreference, theme]);

  const value = useMemo(
    () => ({ theme, preference, setPreference, toggleTheme }),
    [theme, preference, setPreference, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
