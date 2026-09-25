import { useQuery } from "@tanstack/react-query";
import { Check } from "@phosphor-icons/react";
import { api } from "../../api/client";
import { useNavStack } from "../../lib/navStack";
import { nextReviewLabel } from "../../lib/wordBento";

/**
 * The review route with nothing to review (no due, new or shaky cards): says when the next card comes due instead of
 * showing an empty "Stack cleared". Same card shape as the done card (AzubiReview.dc.html §2.6).
 */
export function NothingDue({ onBack }: { onBack: () => void }) {
  const { push, backLabel } = useNavStack();
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
  const pill = { height: 48, padding: "0 18px", border: "2.5px solid var(--line)", borderRadius: 999, fontWeight: 700, fontSize: 15, cursor: "pointer" } as const;
  return (
    <div
      className="relative mx-auto flex w-full flex-col"
      style={{
        maxWidth: 640,
        background: "var(--mint)",
        color: "var(--onTile)",
        border: "2.5px solid var(--line)",
        borderRadius: "8px 8px 34px 8px",
        boxShadow: "8px 8px 0 var(--shadow)",
        transform: "rotate(-1deg)",
        padding: 30,
        gap: 18,
        boxSizing: "border-box",
      }}
    >
      <span aria-hidden="true" style={{ position: "absolute", top: -13, left: 40, width: 90, height: 24, background: "var(--tape)", transform: "rotate(-4deg)", borderRadius: 3 }} />
      <span
        aria-hidden="true"
        className="flex items-center justify-center"
        style={{ position: "absolute", top: -22, right: 26, width: 78, height: 78, borderRadius: "50%", border: "2.5px solid var(--line)", background: "var(--lemon)", boxShadow: "3px 3px 0 var(--shadow)", transform: "rotate(12deg)" }}
      >
        <Check size={34} weight="bold" />
      </span>
      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" }}>Review</span>
      <h1 style={{ margin: 0, fontSize: "calc(var(--k, 1) * 48px)", fontWeight: 700, letterSpacing: "-.05em", lineHeight: 0.95 }}>Nothing due.</h1>
      <span style={{ fontSize: 16, fontWeight: 600 }}>{line}</span>
      <div className="flex flex-wrap" style={{ gap: 8 }}>
        <button type="button" onClick={onBack} style={{ ...pill, background: "var(--plain)", color: "var(--plainText)" }}>
          Back to {backLabel}
        </button>
        <button type="button" onClick={() => push("/words")} className="press" style={{ ...pill, flex: 1, minWidth: 140, background: "var(--btn)", color: "var(--btnText)", boxShadow: "3px 3px 0 var(--shadow)" }}>
          {words.length === 0 ? "Add words" : "Browse words"}
        </button>
      </div>
    </div>
  );
}
