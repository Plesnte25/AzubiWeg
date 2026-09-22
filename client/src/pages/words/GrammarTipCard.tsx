/** Rule-based grammar tip from grammarTips.ts's generateGrammarTip(), always
 * its own card now (decoupled from being nested inside Declension/
 * Conjugation) so the word-detail pane's grammar row has a fixed two-slot
 * shape regardless of word type — see EmptyStateCard.tsx for the sibling
 * slot's placeholder styling this mirrors. */
export function GrammarTipCard({ tip }: { tip: string | null }) {
  return (
    <div className="rounded-xl p-3.5" style={{ background: "var(--color-card)", boxShadow: "0 0 0 1px var(--color-hairline-soft)" }}>
      <div className="text-micro tracking-[.12em] uppercase" style={{ color: "var(--color-brand-500)" }}>
        Grammar tip
      </div>
      <div className="mt-2 text-[13px] leading-[1.5]" style={{ color: tip ? "var(--color-ink-700)" : "var(--color-ink-600)" }}>
        {tip ?? "No grammar tip for this word yet."}
      </div>
    </div>
  );
}
