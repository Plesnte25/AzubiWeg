import { useMemo, useState, type CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { Sparkle } from "@phosphor-icons/react";
import { api } from "../../api/client";
import type { CefrLevel, NoteCategory, WallNote } from "../../api/types";
import { Chip } from "../../components/ui/Chip";
import { Tape, Tile } from "../../components/ui/Tile";
import { toast } from "../../components/ui/Toast";
import { NOTE_CATEGORIES, NOTE_COLORS, NOTE_LABELS } from "../../lib/noteCategories";
import { stripHtml } from "../../lib/text";
import { useBreakpoint, type Breakpoint } from "../../lib/useBreakpoint";
import { deriveStations, type Station } from "../plan/journey/model";
import { NoteEditorModal } from "./NoteEditorModal";
import { LINK_ICONS, STICKY_TILT, backIn, findStation, findWord, noteLink, parseQuickNote, relativeWhen, textToHtml } from "./model";

/*
 * Notes — Sticky wall (Bento README §7, AzubiNotes.dc.html dir a). Quick note (tile colour = chosen category;
 * `/word X` or `/station X` links the note), Surfaced today (real spaced resurfacing of Grammar and Mistakes notes,
 * services/notes/resurface.ts), category filter chips, then the wall: pinned first, CSS columns. A sticky opens the
 * editor modal. lg (tall enough) scrolls the wall inside the page; md/sm scroll the page.
 */

const LEVELS: CefrLevel[] = ["a1", "a2", "b1"];
type Filter = "all" | NoteCategory;

function QuickNote({
  count,
  words,
  stations,
  level,
  bp,
  initial,
  onStuck,
}: {
  count: number;
  words: Parameters<typeof findWord>[0];
  stations: Station[];
  level: CefrLevel | null;
  bp: Breakpoint;
  initial: string;
  onStuck: () => void;
}) {
  const queryClient = useQueryClient();
  const [text, setText] = useState(initial);
  const [cat, setCat] = useState<NoteCategory>("grammar");
  const sm = bp === "sm";
  const create = useMutation({
    mutationFn: () => {
      const { title, body, token } = parseQuickNote(text);
      let link: { wordId?: string; stationKey?: string } = {};
      if (token?.kind === "word") {
        const w = findWord(words, token.query);
        if (w) link = { wordId: w.id };
        else toast.info(`No word “${token.query}” yet · saved without a link`);
      } else if (token?.kind === "station") {
        const s = findStation(stations, token.query, level);
        if (s) link = { stationKey: s.key };
        else toast.info(`No station “${token.query}” · saved without a link`);
      }
      return api.createNote({ title, body: textToHtml(body), category: cat, ...link });
    },
    onSuccess: () => {
      setText("");
      void queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success(`Stuck to the wall · ${NOTE_LABELS[cat]}`);
      onStuck();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't save the note"),
  });
  return (
    <section
      className="relative box-border flex min-w-0 flex-col"
      style={{
        background: NOTE_COLORS[cat],
        color: "var(--onTile)",
        border: "2.5px solid var(--line)",
        borderRadius: 24,
        boxShadow: "5px 5px 0 var(--shadow)",
        transform: "rotate(-0.4deg)",
        padding: sm ? 14 : 18,
        gap: 10,
        minHeight: sm ? 230 : 0,
        transition: "background .2s",
      }}
    >
      <Tape left={34} width={84} />
      <div className="flex items-baseline justify-between" style={{ gap: 8 }}>
        <span style={{ fontSize: "calc(var(--k) * 26px)", fontWeight: 700, letterSpacing: "-.03em" }}>Quick note</span>
        <span style={{ fontSize: 13, fontWeight: 700 }}>
          {count} note{count === 1 ? "" : "s"}
        </span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && text.trim()) create.mutate();
        }}
        placeholder="Write it down before it's gone… type /word or /station to link"
        aria-label="Quick note"
        style={{
          flex: 1,
          minHeight: 64,
          resize: "none",
          padding: 12,
          border: "2.5px solid var(--line)",
          borderRadius: 14,
          background: "var(--plain)",
          color: "var(--plainText)",
          fontSize: 15,
          fontWeight: 600,
          lineHeight: 1.4,
          boxSizing: "border-box",
        }}
      />
      <div className="flex flex-wrap items-center" style={{ gap: 6 }}>
        {NOTE_CATEGORIES.map((c) => (
          <Chip
            key={c}
            size="sm"
            selected={cat === c}
            selectedTilt={-1.5}
            style={{ height: 32, padding: "0 11px", fontSize: 12, border: "2.5px solid var(--line)" }}
            onClick={() => setCat(c)}
          >
            {NOTE_LABELS[c]}
          </Chip>
        ))}
        <button
          type="button"
          disabled={create.isPending}
          onClick={() => (text.trim() ? create.mutate() : toast.info("Write something first"))}
          className="press ml-auto cursor-pointer"
          style={{
            height: 38,
            padding: "0 16px",
            border: "2.5px solid var(--line)",
            borderRadius: 999,
            background: "var(--btn)",
            color: "var(--btnText)",
            fontWeight: 700,
            fontSize: 14,
            boxShadow: "2px 2px 0 var(--shadow)",
          }}
        >
          Stick it
        </button>
      </div>
    </section>
  );
}

function Surfaced({ bp, onOpen }: { bp: Breakpoint; onOpen: (id: string) => void }) {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["notes", "surfaced"], queryFn: api.surfacedNotes });
  const [seen, setSeen] = useState(0);
  const notes = data?.notes ?? [];
  const cur = notes[0];
  const act = useMutation({
    mutationFn: (outcome: "again" | "known") => api.resurfaceNote(cur!.id, outcome),
    onSuccess: ({ note }, outcome) => {
      setSeen((s) => s + 1);
      toast.success(outcome === "again" ? "Shows again tomorrow" : `Nice · back in ${backIn(note.resurfaceDueAt)}`);
      void queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
    onError: () => toast.error("Couldn't update it"),
  });
  const sm = bp === "sm";
  return (
    <Tile tilt={0.8} className="flex flex-col" style={{ padding: sm ? 14 : 18, gap: 8, minHeight: sm ? 190 : 0 }}>
      <div className="flex items-center" style={{ gap: 6 }}>
        <Sparkle size={16} weight="fill" aria-hidden="true" />
        <span className="uppercase" style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".1em" }}>
          Surfaced today{cur ? ` · ${seen + 1}/${seen + notes.length}` : ""}
        </span>
      </div>
      {cur ? (
        <>
          <button
            type="button"
            onClick={() => onOpen(cur.id)}
            className="cursor-pointer text-left"
            style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.15, border: "none", background: "transparent", color: "inherit", padding: 0 }}
          >
            {cur.title || "Untitled"}
          </button>
          <span className="min-h-0 flex-1 overflow-hidden" style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>
            {stripHtml(cur.body ?? "")}
          </span>
          <div className="flex" style={{ gap: 6 }}>
            <button
              type="button"
              disabled={act.isPending}
              onClick={() => act.mutate("again")}
              className="flex-1 cursor-pointer"
              style={{ height: 38, border: "2.5px solid var(--line)", borderRadius: 999, background: "var(--plain)", color: "var(--plainText)", fontWeight: 700, fontSize: 13 }}
            >
              Show again
            </button>
            <button
              type="button"
              disabled={act.isPending}
              onClick={() => act.mutate("known")}
              className="flex-1 cursor-pointer"
              style={{ height: 38, border: "2.5px solid var(--line)", borderRadius: 999, background: "var(--btn)", color: "var(--btnText)", fontWeight: 700, fontSize: 13 }}
            >
              Still know it
            </button>
          </div>
        </>
      ) : (
        <div
          className="flex flex-1 items-center justify-center text-center"
          style={{ border: "2.5px dashed var(--line)", borderRadius: 16, padding: 12, fontSize: 13, fontWeight: 700, opacity: 0.7 }}
        >
          {seen > 0 ? "All caught up for today." : "Nothing to resurface today. Grammar and Mistakes notes come back here on a schedule."}
        </div>
      )}
    </Tile>
  );
}

function Sticky({ note, index, tape, stations, sm, onOpen }: { note: WallNote; index: number; tape: boolean; stations: Station[]; sm: boolean; onOpen: () => void }) {
  const link = noteLink(note, stations);
  const Icon = link ? LINK_ICONS[link.kind] : null;
  const text = stripHtml(note.body ?? "");
  const body = sm && text.length > 90 ? `${text.slice(0, 88)}…` : text;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative box-border flex w-full cursor-pointer flex-col text-left"
      style={{
        breakInside: "avoid",
        gap: 6,
        marginBottom: sm ? 14 : 20,
        padding: sm ? 12 : 16,
        background: NOTE_COLORS[note.category],
        color: "var(--onTile)",
        border: "2.5px solid var(--line)",
        borderRadius: "4px 4px 22px 4px",
        boxShadow: "4px 4px 0 var(--shadow)",
        transform: `rotate(${STICKY_TILT[index % STICKY_TILT.length]}deg)`,
      }}
    >
      {note.pinned && (
        <span
          aria-label="Pinned"
          style={{
            position: "absolute",
            top: -10,
            left: "50%",
            width: 18,
            height: 18,
            marginLeft: -9,
            borderRadius: "50%",
            background: "var(--tomato)",
            border: "2.5px solid var(--line)",
            boxShadow: "2px 2px 0 var(--shadow)",
            boxSizing: "border-box",
          }}
        />
      )}
      {tape && <span aria-hidden="true" style={{ position: "absolute", top: -10, right: 18, width: 58, height: 20, background: "var(--tape)", transform: "rotate(6deg)", borderRadius: 3 }} />}
      <span className="uppercase" style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", opacity: 0.75 }}>
        {NOTE_LABELS[note.category]} · {relativeWhen(note.updatedAt)}
      </span>
      <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-.02em", lineHeight: 1.15, overflowWrap: "anywhere" }}>{note.title || "Untitled"}</span>
      {body && <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, overflowWrap: "anywhere" }}>{body}</span>}
      {link && Icon && (
        <span
          className="inline-flex max-w-full items-center self-start"
          style={{ gap: 5, fontSize: 12, fontWeight: 700, padding: "3px 9px", borderRadius: 999, border: "2px solid var(--line)", background: "var(--plain)", color: "var(--plainText)", marginTop: 2 }}
        >
          <Icon size={12} weight="fill" aria-hidden="true" className="shrink-0" />
          <span className="truncate" lang={link.kind === "word" ? "de" : undefined}>
            {link.label}
          </span>
        </span>
      )}
      {note.files.length > 0 && (
        <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.75 }}>
          {note.files.length} attachment{note.files.length === 1 ? "" : "s"}
        </span>
      )}
    </button>
  );
}

export default function Notes() {
  const { bp, fill } = useBreakpoint();
  const sm = bp === "sm";
  const location = useLocation();
  const navState = (location.state as { open?: string; draft?: string } | null) ?? {};
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(navState.open ?? null);

  const { data } = useQuery({ queryKey: ["notes", "wall"], queryFn: api.notesWall });
  const { data: words } = useQuery({ queryKey: ["words"], queryFn: api.words });
  const { data: syllabus } = useQuery({ queryKey: ["learning", "syllabus"], queryFn: api.learningSyllabus });
  const { data: dash } = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });

  const notes = useMemo(() => data?.notes ?? [], [data]);
  const stations = useMemo(() => (syllabus ? LEVELS.flatMap((l) => deriveStations(syllabus.items, l)) : []), [syllabus]);
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: notes.length, grammar: 0, mistakes: 0, everyday: 0, jobs: 0, listening: 0 };
    for (const n of notes) c[n.category]++;
    return c;
  }, [notes]);
  // server order is pinned first, then most recently edited
  const shown = notes.filter((n) => filter === "all" || n.category === filter);
  const open = openId ? notes.find((n) => n.id === openId) : undefined;

  let unpinned = 0;
  const wall = (
    <div style={{ columnCount: bp === "lg" ? 4 : bp === "md" ? 3 : 2, columnGap: sm ? 12 : 20 }}>
      {shown.map((n, i) => {
        const tape = !n.pinned && unpinned++ % 3 === 1;
        return <Sticky key={n.id} note={n} index={i} tape={tape} stations={stations} sm={sm} onOpen={() => setOpenId(n.id)} />;
      })}
    </div>
  );

  return (
    <div
      className="flex flex-col"
      style={{ gap: sm ? 16 : 20, height: fill ? "100%" : undefined, "--k": bp === "lg" ? 1 : bp === "md" ? 0.9 : 0.78 } as CSSProperties}
    >
      <div
        style={
          sm
            ? { display: "flex", flexDirection: "column", gap: 16 }
            : {
                display: "grid",
                gridTemplateColumns: bp === "lg" ? "minmax(0,2fr) minmax(0,1fr)" : "minmax(0,1.4fr) minmax(0,1fr)",
                gap: 20,
                flexShrink: 0,
                height: bp === "lg" ? 220 : undefined,
              }
        }
      >
        <QuickNote
          count={notes.length}
          words={words?.words ?? []}
          stations={stations}
          level={dash?.bento.level.level ?? null}
          bp={bp}
          initial={navState.draft ?? ""}
          onStuck={() => setFilter("all")}
        />
        <Surfaced bp={bp} onOpen={setOpenId} />
      </div>

      <div
        className="no-scrollbar flex shrink-0"
        role="group"
        aria-label="Filter by category"
        style={{ gap: 8, overflowX: sm ? "auto" : "visible", flexWrap: sm ? "nowrap" : "wrap", margin: sm ? "0 -14px" : 0, padding: sm ? "2px 14px 4px" : 0 }}
      >
        {(["all", ...NOTE_CATEGORIES] as Filter[]).map((f) => (
          <Chip
            key={f}
            selected={filter === f}
            selectedTilt={-1.5}
            bg={f === "all" ? "var(--plain)" : NOTE_COLORS[f]}
            style={{ fontSize: 13 }}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All" : NOTE_LABELS[f]} <span style={{ opacity: 0.7 }}>{counts[f]}</span>
          </Chip>
        ))}
      </div>

      {shown.length === 0 ? (
        <div
          className="flex items-center justify-center text-center"
          style={{ minHeight: 160, border: "2.5px dashed var(--line)", borderRadius: 24, padding: 16, fontSize: 14, fontWeight: 700, opacity: 0.7 }}
        >
          {notes.length === 0 ? "No notes yet. Write one above and stick it to the wall." : `No ${NOTE_LABELS[filter as NoteCategory]} notes yet.`}
        </div>
      ) : fill ? (
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto" style={{ padding: "14px 10px 10px 6px", margin: "-14px -10px 0 -6px" }}>
          {wall}
        </div>
      ) : (
        <div style={{ padding: "8px 4px 0" }}>{wall}</div>
      )}

      {open && <NoteEditorModal key={open.id} note={open} stations={stations} onClose={() => setOpenId(null)} />}
    </div>
  );
}
