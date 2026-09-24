import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { ApiError, api } from "../../../api/client";
import type { StudySource } from "../../../api/types";
import { EmptyState } from "../../../components/ui/EmptyState";
import { PillButton } from "../../../components/ui/PillButton";
import { toast } from "../../../components/ui/Toast";
import { useNavStack } from "../../../lib/navStack";
import { KIND_LABELS, daysUntil, reviewMinutes, shortDate, taskEstimateMinutes, taskKind } from "../../../lib/tasks";
import { useBreakpoint } from "../../../lib/useBreakpoint";
import { AddSourceModal, LibraryModal, SourceModal } from "./LibraryModals";
import { CheckpointModal, GateModal, StationModal, WeekModal } from "./Modals";
import { CHECKPOINT_AFTER, checkpointAt, deriveStations, isItemDone, type Station } from "./model";
import { AltitudeRail, AltitudeStrip, LibraryTile, NotesTile, NowTile, type AltLevel } from "./Rail";
import {
  Behind,
  CheckpointTile,
  CurrentStation,
  GateTile,
  LaterToggle,
  NowCard,
  StationCards,
  Ticket,
  type CheckpointTest,
  type ScheduleCard,
  type TicketRow,
} from "./Stream";
import { TaskModal } from "./TaskModal";
import { useLiveSeconds, useTaskTimerActions } from "./useTaskTimer";

/*
 * Plan — the journey scroll (Bento README §4, AzubiPlanJourney.dc.html). One page replaces Plan, Syllabus, Sources,
 * Self-tests and the Exam gate (their old routes redirect here). Stations are derived (level, theme) syllabus groups;
 * the ticket is today's roadmap; the Now tile drives the one app-wide task timer; the Notes tile is the current
 * station's notes and a drop target for pinning tasks; the Library holds the study sources that fuel stations.
 */

type ModalState =
  | { k: "task"; taskId?: string; itemId?: string; origin: string }
  | { k: "station"; key: string }
  | { k: "check"; index: 1 | 2 | 3 }
  | { k: "gate" }
  | { k: "week" }
  | { k: "lib" }
  | { k: "source"; id: string }
  | { k: "add" };

const MISTAKE_LABELS: Record<string, string> = {
  gender_article: "der/die/das",
  case: "Cases",
  word_order: "Word order",
  conjugation: "Conjugation",
  vocabulary: "Vocabulary",
  spelling: "Spelling",
  pronunciation: "Pronunciation",
  listening_detail: "Listening detail",
  collocation: "Collocations",
  other: "Other",
};

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function fmtDate(d: Date): string {
  return shortDate(d);
}

export default function Journey() {
  const { bp, fill } = useBreakpoint();
  const { push } = useNavStack();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<ModalState | null>(null);
  const [laterOpen, setLaterOpen] = useState(false);
  const dragOK = bp !== "sm";
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }));

  const { data: dash } = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });
  const { data: status } = useQuery({ queryKey: ["roadmap", "status"], queryFn: api.roadmapStatus });
  const activated = status?.activated ?? false;
  const { data: today } = useQuery({ queryKey: ["learning", "roadmap", "today"], queryFn: api.roadmapToday, enabled: activated });
  const { data: syllabus } = useQuery({ queryKey: ["learning", "syllabus"], queryFn: api.learningSyllabus });
  const { data: sourcesData } = useQuery({ queryKey: ["learning", "sources"], queryFn: api.learningSources });
  const { data: quiz } = useQuery({ queryKey: ["learning", "quizResults"], queryFn: api.quizResults });
  const { data: exam } = useQuery({ queryKey: ["learning", "exam", "status"], queryFn: api.examStatus });
  const { data: mistakes } = useQuery({ queryKey: ["learning", "mistakes"], queryFn: api.syllabusMistakes });

  const level = dash?.bento.level.level ?? "a1";
  const items = useMemo(() => syllabus?.items ?? [], [syllabus]);
  const stations = useMemo(() => deriveStations(items, level), [items, level]);
  const current = stations.find((s) => s.state === "cur") ?? null;
  const gate = stations.find((s) => s.state === "gate") ?? stations[stations.length - 1] ?? null;
  const sources = useMemo(() => {
    const all = sourcesData?.sources ?? [];
    return [...all].sort((a, b) => Number(b.stationKey === current?.key) - Number(a.stationKey === current?.key) || (b.updatedAt > a.updatedAt ? 1 : -1));
  }, [sourcesData, current?.key]);
  const fuelFor = (s: Station) => sources.filter((x) => x.stationKey === s.key);

  const { data: notesData } = useQuery({ queryKey: ["notes", "station", current?.key], queryFn: () => api.stationNotes(current!.key), enabled: !!current });

  // deep links: a task from Today (push("/plan", {state:{openTaskId}})), a station or source from a note's link chip
  useEffect(() => {
    const st = (location.state as { openTaskId?: string; openStationKey?: string; openSourceId?: string } | null) ?? {};
    if (st.openTaskId) setModal({ k: "task", taskId: st.openTaskId, origin: "Today's ticket" });
    else if (st.openStationKey) setModal({ k: "station", key: st.openStationKey });
    else if (st.openSourceId) setModal({ k: "source", id: st.openSourceId });
  }, [location.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["learning"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["notes"] });
  };
  const onError = (e: unknown) => toast.error(e instanceof Error ? e.message : "Something went wrong");
  const timer = useTaskTimerActions();

  const toggleTask = useMutation({
    mutationFn: (v: { id: string; done: boolean }) => api.toggleRoadmapTask(v.id, v.done),
    onSuccess: refresh,
    onError: (e, v) => {
      if (e instanceof ApiError && e.status === 409) {
        toast.info("Pass the exercise first — here it is");
        setModal({ k: "task", taskId: v.id, origin: "Today's ticket" });
      } else onError(e);
    },
  });
  const toggleItem = useMutation({
    mutationFn: (v: { id: string; done: boolean }) => api.toggleSyllabusItem(v.id, v.done),
    onSuccess: refresh,
    onError: (e, v) => {
      if (e instanceof ApiError && e.status === 409) {
        toast.info("Pass the exercise first — here it is");
        setModal({ k: "task", itemId: v.id, origin: current ? `Station ${current.index}` : "Station" });
      } else onError(e);
    },
  });
  const pullIn = useMutation({ mutationFn: api.pullBacklogIntoToday, onSuccess: (r) => (toast.success(`Pulled ${r.moved.length} into today`), refresh()), onError });
  const spread = useMutation({ mutationFn: api.spreadBacklog, onSuccess: (r) => (toast.success(`Spread ${r.moved.length} over ${r.overDays} days`), refresh()), onError });
  const saveNote = useMutation({
    mutationFn: (v: { title?: string; text: string; pinned?: boolean; roadmapTaskId?: string; syllabusItemId?: string; skill?: string | null }) =>
      api.createNote({
        title: v.title ?? null,
        body: v.text.split(/\n+/).map((l) => `<p>${escapeHtml(l)}</p>`).join(""),
        stationKey: current?.key ?? null,
        pinned: v.pinned ?? false,
        roadmapTaskId: v.roadmapTaskId ?? null,
        syllabusItemId: v.syllabusItemId ?? null,
        skill: (v.skill ?? null) as never,
      }),
    onSuccess: (_, v) => {
      toast.success(v.pinned ? `Pinned to Station ${current?.index ?? ""} notes` : `Note saved · Station ${current?.index ?? ""}`);
      refresh();
    },
    onError,
  });
  const activate = useMutation({ mutationFn: () => api.activateRoadmap(), onSuccess: () => (void queryClient.invalidateQueries({ queryKey: ["roadmap"] }), refresh()), onError });

  // ── ticket rows ──
  const core = new Set(today?.queues.coreTaskIds ?? []);
  const accel = new Set(today?.queues.accelerationTaskIds ?? []);
  const taskRow = (t: NonNullable<typeof today>["tasks"][number]): TicketRow => {
    const k = taskKind(t);
    return { key: `t:${t.id}`, taskId: t.id, title: t.title, meta: `${k.label} · ${taskEstimateMinutes(t.type)} min`, color: k.color, done: !!t.completedAt, running: !!t.timerRunningSince };
  };
  const tasks = (today?.tasks ?? []).filter((t) => !t.droppedAt);
  const rows: TicketRow[] = [
    ...((dash?.dueToday ?? 0) > 0
      ? [{ key: "review", review: true, title: `Review ${dash!.dueToday} cards`, meta: `Vocab · ${reviewMinutes(dash!.dueToday)} min`, color: "var(--tomato)", done: false }]
      : []),
    ...(today?.queues.topicReviews ?? []).map((r) => ({ key: `r:${r.id}`, itemId: r.id, title: `Review: ${r.title}`, meta: "Topic review · 10 min", color: "var(--lilac)", done: false })),
    ...tasks.filter((t) => t.completedAt || core.has(t.id)).map(taskRow),
  ];
  const optional = tasks.filter((t) => !t.completedAt && accel.has(t.id)).map(taskRow);
  const openRows = rows.filter((r) => !r.done);
  const minutesLeft = openRows.reduce((n, r) => n + Number(r.meta.match(/(\d+) min/)?.[1] ?? 0), 0);
  const capLine = rows.length === 0 ? "nothing planned" : openRows.length === 0 ? `All ${rows.length} done` : `${rows.length - openRows.length}/${rows.length} · ${minutesLeft} min left`;
  const carriedOver = (today?.backlog ?? []).reduce((n, g) => n + g.tasks.length, 0);

  const openRow = (r: TicketRow) => {
    if (r.review) push("/review");
    else setModal({ k: "task", taskId: r.taskId, itemId: r.itemId, origin: "Today's ticket" });
  };
  const toggleRow = (r: TicketRow) => {
    if (r.taskId) toggleTask.mutate({ id: r.taskId, done: !r.done });
    else if (r.itemId) setModal({ k: "task", itemId: r.itemId, origin: "Today's ticket" });
  };

  // ── Now ──
  const running = dash?.bento.runningTask ?? null;
  const nowTask = running
    ? { id: running.id, title: running.title, skill: running.skill, timerSeconds: running.timerSeconds, timerRunningSince: running.timerRunningSince as string | null, type: tasks.find((t) => t.id === running.id)?.type ?? "generic" }
    : (() => {
        const t = tasks.find((x) => !x.completedAt && core.has(x.id));
        return t ? { id: t.id, title: t.title, skill: t.skill, timerSeconds: t.timerSeconds, timerRunningSince: t.timerRunningSince, type: t.type } : null;
      })();
  const nowSeconds = useLiveSeconds(nowTask);
  const nowRunning = !!nowTask?.timerRunningSince;
  const nowEstimate = nowTask ? taskEstimateMinutes(nowTask.type) : 10;

  // ── stations around "you are here" ──
  const upcoming = current ? stations.filter((s) => s.index > current.index && s.state !== "gate") : [];
  const cpAfter = current ? (CHECKPOINT_AFTER.find((c) => c >= current.index && c < (gate?.index ?? 99)) ?? null) : null;
  const next = cpAfter ? upcoming.filter((s) => s.index <= cpAfter) : upcoming;
  const later = cpAfter ? upcoming.filter((s) => s.index > cpAfter) : [];
  const closed = stations.filter((s) => s.state === "done");
  const prevLevels = (dash?.bento.level.levels ?? []).filter((l) => l.state === "done").map((l) => l.level.toUpperCase());

  // projected checkpoint date: when the checkpoint station's last topic is scheduled on the roadmap
  const projected = (stationIndex: number): Date | null => {
    const s = stations.find((x) => x.index === stationIndex);
    const offsets = (s?.items ?? []).map((i) => i.roadmapDayOffset).filter((o): o is number => o !== null);
    if (!offsets.length || !status?.startedAt) return null;
    const d = new Date(status.startedAt);
    d.setDate(d.getDate() + Math.max(...offsets));
    return d;
  };
  const scores = quiz?.scores;
  const tests: CheckpointTest[] = [
    { key: "mcq", title: "Multiple choice", percent: scores?.multipleChoice.percent ?? null },
    { key: "fill", title: "Fill-in-the-blank", percent: scores?.fillIn.percent ?? null },
    { key: "gender", title: "Gender drill", percent: scores?.genderDrill.percent ?? null },
    { key: "listen", title: "Listen & type", percent: scores?.listenType.percent ?? null },
  ];
  const weak = [
    ...(mistakes?.mistakes ?? []).slice(0, 2).map((m) => MISTAKE_LABELS[m.category] ?? m.category),
    ...(quiz?.weakestTopics ?? []).filter((w) => w.total >= 3 && w.percent < 70).map((w) => w.topic.replace(/-/g, " ")),
  ].slice(0, 3);
  const cpResult = (i: number) => quiz?.checkpoints.find((c) => c.level === level && c.index === i) ?? null;

  const schedule: ScheduleCard[] = [];
  const cps = CHECKPOINT_AFTER.filter((c) => stations.some((s) => s.index === c));
  const lastDone = [...cps].reverse().find((c) => cpResult(checkpointAt(c)!));
  const nextCp = cps.find((c) => !cpResult(checkpointAt(c)!));
  for (const c of [lastDone, nextCp].filter((x): x is (typeof CHECKPOINT_AFTER)[number] => x !== undefined)) {
    const i = checkpointAt(c)!;
    const r = cpResult(i);
    const when = projected(c);
    schedule.push(
      r
        ? { k: `Checkpoint ${c}`, d: fmtDate(new Date(r.takenAt)), c: `done · ${Math.round((r.score / r.total) * 100)}%`, st: "done", go: () => setModal({ k: "check", index: i }) }
        : { k: `Checkpoint ${c}`, d: when ? `~${fmtDate(when)}` : "not scheduled", c: when ? `in ${Math.max(0, daysUntil(when))} days` : "any time", st: "next", go: () => setModal({ k: "check", index: i }) },
    );
  }
  if (exam?.suggestedMockDate) {
    const d = new Date(`${exam.suggestedMockDate}T00:00:00`);
    const m = exam.lastMockAttempt;
    schedule.push({
      k: "Mock exam",
      d: fmtDate(d),
      c: m?.score != null && m.total ? `last · ${Math.round((m.score / m.total) * 100)}%` : `in ${Math.max(0, daysUntil(d))} days`,
      st: "soon",
      go: () => setModal({ k: "gate" }),
    });
  }
  schedule.push(
    exam?.examTargetDate
      ? (() => {
          const d = new Date(`${exam.examTargetDate}T00:00:00`);
          return { k: `${level.toUpperCase()} final`, d: d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }), c: `in ${daysUntil(d)} days`, st: "gate" as const, go: () => setModal({ k: "gate" }) };
        })()
      : { k: `${level.toUpperCase()} final`, d: "Set a date", c: "no exam date yet", st: "gate", go: () => setModal({ k: "gate" }) },
  );

  const examDays = exam?.examTargetDate ? daysUntil(new Date(`${exam.examTargetDate}T00:00:00`)) : null;
  const gateInfo = { days: examDays, date: exam?.examTargetDate ? new Date(`${exam.examTargetDate}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : null };
  const rules = exam ? `${Object.values(exam.sectionCounts).reduce((a, b) => a + b, 0)} questions · ${exam.timeLimitMinutes} min · ${Math.round(exam.passThreshold * 100)}% to pass` : "";
  const altLevels: AltLevel[] = (dash?.bento.level.levels ?? []).map((l) => ({ level: l.level, percent: l.percent, state: l.state }));
  const activeAlt = altLevels.find((l) => l.state === "active") ?? { level, percent: dash?.bento.level.percent ?? 0, state: "active" as const };

  const onDragEnd = (e: DragEndEvent) => {
    if (e.over?.id !== "notes-tile") return;
    const id = String(e.active.id);
    if (id.startsWith("ticket:")) {
      const r = [...rows, ...optional].find((x) => `ticket:${x.key}` === id);
      const t = tasks.find((x) => x.id === r?.taskId);
      if (r) saveNote.mutate({ title: `Pinned: ${r.title}`, text: `${r.title} (${r.meta})`, pinned: true, roadmapTaskId: r.taskId, syllabusItemId: r.itemId, skill: t?.skill ?? null });
    } else if (id.startsWith("item:")) {
      const it = items.find((x) => `item:${x.id}` === id);
      if (it) saveNote.mutate({ title: `Pinned: ${it.title}`, text: `${it.title} (${it.skill ? KIND_LABELS[it.skill] : "Topic"})`, pinned: true, syllabusItemId: it.id, skill: it.skill });
    }
  };

  if (!dash || !syllabus) return <div className="flex-1" aria-busy="true" />;

  const streak = dash.streak;
  const openStation = (s: Station) => setModal({ k: "station", key: s.key });
  const openSource = (s: StudySource) => setModal({ k: "source", id: s.id });

  const ticket = activated ? (
    <Ticket
      rows={rows}
      optional={optional}
      carriedOver={carriedOver}
      capLine={capLine}
      bp={bp}
      dragOK={dragOK}
      onToggle={toggleRow}
      onOpen={openRow}
      onWeek={() => setModal({ k: "week" })}
      onPullIn={() => pullIn.mutate()}
      onSpread={() => spread.mutate()}
    />
  ) : (
    <div style={{ background: "var(--lemon)", color: "var(--onTile)", border: "2.5px solid var(--line)", borderRadius: 24, boxShadow: "5px 5px 0 var(--shadow)", padding: 18 }}>
      <EmptyState action={<PillButton height={40} disabled={activate.isPending} onClick={() => activate.mutate()}>Start your roadmap</PillButton>}>
        Today's ticket starts when you activate the 26-week roadmap.
      </EmptyState>
    </div>
  );

  const stream: ReactNode[] = [
    <Behind key="behind" closed={closed} prevLevels={prevLevels} bp={bp} onOpen={openStation} />,
    <div key="ticket">{ticket}</div>,
    bp === "sm" && nowTask ? (
      <NowCard
        key="now"
        title={nowTask.title}
        seconds={nowSeconds}
        running={nowRunning}
        onOpen={() => setModal({ k: "task", taskId: nowTask.id, origin: "Today's ticket" })}
        onRun={() => timer.mutate({ id: nowTask.id, action: nowRunning ? "pause" : "start" })}
      />
    ) : null,
    current ? (
      <CurrentStation
        key="cur"
        station={current}
        total={stations.length}
        fuel={fuelFor(current)}
        bp={bp}
        dragOK={dragOK}
        runningTaskId={running?.id ?? null}
        onOverview={() => openStation(current)}
        onOpenItem={(itemId) => setModal({ k: "task", itemId, origin: `Station ${current.index}` })}
        onToggleItem={(id, done) => {
          const it = items.find((x) => x.id === id);
          if (it?.exerciseType && done && !isItemDone(it)) setModal({ k: "task", itemId: id, origin: `Station ${current.index}` });
          else toggleItem.mutate({ id, done });
        }}
        onOpenSource={openSource}
        onAddFuel={() => setModal({ k: "add" })}
      />
    ) : (
      <EmptyState key="cur">Every station of {level.toUpperCase()} is closed — the gate is next.</EmptyState>
    ),
    next.length ? <StationCards key="next" stations={next} bp={bp} fuelCount={(s) => fuelFor(s).length} onOpen={openStation} /> : null,
    cpAfter ? (
      <CheckpointTile
        key="check"
        label={`Checkpoint · after station ${cpAfter}${projected(cpAfter) ? ` · ~${fmtDate(projected(cpAfter)!)}` : ""}`}
        tests={tests}
        weak={weak}
        bp={bp}
        onOpen={() => setModal({ k: "check", index: checkpointAt(cpAfter)! })}
      />
    ) : null,
    later.length ? <LaterToggle key="laterT" count={later.length} first={later[0]!.index} last={later[later.length - 1]!.index} open={laterOpen} onToggle={() => setLaterOpen((v) => !v)} /> : null,
    later.length && laterOpen ? <StationCards key="later" stations={later} bp={bp} fuelCount={(s) => fuelFor(s).length} onOpen={openStation} /> : null,
    gate ? <GateTile key="gate" stationIndex={gate.index} level={level.toUpperCase()} rules={rules} schedule={schedule} bp={bp} onOpen={() => setModal({ k: "gate" })} /> : null,
  ];

  const nowTile = (
    <NowTile
      kind={nowTask?.skill ? KIND_LABELS[nowTask.skill] : "Task"}
      title={nowTask?.title ?? "Nothing open on today's ticket"}
      seconds={nowSeconds}
      estimate={nowEstimate}
      running={nowRunning}
      disabled={!nowTask || timer.isPending}
      onOpen={() => nowTask && setModal({ k: "task", taskId: nowTask.id, origin: "Today's ticket" })}
      onRun={() => nowTask && timer.mutate({ id: nowTask.id, action: nowRunning ? "pause" : "start" })}
      onAdd={(m) => nowTask && timer.mutate({ id: nowTask.id, setSeconds: nowSeconds + m * 60 })}
    />
  );
  const notesTile = (
    <NotesTile stationIndex={current?.index ?? null} notes={notesData?.notes ?? []} bp={bp} dragOK={dragOK} saving={saveNote.isPending} onSave={(text) => saveNote.mutate({ text })} />
  );
  const libraryTile = <LibraryTile sources={sources} bp={bp} onOpenAll={() => setModal({ k: "lib" })} onAdd={() => setModal({ k: "add" })} onOpenSource={openSource} />;

  const page: CSSProperties = { "--k": bp === "lg" ? 1 : bp === "md" ? 0.9 : 0.74 } as CSSProperties;
  const pickable = current ? [current, ...upcoming.slice(0, 2)] : upcoming.slice(0, 3);

  let layout: ReactNode;
  if (bp === "lg") {
    layout = (
      <div className="flex min-h-0 flex-1 gap-5" style={page}>
        <AltitudeRail levels={altLevels} gate={gateInfo} streak={streak} onGate={() => setModal({ k: "gate" })} />
        <div className={fill ? "no-scrollbar flex min-h-0 min-w-0 flex-1 flex-col gap-[18px] overflow-y-auto" : "flex min-w-0 flex-1 flex-col gap-[18px]"} style={{ padding: "4px 10px 12px 14px" }}>
          {stream}
        </div>
        <div className="flex w-[320px] shrink-0 flex-col gap-5" style={{ minHeight: 0 }}>
          {nowTile}
          {notesTile}
          {libraryTile}
        </div>
      </div>
    );
  } else if (bp === "md") {
    layout = (
      <div className="flex flex-col gap-5" style={page}>
        <AltitudeStrip levels={altLevels} active={activeAlt} gate={gateInfo} streak={streak} bp={bp} onGate={() => setModal({ k: "gate" })} />
        <div className="flex items-start gap-5">
          <div className="flex min-w-0 flex-1 flex-col gap-[18px]" style={{ padding: "4px 6px 0 12px" }}>
            {stream}
          </div>
          <div className="sticky top-5 flex w-[272px] shrink-0 flex-col gap-5">
            {nowTile}
            {notesTile}
            {libraryTile}
          </div>
        </div>
      </div>
    );
  } else {
    layout = (
      <div className="flex flex-col gap-4" style={page}>
        <AltitudeStrip levels={altLevels} active={activeAlt} gate={gateInfo} streak={streak} bp={bp} onGate={() => setModal({ k: "gate" })} />
        {stream}
        {notesTile}
        {libraryTile}
      </div>
    );
  }

  const stationByKey = (key: string) => stations.find((s) => s.key === key);

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      {layout}
      {modal?.k === "task" && (
        <TaskModal
          taskId={modal.taskId}
          itemId={modal.itemId}
          origin={modal.origin}
          items={items}
          stationNotesKey={current?.key ?? null}
          onClose={() => setModal(null)}
          onOpenLibrary={() => setModal({ k: "lib" })}
        />
      )}
      {modal?.k === "station" && stationByKey(modal.key) && (
        <StationModal
          station={stationByKey(modal.key)!}
          total={stations.length}
          fuel={fuelFor(stationByKey(modal.key)!)}
          onClose={() => setModal(null)}
          onOpenItem={(itemId) => setModal({ k: "task", itemId, origin: `Station ${stationByKey(modal.key)!.index}` })}
          onOpenSource={openSource}
        />
      )}
      {modal?.k === "check" && (
        <CheckpointModal
          index={modal.index}
          after={CHECKPOINT_AFTER[modal.index - 1]}
          firstStation={CHECKPOINT_AFTER[modal.index - 1] - 6}
          level={level}
          tests={tests}
          weak={weak}
          lastResult={cpResult(modal.index)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.k === "gate" && exam && <GateModal status={exam} stationIndex={gate?.index ?? stations.length} schedule={schedule} bp={bp} onClose={() => setModal(null)} />}
      {modal?.k === "week" && <WeekModal onClose={() => setModal(null)} />}
      {modal?.k === "lib" && <LibraryModal sources={sources} stations={stations} bp={bp} onClose={() => setModal(null)} onOpen={openSource} onAdd={() => setModal({ k: "add" })} />}
      {modal?.k === "source" && sources.find((s) => s.id === modal.id) && (
        <SourceModal source={sources.find((s) => s.id === modal.id)!} stations={stations} pickable={pickable} onClose={() => setModal(null)} />
      )}
      {modal?.k === "add" && <AddSourceModal stations={pickable} defaultStationKey={current?.key ?? null} onClose={() => setModal(null)} />}
    </DndContext>
  );
}
