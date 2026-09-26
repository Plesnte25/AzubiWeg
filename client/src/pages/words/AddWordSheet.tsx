import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CaretDown } from "@phosphor-icons/react";
import { api } from "../../api/client";
import type { CefrLevel, Word } from "../../api/types";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { Chip } from "../../components/ui/Chip";
import { toast } from "../../components/ui/Toast";

/*
 * Add word (AzubiWords.dc.html addOpen, lemon). Honest version of the prototype:
 * - The real gender and meaning come from the kaikki.org enrichment at save time. The der/die/das/verb picker is
 *   the learner's guess (pre-set from a word-ending hint); after a single-word save it says whether the guess was
 *   right, and it's never sent to the API.
 * - Meaning is an optional override, applied after enrichment and only when adding one word.
 * - Batch entry stays: commas or new lines add several words at once.
 * - Enter saves; Shift+Enter starts another line for a batch.
 * - Level / Lesson live under "More options" (level is derived from the lesson when left on Auto).
 * Stays mounted with `open` (BottomSheet contract) so the command palette can open it with a prefilled word.
 */

type Guess = "der" | "die" | "das" | "verb";
const GUESS_COLORS: Record<Guess, string> = { der: "var(--sky)", die: "var(--pink)", das: "var(--mint)", verb: "var(--lilac)" };

function hintFor(word: string): Guess | null {
  if (/(ung|tion|heit|keit|schaft|sion)$/i.test(word)) return "die";
  if (/(chen|lein|ment)$/i.test(word)) return "das";
  if (/(ling|ismus)$/i.test(word)) return "der";
  if (/^[a-zäöüß]+(en|ern|eln)$/.test(word)) return "verb";
  return null;
}

function guessOf(w: Word): Guess | null {
  return w.genus ?? (w.wortart === "Verb" ? "verb" : null);
}

const field: CSSProperties = {
  padding: "0 14px",
  background: "var(--plain)",
  color: "var(--plainText)",
  border: "2.5px solid var(--line)",
  borderRadius: 14,
  boxSizing: "border-box",
  width: "100%",
};
const label: CSSProperties = { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 700 };

export function AddWordSheet({
  open,
  onClose,
  initialWord = "",
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  initialWord?: string;
  /** Called with the saved words (Words selects the first). */
  onAdded?: (words: Word[]) => void;
}) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState(initialWord);
  const [meaning, setMeaning] = useState("");
  const [guess, setGuess] = useState<Guess | null>(null);
  const [more, setMore] = useState(false);
  const [level, setLevel] = useState<"auto" | CefrLevel>("auto");
  const [lesson, setLesson] = useState("");

  useEffect(() => {
    if (!open) return;
    setInput(initialWord);
    setMeaning("");
    setGuess(initialWord ? hintFor(initialWord.trim()) : null);
    setMore(false);
    setLevel("auto");
    setLesson("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open, initialWord]);

  const words = useMemo(() => input.split(/[,\n]/).map((w) => w.trim()).filter(Boolean), [input]);
  const single = words.length === 1 ? words[0]! : null;
  const lessonValid = !lesson || /^[\w-]+$/.test(lesson);

  const add = useMutation({
    mutationFn: async () => {
      const res = await api.addWords(words, lesson || undefined, level !== "auto" ? { level } : undefined);
      // optional meaning override: after enrichment, single word only
      if (single && meaning.trim() && res.words[0]) {
        const patched = await api.updateWord(res.words[0].id, { meaning: meaning.trim() });
        res.words[0] = patched.word;
      }
      return res;
    },
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ["words"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      for (const r of res.rejected) toast.error(`„${r.word}“ skipped: ${r.reason === "loanword" ? "looks like a loanword" : "doesn't look German"}`);
      const saved = res.words;
      if (saved.length === 1 && guess) {
        const real = guessOf(saved[0]!);
        if (real && real === guess) toast.success(`Richtig! ${real === "verb" ? "" : `${real} `}${saved[0]!.headword} saved`);
        else if (real) toast.info(`Saved as ${real === "verb" ? "a verb" : `${real} ${saved[0]!.headword}`} (you guessed ${guess})`);
        else toast.success(`${saved[0]!.headword} saved`);
      } else if (saved.length > 0) {
        toast.success(saved.length === 1 ? `${saved[0]!.headword} saved` : `${saved.length} words saved`);
      }
      if (saved.length > 0) {
        onAdded?.(saved);
        onClose();
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't save"),
  });

  const canSave = words.length > 0 && lessonValid && !add.isPending;

  return (
    <BottomSheet open={open} onClose={onClose} bg="var(--lemon)" className="max-w-[460px]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSave) add.mutate();
        }}
        className="flex flex-col gap-4"
      >
        <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.03em", paddingRight: 48 }}>New word{words.length > 1 ? "s" : ""}</span>

        {single !== null && (
          <div className="flex flex-col gap-1.5">
            <span style={{ fontSize: 13, fontWeight: 700 }}>Your guess</span>
            <div className="flex gap-1.5" role="radiogroup" aria-label="Your guess">
              {(Object.keys(GUESS_COLORS) as Guess[]).map((a) => {
                const on = guess === a;
                return (
                  <button
                    key={a}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setGuess(on ? null : a)}
                    className="flex flex-1 cursor-pointer items-center justify-center"
                    style={{
                      height: 42,
                      borderRadius: 12,
                      border: "2.5px solid var(--line)",
                      background: on ? GUESS_COLORS[a] : "var(--plain)",
                      color: on ? "var(--onTile)" : "var(--plainText)",
                      fontWeight: 700,
                      fontSize: 15,
                      boxShadow: on ? "3px 3px 0 var(--shadow)" : "none",
                      transform: on ? "rotate(-2deg)" : "none",
                    }}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <label style={label}>
          German
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              const ws = e.target.value.split(/[,\n]/).map((w) => w.trim()).filter(Boolean);
              if (ws.length === 1 && guess === null) setGuess(hintFor(ws[0]!));
            }}
            onKeyDown={(e) => {
              // Enter saves, like a single-line field; Shift+Enter adds a line for a batch
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (canSave) add.mutate();
              }
            }}
            placeholder="z. B. Werkstatt"
            // grows with the batch, up to six lines
            rows={Math.min(6, Math.max(1, input.split("\n").length))}
            lang="de"
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="done"
            style={{ ...field, padding: "11px 14px", minHeight: 48, fontSize: 17, fontWeight: 600, resize: "none" }}
          />
          <span style={{ fontWeight: 500, opacity: 0.75 }}>Several at once: separate with commas, or Shift+Enter for a new line.</span>
        </label>

        {single !== null && (
          <label style={label}>
            Meaning <span style={{ fontWeight: 500, opacity: 0.75 }}>optional — looked up automatically otherwise</span>
            <input value={meaning} onChange={(e) => setMeaning(e.target.value)} placeholder="e.g. workshop" autoCapitalize="off" enterKeyHint="done" style={{ ...field, height: 48, fontSize: 16, fontWeight: 500 }} />
          </label>
        )}

        <button
          type="button"
          aria-expanded={more}
          onClick={() => setMore((v) => !v)}
          className="flex cursor-pointer items-center gap-1.5 self-start"
          style={{ background: "transparent", border: "none", padding: 0, color: "inherit", fontSize: 13, fontWeight: 700 }}
        >
          <CaretDown size={14} weight="bold" style={{ transform: more ? "rotate(180deg)" : "none", transition: "transform .15s" }} aria-hidden="true" />
          More options
        </button>
        {more && (
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <span style={{ fontSize: 13, fontWeight: 700 }}>Level</span>
              <div className="flex flex-wrap gap-1.5">
                {(["auto", "a1", "a2", "b1"] as const).map((l) => (
                  <Chip key={l} size="sm" selected={level === l} onClick={() => setLevel(l)}>
                    {l === "auto" ? "Auto" : l.toUpperCase()}
                  </Chip>
                ))}
              </div>
            </div>
            <label style={label}>
              Lesson
              <input
                value={lesson}
                onChange={(e) => setLesson(e.target.value)}
                placeholder="e.g. week-12"
                aria-invalid={!lessonValid}
                style={{ ...field, height: 44, fontSize: 15, fontWeight: 600, borderColor: lessonValid ? "var(--line)" : "var(--tomato)" }}
              />
              {!lessonValid && <span style={{ fontWeight: 600 }}>Letters, numbers, - and _ only.</span>}
            </label>
          </div>
        )}

        <button
          type="submit"
          disabled={!canSave}
          // sticky: stays in view at the bottom of the sheet while the phone keyboard shrinks it
          className="press sticky bottom-0 cursor-pointer disabled:cursor-default"
          style={{ height: 50, flexShrink: 0, background: "var(--btn)", color: "var(--btnText)", border: "2.5px solid var(--line)", borderRadius: 999, fontWeight: 700, fontSize: 16, opacity: canSave ? 1 : 0.45, boxShadow: "3px 3px 0 var(--shadow)" }}
        >
          {add.isPending ? "Looking it up…" : words.length > 1 ? `Save ${words.length} words` : "Save word"}
        </button>
      </form>
    </BottomSheet>
  );
}
