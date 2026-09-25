import { Moon, Sun } from "@phosphor-icons/react";
import { useTheme } from "../../lib/theme";

/**
 * Bento theme toggle (README §1.5): a plain2 track with a knob that's lemon + sun in light and lilac + moon in dark,
 * sliding on `left`. md+ 60×32 / knob 23 / left 2 → 29; sm 56×30 / knob 21 / left 2 → 26. Labelled with the action
 * it performs (README §10).
 */
export function ThemeToggle({ small = false }: { small?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";
  const knob = small ? 21 : 23;
  const Icon = dark ? Moon : Sun;
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={dark ? "Switch to light" : "Switch to dark"}
      title={dark ? "Switch to light" : "Switch to dark"}
      className="relative shrink-0 cursor-pointer p-0"
      style={{
        width: small ? 56 : 60,
        height: small ? 30 : 32,
        border: "2.5px solid var(--line)",
        borderRadius: 999,
        background: "var(--plain2)",
      }}
    >
      <span
        aria-hidden="true"
        className="absolute flex items-center justify-center motion-reduce:transition-none"
        style={{
          top: 2,
          left: dark ? (small ? 26 : 29) : 2,
          width: knob,
          height: knob,
          borderRadius: "50%",
          background: dark ? "var(--lilac)" : "var(--lemon)",
          color: "var(--onTile)",
          border: "2px solid var(--line)",
          boxSizing: "border-box",
          transition: "left .2s",
        }}
      >
        <Icon size={small ? 12 : 13} weight="fill" />
      </span>
    </button>
  );
}
