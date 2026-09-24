/**
 * Segmented control (README §1.6; Stats range 7d/30d/1y): buttons inside a 2.5px-outlined plain capsule; the
 * selected segment fills with `--btn`. Options are `[value, label]` pairs.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly (readonly [T, string])[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the group. */
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex shrink-0 overflow-hidden"
      style={{ border: "2.5px solid var(--line)", borderRadius: 999, background: "var(--plain)" }}
    >
      {options.map(([v, l]) => {
        const on = v === value;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(v)}
            className="cursor-pointer"
            style={{
              height: 30,
              padding: "0 12px",
              border: "none",
              background: on ? "var(--btn)" : "transparent",
              color: on ? "var(--btnText)" : "var(--plainText)",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}
