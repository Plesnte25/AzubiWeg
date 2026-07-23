import { Moon, Sun } from "lucide-react";
import { useTheme } from "../hooks/useTheme";

export default function ThemeToggle() {
  const { resolved, setTheme } = useTheme();
  const isDark = resolved === "dark";

  return (
    <button
      className="grid size-9 place-items-center rounded-full text-ink-600 hover:bg-paper hover:text-ink-900"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle color theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}
