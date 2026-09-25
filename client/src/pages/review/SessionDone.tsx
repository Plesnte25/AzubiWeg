import { useQuery } from "@tanstack/react-query";
import { Check, Lightning } from "@phosphor-icons/react";
import { api } from "../../api/client";
import type { Grade } from "../../api/types";
import { PillButton } from "../../components/ui/PillButton";
import { RoundSticker } from "../../components/ui/Sticker";
import { Tile } from "../../components/ui/Tile";
import { useNavStack } from "../../lib/navStack";
import { articleChipStyle, articleLabel, nextReviewLabel } from "../../lib/wordBento";
import { findSlippingWord } from "../../lib/wordDisplay";
import { GradeBar } from "./ReviewQueuePane";

function formatDuration(totalSeconds: number): string {
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

/**
 * Session complete (undesigned in the Bento handoff — Sticker style): cards, streak and duration, the grade split,
 * and "the one that keeps slipping" (findSlippingWord over real review history) with a one-card drill. Rendered by
 * ReviewSession once the queue empties; not its own route (both are transient).
 */
export function SessionDone({
  done,
  total,
  elapsedSeconds,
  onHome,
  onTakeTest,
}: {
  done: Record<Grade, number>;
  total: number;
  elapsedSeconds: number;
  onHome: () => void;
  onTakeTest: () => void;
}) {
  const { push } = useNavStack();
  const { data: dashboard } = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });
  const { data: historyData } = useQuery({ queryKey: ["reviews", "history", "sparkline"], queryFn: () => api.reviewHistory(200) });
  const { data: wordsData } = useQuery({ queryKey: ["words"], queryFn: api.words });

  const firstTry = total === 0 ? 0 : Math.round(((done.good + done.easy) / total) * 100);
  const slipping = historyData ? findSlippingWord(historyData.entries) : null;
  const slippingWord = slipping ? wordsData?.words.find((w) => w.id === slipping.wordId) : undefined;
  const stat = (value: string | number, label: string) => (
    <div style={{ background: "var(--plain)", color: "var(--plainText)", border: "2.5px solid var(--line)", borderRadius: 16, padding: "10px 12px" }}>
      <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-.03em" }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--plainMuted)" }}>{label}</div>
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-5">
      <Tile bg="var(--sky)" tilt={-0.8} radius={26} shadow={6} tape className="flex flex-col gap-3.5" style={{ padding: 24 }}>
        <RoundSticker size={64} tilt={12} bg="var(--mint)" style={{ position: "absolute", top: -18, right: -12 }}>
          <Check size={28} weight="bold" aria-hidden="true" />
        </RoundSticker>
        <h1 style={{ margin: 0, fontSize: 44, fontWeight: 700, letterSpacing: "-.045em", lineHeight: 0.95 }}>Stack cleared.</h1>
        <span style={{ fontSize: 15, fontWeight: 600 }}>
          {total} card{total === 1 ? "" : "s"} in {formatDuration(elapsedSeconds)} · {firstTry}% first try
        </span>
        <div className="grid grid-cols-3 gap-2">
          {stat(total, "cards")}
          {stat(dashboard?.streak ?? "—", "day streak")}
          {stat(formatDuration(elapsedSeconds), "duration")}
        </div>
        {total > 0 && <GradeBar done={done} />}
      </Tile>

      {slipping && slippingWord && (
        <Tile bg="var(--tomato)" tilt={0.8} radius={22} className="flex flex-col gap-3" style={{ padding: 20 }}>
          <span className="uppercase" style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".08em" }}>
            The one that keeps slipping
          </span>
          <div className="flex items-center gap-3">
            <span style={articleChipStyle(slippingWord)}>{articleLabel(slippingWord)}</span>
            <div className="min-w-0 flex-1">
              <div lang="de" style={{ fontSize: 20, fontWeight: 700 }}>
                {slipping.headword}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>marked “hard” {slipping.streak} sessions running</div>
            </div>
            <PillButton height={40} icon={<Lightning size={15} weight="fill" aria-hidden="true" />} onClick={() => push("/review", { state: { words: [slippingWord] } })}>
              Drill it
            </PillButton>
          </div>
        </Tile>
      )}

      <div className="flex gap-2">
        <PillButton variant="secondary" style={{ minWidth: 110 }} onClick={onHome}>
          Done
        </PillButton>
        <PillButton className="flex-1" onClick={onTakeTest}>
          Take a self-test
        </PillButton>
      </div>
    </div>
  );
}

/**
 * The review route with nothing to review (no due cards and no new words with a meaning yet): says when the next card
 * comes due instead of showing an empty "Stack cleared" result.
 */
export function NothingDue({ onBack }: { onBack: () => void }) {
  const { push } = useNavStack();
  const { data: wordsData } = useQuery({ queryKey: ["words"], queryFn: api.words });
  const words = wordsData?.words ?? [];
  // srDue is a UTC-midnight @db.Date string, so the ISO strings sort chronologically
  const nextDue = words.reduce<string | null>((min, w) => (w.srDue && (!min || w.srDue < min) ? w.srDue : min), null);
  const line = !wordsData
    ? " "
    : words.length === 0
      ? "Add a few words and they'll show up here to review."
      : nextDue
        ? `Your next card is due ${nextReviewLabel(nextDue)}.`
        : "Words without a meaning yet can't be reviewed. Finish them in Words.";
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-5">
      <Tile bg="var(--mint)" tilt={-0.8} radius={26} shadow={6} tape className="flex flex-col gap-3" style={{ padding: 24 }}>
        <RoundSticker size={64} tilt={12} bg="var(--lemon)" style={{ position: "absolute", top: -18, right: -12 }}>
          <Check size={28} weight="bold" aria-hidden="true" />
        </RoundSticker>
        <h1 style={{ margin: 0, fontSize: 44, fontWeight: 700, letterSpacing: "-.045em", lineHeight: 0.95 }}>Nothing due.</h1>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{line}</span>
      </Tile>
      <div className="flex gap-2">
        <PillButton variant="secondary" style={{ minWidth: 110 }} onClick={onBack}>
          Back
        </PillButton>
        <PillButton className="flex-1" onClick={() => push("/words")}>
          {words.length === 0 ? "Add words" : "Browse words"}
        </PillButton>
      </div>
    </div>
  );
}
