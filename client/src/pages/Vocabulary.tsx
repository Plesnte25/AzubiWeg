import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, playWordAudio } from "../api/client";
import type { Word } from "../api/types";

function AudioButton({ word }: { word: Word }) {
  if (!word.audioPath) return null;
  return (
    <button
      title="Play pronunciation"
      className="rounded-full border border-hairline px-2 py-0.5 text-xs hover:bg-paper"
      onClick={(e) => {
        e.stopPropagation();
        void playWordAudio(word.id);
      }}
    >
      🔊
    </button>
  );
}

function WordRow({ word }: { word: Word }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const queryClient = useQueryClient();

  const del = useMutation({
    mutationFn: () => api.deleteWord(word.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["words"] }),
  });

  return (
    <li className="border-b border-hairline last:border-0">
      <button
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-paper"
        onClick={() => setOpen(!open)}
      >
        <span className="font-medium">{word.headword}</span>
        {word.ipa && <span className="text-xs text-ink-400">/{word.ipa}/</span>}
        <span className="ml-auto flex items-center gap-2">
          {word.lesson && (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
              {word.lesson}
            </span>
          )}
          {word.srDue === null ? (
            <span className="text-xs text-ink-400">new</span>
          ) : (
            <span className="text-xs text-ink-400">
              due {new Date(word.srDue).toLocaleDateString()}
            </span>
          )}
          <AudioButton word={word} />
        </span>
      </button>
      {open && (
        <div className="space-y-1.5 px-3 pt-1 pb-3 text-sm">
          {editing ? (
            <EditForm word={word} onDone={() => setEditing(false)} />
          ) : (
            <>
              {word.meaning && (
                <p>
                  <span className="text-ink-400">Meaning</span> {word.meaning}
                </p>
              )}
              {word.grammar && (
                <p>
                  <span className="text-ink-400">Grammar</span> {word.grammar}
                </p>
              )}
              {word.example && (
                <p>
                  <span className="text-ink-400">Example</span> <em>{word.example}</em>
                </p>
              )}
              {word.srInterval !== null && (
                <p className="text-xs text-ink-400">
                  interval {word.srInterval}d · ease {word.srEase}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  className="rounded border border-hairline px-2 py-1 text-xs hover:bg-paper"
                  onClick={() => setEditing(true)}
                >
                  Edit
                </button>
                <button
                  className="rounded border border-hairline px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                  onClick={() => {
                    if (confirm(`Delete "${word.headword}"? This also removes it from your vault.`))
                      del.mutate();
                  }}
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </li>
  );
}

function EditForm({ word, onDone }: { word: Word; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    meaning: word.meaning ?? "",
    ipa: word.ipa ?? "",
    grammar: word.grammar ?? "",
    example: word.example ?? "",
    lesson: word.lesson ?? "",
  });
  const save = useMutation({
    mutationFn: () =>
      api.updateWord(word.id, {
        meaning: form.meaning || null,
        ipa: form.ipa || null,
        grammar: form.grammar || null,
        example: form.example || null,
        lesson: form.lesson || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["words"] });
      onDone();
    },
  });
  const input = "w-full rounded border border-hairline bg-card px-2 py-1 text-sm";
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      {(["meaning", "ipa", "grammar", "example", "lesson"] as const).map((f) => (
        <label key={f} className="block text-xs text-ink-600">
          {f}
          <input className={input} value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} />
        </label>
      ))}
      <div className="flex gap-2">
        <button className="rounded bg-ink-900 px-3 py-1 text-xs text-white" disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save"}
        </button>
        <button type="button" className="rounded border border-hairline px-3 py-1 text-xs" onClick={onDone}>
          Cancel
        </button>
      </div>
      {save.isError && <p className="text-xs text-red-700">{String(save.error)}</p>}
    </form>
  );
}

type GroupMode = "lesson" | "az" | "flat";
const GROUP_MODES: { key: GroupMode; label: string }[] = [
  { key: "lesson", label: "By lesson" },
  { key: "az", label: "A–Z" },
  { key: "flat", label: "Flat list" },
];

interface WordGroup {
  key: string;
  label: string;
  words: Word[];
}

/** Groups already-sortKey-ordered words by lesson, first non-lesson words last. */
function groupByLesson(words: Word[]): WordGroup[] {
  const map = new Map<string, Word[]>();
  for (const w of words) {
    const key = w.lesson ?? "";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(w);
  }
  return [...map.entries()]
    .map(([key, ws]) => ({ key, label: key || "No lesson", words: ws }))
    .sort((a, b) => (a.key === "" ? 1 : b.key === "" ? -1 : a.label.localeCompare(b.label)));
}

/** Groups already-sortKey-ordered words by first letter of their sort key. */
function groupByLetter(words: Word[]): WordGroup[] {
  const map = new Map<string, Word[]>();
  for (const w of words) {
    const letter = (w.sortKey[0] ?? "#").toUpperCase();
    if (!map.has(letter)) map.set(letter, []);
    map.get(letter)!.push(w);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, ws]) => ({ key, label: key, words: ws }));
}

function WordGroupDetails({ group, defaultOpen }: { group: WordGroup; defaultOpen: boolean }) {
  return (
    <details className="rounded-xl border border-hairline bg-card" open={defaultOpen}>
      <summary className="flex cursor-pointer select-none items-baseline justify-between gap-2 rounded-xl p-3 hover:bg-paper">
        <span className="font-semibold">{group.label}</span>
        <span className="text-xs text-ink-400">{group.words.length}</span>
      </summary>
      <ul className="border-t border-hairline">
        {group.words.map((w) => (
          <WordRow key={w.id} word={w} />
        ))}
      </ul>
    </details>
  );
}

export default function Vocabulary() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const lesson = params.get("lesson") ?? undefined;
  const [groupMode, setGroupMode] = useState<GroupMode>("lesson");
  const [addInput, setAddInput] = useState("");
  const [addLesson, setAddLesson] = useState("");
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["words", { search, lesson }],
    queryFn: () => api.words({ search: search || undefined, lesson }),
  });
  const { data: meta } = useQuery({ queryKey: ["words-meta"], queryFn: api.wordsMeta });

  const add = useMutation({
    mutationFn: (words: string[]) => api.addWords(words, addLesson || undefined),
    onSuccess: () => {
      setAddInput("");
      queryClient.invalidateQueries({ queryKey: ["words"] });
      queryClient.invalidateQueries({ queryKey: ["words-meta"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  function submitAdd(e: FormEvent) {
    e.preventDefault();
    const words = addInput
      .split(/[,\n]/)
      .map((w) => w.trim())
      .filter(Boolean);
    if (words.length) add.mutate(words);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submitAdd} className="rounded-xl border border-hairline bg-card p-4">
        <h2 className="mb-2 text-sm font-medium text-ink-600">
          Add words — meaning, pronunciation &amp; audio are fetched automatically
        </h2>
        <div className="flex flex-wrap gap-2">
          <input
            className="min-w-48 flex-1 rounded-md border border-hairline px-3 py-2 text-sm outline-none focus:border-brand-400"
            placeholder="e.g. Zug, Bahnhof, fahren"
            value={addInput}
            onChange={(e) => setAddInput(e.target.value)}
          />
          <input
            className="w-36 rounded-md border border-hairline px-3 py-2 text-sm outline-none focus:border-brand-400"
            placeholder="lesson (optional)"
            value={addLesson}
            onChange={(e) => setAddLesson(e.target.value)}
          />
          <button
            className="rounded-md bg-ink-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
            disabled={add.isPending || !addInput.trim()}
          >
            {add.isPending ? "Looking up…" : "Add"}
          </button>
        </div>
        {add.isError && <p className="mt-2 text-sm text-red-700">{String(add.error)}</p>}
        {add.isSuccess && add.data.words.length > 0 && (
          <p className="mt-2 text-sm text-green-800">
            Added {add.data.words.map((w) => w?.headword).join(", ")} ✓
          </p>
        )}
        {add.isSuccess && add.data.newlyUnlockedBadges.length > 0 && (
          <p className="mt-2 text-sm text-brand-700">
            🏅 New badge{add.data.newlyUnlockedBadges.length === 1 ? "" : "s"}:{" "}
            {add.data.newlyUnlockedBadges.map((b) => b.label).join(", ")}
          </p>
        )}
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <input
          className="min-w-48 flex-1 rounded-md border border-hairline bg-card px-3 py-2 text-sm outline-none focus:border-brand-400"
          placeholder="Search words or meanings…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="rounded-md border border-hairline bg-card px-2 py-2 text-sm"
          value={lesson ?? ""}
          onChange={(e) => {
            if (e.target.value) setParams({ lesson: e.target.value });
            else setParams({});
          }}
        >
          <option value="">All lessons</option>
          {meta?.lessons.map((l) => (
            <option key={l.lesson} value={l.lesson}>
              {l.lesson} ({l.count})
            </option>
          ))}
        </select>
        <div className="flex gap-1 rounded-full border border-hairline bg-card p-1">
          {GROUP_MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                groupMode === m.key ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-paper"
              }`}
              onClick={() => setGroupMode(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {data && data.words.length === 0 && (
        <p className="rounded-xl border border-hairline bg-card px-3 py-8 text-center text-sm text-ink-400">
          No words found.
        </p>
      )}

      {data && data.words.length > 0 && groupMode === "flat" && (
        <ul className="rounded-xl border border-hairline bg-card">
          {data.words.map((w) => <WordRow key={w.id} word={w} />)}
        </ul>
      )}

      {data && data.words.length > 0 && groupMode !== "flat" && (
        <div className="space-y-2">
          {(groupMode === "lesson" ? groupByLesson(data.words) : groupByLetter(data.words)).map((group, i) => (
            <WordGroupDetails key={group.key} group={group} defaultOpen={i === 0} />
          ))}
        </div>
      )}

      {data && (
        <p className="text-right text-xs text-ink-400">
          {data.words.length} {data.words.length === 1 ? "word" : "words"}
        </p>
      )}
    </div>
  );
}
