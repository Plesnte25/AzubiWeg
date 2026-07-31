import { type ChangeEvent, type ReactNode, useState } from "react";

export const inputCls =
  "w-full rounded border border-hairline bg-card px-2.5 py-1.5 text-sm placeholder:text-ink-300";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-ink-600">{label}</span>
      {children}
    </label>
  );
}

/** Commits on blur, not on every keystroke — matches the applications DetailPanel pattern. */
export function DebouncedInput({
  value,
  onCommit,
  textarea = false,
  placeholder,
}: {
  value: string;
  onCommit: (v: string) => void;
  textarea?: boolean;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);
  const commit = () => {
    if (draft !== value) onCommit(draft);
  };
  const props = {
    className: inputCls,
    value: draft,
    placeholder,
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
    onBlur: commit,
  };
  return textarea ? <textarea rows={4} {...props} /> : <input {...props} />;
}
