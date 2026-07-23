import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Award, BookOpen, CheckCircle2, Trash2, Volume2 } from "lucide-react";
import { api, playWordAudio } from "../api/client";
import type { Word } from "../api/types";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { Select } from "../components/ui/Select";

function AudioButton({ word }: { word: Word }) {
  if (!word.audioPath) return null;
  return (
    <button
      title="Play pronunciation"
      className="grid size-6 place-items-center rounded-full border border-hairline hover:bg-paper"
      onClick={(e) => {
        e.stopPropagation();
        void playWordAudio(word.id);
      }}
    >
      <Volume2 className="size-3.5 text-ink-600" aria-hidden="true" />
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
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-danger-600 hover:border-danger-100 hover:bg-danger-50"
                  leftIcon={<Trash2 className="size-3.5" aria-hidden="true" />}
                  onClick={() => {
                    if (confirm(`Delete "${word.headword}"? This also removes it from your vault.`))
                      del.mutate();
                  }}
                >
                  Delete
                </Button>
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
        <Button size="sm" loading={save.isPending}>
          Save
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onDone}>
          Cancel
        </Button>
      </div>
      {save.isError && <p className="text-xs text-danger-600">{String(save.error)}</p>}
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

/** One card per letter of the alphabet — every word starting with that letter lives inside it. */
function LetterCard({ group }: { group: WordGroup }) {
  return (
    <Card padding="sm">
      <div className="mb-2 flex items-center gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-sm font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
          {group.label}
        </span>
        <span className="text-xs text-ink-400">
          {group.words.length} word{group.words.length === 1 ? "" : "s"}
        </span>
      </div>
      <ul className="max-h-64 space-y-1 overflow-y-auto">
        {group.words.map((w) => (
          <li key={w.id} className="truncate text-sm">
            <span className="font-medium">{w.headword}</span>
            {w.meaning && <span className="text-ink-400"> — {w.meaning}</span>}
          </li>
        ))}
      </ul>
    </Card>
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
      <form onSubmit={submitAdd}>
        <Card>
          <h2 className="mb-2 text-sm font-medium text-ink-600">
            Add words — meaning, pronunciation &amp; audio are fetched automatically
          </h2>
          <div className="flex flex-wrap gap-2">
            <Input
              className="min-w-48 flex-1"
              placeholder="e.g. Zug, Bahnhof, fahren"
              value={addInput}
              onChange={(e) => setAddInput(e.target.value)}
            />
            <Input
              className="w-36"
              placeholder="lesson (optional)"
              value={addLesson}
              onChange={(e) => setAddLesson(e.target.value)}
            />
            <Button disabled={add.isPending || !addInput.trim()} loading={add.isPending}>
              {add.isPending ? "Looking up…" : "Add"}
            </Button>
          </div>
          {add.isError && <p className="mt-2 text-sm text-danger-600">{String(add.error)}</p>}
          {add.isSuccess && add.data.words.length > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-ok-700">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Added {add.data.words.map((w) => w?.headword).join(", ")}
            </p>
          )}
          {add.isSuccess && add.data.newlyUnlockedBadges.length > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-brand-700">
              <Award className="size-4" aria-hidden="true" />
              New badge{add.data.newlyUnlockedBadges.length === 1 ? "" : "s"}:{" "}
              {add.data.newlyUnlockedBadges.map((b) => b.label).join(", ")}
            </p>
          )}
        </Card>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="min-w-48 flex-1"
          placeholder="Search words or meanings…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
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
        </Select>
        <SegmentedControl options={GROUP_MODES} value={groupMode} onChange={setGroupMode} />
      </div>

      {data && data.words.length === 0 && <EmptyState icon={BookOpen} title="No words found" />}

      {data && data.words.length > 0 && groupMode === "flat" && (
        <ul className="rounded-xl border border-hairline bg-card">
          {data.words.map((w) => <WordRow key={w.id} word={w} />)}
        </ul>
      )}

      {data && data.words.length > 0 && groupMode === "lesson" && (
        <div className="space-y-2">
          {groupByLesson(data.words).map((group, i) => (
            <WordGroupDetails key={group.key} group={group} defaultOpen={i === 0} />
          ))}
        </div>
      )}

      {data && data.words.length > 0 && groupMode === "az" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groupByLetter(data.words).map((group) => (
            <LetterCard key={group.key} group={group} />
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
