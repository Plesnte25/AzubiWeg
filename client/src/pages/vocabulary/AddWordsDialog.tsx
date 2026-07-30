import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { Award, CheckCircle2 } from "lucide-react";
import { api } from "../../api/client";
import type { CefrLevel, Themenfeld } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { THEMENFELD_LABELS, THEMENFELD_ORDER } from "../../lib/vocab";

const LEVEL_OPTIONS: { value: "auto" | CefrLevel; label: string }[] = [
  { value: "auto", label: "Auto (from lesson)" },
  { value: "a1", label: "A1" },
  { value: "a2", label: "A2" },
  { value: "b1", label: "B1" },
];

type ThemeMode = "auto" | "unclassified" | "pick";

interface AddWordsDialogProps {
  onClose: () => void;
}

export function AddWordsDialog({ onClose }: AddWordsDialogProps) {
  const [wordsInput, setWordsInput] = useState("");
  const [lesson, setLesson] = useState("");
  const [level, setLevel] = useState<"auto" | CefrLevel>("auto");
  const [themeMode, setThemeMode] = useState<ThemeMode>("auto");
  const [pickedThemes, setPickedThemes] = useState<Themenfeld[]>([]);
  const queryClient = useQueryClient();

  const add = useMutation({
    mutationFn: (words: string[]) =>
      api.addWords(words, lesson || undefined, {
        ...(level !== "auto" ? { level } : {}),
        ...(themeMode !== "auto" ? { themenfeld: themeMode === "unclassified" ? [] : pickedThemes } : {}),
      }),
    onSuccess: () => {
      setWordsInput("");
      queryClient.invalidateQueries({ queryKey: ["words"] });
      queryClient.invalidateQueries({ queryKey: ["words-meta"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    const words = wordsInput
      .split(/[,\n]/)
      .map((w) => w.trim())
      .filter(Boolean);
    if (words.length) add.mutate(words);
  }

  function toggleTheme(t: Themenfeld) {
    setPickedThemes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : prev.length < 2 ? [...prev, t] : prev));
  }

  return (
    <Modal title="Add words" onClose={onClose} size="md">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <p className="mb-1.5 text-sm text-ink-600">Meaning, pronunciation &amp; audio are fetched automatically.</p>
          <textarea
            className="h-24 w-full resize-none rounded-md border border-hairline bg-card px-3 py-2 text-sm outline-none focus:border-brand-400"
            placeholder={"e.g. Zug, Bahnhof, fahren\n(comma or newline separated)"}
            value={wordsInput}
            onChange={(e) => setWordsInput(e.target.value)}
            autoFocus
          />
        </div>

        <Input label="Lesson / Woche (optional)" placeholder="e.g. week-05" value={lesson} onChange={(e) => setLesson(e.target.value)} />

        <div>
          <p className="mb-1.5 text-sm">Level</p>
          <select
            className="w-full rounded-md border border-hairline bg-card px-3 py-2 text-sm outline-none focus:border-brand-400"
            value={level}
            onChange={(e) => setLevel(e.target.value as "auto" | CefrLevel)}
          >
            {LEVEL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-sm">Themenfeld</p>
            <div className="flex gap-1 text-xs">
              {(["auto", "unclassified", "pick"] as ThemeMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`rounded-full px-2 py-1 font-medium ${themeMode === m ? "bg-brand-600 text-white" : "bg-paper text-ink-600"}`}
                  onClick={() => setThemeMode(m)}
                >
                  {m === "auto" ? "Auto" : m === "unclassified" ? "Unclassified" : "Pick (max 2)"}
                </button>
              ))}
            </div>
          </div>
          {themeMode === "pick" && (
            <div className="flex flex-wrap gap-1.5">
              {THEMENFELD_ORDER.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`rounded-full border px-2 py-1 text-xs ${
                    pickedThemes.includes(t) ? "border-brand-400 bg-brand-50 text-brand-700" : "border-hairline text-ink-600"
                  }`}
                  onClick={() => toggleTheme(t)}
                >
                  {THEMENFELD_LABELS[t]}
                </button>
              ))}
            </div>
          )}
        </div>

        <Button className="w-full" disabled={add.isPending || !wordsInput.trim()} loading={add.isPending}>
          {add.isPending ? "Looking up…" : "Add"}
        </Button>

        {add.isError && <p className="text-sm text-danger-600">{String(add.error)}</p>}
        {add.isSuccess && add.data.words.length > 0 && (
          <p className="flex items-center gap-1.5 text-sm text-ok-700">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            Added {add.data.words.map((w) => w?.headword).join(", ")}
          </p>
        )}
        {add.isSuccess && add.data.newlyUnlockedBadges.length > 0 && (
          <p className="flex items-center gap-1.5 text-sm text-brand-700">
            <Award className="size-4" aria-hidden="true" />
            New badge{add.data.newlyUnlockedBadges.length === 1 ? "" : "s"}:{" "}
            {add.data.newlyUnlockedBadges.map((b) => b.label).join(", ")}
          </p>
        )}
      </form>
    </Modal>
  );
}
