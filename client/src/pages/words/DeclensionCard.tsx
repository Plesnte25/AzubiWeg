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
export function DeclensionCard({ declension, form, tip }: { declension: DeclensionTable; form: string | null; tip?: string | null }) {
  const plural = declension.nom?.pl;
  return (
    <div className="rounded-xl p-3.5" style={{ background: "#1c1f2c", boxShadow: "0 0 0 1px rgba(233,233,237,.06)" }}>
      <div className="flex justify-between">
        <div className="text-[10px] tracking-[.12em] uppercase" style={{ color: "#9184d9" }}>
          Declension
        </div>
        {plural && (
          <span className="text-[10px]" style={{ color: "rgba(233,233,237,.4)" }}>
            plural: die {plural}
          </span>
        )}
      </div>
      <table className="mt-2 w-full text-[13px]">
        <thead>
          <tr style={{ color: "rgba(233,233,237,.4)" }}>
            <th className="pb-1.5 text-left text-[10px] font-normal">Case</th>
            <th className="pb-1.5 text-left text-[10px] font-normal">Singular</th>
            <th className="pb-1.5 text-left text-[10px] font-normal">Plural</th>
          </tr>
        </thead>
        <tbody>
          {CASES.map(({ key, label }) => {
            const cell = declension[key];
            return (
              <tr key={key}>
                <td className="py-1" style={{ color: "rgba(233,233,237,.55)" }}>
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
        <div className="mt-2 rounded-lg px-2.5 py-2 text-[11px]" style={{ color: "rgba(233,233,237,.45)", background: "rgba(145,132,217,.08)" }}>
          {form}
        </div>
      )}
      {tip && (
        <div className="mt-2 rounded-lg px-2.5 py-2 text-[11px]" style={{ color: "rgba(233,233,237,.45)", background: "rgba(145,132,217,.08)" }}>
          {tip}
        </div>
      )}
    </div>
  );
}
