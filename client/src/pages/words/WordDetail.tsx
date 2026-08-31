import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CaretLeft, DotsThree, Flag, LinkSimple, NotePencil, SpeakerHigh, Trash } from "@phosphor-icons/react";
import { useParams } from "react-router-dom";
import { api, playWordAudio } from "../../api/client";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { Skeleton } from "../../components/ui/Skeleton";
import { NoteEditor } from "../../components/notes/NoteEditor";
import { chipColor, fullArtLabel } from "../../lib/wordDisplay";
import { useNavStack } from "../../lib/navStack";
import { ConjugationCard } from "./ConjugationCard";
import { DeclensionCard } from "./DeclensionCard";
import { ReviewHistoryCard } from "./ReviewHistoryCard";
import { WordFamilySheet } from "./WordFamilySheet";

function noteSnippet(body: string | null): string {
  if (!body) return "";
  const text = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 140 ? `${text.slice(0, 140)}…` : text;
}

export default function WordDetail() {
  const { id } = useParams<{ id: string }>();
  const { goBack, backLabel, push } = useNavStack();
  const queryClient = useQueryClient();

  const { data: wordsData } = useQuery({ queryKey: ["words"], queryFn: api.words });
  const { data: historyData } = useQuery({ queryKey: ["reviews", "history", "sparkline"], queryFn: () => api.reviewHistory(200) });
  const { data: notesData } = useQuery({ queryKey: ["notes", "word", id], queryFn: () => api.wordNotes(id!), enabled: !!id });

  const [showActions, setShowActions] = useState(false);
  const [showFamily, setShowFamily] = useState(false);
  const [editingNote, setEditingNote] = useState(false);

  const toggleLeech = useMutation({
    mutationFn: (leech: boolean) => api.updateWord(id!, { leech }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["words"] }),
  });
  const del = useMutation({
    mutationFn: () => api.deleteWord(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["words"] });
      setShowActions(false);
      goBack();
    },
  });

  const word = wordsData?.words.find((w) => w.id === id);

  if (!wordsData) {
    return (
      <div className="-mx-4 -my-4 flex min-h-[calc(100dvh-40px)] flex-col gap-3 px-[18px] pt-[calc(env(safe-area-inset-top)+18px)]" style={{ background: "#161826" }}>
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!word) {
    return (
      <div className="-mx-4 -my-4 flex min-h-[calc(100dvh-40px)] flex-col items-center justify-center gap-3 px-[18px]" style={{ background: "#161826" }}>
        <p style={{ color: "rgba(233,233,237,.6)" }}>That word isn&rsquo;t in your vocab anymore.</p>
        <button type="button" onClick={goBack} className="text-[13px]" style={{ color: "#b5abfc" }}>
          ‹ {backLabel}
        </button>
      </div>
    );
  }

  const note = notesData?.notes[0];
  const wordHistory = (historyData?.entries ?? []).filter((e) => e.wordId === word.id);

  return (
    <div
      className="animate-fade-in-screen -mx-4 -my-4 flex min-h-[calc(100dvh-40px)] flex-col gap-[13px] overflow-y-auto px-[18px] pt-[calc(env(safe-area-inset-top)+18px)] pb-6"
      style={{ background: "radial-gradient(120% 38% at 30% 0%, #252840, #161826 55%)" }}
    >
      <div className="flex items-center justify-between text-[13px]" style={{ color: "rgba(233,233,237,.55)" }}>
        <button type="button" onClick={goBack} className="flex items-center gap-[3px]" style={{ color: "inherit" }}>
          <CaretLeft size={14} weight="regular" aria-hidden="true" />
          {backLabel}
        </button>
        <button type="button" onClick={() => setShowActions(true)} aria-label="Word actions">
          <DotsThree size={19} weight="regular" aria-hidden="true" />
        </button>
      </div>

      <div>
        <div className="flex items-center gap-2.5">
          <span
            className="rounded-full px-3 py-1 text-[12px]"
            style={{ background: "rgba(233,233,237,.08)", color: chipColor(word) }}
          >
            {fullArtLabel(word)}
          </span>
          <span className="text-[11px]" style={{ color: "rgba(233,233,237,.45)" }}>
            {word.wortart} · {word.level ? word.level.toUpperCase() : "—"} · {word.lesson ?? "—"}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-3 text-[36px] leading-tight font-medium" style={{ letterSpacing: "-.03em" }}>
          {word.headword}
          <button
            type="button"
            onClick={() => void playWordAudio(word.id).catch(() => {})}
            aria-label="Play pronunciation"
            className="grid size-[37px] shrink-0 place-items-center rounded-full text-white"
            style={{ background: "linear-gradient(160deg,#9184d9,#5d5294)" }}
          >
            <SpeakerHigh size={15} weight="fill" aria-hidden="true" />
          </button>
        </div>
        <div className="text-[15px]" style={{ color: "rgba(233,233,237,.6)" }}>
          {word.meaning ?? "no meaning yet"}
          {word.ipa && <span className="ml-1.5 font-mono text-[12px]">{word.ipa}</span>}
        </div>
      </div>

      {word.declension && <DeclensionCard declension={word.declension} form={word.form} />}
      {word.conjugation && <ConjugationCard headword={word.headword} conjugation={word.conjugation} />}

      {word.example && (
        <div>
          <div className="mb-2 text-[10px] tracking-[.12em] uppercase" style={{ color: "rgba(233,233,237,.45)" }}>
            In a sentence
          </div>
          <div className="pl-3 text-[14px] leading-[1.5]" style={{ borderLeft: "2px solid #5d5294" }}>
            {word.example}
          </div>
        </div>
      )}

      <ReviewHistoryCard word={word} entries={wordHistory} />

      {note && (
        <div
          onClick={() => setEditingNote(true)}
          className="flex cursor-pointer items-start gap-2.5 rounded-xl px-[13px] py-3"
          style={{ background: "rgba(145,132,217,.08)", boxShadow: "0 0 0 1px rgba(145,132,217,.28)" }}
        >
          <NotePencil size={16} weight="regular" style={{ color: "#b5abfc", marginTop: 2, flexShrink: 0 }} aria-hidden="true" />
          <div>
            <div className="text-[10px] tracking-[.1em] uppercase" style={{ color: "#b5abfc" }}>
              Your note
            </div>
            <div className="mt-[3px] text-[13px] leading-[1.5]" style={{ color: "rgba(233,233,237,.8)" }}>
              {noteSnippet(note.body) || note.title || "(empty note)"}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => push("/review", { state: { words: [word] } })}
          className="min-h-[44px] flex-1 rounded-[10px] border text-[14px] font-medium"
          style={{ borderColor: "rgba(233,233,237,.16)" }}
        >
          Drill now
        </button>
        <button
          type="button"
          onClick={() => setShowFamily(true)}
          className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-[10px] text-[14px] font-medium text-white"
          style={{ background: "linear-gradient(160deg,#9184d9,#5d5294)" }}
        >
          <LinkSimple size={15} weight="regular" aria-hidden="true" />
          Word family
        </button>
      </div>

      <BottomSheet open={showActions} onClose={() => setShowActions(false)}>
        <div className="flex flex-col gap-1 pb-1">
          <button
            type="button"
            onClick={() => toggleLeech.mutate(!word.leech)}
            className="flex items-center gap-2.5 rounded-[11px] px-3 py-[11px] text-left text-[13.5px]"
            style={{ background: "#20222f" }}
          >
            <Flag size={15} weight={word.leech ? "fill" : "regular"} aria-hidden="true" />
            {word.leech ? "Unflag as problem word" : "Flag as problem word"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`Delete "${word.headword}"? This also removes it from your vault.`)) del.mutate();
            }}
            className="flex items-center gap-2.5 rounded-[11px] px-3 py-[11px] text-left text-[13.5px]"
            style={{ background: "rgba(209,155,134,.14)", color: "#e4c4b6" }}
          >
            <Trash size={15} weight="regular" aria-hidden="true" />
            Delete word
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={editingNote} onClose={() => setEditingNote(false)}>
        {note && (
          <NoteEditor
            note={note}
            onChanged={() => queryClient.invalidateQueries({ queryKey: ["notes", "word", id] })}
          />
        )}
      </BottomSheet>

      <WordFamilySheet wordId={word.id} headword={word.headword} open={showFamily} onClose={() => setShowFamily(false)} />
    </div>
  );
}
