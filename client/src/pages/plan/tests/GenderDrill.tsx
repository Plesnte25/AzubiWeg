import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { api } from "../../../api/client";
import { PillButton } from "../../../components/ui/PillButton";
import { EmptyState } from "../../../components/ui/EmptyState";
import { useNavStack } from "../../../lib/navStack";
import { stripLeadingPosTag } from "../../../lib/wordDisplay";
import { FeedbackPill, OptionButton, ResultTile, TestShell } from "./kit";
import { questionCard } from "./styles";

/*
 * Gender drill (Stats Drill modal in AzubiStats.dc.html; also its own runner at /plan/self-tests/gender): "Which
 * article?" for nouns, weakest first. Answers lock after one pick; the right article turns mint, a wrong pick tomato.
 * Each answer is stored (article accuracy), and a missed word is marked shaky — the README says it "goes back into
 * tomorrow's review", but self-tests never touch the Obsidian-synced review schedule, so the honest version is the
 * app-only shaky flag, and the copy says so.
 */

type Article = "der" | "die" | "das";
const ARTICLES: Article[] = ["der", "die", "das"];
const COLOR: Record<Article, string> = { der: "var(--sky)", die: "var(--pink)", das: "var(--mint)" };

export function GenderDrillBody({
  size = 6,
  shakyOnly = false,
  wordId,
  onClose,
  onProgress,
}: {
  size?: number;
  shakyOnly?: boolean;
  wordId?: string;
  onClose: () => void;
  /** For hosts that draw their own progress (the Stats modal header). */
  onProgress?: (i: number, total: number) => void;
}) {
  const queryClient = useQueryClient();
  const [round, setRound] = useState(0);
  const { data, isLoading } = useQuery({
    queryKey: ["learning", "gender-drill", round, shakyOnly, wordId],
    queryFn: () => api.genderDrill({ size, shakyOnly, wordId }),
    staleTime: Infinity,
  });
  const words = data?.words ?? [];
  const [i, setI] = useState(0);
  const [picks, setPicks] = useState<Article[]>([]);
  useEffect(() => onProgress?.(i, words.length), [i, words.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = useMutation({
    mutationFn: (all: Article[]) =>
      api.submitQuizResult({
        kind: "gender_drill",
        score: all.filter((p, k) => p === words[k]!.article).length,
        total: all.length,
        answers: all.map((p, k) => ({ wordId: words[k]!.wordId, article: words[k]!.article, picked: p })),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["learning"] });
      void queryClient.invalidateQueries({ queryKey: ["words"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  if (isLoading) return <div aria-busy="true" style={{ minHeight: 260 }} />;
  if (words.length === 0)
    return (
      <EmptyState
        action={
          <PillButton height={40} onClick={onClose}>
            Close
          </PillButton>
        }
      >
        {shakyOnly ? "No shaky nouns right now — nice." : "Add a few nouns first; the drill uses your own words."}
      </EmptyState>
    );

  const done = picks.length === words.length && i >= words.length;
  if (done) {
    const right = picks.filter((p, k) => p === words[k]!.article).length;
    const missed = words.length - right;
    return (
      <div className="flex flex-col gap-4">
        <ResultTile
          score={right}
          total={words.length}
          headline="Gender drill"
          line={
            missed === 0
              ? `All ${words.length} solid. They move up a box.`
              : `${missed} marked shaky — they'll show under Shaky in Words.`
          }
          bg="var(--lemon)"
        />
        <div className="flex gap-2">
          <PillButton variant="secondary" style={{ minWidth: 110 }} onClick={onClose}>
            Close
          </PillButton>
          <PillButton
            className="flex-1"
            onClick={() => {
              setRound((r) => r + 1);
              setI(0);
              setPicks([]);
            }}
          >
            Go again
          </PillButton>
        </div>
      </div>
    );
  }

  const w = words[i]!;
  const picked = picks[i] as Article | undefined;
  const last = i === words.length - 1;
  return (
    <div className="flex flex-col gap-4">
      <div style={{ ...questionCard, background: "var(--plain)", alignItems: "center", textAlign: "center" }}>
        <span
          className="uppercase"
          style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".1em", color: "var(--plainMuted)" }}
        >
          Which article?
        </span>
        <span
          lang="de"
          style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-.04em", lineHeight: 1, overflowWrap: "anywhere" }}
        >
          {picked ? w.article : "___"} {w.headword}
        </span>
        {w.meaning && <span style={{ fontSize: 15, fontWeight: 600, color: "var(--plainMuted)" }}>{stripLeadingPosTag(w.meaning, "Nomen")}</span>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {ARTICLES.map((a) => (
          <OptionButton
            key={a}
            big
            lang="de"
            color={COLOR[a]}
            disabled={!!picked}
            state={!picked ? "idle" : a === w.article ? "right" : a === picked ? "wrong" : "dim"}
            onClick={() => {
              const next = [...picks, a];
              setPicks(next);
              if (next.length === words.length) submit.mutate(next);
            }}
          >
            {a}
          </OptionButton>
        ))}
      </div>
      {picked && (
        <FeedbackPill ok={picked === w.article}>
          {picked === w.article ? `Richtig: ${w.article} ${w.headword}` : `It's ${w.article} ${w.headword}`}
        </FeedbackPill>
      )}
      {picked ? (
        <PillButton onClick={() => setI(i + 1)}>{last ? "See result" : "Next word"}</PillButton>
      ) : (
        <PillButton variant="dashed" disabled>
          Pick an article
        </PillButton>
      )}
    </div>
  );
}

/** /plan/self-tests/gender — the drill as a focused runner (Plan checkpoint tile). */
export default function GenderDrillPage() {
  const { goBack } = useNavStack();
  const location = useLocation();
  const opts = (location.state as { shakyOnly?: boolean; wordId?: string } | null) ?? {};
  const [progress, setProgress] = useState({ i: 0, total: 6 });
  return (
    <TestShell title="Gender drill" index={progress.i} total={Math.max(1, progress.total)} onClose={goBack}>
      <GenderDrillBody
        shakyOnly={opts.shakyOnly}
        wordId={opts.wordId}
        onClose={goBack}
        onProgress={(i, total) => setProgress({ i, total })}
      />
    </TestShell>
  );
}
