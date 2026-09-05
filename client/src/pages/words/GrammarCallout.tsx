/** A small grammar-rule callout using the real `Word.grammar` field
 * (article/plural or verb classification notes, sourced at enrichment time
 * and already round-tripped through the vault card) — not rendered
 * anywhere in the UI before this. Not shown at all when `grammar` is null,
 * matching every other data-driven card on this pane. */
export function GrammarCallout({ grammar }: { grammar: string }) {
  return (
    <div className="rounded-xl p-3.5" style={{ background: "#1c1f2c", boxShadow: "0 0 0 1px rgba(233,233,237,.06)" }}>
      <div className="text-[10px] tracking-[.12em] uppercase" style={{ color: "#9184d9" }}>
        Grammar
      </div>
      <div className="mt-2 text-[13px] leading-[1.5]" style={{ color: "rgba(233,233,237,.75)" }}>
        {grammar}
      </div>
    </div>
  );
}
