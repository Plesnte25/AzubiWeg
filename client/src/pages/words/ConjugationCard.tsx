import type { ConjugationTable } from "../../api/types";

const PERSONS: { key: keyof NonNullable<ConjugationTable["present"]>; label: string }[] = [
  { key: "ich", label: "ich" },
  { key: "wir", label: "wir" },
  { key: "du", label: "du" },
  { key: "ihr", label: "ihr" },
  { key: "er", label: "er/sie/es" },
  { key: "sie", label: "sie/Sie" },
];

/** Real present-tense 6-person grid + past/perfect from the kaikki.org
 * pipeline — `perfect` already carries its own auxiliary ("ist gegangen" /
 * "hat gegessen", see buildGrammarNote()'s doc comment), so it's shown
 * as-is rather than the handoff demo's hardcoded "hat ...". Not rendered
 * when `conjugation` is null (kaikki.org's coverage, like declension's,
 * isn't universal). */
export function ConjugationCard({ headword, conjugation, tip }: { headword: string; conjugation: ConjugationTable; tip?: string | null }) {
  const present = conjugation.present;
  return (
    <div className="rounded-xl p-3.5" style={{ background: "#1c1f2c", boxShadow: "0 0 0 1px rgba(233,233,237,.06)" }}>
      <div className="text-[10px] tracking-[.12em] uppercase" style={{ color: "#9184d9" }}>
        {headword} · present tense
      </div>
      {present && (
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[13.5px]">
          {PERSONS.map(({ key, label }) => (
            <div key={key} className="flex justify-between">
              <span style={{ color: "rgba(233,233,237,.5)" }}>{label}</span>
              <span>{present[key] ?? "—"}</span>
            </div>
          ))}
        </div>
      )}
      {(conjugation.perfect ?? conjugation.past) && (
        <div className="mt-2 text-[11px]" style={{ color: "rgba(233,233,237,.45)" }}>
          {conjugation.perfect ? `perfect: ${conjugation.perfect}` : ""}
          {conjugation.perfect && conjugation.past ? " · " : ""}
          {conjugation.past ? `past: ${conjugation.past}` : ""}
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
