import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowCounterClockwise, FileText, FlagPennant, LinkSimple, Palette, Plus, Tag, Timer, Trash } from "@phosphor-icons/react";
import { api, downloadFile } from "../../api/client";
import type { Cv, RoadmapStatus } from "../../api/types";
import { Chip } from "../../components/ui/Chip";
import { eyebrow, fieldInput } from "../../components/ui/fields";
import { PillButton } from "../../components/ui/PillButton";
import { Segmented } from "../../components/ui/Segmented";
import { Eyebrow, Tile } from "../../components/ui/Tile";
import { toast } from "../../components/ui/Toast";
import { invalidateHub } from "../../lib/queryHelpers";
import { localDateKey } from "../../lib/tasks";
import { useTheme, type ThemePreference } from "../../lib/theme";
import { useBreakpoint } from "../../lib/useBreakpoint";
import AddCvModal from "./AddCvModal";

/*
 * Settings — undesigned in the handoff, so it's built from the Sticker primitives (README "restyle undesigned
 * screens"): a title tile, then one coloured tile per concern. Study time moved here from the old planner, the exam
 * date replaces the ExamSchedule sheet, and the CV shelf moved here from Jobs (the Bento Jobs page has none).
 * Vocabulary tagging keeps only its one real action (fill in missing tags); there are no tagging "modes" to pick.
 */

const k = (px: number) => `calc(var(--k) * ${px}px)`;
const title: CSSProperties = { fontSize: 20, fontWeight: 700, letterSpacing: "-.02em" };
const body: CSSProperties = { fontSize: 13, fontWeight: 600, lineHeight: 1.4 };

function Head({ icon, children, sub }: { icon: ReactNode; children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex items-start" style={{ gap: 10 }}>
      <span
        className="flex shrink-0 items-center justify-center"
        style={{ width: 34, height: 34, borderRadius: 10, border: "2.5px solid var(--line)", background: "var(--plain)", color: "var(--plainText)", transform: "rotate(-6deg)", boxSizing: "border-box" }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div style={title}>{children}</div>
        {sub && <div style={{ ...body, opacity: 0.8 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── appearance ───────────────────────────────────────────────────────────────

const THEMES = [
  ["system", "System"],
  ["light", "Light"],
  ["dark", "Dark"],
] as const;

function Appearance() {
  const { preference, setPreference, theme } = useTheme();
  return (
    <Tile tilt={-0.4} className="flex flex-col" style={{ padding: 18, gap: 12 }}>
      <Head icon={<Palette size={17} weight="fill" aria-hidden="true" />} sub={preference === "system" ? `Following your device · ${theme} now` : `Always ${theme}`}>
        Appearance
      </Head>
      <div className="self-start">
        <Segmented label="Theme" options={THEMES} value={preference} onChange={(v) => setPreference(v as ThemePreference)} />
      </div>
    </Tile>
  );
}

// ── study time ───────────────────────────────────────────────────────────────

const CAPACITIES: { v: number; l: string }[] = [
  { v: 10, l: "10 min" },
  { v: 20, l: "20 min" },
  { v: 45, l: "45 min" },
  { v: 90, l: "1½ h" },
  { v: 180, l: "3 h" },
];

const hours = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}` : ""}`);

function StudyTime({ status }: { status: RoadmapStatus | undefined }) {
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: (minutes: number) => api.updateStudyCapacity({ minutes }),
    onSuccess: (d) => {
      invalidateHub(queryClient);
      void queryClient.invalidateQueries({ queryKey: ["roadmap", "status"] });
      toast.success(`${hours(d.studyCapacityMinutes)} a day · weekly goal ${hours(d.studyCapacityMinutes * 6)}`);
    },
    onError: () => toast.error("Couldn't save that"),
  });
  const cur = status?.studyCapacityMinutes;
  return (
    <Tile bg="var(--lilac)" tilt={0.5} className="flex flex-col" style={{ padding: 18, gap: 12 }}>
      <Head icon={<Timer size={17} weight="fill" aria-hidden="true" />} sub="How much time a day you can give German. It sizes today's ticket; the weekly goal is 6 study days of it.">
        Study time
      </Head>
      <div className="flex flex-wrap" style={{ gap: 6 }} role="group" aria-label="Minutes a day">
        {CAPACITIES.map((c) => (
          <Chip key={c.v} selected={cur === c.v} selectedTilt={-1.5} style={{ border: "2px solid var(--line)", fontSize: 13 }} disabled={save.isPending} onClick={() => cur !== c.v && save.mutate(c.v)}>
            {c.l}
          </Chip>
        ))}
      </div>
      {cur && (
        <span style={{ ...body, fontWeight: 700 }}>
          Weekly goal: {hours(cur * 6)}
        </span>
      )}
    </Tile>
  );
}

// ── exam date ────────────────────────────────────────────────────────────────

const PRESETS = [182, 200, 240];

function addDays(key: string, n: number): string {
  const d = new Date(`${key}T00:00:00`);
  d.setDate(d.getDate() + n);
  return localDateKey(d);
}
const daysBetween = (a: string, b: string) => Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86_400_000);
const fmtDate = (key: string) => new Date(`${key}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

function ExamDate({ suggest }: { suggest: number | null }) {
  const queryClient = useQueryClient();
  const { data: syllabus } = useQuery({ queryKey: ["learning", "syllabus"], queryFn: api.learningSyllabus });
  const today = localDateKey();
  const current = syllabus?.routePace.examTargetDate ?? null;
  const [picked, setPicked] = useState(current ?? "");
  useEffect(() => setPicked(current ?? ""), [current]);
  // after a plan reset the old date is stale: pre-fill a fresh one (the user still confirms it)
  useEffect(() => {
    if (suggest) setPicked(addDays(today, suggest));
  }, [suggest]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: (date: string | null) => api.setExamTarget(date),
    onSuccess: (_d, date) => {
      void queryClient.invalidateQueries({ queryKey: ["learning"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(date ? `Exam set for ${fmtDate(date)} · plan re-paced` : "Exam date cleared");
    },
    onError: () => toast.error("Couldn't save that date"),
  });

  const days = picked ? daysBetween(today, picked) : 0;
  const projected = syllabus?.routePace.projectedFinishDate ?? null;
  const projectedDays = projected ? daysBetween(today, projected) : null;
  const note =
    !picked || days < 1
      ? "Pick a date after today."
      : projectedDays === null
        ? `${days} days out. Close a few topics to see a pace projection.`
        : days >= projectedDays
          ? `${days} days out. At your pace you'd finish the level in ~${projectedDays} days. Comfortable.`
          : `${days} days out. Your pace projects ~${projectedDays} days, so this is tighter than your rate so far.`;
  const dirty = picked !== (current ?? "");

  return (
    <Tile bg="var(--orange)" tilt={-0.6} className="flex flex-col" style={{ padding: 18, gap: 12 }}>
      <Head icon={<FlagPennant size={17} weight="fill" aria-hidden="true" />} sub={current ? `Booked for ${fmtDate(current)}` : "No exam date yet"}>
        Exam date
      </Head>
      <input
        type="date"
        value={picked}
        min={addDays(today, 1)}
        onChange={(e) => setPicked(e.target.value)}
        aria-label="Exam date"
        style={{ ...fieldInput, width: "100%" }}
      />
      <div className="flex flex-wrap" style={{ gap: 6 }}>
        {PRESETS.map((n) => (
          <Chip key={n} size="sm" selected={picked === addDays(today, n)} selectedTilt={-1.5} style={{ border: "2px solid var(--line)" }} onClick={() => setPicked(addDays(today, n))}>
            in {n} days
          </Chip>
        ))}
      </div>
      <span style={body}>{note}</span>
      <div className="flex" style={{ gap: 8 }}>
        {current && (
          <PillButton variant="secondary" height={40} onClick={() => save.mutate(null)} disabled={save.isPending}>
            Clear
          </PillButton>
        )}
        <PillButton className="flex-1" height={40} disabled={!dirty || !picked || days < 1 || save.isPending} onClick={() => save.mutate(picked)}>
          {current ? "Update date" : "Set date"}
        </PillButton>
      </div>
    </Tile>
  );
}

// ── CVs ──────────────────────────────────────────────────────────────────────

const CV_KIND: Record<Cv["category"], string> = { lebenslauf: "Lebenslauf", ats: "ATS" };

function Cvs() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["cvs"], queryFn: api.cvs });
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const remove = useMutation({
    mutationFn: (id: string) => api.deleteCv(id),
    onSuccess: () => {
      setConfirm(null);
      void queryClient.invalidateQueries({ queryKey: ["cvs"] });
      toast.info("CV deleted");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't delete it"),
  });
  const cvs = data?.cvs ?? [];
  return (
    <Tile bg="var(--mint)" tilt={0.4} className="flex flex-col" style={{ padding: 18, gap: 12 }}>
      <Head icon={<FileText size={17} weight="fill" aria-hidden="true" />} sub="The files your applications point at. Pick one per application in Jobs.">
        CVs
      </Head>
      <div className="flex flex-col" style={{ gap: 6 }}>
        {cvs.map((cv) => (
          <div
            key={cv.id}
            className="flex items-center"
            style={{ gap: 8, padding: "8px 10px", border: "2px solid var(--line)", borderRadius: 12, background: "var(--plain)", color: "var(--plainText)" }}
          >
            <button type="button" onClick={() => downloadFile(cv.file.id, cv.file.originalName)} className="min-w-0 flex-1 cursor-pointer text-left" title={`Download ${cv.file.originalName}`} style={{ border: "none", background: "transparent", color: "inherit", padding: 0 }}>
              <span className="block truncate" style={{ fontSize: 14, fontWeight: 700 }}>
                {cv.title}
              </span>
              <span className="block" style={{ fontSize: 12, fontWeight: 600, color: "var(--plainMuted)" }}>
                {CV_KIND[cv.category]} · {cv.usedIn === 0 ? "not used yet" : `used by ${cv.usedIn} application${cv.usedIn === 1 ? "" : "s"}`}
              </span>
            </button>
            <button
              type="button"
              aria-label={confirm === cv.id ? `Really delete ${cv.title}` : `Delete ${cv.title}`}
              onClick={() => (confirm === cv.id ? remove.mutate(cv.id) : setConfirm(cv.id))}
              className="flex shrink-0 cursor-pointer items-center"
              style={{ height: 30, gap: 4, padding: confirm === cv.id ? "0 10px" : "0 8px", border: "2px dashed var(--line)", borderRadius: 999, background: "transparent", color: "inherit", fontSize: 12, fontWeight: 700 }}
            >
              <Trash size={12} weight="fill" aria-hidden="true" />
              {confirm === cv.id && "Sure?"}
            </button>
          </div>
        ))}
        {cvs.length === 0 && (
          <div style={{ ...body, padding: 12, border: "2.5px dashed var(--line)", borderRadius: 12, textAlign: "center" }}>No CVs yet.</div>
        )}
      </div>
      <PillButton variant="secondary" height={40} icon={<Plus size={14} weight="bold" aria-hidden="true" />} className="self-start" onClick={() => setAdding(true)}>
        Add a CV
      </PillButton>
      {adding && <AddCvModal onClose={() => setAdding(false)} />}
    </Tile>
  );
}

// ── Obsidian ─────────────────────────────────────────────────────────────────

function Obsidian() {
  const queryClient = useQueryClient();
  const { data: status } = useQuery({ queryKey: ["vault-status"], queryFn: api.vaultStatus });
  const [path, setPath] = useState("");
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["vault-status"] });
    void queryClient.invalidateQueries({ queryKey: ["words"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };
  const link = useMutation({
    mutationFn: () => api.vaultLink(path.trim()),
    onSuccess: (d) => {
      refresh();
      setPath("");
      toast.success(`Linked · imported ${d.wordCount} words`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't link that folder"),
  });
  const unlink = useMutation({
    mutationFn: api.vaultUnlink,
    onSuccess: () => {
      setConfirmUnlink(false);
      refresh();
      toast.info("Vault unlinked · your files are untouched");
    },
  });
  const sync = useMutation({ mutationFn: api.vaultSyncNow, onSuccess: () => (refresh(), toast.success("Synced")), onError: () => toast.error("Couldn't sync · try again") });
  const linked = !!status?.vaultPath;
  const row = (l: string, v: ReactNode) => (
    <div className="flex items-center justify-between" style={{ gap: 10, fontSize: 13, fontWeight: 600 }}>
      <span style={{ opacity: 0.8 }}>{l}</span>
      <span className="min-w-0 truncate" style={{ fontWeight: 700 }}>
        {v}
      </span>
    </div>
  );
  return (
    <Tile bg="var(--sky)" tilt={-0.3} className="flex flex-col" style={{ padding: 18, gap: 12 }}>
      <Head
        icon={<LinkSimple size={17} weight="bold" aria-hidden="true" />}
        sub={linked ? `${status!.wordCount} words · ${status!.watching ? "watching for changes" : "watcher stopped"}` : "Not linked"}
      >
        Obsidian vault
      </Head>
      {linked ? (
        <>
          <div className="flex flex-col" style={{ gap: 6, padding: "10px 12px", border: "2px solid var(--line)", borderRadius: 12, background: "var(--plain)", color: "var(--plainText)" }}>
            {row("Folder", <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{status!.vaultPath}</span>)}
            {row("Last sync", status!.lastSyncAt ? new Date(status!.lastSyncAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "never")}
          </div>
          <div className="flex" style={{ gap: 8 }}>
            <PillButton variant="secondary" height={40} onClick={() => (confirmUnlink ? unlink.mutate() : setConfirmUnlink(true))}>
              {confirmUnlink ? "Really unlink?" : "Unlink"}
            </PillButton>
            <PillButton className="flex-1" height={40} disabled={sync.isPending} icon={<ArrowCounterClockwise size={14} weight="bold" aria-hidden="true" />} onClick={() => sync.mutate()}>
              {sync.isPending ? "Syncing…" : "Sync now"}
            </PillButton>
          </div>
        </>
      ) : (
        <form
          className="flex flex-col"
          style={{ gap: 8 }}
          onSubmit={(e) => {
            e.preventDefault();
            if (path.trim()) link.mutate();
          }}
        >
          <label className="flex flex-col" style={{ gap: 6 }}>
            <span style={eyebrow}>Vault folder on the server</span>
            <input value={path} onChange={(e) => setPath(e.target.value)} placeholder="/home/you/Documents/Ausbildung 27/German" style={{ ...fieldInput, fontSize: 13 }} />
          </label>
          <PillButton type="submit" height={40} disabled={!path.trim() || link.isPending}>
            {link.isPending ? "Importing…" : "Link vault"}
          </PillButton>
        </form>
      )}
    </Tile>
  );
}

// ── vocabulary tagging ───────────────────────────────────────────────────────

function Tagging() {
  const queryClient = useQueryClient();
  const reclassify = useMutation({
    mutationFn: api.reclassifyWords,
    onSuccess: (d) => {
      void queryClient.invalidateQueries({ queryKey: ["words"] });
      toast.success(d.updated === 0 ? `Checked ${d.total} words · nothing was missing` : `Classified ${d.updated} of ${d.total} words`);
    },
    onError: () => toast.error("Couldn't run it · try again"),
  });
  return (
    <Tile tilt={0.3} className="flex flex-col" style={{ padding: 18, gap: 12 }}>
      <Head icon={<Tag size={17} weight="fill" aria-hidden="true" />} sub="Level and theme are filed in automatically when you add a word.">
        Vocabulary tagging
      </Head>
      <span style={{ ...body, color: "var(--plainMuted)" }}>
        Older words may still miss one. This fills in whatever's missing and never touches what you set yourself.
      </span>
      <PillButton variant="secondary" height={40} className="self-start" disabled={reclassify.isPending} onClick={() => reclassify.mutate()}>
        {reclassify.isPending ? "Classifying…" : "Fill in missing tags"}
      </PillButton>
    </Tile>
  );
}

// ── reset plan ───────────────────────────────────────────────────────────────

function ResetPlan({ onReset }: { onReset: () => void }) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const reset = useMutation({
    mutationFn: api.resetRoadmap,
    onSuccess: () => {
      setConfirming(false);
      invalidateHub(queryClient);
      toast.success("Plan reset from today · check the exam date");
      onReset();
    },
    onError: () => toast.error("Couldn't reset the plan · try again"),
  });
  return (
    <Tile bg="var(--tomato)" tilt={-0.5} className="flex flex-col" style={{ padding: 18, gap: 12 }}>
      <Head icon={<ArrowCounterClockwise size={17} weight="bold" aria-hidden="true" />} sub="Start a fresh 182-day plan from today.">
        Reset plan
      </Head>
      <span style={body}>Clears due dates and daily tasks, then lays out 182 days from today. Words, notes, syllabus progress and test history stay.</span>
      {confirming ? (
        <div className="flex" style={{ gap: 8 }}>
          <PillButton variant="secondary" height={40} onClick={() => setConfirming(false)}>
            Keep it
          </PillButton>
          <PillButton className="flex-1" height={40} disabled={reset.isPending} onClick={() => reset.mutate()}>
            {reset.isPending ? "Resetting…" : "Yes, reset"}
          </PillButton>
        </div>
      ) : (
        <PillButton variant="dashed" height={40} className="self-start" style={{ opacity: 1 }} onClick={() => setConfirming(true)}>
          Reset plan
        </PillButton>
      )}
    </Tile>
  );
}

export default function Settings() {
  const { bp } = useBreakpoint();
  const { data: status } = useQuery({ queryKey: ["roadmap", "status"], queryFn: api.roadmapStatus });
  const [suggestExam, setSuggestExam] = useState<number | null>(null);
  const cols = bp === "lg" ? 3 : bp === "md" ? 2 : 1;
  const tiles = [
    <Appearance key="a" />,
    <StudyTime key="s" status={status} />,
    <ExamDate key="e" suggest={suggestExam} />,
    <Cvs key="c" />,
    <Obsidian key="o" />,
    <Tagging key="t" />,
    <ResetPlan key="r" onReset={() => setSuggestExam(200)} />,
  ];
  // masonry-ish: deal tiles into columns so uneven heights don't leave grid holes
  const columns = Array.from({ length: cols }, (_, c) => tiles.filter((_, i) => i % cols === c));
  return (
    <div className="flex flex-col" style={{ gap: bp === "sm" ? 16 : 20, "--k": bp === "lg" ? 1 : bp === "md" ? 0.9 : 0.78 } as CSSProperties}>
      <Tile bg="var(--lemon)" tilt={-0.5} tape={{ left: 34, width: 84 }} className="flex flex-col" style={{ padding: bp === "sm" ? 16 : 18, gap: 6 }}>
        <Eyebrow>You &amp; the app</Eyebrow>
        <span style={{ fontSize: k(34), fontWeight: 700, letterSpacing: "-.04em", lineHeight: 1 }}>Settings</span>
      </Tile>
      <div className="grid items-start" style={{ gridTemplateColumns: `repeat(${cols},minmax(0,1fr))`, gap: bp === "sm" ? 16 : 20 }}>
        {columns.map((col, c) => (
          <div key={c} className="flex min-w-0 flex-col" style={{ gap: bp === "sm" ? 16 : 20 }}>
            {col}
          </div>
        ))}
      </div>
    </div>
  );
}
