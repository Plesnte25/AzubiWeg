import { useState, type CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, LockSimple, Trash } from "@phosphor-icons/react";
import { api } from "../../../api/client";
import type { ExamStatus, QuizResultsResponse, StudySource } from "../../../api/types";
import { Modal } from "../../../components/ui/Modal";
import { PillButton } from "../../../components/ui/PillButton";
import { toast } from "../../../components/ui/Toast";
import { useNavStack } from "../../../lib/navStack";
import { localDateKey, shortDate } from "../../../lib/tasks";
import type { Breakpoint } from "../../../lib/useBreakpoint";
import { band, isItemDone, LINE_LABEL, type Station } from "./model";
import { ScheduleGrid, SourceChip, type CheckpointTest, type ScheduleCard } from "./Stream";

const eyebrow: CSSProperties = { fontSize: 12, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" };
const rowS: CSSProperties = { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 14, border: "2px solid var(--line)", background: "var(--plain)", color: "var(--plainText)", flexShrink: 0 };
const pill = (bg: string, dashed = false): CSSProperties => ({ fontSize: 12, fontWeight: 700, padding: "2px 9px", borderRadius: 999, border: `2px ${dashed ? "dashed" : "solid"} var(--line)`, background: bg, color: "var(--onTile)", flexShrink: 0, whiteSpace: "nowrap" });

function useRefresh() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["learning"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };
}
const onError = (e: unknown) => toast.error(e instanceof Error ? e.message : "Something went wrong");

// ── Station ──

export function StationModal({
  station,
  total,
  fuel,
  onClose,
  onOpenItem,
  onOpenSource,
}: {
  station: Station;
  total: number;
  fuel: StudySource[];
  onClose: () => void;
  onOpenItem: (itemId: string) => void;
  onOpenSource: (s: StudySource) => void;
}) {
  const refresh = useRefresh();
  const [newTopic, setNewTopic] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const done = station.items.filter(isItemDone).length;
  const bg = station.state === "done" ? "var(--mint)" : station.state === "cur" ? "var(--lilac)" : "var(--plain2)";
  const stateLabel = station.skipped ? "skipped" : station.state === "done" ? "closed" : station.state === "cur" ? "you are here" : station.state === "gate" ? "the gate" : "ahead";

  const skip = useMutation({
    mutationFn: () => api.setStationSkipped(station.level, station.theme, !station.skipped),
    onSuccess: () => {
      toast.success(station.skipped ? "Station back on your route" : "Station skipped");
      refresh();
      onClose();
    },
    onError,
  });
  const add = useMutation({
    mutationFn: () => api.addSyllabusItem({ level: station.level, category: "skill", theme: station.theme, title: newTopic.trim() }),
    onSuccess: () => {
      setNewTopic("");
      toast.success("Topic added to this station");
      refresh();
    },
    onError,
  });
  const del = useMutation({
    mutationFn: (id: string) => api.deleteSyllabusItem(id),
    onSuccess: () => {
      setConfirmDelete(null);
      toast.success("Topic deleted");
      refresh();
    },
    onError,
  });

  const firstOpen = station.items.find((i) => !isItemDone(i)) ?? station.items[0];
  const cta = station.state === "done" ? "Review station" : station.state === "cur" ? "Continue" : "Preview first task";

  return (
    <Modal
      title={station.theme}
      tag={`Station ${station.index} of ${total} · ${stateLabel}`}
      subtitle={`${done}/${station.total} closed`}
      bg={bg}
      onClose={onClose}
      footer={
        <>
          <PillButton variant="secondary" style={{ minWidth: 110 }} disabled={skip.isPending} onClick={() => skip.mutate()}>
            {station.skipped ? "Unskip station" : "Skip station"}
          </PillButton>
          <PillButton className="flex-1" disabled={!firstOpen} onClick={() => firstOpen && onOpenItem(firstOpen.id)}>
            {cta}
          </PillButton>
        </>
      }
    >
      {station.items.map((item) => {
        const d = isItemDone(item);
        // per-topic locking (queue lines): a topic opens once the one before it in its line is passed
        const status = d ? "closed" : item.locked || station.state === "locked" ? "locked" : item.taken ? "on ticket" : "open";
        return (
          <div key={item.id} style={rowS}>
            <span aria-hidden="true" className="flex shrink-0 items-center justify-center" style={{ width: 22, height: 22, borderRadius: "50%", border: "2.5px solid var(--line)", background: d ? "var(--mint)" : "transparent", color: "var(--onTile)" }}>
              {d ? <Check size={12} weight="bold" /> : status === "locked" ? <LockSimple size={11} weight="fill" /> : null}
            </span>
            <button type="button" onClick={() => onOpenItem(item.id)} className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent p-0 text-left" style={{ color: "inherit" }}>
              <div lang="de" style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>
                {item.title}
              </div>
              <div style={{ fontSize: 12, fontWeight: 500, opacity: 0.7 }}>
                {item.skill ?? "topic"}
                {item.exerciseType ? " · exercise" : ""}
                {item.reviewDue ? " · review due" : ""}
              </div>
            </button>
            <span style={pill(status === "closed" ? "var(--mint)" : status === "locked" ? "transparent" : "var(--lemon)", status === "locked")}>{status}</span>
            {confirmDelete === item.id ? (
              <button type="button" onClick={() => del.mutate(item.id)} className="cursor-pointer" style={{ ...pill("var(--tomato)"), cursor: "pointer" }}>
                Delete?
              </button>
            ) : (
              <button type="button" aria-label={`Delete ${item.title}`} onClick={() => setConfirmDelete(item.id)} className="flex cursor-pointer items-center border-0 bg-transparent p-0" style={{ color: "inherit", opacity: 0.55 }}>
                <Trash size={15} weight="fill" aria-hidden="true" />
              </button>
            )}
          </div>
        );
      })}
      <div className="flex shrink-0 gap-2">
        <input
          value={newTopic}
          onChange={(e) => setNewTopic(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && newTopic.trim() && add.mutate()}
          placeholder="Add a topic to this station…"
          aria-label="New topic"
          style={{ flex: 1, minWidth: 0, height: 42, padding: "0 12px", border: "2.5px solid var(--line)", borderRadius: 12, background: "var(--plain)", color: "var(--plainText)", fontSize: 14, fontWeight: 600 }}
        />
        <PillButton height={42} variant="secondary" disabled={!newTopic.trim() || add.isPending} onClick={() => add.mutate()}>
          Add
        </PillButton>
      </div>
      <div className="flex shrink-0 flex-col gap-2">
        <span style={eyebrow}>Fuel for this stop</span>
        <div className="flex flex-wrap gap-2">
          {fuel.length ? fuel.map((s) => <SourceChip key={s.id} source={s} onClick={() => onOpenSource(s)} />) : <span style={{ fontSize: 13, fontWeight: 600 }}>No sources linked yet.</span>}
        </div>
      </div>
    </Modal>
  );
}

// ── Checkpoint ──

export function CheckpointModal({
  index,
  after,
  level,
  firstStation,
  tests,
  weak,
  lastResult,
  onClose,
}: {
  index: 1 | 2 | 3;
  after: number;
  level: string;
  firstStation: number;
  tests: CheckpointTest[];
  weak: string[];
  lastResult: { score: number; total: number } | null;
  onClose: () => void;
}) {
  const { push } = useNavStack();
  const start = () => push("/plan/self-tests/run", { state: { checkpointIndex: index, level } });
  const go = (t: CheckpointTest) => {
    if (t.key === "gender") push("/plan/self-tests/gender");
    else if (t.key === "listen") push("/plan/self-tests/listen");
    else start();
  };
  return (
    <Modal
      title="Self-tests"
      tag={`Checkpoint ${index} · after station ${after}`}
      subtitle={`A mixed test over stations ${firstStation}–${after}. It records your score and never locks anything.`}
      bg="var(--mint)"
      onClose={onClose}
      footer={
        <>
          <PillButton variant="secondary" style={{ minWidth: 110 }} onClick={onClose}>
            Close
          </PillButton>
          <PillButton className="flex-1" onClick={start}>
            Start mixed test · 20 q
          </PillButton>
        </>
      }
    >
      {lastResult && (
        <span style={{ fontSize: 14, fontWeight: 700 }}>
          Last time: {lastResult.score}/{lastResult.total} ({Math.round((lastResult.score / lastResult.total) * 100)}%)
        </span>
      )}
      {tests.map((t) => (
        <button key={t.key} type="button" onClick={() => go(t)} className="cursor-pointer text-left" style={{ ...rowS, cursor: "pointer", font: "inherit" }}>
          <div className="min-w-0 flex-1">
            <div style={{ fontSize: 15, fontWeight: 700 }}>{t.title}</div>
            <div style={{ fontSize: 12, fontWeight: 500, opacity: 0.7 }}>
              {t.key === "gender" ? "der, die or das for your nouns" : t.key === "listen" ? "hear a word, type it" : "part of the mixed test"}
            </div>
          </div>
          <span style={pill(t.percent === null ? "transparent" : band(t.percent), t.percent === null)}>{t.percent === null ? "not yet" : `${t.percent}%`}</span>
        </button>
      ))}
      {weak.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span style={eyebrow}>Weak spots</span>
          {weak.map((w) => (
            <span key={w} style={pill("var(--tomato)")}>
              {w}
            </span>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ── Gate ──

const SECTION_LABEL: Record<string, string> = { vocabulary: "Vocabulary", grammar: "Grammar", gender_drill: "Gender drill", listening: "Listening" };

export function GateModal({ status, stationIndex, schedule, bp, onClose }: { status: ExamStatus; stationIndex: number; schedule: ScheduleCard[]; bp: Breakpoint; onClose: () => void }) {
  const { push } = useNavStack();
  const refresh = useRefresh();
  const [moving, setMoving] = useState(false);
  const [date, setDate] = useState(status.examTargetDate ?? "");
  const questions = Object.values(status.sectionCounts).reduce((a, b) => a + b, 0);
  const rules = `${questions} questions · ${status.timeLimitMinutes} min · ${Math.round(status.passThreshold * 100)}% to pass`;
  const days = status.examTargetDate ? Math.round((new Date(`${status.examTargetDate}T00:00:00`).getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000) : null;
  const latest = [status.lastAttempt, status.lastMockAttempt].filter((a) => a?.sectionBreakdown).sort((a, b) => (b!.startedAt > a!.startedAt ? 1 : -1))[0];
  const move = useMutation({
    mutationFn: () => api.setExamTarget(date || null),
    onSuccess: () => {
      toast.success(date ? "Exam date moved" : "Exam date cleared");
      setMoving(false);
      refresh();
    },
    onError,
  });
  const realLine =
    status.reason === "already_passed"
      ? "You've passed this level's exam."
      : status.reason === "cooldown" && status.nextAvailableAt
        ? `Next real attempt from ${new Date(status.nextAvailableAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} (7-day gap between attempts).`
        : "The real exam is open whenever you're ready.";
  return (
    <Modal
      title={`${status.level.toUpperCase()} final exam`}
      tag={`Station ${stationIndex} · the gate`}
      subtitle={`${status.examTargetDate ? `${new Date(`${status.examTargetDate}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })} · ${days} days · ` : ""}${rules}`}
      bg="var(--orange)"
      onClose={onClose}
      footer={
        <>
          <PillButton variant="secondary" style={{ minWidth: 110 }} onClick={() => setMoving((v) => !v)}>
            Move date
          </PillButton>
          <PillButton className="flex-1" onClick={() => push("/exam-take", { state: { mode: "mock" } })}>
            Take mock exam
          </PillButton>
        </>
      }
    >
      {moving && (
        <div className="flex shrink-0 gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Exam date"
            style={{ flex: 1, height: 42, padding: "0 12px", border: "2.5px solid var(--line)", borderRadius: 12, background: "var(--plain)", color: "var(--plainText)", fontSize: 15, fontWeight: 600 }}
          />
          <PillButton height={42} disabled={move.isPending} onClick={() => move.mutate()}>
            Save
          </PillButton>
        </div>
      )}
      <div className="flex shrink-0 flex-col gap-2">
        <span style={eyebrow}>Section practice scores</span>
        {latest?.sectionBreakdown ? (
          latest.sectionBreakdown.map((s) => {
            const pct = s.total ? Math.round((s.correct / s.total) * 100) : 0;
            return (
              <div key={s.section} style={rowS}>
                <span className="flex-1" style={{ fontSize: 15, fontWeight: 700 }}>
                  {SECTION_LABEL[s.section] ?? s.section}
                </span>
                <span style={pill(band(pct))}>{pct}%</span>
              </div>
            );
          })
        ) : (
          <span style={{ fontSize: 14, fontWeight: 600 }}>No attempts yet — a mock exam shows where you stand, and never counts.</span>
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-2">
        <span style={eyebrow}>The real exam</span>
        <div className="flex flex-wrap items-center justify-between gap-2" style={rowS}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{realLine}</span>
          {status.allowed && (
            <PillButton height={40} onClick={() => push("/exam-take", { state: { mode: "real" } })}>
              Start the real exam
            </PillButton>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-2">
        <span style={eyebrow}>Schedule</span>
        <ScheduleGrid schedule={schedule} bp={bp} />
      </div>
    </Modal>
  );
}

// ── Week ──

/**
 * The ticket stub's Week modal (GET /roadmap/week): the last 7 days as they actually went — nothing here is ever
 * "overdue" in the self-paced queue — and what's next on each line, with dates projected from the real pace.
 */
export function WeekModal({ onClose }: { onClose: () => void }) {
  const { data } = useQuery({ queryKey: ["learning", "roadmap", "week"], queryFn: () => api.roadmapWeek() });
  const todayKey = localDateKey();
  return (
    <Modal
      title="Your week"
      tag="Last 7 days"
      subtitle={data ? `${data.thisWeek.done} tasks done · ${data.thisWeek.minutes} of ${data.thisWeek.goalMinutes} min goal` : undefined}
      bg="var(--lemon)"
      onClose={onClose}
    >
      {!data && <div aria-busy="true" style={{ minHeight: 200 }} />}
      {data?.days.map((d) => {
        const date = new Date(`${d.date}T00:00:00`);
        const isToday = d.date === todayKey;
        return (
          <div key={d.date} style={{ ...rowS, borderStyle: d.tasks.length || d.minutes ? "solid" : "dashed" }}>
            <div className="flex w-[54px] shrink-0 flex-col" style={{ lineHeight: 1.05 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em" }}>{date.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase()}</span>
              <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.04em" }}>{date.getDate()}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate" lang="de" style={{ fontSize: 14, fontWeight: 700 }}>
                {d.tasks.length ? d.tasks.map((t) => t.title.replace(/^[A-Za-z]+: /, "")).join(" · ") : d.studyDay ? "Nothing finished" : "Rest day"}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.7 }}>
                {d.tasks.length} done · {d.minutes} min
              </div>
            </div>
            {isToday && <span style={pill("var(--lemon)", false)}>today</span>}
          </div>
        );
      })}
      {data && data.upNext.length > 0 && (
        <div className="flex shrink-0 flex-col gap-2">
          <span style={eyebrow}>Next up</span>
          {data.upNext.map((l) => (
            <div key={l.line} className="flex flex-col gap-1">
              <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.75 }}>{LINE_LABEL[l.line]}</span>
              {l.topics.map((t) => (
                <div key={t.id} className="flex items-center gap-2" style={{ fontSize: 14, fontWeight: 600 }}>
                  {t.locked ? <LockSimple size={12} weight="fill" aria-hidden="true" /> : <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 3, border: "2px solid var(--line)", background: t.taken ? "var(--mint)" : "transparent" }} />}
                  <span lang="de" className="min-w-0 flex-1 truncate">{t.title}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.75 }}>{t.taken ? "on ticket" : t.projectedDate ? `~${shortDate(new Date(`${t.projectedDate}T00:00:00`))}` : ""}</span>
                </div>
              ))}
            </div>
          ))}
          <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.7 }}>Dates are projections from your pace over the last 4 weeks.</span>
        </div>
      )}
    </Modal>
  );
}

export type { QuizResultsResponse };
