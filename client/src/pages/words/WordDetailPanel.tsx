import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, DotsThree, Lightning, SpeakerHigh, Star, X } from "@phosphor-icons/react";
import { api, playWordAudio } from "../../api/client";
import type { Word } from "../../api/types";
import { Modal } from "../../components/ui/Modal";
import { PillButton } from "../../components/ui/PillButton";
import { toast } from "../../components/ui/Toast";
import { useNavStack } from "../../lib/navStack";
import { articleChipStyle, articleLabel, nextReviewLabel, pipStyles, STRENGTH_LABELS } from "../../lib/wordBento";
import { stripLeadingPosTag } from "../../lib/wordDisplay";

/*
 * The selected word (AzubiWords.dc.html detail tile / sm sheet), shared by the Words page and the review session.
 * The caller supplies the coloured container; this renders its contents. Fields are real or left out: plural /
 * past forms from kaikki.org, next review from srDue, the example with its stored translation.
 */

const plainBox: CSSProperties = { background: "var(--plain)", color: "var(--plainText)", border: "2px solid var(--line)", borderRadius: 14, padding: "10px 12px" };
const eyebrow: CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--plainMuted)" };

function roundBtn(on = false): CSSProperties {
  return {
    width: 38,
    height: 38,
    borderRadius: "50%",
    background: on ? "var(--lemon)" : "var(--plain)",
    color: on ? "var(--onTile)" : "var(--plainText)",
    border: "2.5px solid var(--line)",
    padding: 0,
    transform: on ? "rotate(-12deg)" : "none",
  };
}

function useWordMutations(word: Word, onDeleted?: () => void) {
  const queryClient = useQueryClient();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["words"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };
  const onError = (e: unknown) => toast.error(e instanceof Error ? e.message : "Something went wrong");
  return {
    star: useMutation({ mutationFn: (starred: boolean) => api.updateWord(word.id, { starred }), onSuccess: refresh, onError }),
    flag: useMutation({
      mutationFn: (leech: boolean) => api.updateWord(word.id, { leech }),
      onSuccess: (_, leech) => {
        toast.success(leech ? "Flagged as shaky" : "Shaky flag removed");
        refresh();
      },
      onError,
    }),
    meaning: useMutation({
      mutationFn: (meaning: string) => api.updateWord(word.id, { meaning }),
      onSuccess: () => {
        toast.success("Meaning saved");
        refresh();
      },
      onError,
    }),
    del: useMutation({
      mutationFn: () => api.deleteWord(word.id),
      onSuccess: () => {
        toast.success(`Deleted „${word.headword}“`);
        onDeleted?.();
        refresh();
      },
      onError,
    }),
  };
}

/** ⋯ menu: edit meaning (shows the enrichment review note), flag as shaky, delete. */
function WordMenu({ word, onDeleted }: { word: Word; onDeleted?: () => void }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draft, setDraft] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const m = useWordMutations(word, onDeleted);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item: CSSProperties = { display: "flex", width: "100%", textAlign: "left", padding: "9px 12px", borderRadius: 10, fontSize: 14, fontWeight: 700, background: "transparent", border: "none", color: "inherit" };
  const choose = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label="More actions" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex cursor-pointer items-center justify-center" style={roundBtn()}>
        <DotsThree size={17} weight="bold" aria-hidden="true" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 flex flex-col"
          style={{ top: 44, width: 210, padding: 6, background: "var(--plain)", color: "var(--plainText)", border: "2.5px solid var(--line)", borderRadius: 16, boxShadow: "4px 4px 0 var(--shadow)" }}
        >
          <button
            type="button"
            role="menuitem"
            className="cursor-pointer hover:bg-plain2"
            style={item}
            onClick={choose(() => {
              setDraft(stripLeadingPosTag(word.meaning ?? ""));
              setEditing(true);
            })}
          >
            {word.reviewNote ? "Review meaning…" : "Edit meaning…"}
          </button>
          <button type="button" role="menuitem" className="cursor-pointer hover:bg-plain2" style={item} onClick={choose(() => m.flag.mutate(!word.leech))}>
            {word.leech ? "Remove shaky flag" : "Flag as shaky"}
          </button>
          <button type="button" role="menuitem" className="cursor-pointer hover:bg-plain2" style={{ ...item, color: "var(--tomato)" }} onClick={choose(() => setConfirmDelete(true))}>
            Delete word…
          </button>
        </div>
      )}
      {editing && (
        <Modal
          title={word.reviewNote ? "Review meaning" : "Edit meaning"}
          tag={word.headword}
          subtitle={word.reviewNote ? "Saving marks this word as reviewed." : undefined}
          bg="var(--lemon)"
          width={480}
          onClose={() => setEditing(false)}
          footer={
            <>
              <PillButton variant="secondary" style={{ minWidth: 110 }} onClick={() => setEditing(false)}>
                Cancel
              </PillButton>
              <PillButton
                className="flex-1"
                disabled={!draft.trim() || m.meaning.isPending}
                onClick={() => m.meaning.mutate(draft.trim(), { onSuccess: () => setEditing(false) })}
              >
                {word.reviewNote ? "Save & mark reviewed" : "Save"}
              </PillButton>
            </>
          }
        >
          {word.reviewNote && (
            <div style={{ ...plainBox, borderWidth: 2.5 }}>
              <div style={eyebrow}>Why it needs a look</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{word.reviewNote}</div>
            </div>
          )}
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            aria-label="Meaning"
            style={{ padding: "12px 14px", background: "var(--plain)", color: "var(--plainText)", border: "2.5px solid var(--line)", borderRadius: 14, fontSize: 16, fontWeight: 600, resize: "vertical" }}
          />
        </Modal>
      )}
      {confirmDelete && (
        <Modal
          title="Delete this word?"
          tag={word.headword}
          subtitle="It leaves your Wortschatz and your Obsidian vault, with its review history."
          bg="var(--tomato)"
          width={460}
          onClose={() => setConfirmDelete(false)}
          footer={
            <>
              <PillButton variant="secondary" style={{ minWidth: 110 }} onClick={() => setConfirmDelete(false)}>
                Keep it
              </PillButton>
              <PillButton className="flex-1" disabled={m.del.isPending} onClick={() => m.del.mutate(undefined, { onSuccess: () => setConfirmDelete(false) })}>
                Delete
              </PillButton>
            </>
          }
        >
          <span style={{ fontSize: 15, fontWeight: 600 }}>This can't be undone.</span>
        </Modal>
      )}
    </div>
  );
}

export function WordDetailPanel({
  word,
  onDetails,
  onClose,
  onDeleted,
  compact = false,
}: {
  word: Word;
  onDetails: () => void;
  /** sm sheet: a close button replaces the header row's kind label. */
  onClose?: () => void;
  onDeleted?: () => void;
  compact?: boolean;
}) {
  const { push } = useNavStack();
  const m = useWordMutations(word);
  const isVerb = word.wortart === "Verb";
  const kind = isVerb ? "Verb" : word.genus ? "Noun" : (word.wortart ?? "Word");
  const plural = word.declension?.nom?.pl;
  const past = [word.conjugation?.past, word.conjugation?.perfect].filter(Boolean).join(" · ");
  const form = isVerb ? past : plural ? `die ${plural}` : null;
  const hasForms = isVerb || word.wortart === "Nomen" || !!word.genus;
  const strength = word.strength ?? 0;
  const meaning = stripLeadingPosTag(word.meaning ?? "", word.wortart);
  const badge =
    word.enrichmentStatus === "published_review" ? "needs review" : word.enrichmentStatus === "incomplete" || word.enrichmentStatus === "unresolved" ? "incomplete" : null;

  const play = () => void playWordAudio(word.id).catch(() => toast.error("Audio isn't available right now"));

  return (
    <div className="flex min-h-0 flex-1 flex-col" style={{ gap: compact ? 14 : 16 }}>
      <div className="flex items-center justify-between gap-2">
        {onClose ? (
          <span style={articleChipStyle(word, true)}>{articleLabel(word)}</span>
        ) : (
          <span className="uppercase" style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".08em" }}>
            {kind}
            {word.lesson ? ` · ${word.lesson.replace(/-/g, " ")}` : word.level ? ` · ${word.level.toUpperCase()}` : ""}
          </span>
        )}
        <div className="flex gap-1.5">
          <button
            type="button"
            aria-label={word.starred ? "Unstar" : "Star"}
            aria-pressed={word.starred}
            onClick={() => m.star.mutate(!word.starred)}
            className="flex cursor-pointer items-center justify-center"
            style={roundBtn(word.starred)}
          >
            <Star size={17} weight="fill" aria-hidden="true" />
          </button>
          <WordMenu word={word} onDeleted={onDeleted} />
          {onClose && (
            <button type="button" aria-label="Close" onClick={onClose} className="flex cursor-pointer items-center justify-center" style={roundBtn()}>
              <X size={16} weight="bold" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {!onClose && <span style={articleChipStyle(word, true)}>{articleLabel(word)}</span>}
        <div className="flex flex-wrap items-center gap-3">
          <span lang="de" style={{ fontSize: compact ? 40 : "calc(var(--k) * 60px)", fontWeight: 700, letterSpacing: "-.045em", lineHeight: 0.95, hyphens: "auto", overflowWrap: "anywhere" }}>
            {word.headword}
          </span>
          <button
            type="button"
            aria-label={`Play „${word.headword}“`}
            onClick={play}
            className="press flex shrink-0 cursor-pointer items-center justify-center"
            style={{ width: compact ? 42 : 46, height: compact ? 42 : 46, borderRadius: "50%", background: "var(--btn)", color: "var(--btnText)", border: "2.5px solid var(--line)", padding: 0, boxShadow: "3px 3px 0 var(--shadow)" }}
          >
            <SpeakerHigh size={compact ? 18 : 20} weight="fill" aria-hidden="true" />
          </button>
          {badge && (
            <span style={{ fontSize: 11, fontWeight: 700, background: "var(--plain)", color: "var(--plainText)", border: "2px solid var(--line)", borderRadius: 999, padding: "2px 8px", transform: "rotate(-4deg)" }}>
              {badge}
            </span>
          )}
        </div>
        <span style={{ fontSize: compact ? 16 : 17, fontWeight: 600 }}>
          {meaning || <i>no meaning yet</i>}
          {word.ipa && <span style={{ fontWeight: 500, opacity: 0.7 }}> · {word.ipa}</span>}
        </span>
      </div>

      {!compact && (
        <div className={hasForms ? "grid grid-cols-2 gap-2.5" : "grid grid-cols-1 gap-2.5"}>
          {/* plural for nouns, past/Perfekt for verbs; other word types have no form to show */}
          {hasForms && (
            <div style={plainBox}>
              <div style={eyebrow}>{isVerb ? "Past · Perfekt" : "Plural"}</div>
              <div lang="de" style={{ fontSize: 15, fontWeight: 700, marginTop: 2, overflowWrap: "anywhere" }}>
                {form || "—"}
              </div>
            </div>
          )}
          <div style={plainBox}>
            <div style={eyebrow}>Next review</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{nextReviewLabel(word.srDue)}</div>
          </div>
        </div>
      )}

      {word.example && (
        <div
          className="flex flex-col gap-1"
          style={{ background: "var(--plain)", color: "var(--plainText)", border: "2.5px solid var(--line)", borderRadius: 16, padding: compact ? 12 : 14, transform: compact ? "none" : "rotate(0.8deg)" }}
        >
          <p lang="de" style={{ margin: 0, fontSize: compact ? 16 : "calc(var(--k) * 18px)", fontWeight: 700, lineHeight: 1.35 }}>
            „{word.example}“
          </p>
          {word.exampleTranslation && <p style={{ margin: 0, fontSize: compact ? 13 : 14, fontWeight: 500, color: "var(--plainMuted)" }}>{word.exampleTranslation}</p>}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {!compact && (
          <div className="flex justify-between" style={{ fontSize: 13, fontWeight: 700 }}>
            <span>Strength</span>
            <span>{STRENGTH_LABELS[strength]}</span>
          </div>
        )}
        <div className="flex gap-[5px]" role="img" aria-label={`Strength ${strength} of 5: ${STRENGTH_LABELS[strength]}`}>
          {pipStyles(strength, true).map((s, i) => (
            <span key={i} style={s} />
          ))}
        </div>
      </div>

      <div className="mt-auto flex gap-2">
        <PillButton
          variant="secondary"
          className="flex-1"
          icon={<Lightning size={16} weight="fill" aria-hidden="true" />}
          onClick={() => push("/review", { state: { words: [word], deckLabel: `Words · ${word.headword}` } })}
          disabled={!word.meaning}
        >
          Drill now
        </PillButton>
        <PillButton className="flex-1" icon={<BookOpen size={16} weight="fill" aria-hidden="true" />} onClick={onDetails}>
          Word details
        </PillButton>
      </div>
    </div>
  );
}
