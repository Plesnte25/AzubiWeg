import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SpeakerHigh } from "@phosphor-icons/react";
import { api } from "../../../api/client";
import { playAuthedAudio } from "../../../lib/playAudio";
import { EmptyState } from "../../../components/ui/EmptyState";
import { PillButton } from "../../../components/ui/PillButton";
import { isAnswerAccepted } from "../../../lib/quiz";
import { useNavStack } from "../../../lib/navStack";
import { stripLeadingPosTag } from "../../../lib/wordDisplay";
import { FeedbackPill, ResultTile, TestShell } from "./kit";
import { questionCard } from "./styles";

/*
 * Listen & type (/plan/self-tests/listen): hear one of your words, type it. Words with a recording come first; the
 * rest play the server's cached TTS. Umlaut spellings (ae/oe/ue, ss) are accepted, like the other fill-ins. The
 * score is saved as a listen_type self-test (the Checkpoint tile's fourth drill).
 */

export default function ListenType() {
  const { goBack } = useNavStack();
  const queryClient = useQueryClient();
  const [round, setRound] = useState(0);
  const { data, isLoading } = useQuery({
    queryKey: ["learning", "listen-type", round],
    queryFn: () => api.listenType(8),
    staleTime: Infinity,
  });
  const words = data?.words ?? [];
  const [i, setI] = useState(0);
  const [draft, setDraft] = useState("");
  const [results, setResults] = useState<boolean[]>([]);
  const [audioError, setAudioError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const w = words[i];
  const checked = results.length > i;
  const play = () => {
    if (!w) return;
    setAudioError(false);
    playAuthedAudio(w.audioUrl).catch(() => setAudioError(true));
  };
  useEffect(() => {
    if (!w) return;
    play();
    inputRef.current?.focus();
  }, [w?.wordId]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = useMutation({
    mutationFn: (all: boolean[]) =>
      api.submitQuizResult({ kind: "listen_type", score: all.filter(Boolean).length, total: all.length }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["learning"] }),
  });

  const check = () => {
    if (!w || checked || !draft.trim()) return;
    const next = [...results, isAnswerAccepted(draft, [w.headword])];
    setResults(next);
    if (next.length === words.length) submit.mutate(next);
  };
  const advance = () => {
    setDraft("");
    setI(i + 1);
  };

  if (isLoading) return <div className="min-h-dvh" aria-busy="true" />;
  if (words.length === 0)
    return (
      <TestShell title="Listen & type" index={0} total={1} onClose={goBack}>
        <EmptyState
          action={
            <PillButton height={40} onClick={goBack}>
              Back
            </PillButton>
          }
        >
          Add some words first; this drill plays your own.
        </EmptyState>
      </TestShell>
    );

  if (i >= words.length) {
    const right = results.filter(Boolean).length;
    return (
      <TestShell title="Listen & type" index={words.length} total={words.length} results={results} onClose={goBack}>
        <ResultTile
          score={right}
          total={words.length}
          headline="Listen & type"
          line={
            right === words.length
              ? "Every word, by ear. Sehr gut!"
              : "Replay the ones you missed in Words — the speaker button on each word."
          }
          bg="var(--sky)"
        >
          <div className="flex flex-wrap gap-1.5">
            {words.map((x, k) => (
              <span
                key={x.wordId}
                lang="de"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "3px 9px",
                  borderRadius: 999,
                  border: "2px solid var(--line)",
                  background: results[k] ? "var(--plain)" : "var(--tomato)",
                }}
              >
                {x.headword}
              </span>
            ))}
          </div>
        </ResultTile>
        <div className="flex gap-2">
          <PillButton variant="secondary" style={{ minWidth: 110 }} onClick={goBack}>
            Done
          </PillButton>
          <PillButton
            className="flex-1"
            onClick={() => {
              setRound((r) => r + 1);
              setI(0);
              setResults([]);
            }}
          >
            Go again
          </PillButton>
        </div>
      </TestShell>
    );
  }

  const ok = results[i];
  return (
    <TestShell title="Listen & type" index={i} total={words.length} results={results} onClose={goBack}>
      <div style={{ ...questionCard, alignItems: "center", textAlign: "center" }}>
        <span
          className="uppercase"
          style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".1em", color: "var(--plainMuted)" }}
        >
          Listen, then type what you hear
        </span>
        <button
          type="button"
          onClick={play}
          aria-label="Play the word again"
          className="press flex cursor-pointer items-center justify-center"
          style={{
            width: 84,
            height: 84,
            borderRadius: "50%",
            border: "2.5px solid var(--line)",
            background: "var(--sky)",
            color: "var(--onTile)",
            boxShadow: "4px 4px 0 var(--shadow)",
          }}
        >
          <SpeakerHigh size={36} weight="fill" aria-hidden="true" />
        </button>
        {audioError && (
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--tomato)" }}>
            Couldn't play the audio — try again.
          </span>
        )}
        <input
          ref={inputRef}
          value={draft}
          lang="de"
          disabled={checked}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (checked ? advance() : check())}
          placeholder="Type the German word…"
          aria-label="What you heard"
          style={{
            width: "100%",
            height: 52,
            padding: "0 14px",
            border: "2.5px solid var(--line)",
            borderRadius: 14,
            background: "var(--plain2)",
            color: "var(--plainText)",
            fontSize: 20,
            fontWeight: 700,
            textAlign: "center",
          }}
        />
      </div>
      {checked && (
        <FeedbackPill ok={!!ok}>
          {ok ? `Richtig: ${w!.headword}` : `It was „${w!.headword}“${w!.meaning ? ` — ${stripLeadingPosTag(w!.meaning)}` : ""}`}
        </FeedbackPill>
      )}
      <PillButton disabled={!checked && !draft.trim()} onClick={checked ? advance : check}>
        {!checked ? "Check" : i === words.length - 1 ? "See result" : "Next word"}
      </PillButton>
    </TestShell>
  );
}
