import { useState, type CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CalendarCheck, Plus, Target } from "@phosphor-icons/react";
import { api } from "../../api/client";
import type { Application, ApplicationStatus, CefrLevel } from "../../api/types";
import { Eyebrow, Tile } from "../../components/ui/Tile";
import { toast } from "../../components/ui/Toast";
import { daysUntil } from "../../lib/tasks";
import { useBreakpoint, type Breakpoint } from "../../lib/useBreakpoint";
import { DetailModal, type YourLevel } from "./DetailModal";
import NewApplicationModal from "./NewApplicationModal";
import {
  GERMAN_LEVELS,
  STAGES,
  STAGE_COLOR,
  STAGE_LABEL,
  cardTilt,
  clockTime,
  companyColor,
  hasTime,
  initials,
  levelGap,
  levelIndex,
  stageText,
  weekdayDayMonth,
  whenLine,
  type BoardStage,
} from "./model";

/*
 * Jobs — Pinboard (Bento README §6, AzubiJobs.dc.html dir a). Header tiles (title + counts, Next up, B1 nudge),
 * then four cork columns. lg/md: drag a card onto a column to change its stage (dnd-kit; touch works with a short
 * press). sm: stage tabs show one column; cards are tap-only and the stage changes in the detail modal's stepper
 * (also the keyboard alternative everywhere). Rejected isn't a column: it's the "closed" count.
 */

const k = (px: number) => `calc(var(--k) * ${px}px)`;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];

// ── card ─────────────────────────────────────────────────────────────────────

function CardBody({ app, you }: { app: Application; you: CefrLevel | null }) {
  const gap = app.germanLevel && you ? levelGap(app.germanLevel, you) : 0;
  return (
    <div className="@container flex flex-col" style={{ gap: 8 }}>
      {/* narrow cards (md's four columns) stack the name under the logo + badge instead of squeezing it to a few letters */}
      <div className="flex items-center @max-[210px]:flex-wrap" style={{ gap: 10 }}>
        <span
          className="flex shrink-0 items-center justify-center"
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            border: "2.5px solid var(--line)",
            background: companyColor(app.company),
            color: "var(--onTile)",
            fontWeight: 700,
            fontSize: 15,
            boxSizing: "border-box",
            transform: "rotate(-6deg)",
          }}
        >
          {initials(app.company)}
        </span>
        <div className="min-w-0 flex-1 @max-[210px]:order-last @max-[210px]:basis-full">
          <div className="line-clamp-2" style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-.02em", lineHeight: 1.1 }}>
            {app.company}
          </div>
          {app.location && (
            <div className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ fontSize: 12, fontWeight: 600, opacity: 0.75 }}>
              {app.location}
            </div>
          )}
        </div>
        {app.germanLevel && (
          <span
            className="shrink-0 @max-[210px]:ml-auto"
            title={gap > 0 ? "Above the level you're working on" : "You meet this"}
            style={{
              fontSize: 12,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 999,
              border: "2px solid var(--line)",
              background: gap > 0 ? "var(--tomato)" : "var(--mint)",
              color: "var(--onTile)",
            }}
          >
            {app.germanLevel.toUpperCase()}
          </span>
        )}
      </div>
      <span lang="de" style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2, hyphens: "auto", overflowWrap: "anywhere" }}>
        {app.role}
      </span>
      <div className="flex items-center" style={{ gap: 6, fontSize: 12, fontWeight: 700 }}>
        <CalendarCheck size={13} weight="fill" aria-hidden="true" />
        {whenLine(app)}
      </div>
    </div>
  );
}

const cardStyle = (tilt: number, sm: boolean): CSSProperties => ({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: 12,
  borderRadius: 18,
  border: "2.5px solid var(--line)",
  background: "var(--plain)",
  color: "var(--plainText)",
  boxShadow: "3px 3px 0 var(--shadow)",
  transform: `rotate(${tilt}deg)`,
  cursor: sm ? "pointer" : "grab",
  flexShrink: 0,
  textAlign: "left",
  touchAction: sm ? undefined : "manipulation",
});

function Card({ app, index, you, sm, onOpen }: { app: Application; index: number; you: CefrLevel | null; sm: boolean; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: app.id, disabled: sm });
  return (
    <div
      ref={setNodeRef}
      // dnd-kit marks a disabled draggable aria-disabled; on sm the card is still a working (tap-to-open) button
      {...(sm ? {} : { ...attributes, ...listeners })}
      role="button"
      tabIndex={0}
      aria-label={`${app.company}, ${app.role}. Open details`}
      aria-roledescription={sm ? undefined : "draggable card"}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      style={{ ...cardStyle(cardTilt(app.id, index), sm), opacity: isDragging ? 0.35 : 1 }}
    >
      <CardBody app={app} you={you} />
    </div>
  );
}

// ── column ───────────────────────────────────────────────────────────────────

function Column({
  stage,
  apps,
  you,
  sm,
  onOpen,
}: {
  stage: (typeof STAGES)[number];
  apps: Application[];
  you: CefrLevel | null;
  sm: boolean;
  onOpen: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id, disabled: sm });
  const Icon = stage.icon;
  return (
    <section
      ref={setNodeRef}
      aria-label={`${stage.label}, ${apps.length}`}
      className="relative box-border flex min-w-0 flex-col"
      style={{
        border: "2.5px solid var(--line)",
        borderRadius: 24,
        boxShadow: "5px 5px 0 var(--shadow)",
        background: "var(--cork)",
        backgroundImage: "radial-gradient(rgba(0,0,0,.07) 1.2px, transparent 1.6px)",
        backgroundSize: "9px 9px",
        color: "var(--plainText)",
        padding: 14,
        gap: 12,
        minHeight: sm ? 240 : 0,
        outline: isOver ? "3px dashed var(--line)" : "none",
        outlineOffset: 3,
      }}
    >
      <div className="flex shrink-0 items-center justify-between" style={{ gap: 8 }}>
        <span
          className="inline-flex items-center uppercase"
          style={{
            gap: 6,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: ".06em",
            padding: "4px 10px",
            borderRadius: 999,
            border: "2.5px solid var(--line)",
            background: STAGE_COLOR[stage.id],
            color: stageText(stage.id),
            transform: "rotate(-2deg)",
          }}
        >
          <Icon size={14} weight="fill" aria-hidden="true" />
          {stage.label}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{apps.length}</span>
      </div>
      <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto" style={{ gap: 12, padding: "4px 6px 8px 2px" }}>
        {apps.map((a, i) => (
          <Card key={a.id} app={a} index={i} you={you} sm={sm} onOpen={() => onOpen(a.id)} />
        ))}
        {apps.length === 0 && (
          <div
            className="flex flex-1 items-center justify-center text-center"
            style={{ minHeight: 90, border: "2.5px dashed var(--line)", borderRadius: 16, fontSize: 13, fontWeight: 700, opacity: 0.6, padding: 10 }}
          >
            {stage.id === "offer" ? (sm ? "No offers yet." : "No offers yet. Drag a card here when one lands.") : sm ? "Nothing here yet." : "Drop a card here"}
          </div>
        )}
      </div>
    </section>
  );
}

// ── header tiles ─────────────────────────────────────────────────────────────

function headStyle(bp: Breakpoint): CSSProperties {
  if (bp === "sm") return { display: "flex", flexDirection: "column", gap: 12 };
  return {
    display: "grid",
    gridTemplateColumns: bp === "lg" ? "minmax(0,1.6fr) minmax(0,1fr) minmax(0,1fr)" : "minmax(0,1fr) minmax(0,1fr)",
    gap: 20,
    flexShrink: 0,
  };
}

function Nudge({ apps, you, finish }: { apps: Application[]; you: YourLevel | null; finish: string | null }) {
  let head = "No applications yet";
  let sub = "Add one to see what German it asks for.";
  if (you && apps.length > 0) {
    const LVL = you.level.toUpperCase();
    const next = GERMAN_LEVELS[levelIndex(you.level) + 1]!;
    const above = apps.filter((a) => a.germanLevel && levelIndex(a.germanLevel) > levelIndex(you.level));
    const beyondNext = above.some((a) => levelIndex(a.germanLevel!) > levelIndex(next));
    const known = apps.filter((a) => a.germanLevel).length;
    head = known === 0 ? "No levels stated yet" : `${above.length} of ${apps.length} ask for ${next.toUpperCase()}${beyondNext ? "+" : ""}`;
    const d = finish ? new Date(`${finish}T00:00:00`) : null;
    sub = `You're ${LVL} · ${you.percent}%.${d ? ` ${LVL} done by ${MONTHS[d.getMonth()]} ${d.getFullYear()} at this pace.` : ""}`;
  }
  return (
    <Tile bg="var(--lilac)" tilt={-1} className="flex items-center" style={{ padding: 16, gap: 12 }}>
      <Target size={26} weight="fill" className="shrink-0" aria-hidden="true" />
      <div style={{ lineHeight: 1.25 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{head}</div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{sub}</div>
      </div>
    </Tile>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function JobSearch() {
  const { bp, fill } = useBreakpoint();
  const sm = bp === "sm";
  const location = useLocation();
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(() => (location.state as { open?: string } | null)?.open ?? null);
  const [adding, setAdding] = useState(false);
  const [tab, setTab] = useState<BoardStage>("wishlist");
  const [dragId, setDragId] = useState<string | null>(null);

  const { data } = useQuery({ queryKey: ["applications"], queryFn: api.applications });
  const { data: dash } = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });
  const { data: pace } = useQuery({ queryKey: ["learning", "pace"], queryFn: api.learningPace });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }));

  const all = data?.applications ?? [];
  const open = all.filter((a) => a.status !== "rejected");
  const closed = all.length - open.length;
  const you: YourLevel | null = dash ? { level: dash.bento.level.level, percent: dash.bento.level.percent } : null;
  const next = dash?.bento.nextInterview ?? null;

  const move = useMutation({
    mutationFn: ({ app, to }: { app: Application; to: ApplicationStatus }) =>
      api.moveApplication(app.id, to, all.filter((a) => a.status === to && a.id !== app.id).length),
    onMutate: ({ app, to }) => {
      const prev = queryClient.getQueryData<{ applications: Application[] }>(["applications"]);
      queryClient.setQueryData<{ applications: Application[] }>(["applications"], (d) =>
        d ? { applications: d.applications.map((a) => (a.id === app.id ? { ...a, status: to } : a)) } : d,
      );
      return { prev };
    },
    onSuccess: (res, { app, to }) => {
      queryClient.setQueryData(["applications"], res);
      toast.success(to === "rejected" ? `${app.company} → closed` : `${app.company} → ${STAGE_LABEL[to]}`);
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["applications"], ctx.prev);
      toast.error("Couldn't move it");
    },
    onSettled: (_r, _e, { app }) => {
      void queryClient.invalidateQueries({ queryKey: ["applications", "stats"] });
      void queryClient.invalidateQueries({ queryKey: ["applications", app.id] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
  const moveTo = (app: Application, to: ApplicationStatus) => app.status !== to && move.mutate({ app, to });

  const onDragStart = (e: DragStartEvent) => setDragId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setDragId(null);
    const app = all.find((a) => a.id === e.active.id);
    if (app && e.over) moveTo(app, e.over.id as BoardStage);
  };
  const dragging = dragId ? all.find((a) => a.id === dragId) : undefined;

  const nextDate = next ? new Date(next.at) : null;
  const nextDays = nextDate ? daysUntil(nextDate) : null;
  const shown = sm ? STAGES.filter((s) => s.id === tab) : STAGES;

  return (
    <div className="flex flex-col" style={{ gap: sm ? 16 : 20, height: fill ? "100%" : undefined, "--k": bp === "lg" ? 1 : bp === "md" ? 0.9 : 0.78 } as CSSProperties}>
      <div style={headStyle(bp)}>
        <Tile
          bg="var(--lemon)"
          tilt={-0.5}
          tape={{ left: 34, width: 84 }}
          className="flex flex-col"
          style={{ gridColumn: bp === "md" ? "span 2" : undefined, padding: sm ? 16 : 18, gap: 8 }}
        >
          <Eyebrow>Jobs · Bewerbungen</Eyebrow>
          <div className="flex flex-wrap items-end justify-between" style={{ gap: 12 }}>
            <span style={{ fontSize: k(34), fontWeight: 700, letterSpacing: "-.04em", lineHeight: 1 }}>
              {open.length} open · {closed} closed
            </span>
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="press flex cursor-pointer items-center"
              style={{
                height: 44,
                padding: "0 16px",
                gap: 6,
                border: "2.5px solid var(--line)",
                borderRadius: 999,
                background: "var(--btn)",
                color: "var(--btnText)",
                fontWeight: 700,
                fontSize: 15,
                boxShadow: "3px 3px 0 var(--shadow)",
              }}
            >
              <Plus size={15} weight="bold" aria-hidden="true" />
              New application
            </button>
          </div>
        </Tile>
        <Tile
          as={next ? "button" : "section"}
          bg="var(--tomato)"
          tilt={0.8}
          className={next ? "flex cursor-pointer flex-col text-left" : "flex flex-col"}
          style={{ padding: sm ? 14 : 16, gap: 6 }}
          {...(next ? { type: "button", onClick: () => setOpenId(next.applicationId), "aria-label": `Next up: ${next.company} interview. Open` } : {})}
        >
          <Eyebrow>Next up</Eyebrow>
          {next && nextDate && nextDays !== null ? (
            <>
              <div className="flex flex-wrap items-baseline" style={{ gap: 8 }}>
                <span style={{ fontSize: k(38), fontWeight: 700, letterSpacing: "-.05em", lineHeight: 0.9 }}>
                  {nextDays <= 0 ? "Today" : nextDays === 1 ? "Tomorrow" : `${nextDays} days`}
                </span>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{next.company} interview</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                {weekdayDayMonth(nextDate)}
                {hasTime(nextDate) ? ` · ${clockTime(nextDate)}` : ""}
                {next.location ? ` · ${next.location}` : ""}
              </span>
            </>
          ) : (
            <>
              <span style={{ fontSize: k(38), fontWeight: 700, letterSpacing: "-.05em", lineHeight: 0.9 }}>Nothing booked</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Log an interview on a card's timeline.</span>
            </>
          )}
        </Tile>
        <Nudge apps={open} you={you} finish={pace?.projectedFinishDate ?? null} />
      </div>

      {sm && (
        <div className="no-scrollbar flex overflow-x-auto" style={{ gap: 6, margin: "0 -14px", padding: "2px 14px 4px" }} role="tablist" aria-label="Stage">
          {STAGES.map((s) => {
            const on = tab === s.id;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTab(s.id)}
                className="shrink-0 cursor-pointer whitespace-nowrap"
                style={{
                  height: 38,
                  padding: "0 14px",
                  border: "2.5px solid var(--line)",
                  borderRadius: 999,
                  background: on ? "var(--sel)" : STAGE_COLOR[s.id],
                  color: on ? "var(--selText)" : stageText(s.id),
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {s.label} · {open.filter((a) => a.status === s.id).length}
              </button>
            );
          })}
        </div>
      )}

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragId(null)}>
        <div
          style={
            sm
              ? { display: "flex", flexDirection: "column", gap: 16 }
              : {
                  display: "grid",
                  gridTemplateColumns: "repeat(4,minmax(0,1fr))",
                  gap: bp === "lg" ? 20 : 14,
                  flex: fill ? 1 : undefined,
                  minHeight: 0,
                  // below lgfill the page scrolls: give the board a fixed height so each column scrolls on its own
                  height: fill ? undefined : bp === "md" ? 680 : 560,
                }
          }
        >
          {shown.map((s) => (
            <Column key={s.id} stage={s} apps={open.filter((a) => a.status === s.id)} you={you?.level ?? null} sm={sm} onOpen={setOpenId} />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {dragging ? (
            <div style={{ ...cardStyle(-2, false), cursor: "grabbing", boxShadow: "6px 6px 0 var(--shadow)" }}>
              <CardBody app={dragging} you={you?.level ?? null} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {adding && (
        <NewApplicationModal
          onClose={() => setAdding(false)}
          onAdded={(a) => {
            setAdding(false);
            setTab(a.status === "rejected" ? "wishlist" : a.status);
          }}
        />
      )}
      {openId && <DetailModal id={openId} you={you} sm={sm} onClose={() => setOpenId(null)} onMove={moveTo} />}
    </div>
  );
}
