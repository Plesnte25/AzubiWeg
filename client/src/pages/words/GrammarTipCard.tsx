/** Rule-based grammar tip from grammarTips.ts's generateGrammarTip(), always
 * its own card now (decoupled from being nested inside Declension/
 * Conjugation) so the word-detail pane's grammar row has a fixed two-slot
 * shape regardless of word type — see EmptyStateCard.tsx for the sibling
 * slot's placeholder styling this mirrors. */
export function GrammarTipCard({ tip }: { tip: string | null }) {
  return (
    <div className="rounded-xl p-3.5" style={{ background: "#1c1f2c", boxShadow: "0 0 0 1px rgba(233,233,237,.06)" }}>
      <div className="text-[10px] tracking-[.12em] uppercase" style={{ color: "#9184d9" }}>
        Grammar tip
      </div>
      <div className="mt-2 text-[13px] leading-[1.5]" style={{ color: tip ? "rgba(233,233,237,.75)" : "rgba(233,233,237,.4)" }}>
        {tip ?? "No grammar tip for this word yet."}
      </div>
    </div>
  );
}
