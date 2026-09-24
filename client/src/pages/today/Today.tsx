import { useState, type CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api, getUser } from "../../api/client";
import type { RoadmapSkill } from "../../api/types";
import { Chip } from "../../components/ui/Chip";
import { EmptyState } from "../../components/ui/EmptyState";
import { Modal } from "../../components/ui/Modal";
import { PillButton } from "../../components/ui/PillButton";
import { toast } from "../../components/ui/Toast";
import { useNavStack } from "../../lib/navStack";
import { KIND_LABELS, daysUntil, localDateKey, reviewMinutes, taskEstimateMinutes, taskKind } from "../../lib/tasks";
import { useBreakpoint, type Breakpoint } from "../../lib/useBreakpoint";
import {
  GoalTile,
  HeroTile,
  JobsTile,
  ReviewTile,
  RouteTile,
  StreakTile,
  TimerTile,
  WeakTile,
  WordsTile,
  type RouteRow,
  type TimerTarget,
} from "./TodayTiles";

/*
 * Today (Bento README §2, AzubiDashSticker2.dc.html variant a). The grid areas come from the prototype's layout
 * table minus its nav row (Layout.tsx renders the chrome). "Busy" vs "light" is derived from the route: more than
 * three open stops is busy (route spans two rows, Lernzeit one); otherwise Lernzeit gets two rows and lists today's
 * sessions.
 */

const LAYOUT = {
  busy: {
    lg: '"hero hero review goal plan" "hero hero weak words plan" "streak streak streak jobs timer"',
    md: ['"hero hero review review" "hero hero goal goal" "plan plan weak weak" "plan plan words words" "timer timer jobs jobs" "streak streak streak streak"', "214px 214px 240px 220px 250px 190px"],
    sm: ['"hero hero" "review review" "goal words" "plan plan" "timer timer" "weak weak" "streak streak" "jobs jobs"', "330px 190px 200px 460px 190px 230px 190px 270px"],
  },
  light: {
    lg: '"hero hero review goal plan" "hero hero weak words timer" "streak streak streak jobs timer"',
    md: ['"hero hero review review" "hero hero goal goal" "plan plan timer timer" "weak weak words words" "jobs jobs jobs jobs" "streak streak streak streak"', "214px 214px 300px 220px 220px 190px"],
    sm: ['"hero hero" "review review" "goal words" "plan plan" "timer timer" "weak weak" "streak streak" "jobs jobs"', "330px 190px 200px 250px 190px 230px 190px 270px"],
  },
} as const;

function gridStyle(bp: Breakpoint, fill: boolean, load: "busy" | "light"): CSSProperties {
  const L = LAYOUT[load];
  if (bp === "lg") {
    return {
      gridTemplateColumns: "repeat(4,minmax(0,1fr)) minmax(0,1.3fr)",
      // lgfill: the three rows share the viewport; shorter lg screens page-scroll with fixed row floors
      gridTemplateRows: fill ? "repeat(3,minmax(0,1fr))" : "300px 260px 240px",
      gridTemplateAreas: L.lg,
      gap: 22,
      height: fill ? "100%" : undefined,
      "--k": 1,
    } as CSSProperties;
  }
  if (bp === "md") {
    return { gridTemplateColumns: "repeat(4,minmax(0,1fr))", gridTemplateRows: L.md[1], gridTemplateAreas: L.md[0], gap: 20, "--k": 0.86 } as CSSProperties;
  }
  return { gridTemplateColumns: "repeat(2,minmax(0,1fr))", gridTemplateRows: L.sm[1], gridTemplateAreas: L.sm[0], gap: 18, "--k": 0.72 } as CSSProperties;
}

const ADD_KINDS: RoadmapSkill[] = ["vocab", "grammar", "listening", "speaking", "writing", "reading"];

function AddTaskModal({ onClose, onAdd, saving }: { onClose: () => void; onAdd: (title: string, skill: RoadmapSkill) => void; saving: boolean }) {
  const [title, setTitle] = useState("");
  const [skill, setSkill] = useState<RoadmapSkill>("vocab");
  const valid = title.trim().length > 0;
  return (
    <Modal
      title="Add a stop"
      tag="Today's route"
      subtitle="It joins today's route and ticket."
      bg="var(--lemon)"
      width={460}
      onClose={onClose}
      footer={
        <>
          <PillButton variant="secondary" onClick={onClose} style={{ minWidth: 110 }}>
            Cancel
          </PillButton>
          <PillButton disabled={!valid || saving} onClick={() => onAdd(title.trim(), skill)} className="flex-1">
            Add to route
          </PillButton>
        </>
      }
    >
      <label className="flex flex-col gap-1.5" style={{ fontSize: 13, fontWeight: 700 }}>
        What
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && valid && onAdd(title.trim(), skill)}
          placeholder="z. B. Hörverstehen: Nachrichten"
          maxLength={200}
          lang="de"
          style={{ height: 46, padding: "0 14px", border: "2.5px solid var(--line)", borderRadius: 14, background: "var(--plain)", color: "var(--plainText)", fontSize: 15, fontWeight: 600 }}
        />
      </label>
      <div className="flex flex-col gap-1.5">
        <span style={{ fontSize: 13, fontWeight: 700 }}>Kind</span>
        <div className="flex flex-wrap gap-1.5">
          {ADD_KINDS.map((k) => (
            <Chip key={k} size="sm" selected={skill === k} onClick={() => setSkill(k)}>
              {KIND_LABELS[k]}
            </Chip>
          ))}
        </div>
      </div>
    </Modal>
  );
}

export default function Today() {
  const { bp, fill } = useBreakpoint();
  const { push } = useNavStack();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);

  const { data: dash } = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });
  const { data: status } = useQuery({ queryKey: ["roadmap", "status"], queryFn: api.roadmapStatus });
  const activated = status?.activated ?? false;
  const { data: today } = useQuery({ queryKey: ["learning", "roadmap", "today"], queryFn: api.roadmapToday, enabled: activated });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["learning", "roadmap"] });
  };
  const onError = (e: unknown) => toast.error(e instanceof Error ? e.message : "Something went wrong");

  const toggle = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => api.toggleRoadmapTask(id, done),
    onSuccess: refresh,
    onError: (e, vars) => {
      // exercise topics complete only after their exercise is passed — send the user to it
      if (e instanceof ApiError && e.status === 409) {
        toast.info("Pass the exercise first — opening it in Plan");
        push("/plan", { state: { openTaskId: vars.id } });
        return;
      }
      onError(e);
    },
  });
  const timer = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "start" | "pause" | "reset" }) => api.updateRoadmapTask(id, { timerAction: action }),
    onSuccess: refresh,
    onError,
  });
  const pullIn = useMutation({
    mutationFn: api.pullBacklogIntoToday,
    onSuccess: (r) => {
      toast.success(`Pulled ${r.moved.length} into today`);
      refresh();
    },
    onError,
  });
  const spread = useMutation({
    mutationFn: api.spreadBacklog,
    onSuccess: (r) => {
      toast.success(`Spread ${r.moved.length} over ${r.overDays} days`);
      refresh();
    },
    onError,
  });
  const add = useMutation({
    mutationFn: ({ title, skill }: { title: string; skill: RoadmapSkill }) => api.addRoadmapTask({ date: localDateKey(), title, skill }),
    onSuccess: () => {
      setAdding(false);
      toast.success("Added to today's route");
      refresh();
    },
    onError,
  });
  const activate = useMutation({
    mutationFn: () => api.activateRoadmap(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["roadmap"] });
      refresh();
    },
    onError,
  });

  if (!dash) return <div className="flex-1" aria-busy="true" />;
  const b = dash.bento;

  // Route rows: due reviews first (a destination, not a checkbox), then today's core tasks and anything already
  // done today. Optional acceleration tasks stay on the Plan ticket.
  const core = new Set(today?.queues.coreTaskIds ?? []);
  const todaysTasks = (today?.tasks ?? []).filter((t) => !t.droppedAt && (t.completedAt || core.has(t.id)));
  const rows: RouteRow[] = [
    ...(dash.dueToday > 0
      ? [{ id: "review", title: `Review ${dash.dueToday} cards`, meta: `Vocab · ${reviewMinutes(dash.dueToday)} min`, color: "var(--tomato)", done: false, review: true }]
      : []),
    ...todaysTasks.map((t) => {
      const kind = taskKind(t);
      return { id: t.id, title: t.title, meta: `${kind.label} · ${taskEstimateMinutes(t.type)} min`, color: kind.color, done: !!t.completedAt };
    }),
  ];
  const openStops = rows.filter((r) => !r.done).length;
  const load = openStops > 3 ? "busy" : "light";
  const carriedOver = (today?.backlog ?? []).reduce((n, g) => n + g.tasks.length, 0);

  // Lernzeit tile drives the one app-wide task timer: the running task, else the first open task today.
  const running = b.runningTask;
  const firstOpen = todaysTasks.find((t) => !t.completedAt);
  const target: TimerTarget | null = running
    ? { id: running.id, title: running.title, seconds: running.timerSeconds, runningSince: running.timerRunningSince }
    : firstOpen
      ? { id: firstOpen.id, title: firstOpen.title, seconds: firstOpen.timerSeconds, runningSince: null }
      : null;
  const sessions = (today?.tasks ?? [])
    .filter((t) => t.timerSeconds > 0 || t.timerRunningSince)
    .map((t) => ({ id: t.id, title: t.title, minutes: Math.round(t.timerSeconds / 60), color: taskKind(t).color }));

  const firstName = (getUser()?.name ?? "").trim().split(/\s+/)[0] || "du";
  const examDays = dash.examTargetDate ? daysUntil(new Date(`${dash.examTargetDate}T00:00:00`)) : null;
  const heroLine =
    openStops === 0 && rows.length > 0
      ? "Route cleared for today. Ruh dich aus."
      : `${openStops} stop${openStops === 1 ? "" : "s"} left on today's route.${
          examDays !== null && examDays >= 0 ? ` Your ${b.level.level.toUpperCase()} exam is ${examDays} days away — keep rolling.` : " Keep rolling."
        }`;
  const dayLabel = today ? `Day ${today.overview.currentDayOffset + 1} / ${today.overview.totalDays}` : null;

  const openRow = (row: RouteRow) => {
    if (row.review) push("/review");
    else push("/plan", { state: { openTaskId: row.id } });
  };

  return (
    <div className="grid min-h-0 flex-1" style={gridStyle(bp, fill, load)}>
      <HeroTile firstName={firstName} dayLabel={dayLabel} heroLine={heroLine} level={b.level} totalWords={b.words.total} bp={bp} />
      <ReviewTile due={dash.dueToday} minutes={reviewMinutes(dash.dueToday)} onGo={() => push("/review")} onBrowse={() => push("/words")} />
      <GoalTile goal={b.weeklyGoal} />
      <RouteTile
        rows={rows}
        optionalCount={today?.queues.accelerationTaskIds.length ?? 0}
        carriedOver={carriedOver}
        onToggle={(row) => toggle.mutate({ id: row.id, done: !row.done })}
        onOpen={openRow}
        onAdd={() => setAdding(true)}
        onPullIn={() => pullIn.mutate()}
        onSpread={() => spread.mutate()}
        inactive={
          status && !activated ? (
            <EmptyState action={<PillButton height={40} onClick={() => activate.mutate()} disabled={activate.isPending}>Start your roadmap</PillButton>}>
              Your daily route starts when you activate the 26-week roadmap.
            </EmptyState>
          ) : undefined
        }
      />
      <WeakTile spot={b.weakSpot} onDrill={() => push("/plan/self-tests/run")} />
      <WordsTile words={b.words} onOpen={() => push("/words")} />
      <StreakTile streak={dash.streak} best={b.bestStreak} calendar={b.streakCalendar} bp={bp} />
      <TimerTile
        lernzeitToday={b.lernzeitToday}
        target={target}
        sessions={sessions}
        showSessions={load === "light" && bp !== "sm"}
        busy={timer.isPending}
        onToggle={() => target && timer.mutate({ id: target.id, action: target.runningSince ? "pause" : "start" })}
        onReset={() => target && timer.mutate({ id: target.id, action: "reset" })}
      />
      <JobsTile applications={dash.applications} nextInterview={b.nextInterview} onOpen={() => push("/jobs", b.nextInterview ? { state: { open: b.nextInterview.applicationId } } : undefined)} />
      {adding && <AddTaskModal onClose={() => setAdding(false)} saving={add.isPending} onAdd={(title, skill) => add.mutate({ title, skill })} />}
    </div>
  );
}
