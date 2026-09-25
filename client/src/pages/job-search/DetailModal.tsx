import { useState, type CSSProperties, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowSquareOut, Check, FileText, Plus, X } from "@phosphor-icons/react";
import { api, downloadFile } from "../../api/client";
import type { Application, ApplicationDetail, ApplicationEvent, ApplicationStatus, CefrLevel, CuratedPhrase, GermanLevel } from "../../api/types";
import { Chip } from "../../components/ui/Chip";
import { Modal } from "../../components/ui/Modal";
import { PillButton } from "../../components/ui/PillButton";
import { toast } from "../../components/ui/Toast";
import { localDateKey } from "../../lib/tasks";
import {
  GERMAN_LEVELS,
  STAGES,
  STAGE_LABEL,
  clockTime,
  companyColor,
  dayMonth,
  hasTime,
  levelGap,
  levelMessage,
  levelProgress,
  sourceLabel,
  type BoardStage,
} from "./model";
import { eyebrow, fieldInput } from "../../components/ui/fields";

/*
 * Application detail (AzubiJobs.dc.html detail modal; bg = company colour). Real-data deviations, per the plan:
 * - the Checklist section is omitted (deferred: no per-application checklist storage yet — a fake one would lose
 *   its ticks on reload);
 * - the timeline is the real event log, with a date on each logged event (an upcoming interview feeds Next up);
 * - phrases are the curated bank for the current stage plus your own; "+" adds a Speaking task to today's ticket;
 * - Edit / Mark rejected / Delete live in a tools row, since rejected isn't a board column.
 */

export interface YourLevel {
  level: CefrLevel;
  percent: number;
}

// ── phrase "added today" memory (per viewer; the task itself is the real record) ─

const ADDED_KEY = "azubiweg-phrases-added";

function readAdded(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(ADDED_KEY) ?? "null") as { date: string; ids: string[] } | null;
    return new Set(raw && raw.date === localDateKey() ? raw.ids : []);
  } catch {
    return new Set();
  }
}

function writeAdded(ids: Set<string>) {
  try {
    localStorage.setItem(ADDED_KEY, JSON.stringify({ date: localDateKey(), ids: [...ids] }));
  } catch {
    // storage blocked: the tick just won't survive a reload
  }
}

// ── pieces ───────────────────────────────────────────────────────────────────

export function Stepper({ status, onPick, sm }: { status: ApplicationStatus; onPick: (s: BoardStage) => void; sm?: boolean }) {
  const si = STAGES.findIndex((s) => s.id === status);
  return (
    <div className="flex shrink-0" style={{ gap: 6 }} role="group" aria-label="Stage">
      {STAGES.map((s, i) => {
        const cur = i === si;
        return (
          <button
            key={s.id}
            type="button"
            aria-pressed={cur}
            onClick={() => !cur && onPick(s.id)}
            className="flex min-w-0 flex-1 cursor-pointer items-center justify-center whitespace-nowrap"
            style={{
              height: 38,
              gap: 5,
              border: `2.5px ${i > si ? "dashed" : "solid"} var(--line)`,
              borderRadius: 999,
              background: cur ? "var(--sel)" : i < si ? "var(--plain)" : "transparent",
              boxShadow: cur ? "2px 2px 0 var(--shadow)" : "none",
              color: cur ? "var(--selText)" : i < si ? "var(--plainText)" : "var(--onTile)",
              fontWeight: 700,
              fontSize: sm ? 12 : 13,
              padding: "0 4px",
            }}
          >
            {i < si && <Check size={13} weight="bold" aria-hidden="true" />}
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

function LangCard({ asked, you }: { asked: GermanLevel; you: YourLevel }) {
  const gap = levelGap(asked, you.level);
  return (
    <div
      className="flex shrink-0 flex-col"
      style={{ gap: 6, padding: "10px 12px", border: "2.5px solid var(--line)", borderRadius: 14, background: gap > 0 ? "var(--tomato)" : "var(--mint)", color: "var(--onTile)" }}
    >
      <div className="flex justify-between" style={{ fontSize: 13, fontWeight: 700 }}>
        <span>Asks for {asked.toUpperCase()}</span>
        <span>
          you: {you.level.toUpperCase()} · {you.percent}%
        </span>
      </div>
      <div style={{ height: 12, border: "2px solid var(--line)", borderRadius: 999, background: "var(--plain)", overflow: "hidden", boxSizing: "border-box" }}>
        <div style={{ width: `${levelProgress(asked, you.level, you.percent)}%`, height: "100%", background: "var(--lemon)", borderRight: "2px solid var(--line)" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600 }}>{levelMessage(asked, you.level)}</span>
    </div>
  );
}

const rowBox: CSSProperties = {
  padding: "8px 10px",
  border: "2px solid var(--line)",
  borderRadius: 12,
  background: "var(--plain)",
  color: "var(--plainText)",
};

function eventTitle(e: ApplicationEvent): string {
  if (e.type === "created") return "Saved posting";
  if (e.type === "status_change") {
    if (e.toStatus === "applied") return "Application sent";
    if (e.toStatus === "interview") return "Invited to interview";
    if (e.toStatus === "offer") return "Offer received";
    if (e.toStatus === "rejected") return "Closed · rejected";
    return `Moved to ${STAGE_LABEL[e.toStatus ?? "wishlist"]}`;
  }
  const kind = e.type === "interview" ? "Interview" : e.type === "follow_up" ? "Follow-up" : "Note";
  return e.note ? (e.type === "note" ? e.note : `${kind}: ${e.note}`) : kind;
}

const LOG_TYPES = [
  ["interview", "Interview"],
  ["follow_up", "Follow-up"],
  ["note", "Note"],
] as const;

function Timeline({ app, onChanged }: { app: ApplicationDetail; onChanged: () => void }) {
  const [type, setType] = useState<"interview" | "follow_up" | "note">("interview");
  const [text, setText] = useState("");
  const [when, setWhen] = useState("");
  const add = useMutation({
    mutationFn: () => api.addApplicationEvent(app.id, { type, note: text.trim() || undefined, occurredAt: when ? new Date(when).toISOString() : undefined }),
    onSuccess: () => {
      setText("");
      setWhen("");
      onChanged();
    },
    onError: () => toast.error("Couldn't log that"),
  });
  const remove = useMutation({ mutationFn: (eventId: string) => api.deleteApplicationEvent(app.id, eventId), onSuccess: onChanged });
  const now = Date.now();
  const events = [...app.events].sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
  return (
    <div className="flex shrink-0 flex-col" style={{ gap: 6 }}>
      <span style={eyebrow}>Timeline</span>
      {events.map((e) => {
        const d = new Date(e.occurredAt);
        const upcoming = d.getTime() > now;
        const own = e.type !== "created" && e.type !== "status_change";
        return (
          <div key={e.id} className="flex items-center" style={{ ...rowBox, gap: 10 }}>
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                border: "2.5px solid var(--line)",
                background: upcoming ? "var(--plain)" : "var(--lemon)",
                boxSizing: "border-box",
                flexShrink: 0,
              }}
            />
            <span className="min-w-0 flex-1" style={{ fontSize: 14, fontWeight: 700, overflowWrap: "anywhere" }}>
              {eventTitle(e)}
            </span>
            <span className="shrink-0" style={{ fontSize: 12, fontWeight: 600, color: "var(--plainMuted)" }}>
              {dayMonth(d)}
              {own && hasTime(d) ? ` · ${clockTime(d)}` : ""}
              {upcoming ? " · upcoming" : ""}
            </span>
            {own && (
              <button
                type="button"
                aria-label="Remove this entry"
                onClick={() => remove.mutate(e.id)}
                className="flex shrink-0 cursor-pointer items-center justify-center p-0"
                style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid var(--line)", background: "transparent", color: "inherit" }}
              >
                <X size={11} weight="bold" aria-hidden="true" />
              </button>
            )}
          </div>
        );
      })}
      <form
        className="flex flex-col"
        style={{ ...rowBox, gap: 8, background: "var(--plain2)" }}
        onSubmit={(e) => {
          e.preventDefault();
          if (type === "note" && !text.trim()) return;
          add.mutate();
        }}
      >
        <div className="flex flex-wrap" style={{ gap: 6 }}>
          {LOG_TYPES.map(([t, l]) => (
            <Chip key={t} size="sm" selected={type === t} selectedTilt={-1.5} onClick={() => setType(t)}>
              {l}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap" style={{ gap: 6 }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={type === "interview" ? "e.g. Werkstatt tour, bring Zeugnisse" : type === "follow_up" ? "e.g. Called HR" : "What happened?"}
            aria-label="What happened"
            style={{ ...fieldInput, flex: "1 1 180px", height: 40, fontSize: 14 }}
          />
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            aria-label="When (leave empty for now)"
            style={{ ...fieldInput, flex: "0 1 200px", height: 40, fontSize: 13 }}
          />
          <PillButton height={40} disabled={add.isPending || (type === "note" && !text.trim())} type="submit" style={{ padding: "0 16px" }}>
            Log
          </PillButton>
        </div>
      </form>
    </div>
  );
}

function PhraseRow({ text, en, added, onAdd, onRemove }: { text: string; en?: string; added: boolean; onAdd: () => void; onRemove?: () => void }) {
  return (
    <div className="flex items-center" style={{ ...rowBox, gap: 8 }}>
      <span className="min-w-0 flex-1" style={{ lineHeight: 1.3 }}>
        <span lang="de" style={{ display: "block", fontSize: 13, fontWeight: 600 }}>
          {text}
        </span>
        {en && <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--plainMuted)" }}>{en}</span>}
      </span>
      {onRemove && (
        <button
          type="button"
          aria-label="Delete this phrase"
          onClick={onRemove}
          className="flex shrink-0 cursor-pointer items-center justify-center p-0"
          style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid var(--line)", background: "transparent", color: "inherit" }}
        >
          <X size={11} weight="bold" aria-hidden="true" />
        </button>
      )}
      <button
        type="button"
        onClick={onAdd}
        disabled={added}
        aria-label={added ? "Added to today" : "Add to today"}
        className="flex shrink-0 items-center justify-center p-0"
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: "2px solid var(--line)",
          background: added ? "var(--mint)" : "var(--lemon)",
          color: "var(--onTile)",
          cursor: added ? "default" : "pointer",
        }}
      >
        {added ? <Check size={13} weight="bold" aria-hidden="true" /> : <Plus size={13} weight="bold" aria-hidden="true" />}
      </button>
    </div>
  );
}

function Phrases({ app, suggested, onChanged }: { app: ApplicationDetail; suggested: CuratedPhrase[]; onChanged: () => void }) {
  const queryClient = useQueryClient();
  const [added, setAdded] = useState(readAdded);
  const [draft, setDraft] = useState("");
  const addTask = useMutation({
    mutationFn: ({ text }: { key: string; text: string }) =>
      api.addRoadmapTask({ date: localDateKey(), title: `Rehearse: „${text.length > 110 ? `${text.slice(0, 107)}…` : text}“`, description: `Interview phrase for ${app.company}`, skill: "speaking" }),
    onSuccess: (_d, { key }) => {
      const next = new Set(added).add(key);
      setAdded(next);
      writeAdded(next);
      toast.success("Added to today's ticket · Speaking");
      void queryClient.invalidateQueries({ queryKey: ["learning"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Couldn't add it to today"),
  });
  const addOwn = useMutation({
    mutationFn: () => api.addApplicationPhrase(app.id, draft.trim()),
    onSuccess: () => {
      setDraft("");
      onChanged();
    },
  });
  const removeOwn = useMutation({ mutationFn: (id: string) => api.deleteApplicationPhrase(app.id, id), onSuccess: onChanged });
  const row = (key: string, text: string, en?: string, onRemove?: () => void) => (
    <PhraseRow key={key} text={text} en={en} added={added.has(key)} onAdd={() => addTask.mutate({ key, text })} onRemove={onRemove} />
  );
  return (
    <div className="flex shrink-0 flex-col" style={{ gap: 6 }}>
      <span style={eyebrow}>Phrases to rehearse</span>
      {suggested.map((p) => row(`${app.id}:${p.id}`, p.de, p.en))}
      {app.phrases.map((p) => row(`${app.id}:own:${p.id}`, p.text, undefined, () => removeOwn.mutate(p.id)))}
      <form
        className="flex"
        style={{ gap: 6 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) addOwn.mutate();
        }}
      >
        <input
          lang="de"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Your own phrase for this job…"
          aria-label="Your own phrase"
          style={{ ...fieldInput, flex: 1, height: 40, fontSize: 14 }}
        />
        <PillButton height={40} variant="secondary" type="submit" disabled={!draft.trim() || addOwn.isPending} style={{ padding: "0 16px" }}>
          Add
        </PillButton>
      </form>
    </div>
  );
}

// ── edit ─────────────────────────────────────────────────────────────────────

function EditForm({ app, onDone, onChanged }: { app: ApplicationDetail; onDone: () => void; onChanged: () => void }) {
  const { data: cvs } = useQuery({ queryKey: ["cvs"], queryFn: api.cvs });
  const [f, setF] = useState({
    company: app.company,
    role: app.role,
    location: app.location ?? "",
    url: app.url ?? "",
    germanLevel: app.germanLevel,
    cvId: app.cvId,
  });
  const valid = f.company.trim() && f.role.trim();
  const save = useMutation({
    mutationFn: () =>
      api.updateApplication(app.id, {
        company: f.company.trim(),
        role: f.role.trim(),
        location: f.location.trim() || null,
        url: f.url.trim() || null,
        germanLevel: f.germanLevel,
        cvId: f.cvId,
      }),
    onSuccess: () => {
      onChanged();
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't save"),
  });
  const field = (label: string, key: "company" | "role" | "location" | "url", ph: string) => (
    <label className="flex min-w-0 flex-col" style={{ gap: 6 }}>
      <span style={eyebrow}>{label}</span>
      <input value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })} placeholder={ph} style={fieldInput} />
    </label>
  );
  return (
    <div className="flex shrink-0 flex-col" style={{ gap: 12 }}>
      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 12 }}>
        {field("Company *", "company", "e.g. Porsche")}
        {field("Role *", "role", "e.g. Azubi Kfz-Mechatroniker/in")}
        {field("Location", "location", "e.g. Leipzig")}
        {field("Posting link", "url", "https://…")}
      </div>
      <Pickers
        label="German asked for"
        options={[[null, "Not stated"], ...GERMAN_LEVELS.map((l) => [l, l.toUpperCase()] as const)]}
        value={f.germanLevel}
        onPick={(v) => setF({ ...f, germanLevel: v })}
      />
      <Pickers
        label="CV to use"
        options={[[null, "None"], ...(cvs?.cvs ?? []).filter((c) => c.kind === "cv" || c.id === f.cvId).map((c) => [c.id, c.title] as const)]}
        value={f.cvId}
        onPick={(v) => setF({ ...f, cvId: v })}
      />
      <div className="flex" style={{ gap: 8 }}>
        <PillButton variant="secondary" style={{ minWidth: 110 }} onClick={onDone}>
          Cancel
        </PillButton>
        <PillButton className="flex-1" disabled={!valid || save.isPending} onClick={() => save.mutate()}>
          Save changes
        </PillButton>
      </div>
    </div>
  );
}

export function Pickers<T extends string | null>({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: readonly (readonly [T, string])[];
  value: T;
  onPick: (v: T) => void;
}) {
  return (
    <div className="flex shrink-0 flex-col" style={{ gap: 6 }}>
      <span style={eyebrow}>{label}</span>
      <div className="flex flex-wrap" style={{ gap: 6 }} role="group" aria-label={label}>
        {options.map(([v, l]) => (
          <Chip key={String(v)} selected={value === v} selectedTilt={-1.5} style={{ border: "2px solid var(--line)", fontSize: 13 }} onClick={() => onPick(v)}>
            {l}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function ToolButton({ children, onClick, danger, icon }: { children: ReactNode; onClick: () => void; danger?: boolean; icon?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 cursor-pointer items-center"
      style={{
        height: 32,
        gap: 5,
        padding: "0 12px",
        border: `2px ${danger ? "dashed" : "solid"} var(--line)`,
        borderRadius: 999,
        background: danger ? "transparent" : "var(--plain)",
        color: danger ? "var(--onTile)" : "var(--plainText)",
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      {icon}
      {children}
    </button>
  );
}

// ── the modal ────────────────────────────────────────────────────────────────

export function DetailModal({
  id,
  you,
  sm,
  onClose,
  onMove,
}: {
  id: string;
  you: YourLevel | null;
  sm: boolean;
  onClose: () => void;
  /** Stage change (stepper, footer, reject): the board owns it so the toast and cache update live in one place. */
  onMove: (app: Application, to: ApplicationStatus) => void;
}) {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["applications", id], queryFn: () => api.application(id) });
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["applications"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };
  const remove = useMutation({
    mutationFn: () => api.deleteApplication(id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["applications", id], exact: true });
      refresh();
      toast.info(`${data?.application.company ?? "Application"} deleted`);
      onClose();
    },
  });

  const app = data?.application;
  if (!app) return null;
  const si = STAGES.findIndex((s) => s.id === app.status);
  const rejected = app.status === "rejected";
  const next = STAGES[si + 1];

  const primary = rejected
    ? { label: "Reopen", act: () => onMove(app, app.appliedAt ? "applied" : "wishlist") }
    : next
      ? { label: `Move to ${next.label}`, act: () => onMove(app, next.id) }
      : { label: "Accept offer", act: () => (toast.success("Glückwunsch!"), onClose()) };

  return (
    <Modal
      tag={`${app.location ? `${app.location} · ` : ""}via ${sourceLabel(app)}`}
      title={app.company}
      subtitle={<span lang="de">{app.role}</span>}
      bg={companyColor(app.company)}
      width={580}
      onClose={onClose}
      footer={
        <>
          <PillButton variant="secondary" style={{ minWidth: 110 }} onClick={onClose}>
            Close
          </PillButton>
          <PillButton className="flex-1" onClick={primary.act}>
            {primary.label}
          </PillButton>
        </>
      }
    >
      {rejected ? (
        <div className="shrink-0" style={{ ...rowBox, fontSize: 14, fontWeight: 700, borderStyle: "dashed", background: "transparent", color: "inherit" }}>
          Closed · rejected. It counts toward “closed” on the board; Reopen puts it back.
        </div>
      ) : (
        <Stepper status={app.status} sm={sm} onPick={(s) => onMove(app, s)} />
      )}

      <div className="flex shrink-0 flex-wrap items-center" style={{ gap: 6 }}>
        {app.url && (
          <a
            href={app.url}
            target="_blank"
            rel="noreferrer"
            className="flex shrink-0 items-center"
            style={{ height: 32, gap: 5, padding: "0 12px", border: "2px solid var(--line)", borderRadius: 999, background: "var(--plain)", color: "var(--plainText)", fontSize: 13, fontWeight: 700 }}
          >
            Posting <ArrowSquareOut size={13} weight="bold" aria-hidden="true" />
          </a>
        )}
        {app.cv?.file && (
          <ToolButton icon={<FileText size={13} weight="fill" aria-hidden="true" />} onClick={() => downloadFile(app.cv!.file!.id, app.cv!.file!.originalName)}>
            {app.cv.title}
            {app.cvVersion !== null && app.cvVersion !== app.cv.version && ` · v${app.cvVersion}`}
          </ToolButton>
        )}
        <span className="flex-1" />
        {!editing && <ToolButton onClick={() => setEditing(true)}>Edit</ToolButton>}
        {!rejected && (
          <ToolButton danger onClick={() => onMove(app, "rejected")}>
            Mark rejected
          </ToolButton>
        )}
        <ToolButton danger onClick={() => (confirmDelete ? remove.mutate() : setConfirmDelete(true))}>
          {confirmDelete ? "Really delete?" : "Delete"}
        </ToolButton>
      </div>

      {editing ? (
        <EditForm app={app} onDone={() => setEditing(false)} onChanged={refresh} />
      ) : (
        <>
          {app.germanLevel && you ? (
            <LangCard asked={app.germanLevel} you={you} />
          ) : (
            <div className="shrink-0" style={{ ...rowBox, fontSize: 13, fontWeight: 600, borderStyle: "dashed", background: "transparent", color: "inherit" }}>
              The posting's German level isn't set. Edit to add it.
            </div>
          )}
          <Timeline app={app} onChanged={refresh} />
          <Phrases app={app} suggested={data.suggestedPhrases} onChanged={refresh} />
        </>
      )}
    </Modal>
  );
}
