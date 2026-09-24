import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CaretDown } from "@phosphor-icons/react";
import { api } from "../../../api/client";
import type { SyllabusItem, SyllabusMistakeCategory } from "../../../api/types";
import AudioRecorder from "../../../components/AudioRecorder";
import { PillButton } from "../../../components/ui/PillButton";

/*
 * The topic workspace (learn → practise → exercise) inside the Plan Task modal: outcome, study text, listening
 * audio (authored URL or generated TTS, transcript revealed on demand), guided practice, and the graded exercise —
 * multiple choice, free text/correction, or an audio recording — with the self-review rubric and a mistake category
 * for failed attempts. Moved out of the Nocturne StationDetailModal and restyled; the behaviour is unchanged.
 * The grammar notebook (examples / exceptions / common mistakes) sits in a collapsed section at the end.
 */

const box: CSSProperties = { background: "var(--plain)", color: "var(--plainText)", border: "2.5px solid var(--line)", borderRadius: 16, padding: "12px 14px" };
const eyebrow: CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--plainMuted)" };
const input: CSSProperties = { width: "100%", padding: "10px 12px", background: "var(--plain)", color: "var(--plainText)", border: "2.5px solid var(--line)", borderRadius: 12, fontSize: 15, fontWeight: 500, boxSizing: "border-box" };

const MISTAKES: [SyllabusMistakeCategory, string][] = [
  ["gender_article", "Gender / article"],
  ["case", "Case"],
  ["word_order", "Word order"],
  ["conjugation", "Conjugation"],
  ["vocabulary", "Vocabulary"],
  ["spelling", "Spelling"],
  ["pronunciation", "Pronunciation"],
  ["listening_detail", "Listening detail"],
  ["collocation", "Collocation"],
  ["other", "Other"],
];

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={box}>
      <div style={eyebrow}>{label}</div>
      <div className="mt-1.5 flex flex-col gap-2" style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.45 }}>
        {children}
      </div>
    </div>
  );
}

function mergedNotebook(item: SyllabusItem): string {
  return [item.examples, item.exceptions, item.commonMistakes].filter(Boolean).join("\n\n");
}

function Notebook({ item }: { item: SyllabusItem }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(mergedNotebook(item));
  const save = useMutation({
    // every save writes the merged text back to `examples` (see the schema note on the legacy columns)
    mutationFn: (value: string) => api.updateSyllabusNotebook(item.id, { examples: value || null, exceptions: null, commonMistakes: null }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["learning"] }),
  });
  return (
    <div style={{ ...box, background: "transparent", borderStyle: "dashed" }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between border-0 bg-transparent p-0"
        style={{ color: "inherit", fontSize: 13, fontWeight: 700 }}
      >
        Grammar notebook{mergedNotebook(item) ? " · has notes" : ""}
        <CaretDown size={14} weight="bold" style={{ transform: open ? "rotate(180deg)" : "none" }} aria-hidden="true" />
      </button>
      {open && (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => draft !== mergedNotebook(item) && save.mutate(draft)}
          rows={4}
          placeholder="Examples, exceptions, the mistakes you make…"
          aria-label="Grammar notebook"
          style={{ ...input, marginTop: 10, resize: "vertical" }}
        />
      )}
    </div>
  );
}

export function TopicWorkspace({ itemId, onCompleted }: { itemId: string; onCompleted: () => void }) {
  const { data, isLoading } = useQuery({ queryKey: ["learning", "workspace", itemId], queryFn: () => api.syllabusWorkspace(itemId) });
  const [answer, setAnswer] = useState("");
  const [mistake, setMistake] = useState<SyllabusMistakeCategory | "">("");
  const [audioUploaded, setAudioUploaded] = useState(false);
  const [rubric, setRubric] = useState({ taskFulfilled: false, grammarChecked: false, understandable: false });
  const [showTranscript, setShowTranscript] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  useEffect(() => {
    if (!data?.item.resourceTranscript || data.item.skill !== "listening" || data.item.resourceAudioUrl) return;
    let active = true;
    let url: string | null = null;
    setGeneratedAudio(null);
    setAudioError(null);
    api
      .syllabusAudio(itemId)
      .then((audio) => {
        if (!active) return;
        url = URL.createObjectURL(audio);
        setGeneratedAudio(url);
      })
      .catch((e: unknown) => active && setAudioError(e instanceof Error ? e.message : "The lesson recording could not be loaded."));
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [data?.item.resourceAudioUrl, data?.item.resourceTranscript, data?.item.skill, itemId]);

  const needsRubric = data ? data.item.skill === "writing" || data.item.exerciseType === "speaking_audio" || data.item.exerciseType === "self_check" : false;
  const submit = useMutation({
    mutationFn: () =>
      api.submitSyllabusExercise(
        itemId,
        answer || (data?.item.exerciseType === "self_check" ? "self-check" : "audio"),
        mistake || null,
        needsRubric ? rubric : null,
      ),
    onSuccess: (result) => {
      if (result.passed && data?.item.exerciseType !== "speaking_audio") onCompleted();
    },
  });

  if (isLoading || !data) return <div aria-busy="true" style={{ ...box, borderStyle: "dashed", opacity: 0.6 }}>Loading the lesson…</div>;
  const { item } = data;
  const isAudioExercise = item.exerciseType === "listening_audio" || item.exerciseType === "speaking_audio";
  const canSubmit = isAudioExercise ? audioUploaded : item.exerciseType === "self_check" ? Object.values(rubric).every(Boolean) : answer.trim().length > 0;
  const rubricLabels: [keyof typeof rubric, string][] =
    item.exerciseType === "speaking_audio"
      ? [
          ["taskFulfilled", "I completed every part of the speaking prompt."],
          ["grammarChecked", "I listened to my recording once."],
          ["understandable", "My message is understandable without reading the prompt."],
        ]
      : item.exerciseType === "self_check"
        ? [
            ["taskFulfilled", "I can explain the target concept."],
            ["grammarChecked", "I can produce a correct example."],
            ["understandable", "I know what to review if I am unsure."],
          ]
        : [
            ["taskFulfilled", "I answered every part of the prompt."],
            ["grammarChecked", "I checked verb forms, articles and word order."],
            ["understandable", "A German learner could understand my meaning."],
          ];

  return (
    <div className="flex flex-col gap-3" aria-label={`Study ${item.title}`}>
      {item.learningOutcome && <Section label="Outcome">{item.learningOutcome}</Section>}
      {item.resourceTitle && (
        <Section label="Study">
          <b>{item.resourceTitle}</b>
          {item.resourceBody && <span className="whitespace-pre-line">{item.resourceBody}</span>}
          {item.resourceUrl && (
            <a href={item.resourceUrl} target="_blank" rel="noreferrer" style={{ fontWeight: 700, textDecoration: "underline" }}>
              Open the resource
            </a>
          )}
        </Section>
      )}
      {item.skill === "listening" && (
        <Section label="Listening">
          {item.resourceAudioUrl || generatedAudio ? (
            <>
              <audio className="w-full" controls preload="metadata" src={item.resourceAudioUrl ?? generatedAudio ?? undefined}>
                Your browser cannot play this audio.
              </audio>
              <span>Listen twice: first for the main idea, then for the details.</span>
            </>
          ) : (
            <span>{item.resourceTranscript ? "Preparing the lesson recording…" : "No recording for this lesson yet."}</span>
          )}
          {audioError && <span style={{ color: "var(--tomato)", fontWeight: 700 }}>{audioError}</span>}
          {item.listeningPrompt && (
            <span>
              <b>Listen for:</b> {item.listeningPrompt}
            </span>
          )}
          {item.resourceTranscript && (
            <>
              <button
                type="button"
                aria-expanded={showTranscript}
                onClick={() => setShowTranscript((v) => !v)}
                className="cursor-pointer self-start border-0 bg-transparent p-0"
                style={{ color: "inherit", fontWeight: 700, textDecoration: "underline" }}
              >
                {showTranscript ? "Hide transcript" : "Reveal the transcript after listening"}
              </button>
              {showTranscript && (
                <span lang="de" className="whitespace-pre-line">
                  {item.resourceTranscript}
                </span>
              )}
            </>
          )}
        </Section>
      )}
      {item.guidedPractice && <Section label="Practise">{item.guidedPractice}</Section>}
      {item.exercisePrompt && (
        <Section label="Exercise">
          <span lang="de">{item.exercisePrompt}</span>
          {item.exerciseType === "multiple_choice" && item.exerciseOptions?.options?.length ? (
            <div role="radiogroup" aria-label="Answer" className="flex flex-col gap-1.5">
              {item.exerciseOptions.options.map((option, index) => {
                const on = answer === String(index);
                return (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setAnswer(String(index))}
                    className="cursor-pointer text-left"
                    lang="de"
                    style={{
                      padding: "9px 12px",
                      borderRadius: 12,
                      border: "2.5px solid var(--line)",
                      background: on ? "var(--sel)" : "var(--plain)",
                      color: on ? "var(--selText)" : "var(--plainText)",
                      fontWeight: 700,
                      fontSize: 14,
                    }}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          ) : isAudioExercise ? (
            <div className="flex flex-col gap-2">
              <span>{item.exerciseType === "listening_audio" ? "Listen, then record your spoken summary or answer." : "Record yourself doing this speaking task."}</span>
              <AudioRecorder syllabusItemId={item.id} onUploaded={() => setAudioUploaded(true)} />
              {audioUploaded && <b>Recording uploaded — submit it for feedback.</b>}
            </div>
          ) : (
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={3}
              lang="de"
              aria-label="Your answer"
              placeholder={item.exerciseType === "correction" ? "Write the corrected German sentence…" : "Write your answer in German…"}
              style={{ ...input, resize: "vertical" }}
            />
          )}
          {needsRubric && (
            <fieldset className="m-0 flex flex-col gap-1.5" style={{ border: "2px dashed var(--line)", borderRadius: 12, padding: "8px 12px" }}>
              <legend style={{ fontSize: 13, fontWeight: 700, padding: "0 4px" }}>
                {item.exerciseType === "self_check" ? "Confirm your understanding" : "Before you submit"}
              </legend>
              {rubricLabels.map(([key, label]) => (
                <label key={key} className="flex cursor-pointer items-start gap-2">
                  <input type="checkbox" checked={rubric[key]} onChange={(e) => setRubric((r) => ({ ...r, [key]: e.target.checked }))} style={{ marginTop: 3 }} />
                  <span>{label}</span>
                </label>
              ))}
            </fieldset>
          )}
          <label className="flex flex-col gap-1" style={{ fontSize: 13, fontWeight: 700 }}>
            If it's wrong, what felt hard?
            <select value={mistake} onChange={(e) => setMistake(e.target.value as SyllabusMistakeCategory | "")} style={{ ...input, height: 42, padding: "0 10px" }}>
              <option value="">Choose after a wrong attempt</option>
              {MISTAKES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <PillButton height={42} disabled={submit.isPending || !canSubmit} onClick={() => submit.mutate()} className="self-start">
            {submit.isPending ? "Checking…" : "Check and complete"}
          </PillButton>
          {submit.data && (
            <span role="status" style={{ fontWeight: 700, padding: "8px 10px", borderRadius: 12, border: "2px solid var(--line)", background: submit.data.passed ? "var(--mint)" : "var(--tomato)", color: "var(--onTile)" }}>
              {submit.data.feedback}
            </span>
          )}
        </Section>
      )}
      {item.category === "grammar" && <Notebook item={item} />}
    </div>
  );
}
