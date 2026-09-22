import type { DeclensionTable } from "../../api/types";

const CASES: { key: keyof DeclensionTable; label: string }[] = [
  { key: "nom", label: "Nom." },
  { key: "akk", label: "Acc." },
  { key: "dat", label: "Dat." },
  { key: "gen", label: "Gen." },
];

/** Real per-case singular/plural forms from the kaikki.org enrichment
 * pipeline (server/src/services/enrichment/kaikki.ts's extractDeclension())
 * — unlike the handoff's demo, which fabricates every cell from a suffix
 * guess, this renders exactly what was actually looked up and dashes out
 * whatever kaikki.org didn't have a table for (its coverage is real but
 * incomplete). Not rendered at all when `declension` is null. */
export function DeclensionCard({ declension, form }: { declension: DeclensionTable; form: string | null }) {
  const plural = declension.nom?.pl;
  return (
    <div className="rounded-xl p-3.5" style={{ background: "var(--color-card)", boxShadow: "0 0 0 1px var(--color-hairline-soft)" }}>
      <div className="flex justify-between">
        <div className="text-micro tracking-[.12em] uppercase" style={{ color: "var(--color-brand-500)" }}>
          Declension
        </div>
        {plural && (
          <span className="text-micro" style={{ color: "var(--color-ink-600)" }}>
            plural: die {plural}
          </span>
        )}
      </div>
      <table className="mt-2 w-full text-[13px]">
        <thead>
          <tr style={{ color: "var(--color-ink-600)" }}>
            <th className="pb-1.5 text-left text-micro font-normal">Case</th>
            <th className="pb-1.5 text-left text-micro font-normal">Singular</th>
            <th className="pb-1.5 text-left text-micro font-normal">Plural</th>
          </tr>
        </thead>
        <tbody>
          {CASES.map(({ key, label }) => {
            const cell = declension[key];
            return (
              <tr key={key}>
                <td className="py-1" style={{ color: "var(--color-ink-600)" }}>
                  {label}
                </td>
                <td className="py-1">{cell?.sg ?? "—"}</td>
                <td className="py-1">{cell?.pl ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {form && (
        <div className="mt-2 rounded-lg px-2.5 py-2 text-[11px]" style={{ color: "var(--color-ink-400)", background: "var(--color-brand-50)" }}>
          {form}
        </div>
      )}
    </div>
  );
}
