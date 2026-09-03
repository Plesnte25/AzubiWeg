import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { CalendarCheck, Sparkle } from "@phosphor-icons/react";
import { api } from "../../api/client";
import type { CefrLevel, Genus, Themenfeld } from "../../api/types";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { GENUS_COLORS, THEMENFELD_LABELS, THEMENFELD_ORDER } from "../../lib/vocab";

const LEVEL_OPTIONS: { value: "auto" | CefrLevel; label: string }[] = [
  { value: "auto", label: "Auto (from lesson)" },
  { value: "a1", label: "A1" },
  { value: "a2", label: "A2" },
  { value: "b1", label: "B1" },
];

type ThemeMode = "auto" | "unclassified" | "pick";

// Suffix -> article rules from the handoff's article-suggest logic — a
// hint only. The real gender/article comes back from the kaikki.org
// enrichment lookup once the word is actually saved (see server/src/
// services/enrichment/kaikki.ts), so this never gets sent to the API.
const DIE_SUFFIXES = /(ung|tion|heit|keit|schaft)$/i;
const DAS_SUFFIXES = /(chen|lein|ment|zimmer)$/i;
const DER_SUFFIXES = /(or| er|ismus|vertrag|ort)$/i;

function suggestArticle(word: string): Genus {
  if (DIE_SUFFIXES.test(word)) return "die";
  if (DAS_SUFFIXES.test(word)) return "das";
  if (DER_SUFFIXES.test(word)) return "der";
  return null;
}

interface AddWordsDialogProps {
  open: boolean;
  onClose: () => void;
  /** Prefills the input from the Words screen's empty-state "Add it as a
   * new word" CTA. */
  initialWord?: string;
}

export function AddWordsDialog({ open, onClose, initialWord = "" }: AddWordsDialogProps) {
  const [wordsInput, setWordsInput] = useState(initialWord);
  const [lesson, setLesson] = useState("");
  const [level, setLevel] = useState<"auto" | CefrLevel>("auto");
  const [themeMode, setThemeMode] = useState<ThemeMode>("auto");
  const [pickedThemes, setPickedThemes] = useState<Themenfeld[]>([]);
  const queryClient = useQueryClient();
  const wordsInputRef = useRef<HTMLTextAreaElement>(null);

  // Stays mounted at all times (BottomSheet handles its own open/close
  // transition — see Dashboard.tsx's task-detail sheet for the same
  // pattern), so reset the form on every open rather than relying on
  // mount/unmount to do it. Focus is driven from here too, not a static
  // autoFocus prop on the textarea below — autoFocus fires once at real
  // DOM mount regardless of `open`, which (since this component is always
  // mounted) would silently steal page focus the instant this component's
  // parent mounts, closed or not. That's a real bug here: CommandPalette.tsx
  // now mounts this app-wide via Layout.tsx, so a static autoFocus would
  // steal focus on every single page load, not just while this is open.
  useEffect(() => {
    if (!open) return;
    setWordsInput(initialWord);
    setLesson("");
    setLevel("auto");
    setThemeMode("auto");
    setPickedThemes([]);
    wordsInputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const words = useMemo(
    () =>
      wordsInput
        .split(/[,\n]/)
        .map((w) => w.trim())
        .filter(Boolean),
    [wordsInput],
  );
  // article-suggest only makes sense for a single word being typed
  const singleWord = words.length === 1 && !/[,\n]$/.test(wordsInput) ? words[0]! : null;
  const suggested = singleWord ? suggestArticle(singleWord) : null;

  const add = useMutation({
    mutationFn: () =>
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
    if (words.length) add.mutate();
  }

  function toggleTheme(t: Themenfeld) {
    setPickedThemes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : prev.length < 2 ? [...prev, t] : prev));
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-[18px]">
        <div className="flex items-center justify-between">
          <button type="button" onClick={onClose} className="min-h-0 px-1.5 py-1 text-[13px]" style={{ color: "rgba(233,233,237,.5)" }}>
            Cancel
          </button>
          <span className="text-[16px] font-medium">New word</span>
          <button
            type="submit"
            disabled={add.isPending || words.length === 0}
            className="min-h-0 px-1.5 py-1 text-[13px] font-medium disabled:opacity-40"
            style={{ color: "#b5abfc" }}
          >
            {add.isPending ? "Saving…" : "Save"}
          </button>
        </div>

        <div>
          <div className="mb-1.5 text-[11px]" style={{ color: "rgba(233,233,237,.5)" }}>
            German word{words.length > 1 ? "s" : ""}
          </div>
          <textarea
            ref={wordsInputRef}
            value={wordsInput}
            onChange={(e) => setWordsInput(e.target.value)}
            placeholder={"Genehmigung\n(comma or newline separated for more than one)"}
            rows={singleWord ? 1 : 3}
            className="w-full resize-none bg-transparent text-[24px] leading-tight font-medium outline-none"
            style={{ color: "#e9e9ed", letterSpacing: "-.02em", borderBottom: "2px solid #9184d9", paddingBottom: 7 }}
          />
        </div>

        {singleWord && (
          <div>
            <div className="mb-[7px] flex items-baseline justify-between">
              <div className="text-[11px]" style={{ color: "rgba(233,233,237,.5)" }}>
                Article
              </div>
              <div className="text-[10px]" style={{ color: "rgba(233,233,237,.35)" }}>
                guessed from the ending
              </div>
            </div>
            <div className="flex gap-2">
              {(["der", "die", "das"] as const).map((g) => {
                const on = suggested === g;
                return (
                  <div
                    key={g}
                    className="flex-1 rounded-[11px] py-[11px] text-center text-[15px] font-medium"
                    style={{
                      border: `1px solid ${on ? GENUS_COLORS[g] : "rgba(233,233,237,.14)"}`,
                      background: on ? "rgba(145,132,217,.14)" : "transparent",
                      color: on ? GENUS_COLORS[g] : "rgba(233,233,237,.55)",
                    }}
                  >
                    {g}
                  </div>
                );
              })}
            </div>
            <div className="mt-[9px] flex items-start gap-[7px] text-[11.5px] leading-[1.45]" style={{ color: "#b5abfc" }}>
              <Sparkle size={13} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
              {suggested
                ? `Nouns ending like this are usually ${suggested} — the real article comes from the dictionary lookup once you save.`
                : "No reliable ending rule here — the dictionary lookup decides the real article once you save."}
            </div>
          </div>
        )}

        <p className="text-[12px]" style={{ color: "rgba(233,233,237,.5)" }}>
          Meaning, pronunciation &amp; audio are fetched automatically once saved.
        </p>

        <div>
          <div className="mb-1.5 text-[11px]" style={{ color: "rgba(233,233,237,.5)" }}>
            Lesson / Woche (optional)
          </div>
          <input
            value={lesson}
            onChange={(e) => setLesson(e.target.value)}
            placeholder="e.g. week-05"
            className="w-full border-0 bg-transparent pb-[7px] text-[15px] outline-none"
            style={{ color: "#e9e9ed", borderBottom: "1px solid rgba(233,233,237,.14)" }}
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px]" style={{ color: "rgba(233,233,237,.5)" }}>
              Level
            </span>
            <div className="flex gap-1">
              {LEVEL_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setLevel(o.value)}
                  className="rounded-full px-2 py-1 text-[10.5px] font-medium"
                  style={{
                    background: level === o.value ? "rgba(145,132,217,.22)" : "#20222f",
                    color: level === o.value ? "#d2cefd" : "rgba(233,233,237,.6)",
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px]" style={{ color: "rgba(233,233,237,.5)" }}>
              Themenfeld
            </span>
            <div className="flex gap-1">
              {(["auto", "unclassified", "pick"] as ThemeMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setThemeMode(m)}
                  className="rounded-full px-2 py-1 text-[10.5px] font-medium"
                  style={{
                    background: themeMode === m ? "rgba(145,132,217,.22)" : "#20222f",
                    color: themeMode === m ? "#d2cefd" : "rgba(233,233,237,.6)",
                  }}
                >
                  {m === "auto" ? "Auto" : m === "unclassified" ? "Unclassified" : "Pick (max 2)"}
                </button>
              ))}
            </div>
          </div>
          {themeMode === "pick" && (
            <div className="flex flex-wrap gap-1.5">
              {THEMENFELD_ORDER.map((t) => {
                const on = pickedThemes.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTheme(t)}
                    className="rounded-full px-2 py-1 text-[10.5px]"
                    style={{
                      border: `1px solid ${on ? "#9184d9" : "rgba(233,233,237,.14)"}`,
                      color: on ? "#d2cefd" : "rgba(233,233,237,.6)",
                    }}
                  >
                    {THEMENFELD_LABELS[t]}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {add.isError && (
          <p className="text-[12px]" style={{ color: "#e4c4b6" }}>
            {String(add.error)}
          </p>
        )}
        {add.isSuccess && add.data.words.length > 0 && (
          <p className="text-[12px]" style={{ color: "#b5abfc" }}>
            Added {add.data.words.map((w) => w?.headword).join(", ")}
          </p>
        )}

        <div className="flex items-center gap-2 pb-1 text-[11px]" style={{ color: "rgba(233,233,237,.35)" }}>
          <CalendarCheck size={13} weight="regular" aria-hidden="true" />
          Lands in today&rsquo;s &ldquo;new&rdquo; stack · first review tomorrow
        </div>
      </form>
    </BottomSheet>
  );
}
