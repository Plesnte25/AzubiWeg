import { useState, type CSSProperties, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import type { Word } from "../../api/types";
import { Modal } from "../../components/ui/Modal";
import { EmptyState } from "../../components/ui/EmptyState";
import { generateGrammarTip } from "../../lib/grammarTips";
import { useNavStack } from "../../lib/navStack";
import { articleChipStyle, articleLabel, wordColor } from "../../lib/wordBento";
import { useBreakpoint } from "../../lib/useBreakpoint";
import { stripLeadingPosTag } from "../../lib/wordDisplay";

/*
 * "Word details" (AzubiWords.dc.html detOpen): five numbered tabs in the prototype — Gender · Plural · Cases ·
 * Valency · Family. Real data only (CLAUDE.md honest-deviation rule): a tab whose data doesn't exist for this word
 * is left out rather than filled with a guess. Valency has no data source, so it never shows. For verbs, the first
 * two tabs become Präsens and Präteritum/Perfekt from the kaikki.org conjugation.
 */

type TabKey = "gender" | "plural" | "cases" | "present" | "past" | "family";
const ROMAN = ["i", "ii", "iii", "iv", "v"];

const box: CSSProperties = { background: "var(--plain)", color: "var(--plainText)", border: "2.5px solid var(--line)", borderRadius: 16 };
const eyebrow: CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--plainMuted)" };

// ── nouns ──

const GENDERS = [
  { def: "der", indef: "ein", name: "masculine", color: "var(--sky)" },
  { def: "die", indef: "eine", name: "feminine", color: "var(--pink)" },
  { def: "das", indef: "ein", name: "neuter", color: "var(--mint)" },
] as const;

function GenderTab({ word }: { word: Word }) {
  const tip = generateGrammarTip(word);
  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-3 gap-2.5">
        {GENDERS.map((g) => {
          const me = g.def === word.genus;
          return (
            <div
              key={g.def}
              className="relative flex flex-col gap-1.5"
              style={{
                padding: 14,
                borderRadius: 16,
                border: "2.5px solid var(--line)",
                background: me ? g.color : "var(--plain)",
                color: me ? "var(--onTile)" : "var(--plainText)",
                opacity: me ? 1 : 0.7,
                boxShadow: me ? "4px 4px 0 var(--shadow)" : "none",
                transform: me ? "rotate(-1.5deg)" : "none",
              }}
            >
              <span className="uppercase" style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em" }}>
                {g.name}
              </span>
              <span style={{ fontSize: "calc(var(--k) * 34px)", fontWeight: 700, letterSpacing: "-.04em", lineHeight: 1 }} lang="de">
                {g.def}
              </span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                indef. <b lang="de">{g.indef}</b>
              </span>
              {me && (
                <span
                  className="absolute"
                  style={{ top: -12, right: -8, fontSize: 11, fontWeight: 700, background: "var(--lemon)", color: "var(--onTile)", border: "2px solid var(--line)", borderRadius: 999, padding: "2px 8px", transform: "rotate(8deg)" }}
                >
                  this word
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex flex-col gap-1.5" style={{ ...box, padding: "14px 16px" }}>
        <span style={eyebrow}>Gender pattern</span>
        <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.35 }}>
          {tip ?? "No reliable ending rule for this one — learn it together with its article."}
        </span>
        <span lang="de" style={{ fontSize: 14, fontWeight: 500, color: "var(--plainMuted)" }}>
          {word.genus} {word.headword}
        </span>
      </div>
    </div>
  );
}

const ENDINGS = [
  { e: "-e", ex: "der Tag → Tage", rule: "Many masculine nouns add -e, some with an umlaut." },
  { e: "-(e)n", ex: "die Frau → Frauen", rule: "Almost every feminine noun adds -(e)n." },
  { e: "-er + ¨", ex: "das Kind → Kinder", rule: "Many short neuter nouns add -er, with an umlaut where they can." },
  { e: "-s", ex: "das Auto → Autos", rule: "Loanwords and nouns ending in a vowel add -s." },
  { e: "– / ¨", ex: "der Lehrer → Lehrer", rule: "Masculine and neuter nouns ending in -er, -el or -en add nothing (sometimes an umlaut)." },
];

const deUmlaut = (s: string) => s.toLowerCase().replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u");

/** Which of the five common plural patterns a real singular/plural pair follows, or -1 for an irregular one. */
function pluralPattern(singular: string, plural: string): number {
  const sg = deUmlaut(singular);
  const pl = deUmlaut(plural);
  if (pl === sg) return 4;
  if (plural.toLowerCase() === singular.toLowerCase() + "s") return 3;
  if (pl === sg + "er") return 2;
  if (plural.toLowerCase() === singular.toLowerCase() + "n" || plural.toLowerCase() === singular.toLowerCase() + "en") return 1;
  if (pl === sg + "e") return 0;
  return -1;
}

function PluralTab({ word, plural }: { word: Word; plural: string }) {
  const pk = pluralPattern(word.headword, plural);
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-3.5" style={{ ...box, borderRadius: 18, padding: 16 }}>
        <span style={{ ...articleChipStyle({ genus: "die", wortart: "Nomen" }), transform: "rotate(-3deg)" }}>die</span>
        <span lang="de" style={{ fontSize: "calc(var(--k) * 34px)", fontWeight: 700, letterSpacing: "-.04em", lineHeight: 1, overflowWrap: "anywhere" }}>
          {plural}
        </span>
        {pk >= 0 && (
          <span
            className="ml-auto"
            style={{ fontSize: 15, fontWeight: 700, background: "var(--lemon)", color: "var(--onTile)", border: "2.5px solid var(--line)", borderRadius: 999, padding: "4px 12px", boxShadow: "2px 2px 0 var(--shadow)" }}
          >
            {ENDINGS[pk]!.e}
          </span>
        )}
      </div>
      <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>
        {pk >= 0 ? ENDINGS[pk]!.rule : "This plural doesn't follow one of the common patterns — learn it by heart."} The plural article
        is always <b>die</b>, whatever the gender.
      </span>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {ENDINGS.map((e, i) => (
          <div
            key={e.e}
            className="flex flex-col gap-1"
            style={{
              padding: 10,
              borderRadius: 14,
              border: "2.5px solid var(--line)",
              background: i === pk ? "var(--lemon)" : "var(--plain)",
              color: i === pk ? "var(--onTile)" : "var(--plainText)",
              opacity: i === pk ? 1 : 0.65,
              boxShadow: i === pk ? "3px 3px 0 var(--shadow)" : "none",
            }}
          >
            <span style={{ fontSize: 17, fontWeight: 700 }}>{e.e}</span>
            <span lang="de" style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3 }}>
              {e.ex}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const CASES = [
  { key: "nom", c: "Nom.", q: "Wer? Was?", color: "var(--mint)" },
  { key: "akk", c: "Akk.", q: "Wen? Was?", color: "var(--tomato)" },
  { key: "dat", c: "Dat.", q: "Wem?", color: "var(--sky)" },
  { key: "gen", c: "Gen.", q: "Wessen?", color: "var(--lilac)" },
] as const;
const DEF: Record<string, [string, string][]> = {
  der: [["der", "ein"], ["den", "einen"], ["dem", "einem"], ["des", "eines"]],
  die: [["die", "eine"], ["die", "eine"], ["der", "einer"], ["der", "einer"]],
  das: [["das", "ein"], ["das", "ein"], ["dem", "einem"], ["des", "eines"]],
};
const PL_ART = ["die", "die", "den", "der"];

function caseChip(color: string): CSSProperties {
  return { alignSelf: "flex-start", fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 6, border: "2px solid var(--line)", background: color, color: "var(--onTile)" };
}

function CasesTab({ word, narrow }: { word: Word; narrow: boolean }) {
  const decl = word.declension!;
  const arts = DEF[word.genus ?? "der"]!;
  const cols = narrow ? "74px repeat(2,minmax(0,1fr))" : "110px repeat(3,minmax(0,1fr))";
  const cell: CSSProperties = { fontSize: "var(--cf)", hyphens: "auto", overflowWrap: "break-word" };
  const note =
    word.genus === "die"
      ? "Feminine nouns never change their ending in the singular. Only the article moves."
      : "Masculine and neuter nouns add -(e)s in the genitive. Every plural adds -n in the dative.";
  return (
    <div className="flex flex-col gap-2.5">
      <div className="overflow-hidden" style={box}>
        <div className="grid gap-2.5" style={{ gridTemplateColumns: cols, padding: "10px 14px", ...eyebrow }}>
          <span>Case</span>
          <span>Singular</span>
          {!narrow && <span>Indefinite</span>}
          <span>Plural</span>
        </div>
        {CASES.map((c, i) => {
          const sg = decl[c.key]?.sg ?? word.headword;
          const pl = decl[c.key]?.pl;
          return (
            <div key={c.key} className="grid items-center gap-2.5" style={{ gridTemplateColumns: cols, padding: "10px 14px", borderTop: "2px solid var(--dash)" }}>
              <div className="flex flex-col gap-[3px]">
                <span style={caseChip(c.color)}>{c.c}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--plainMuted)" }} lang="de">
                  {c.q}
                </span>
              </div>
              <span lang="de" style={{ ...cell, fontWeight: 700 }}>
                {arts[i]![0]} {sg}
              </span>
              {!narrow && (
                <span lang="de" style={{ ...cell, fontWeight: 600 }}>
                  {arts[i]![1]} {sg}
                </span>
              )}
              <span lang="de" style={{ ...cell, fontWeight: 600 }}>
                {pl ? `${PL_ART[i]} ${pl}` : "—"}
              </span>
            </div>
          );
        })}
      </div>
      <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{note}</span>
    </div>
  );
}

// ── verbs ──

const PERSONS = [
  ["ich", "ich"],
  ["du", "du"],
  ["er", "er/sie/es"],
  ["wir", "wir"],
  ["ihr", "ihr"],
  ["sie", "sie/Sie"],
] as const;

function PresentTab({ word }: { word: Word }) {
  const present = word.conjugation!.present!;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-1 overflow-hidden sm:grid-cols-2" style={box}>
        {PERSONS.map(([key, label], i) => (
          <div
            key={key}
            className="flex items-baseline justify-between gap-3"
            style={{ padding: "12px 16px", borderTop: i > 0 ? "2px solid var(--dash)" : "none" }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--plainMuted)" }} lang="de">
              {label}
            </span>
            <span style={{ fontSize: "var(--cf)", fontWeight: 700 }} lang="de">
              {present[key] ?? "—"}
            </span>
          </div>
        ))}
      </div>
      <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>Präsens: what you say about now, and often about the future too.</span>
    </div>
  );
}

function PastTab({ word }: { word: Word }) {
  const { past, perfect } = word.conjugation!;
  const card = (label: string, value: string | undefined, color: string) =>
    value && (
      <div className="flex flex-col gap-1.5" style={{ ...box, padding: 16, borderRadius: 18 }}>
        <span style={{ ...caseChip(color), fontSize: 12 }}>{label}</span>
        <span lang="de" style={{ fontSize: "calc(var(--k) * 30px)", fontWeight: 700, letterSpacing: "-.03em", lineHeight: 1.05, overflowWrap: "anywhere" }}>
          {value}
        </span>
      </div>
    );
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {card("Präteritum", past, "var(--sky)")}
        {card("Perfekt", perfect, "var(--mint)")}
      </div>
      <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>
        In conversation you'll mostly use the Perfekt. The Präteritum is for writing, and for sein, haben and the modal verbs.
      </span>
    </div>
  );
}

// ── family ──

const POS_TAG: { test: RegExp; label: string; color: string }[] = [
  { test: /^v/i, label: "verb", color: "var(--lilac)" },
  { test: /^a/i, label: "adj", color: "var(--orange)" },
  { test: /^n/i, label: "noun", color: "var(--sky)" },
];

function FamilyTab({ word }: { word: Word }) {
  const { push } = useNavStack();
  const { data, isLoading } = useQuery({ queryKey: ["word-family", word.id], queryFn: () => api.wordFamily(word.id) });
  const members = data?.members ?? [];
  if (isLoading) return <div aria-busy="true" style={{ minHeight: 120 }} />;
  if (members.length === 0) return <EmptyState>No word family found for „{word.headword}“ yet.</EmptyState>;
  return (
    <div className="flex flex-col gap-3">
      <span style={{ fontSize: 15, fontWeight: 600 }}>Learn these together{members.some((m) => m.ownedWordId) ? " — the ones you already have open in Words." : "."}</span>
      <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))" }}>
        {members.map((m, i) => {
          const tag = POS_TAG.find((t) => t.test.test(m.pos)) ?? { label: m.pos || "word", color: "var(--lemon)" };
          const inner = (
            <>
              <span style={{ alignSelf: "flex-start", fontSize: 11, fontWeight: 700, padding: "1px 8px", borderRadius: 6, border: "2px solid var(--line)", background: tag.color, color: "var(--onTile)" }}>
                {tag.label}
              </span>
              <span lang="de" style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2, overflowWrap: "anywhere" }}>
                {m.headword}
              </span>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--plainMuted)" }}>
                {m.tier === "close" ? "closely related" : "same family"}
                {m.ownedWordId ? " · in your words" : ""}
              </span>
            </>
          );
          const style: CSSProperties = {
            ...box,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: 12,
            textAlign: "left",
            font: "inherit",
            transform: `rotate(${[-1, 0.8, -0.5, 1.2][i % 4]}deg)`,
            boxShadow: "3px 3px 0 var(--shadow)",
            opacity: m.tier === "distant" ? 0.8 : 1,
          };
          return m.ownedWordId ? (
            <button key={`${m.headword}-${i}`} type="button" onClick={() => push(`/words/${m.ownedWordId}`)} className="cursor-pointer" style={style}>
              {inner}
            </button>
          ) : (
            <div key={`${m.headword}-${i}`} style={style}>
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function WordDetailsModal({ word, onClose }: { word: Word; onClose: () => void }) {
  const { bp } = useBreakpoint();
  const isVerb = word.wortart === "Verb";
  const plural = word.declension?.nom?.pl ?? null;
  const tabs: { key: TabKey; label: string; render: () => ReactNode }[] = [];
  if (isVerb) {
    if (word.conjugation?.present) tabs.push({ key: "present", label: "Präsens", render: () => <PresentTab word={word} /> });
    if (word.conjugation?.past || word.conjugation?.perfect)
      tabs.push({ key: "past", label: "Präteritum / Perfekt", render: () => <PastTab word={word} /> });
  } else if (word.genus) {
    tabs.push({ key: "gender", label: "Gender", render: () => <GenderTab word={word} /> });
    if (plural) tabs.push({ key: "plural", label: "Plural", render: () => <PluralTab word={word} plural={plural} /> });
    if (word.declension) tabs.push({ key: "cases", label: "Cases", render: () => <CasesTab word={word} narrow={bp === "sm"} /> });
  }
  tabs.push({ key: "family", label: "Family", render: () => <FamilyTab word={word} /> });

  const [active, setActive] = useState<TabKey>(tabs[0]!.key);
  const current = tabs.find((t) => t.key === active) ?? tabs[0]!;

  return (
    <Modal
      title={
        <span className="flex min-w-0 flex-wrap items-center gap-3">
          <span style={articleChipStyle(word, true)}>{articleLabel(word)}</span>
          <span lang="de" style={{ fontSize: "calc(var(--k) * 38px)", overflowWrap: "anywhere" }}>
            {word.headword}
          </span>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: 0 }}>{stripLeadingPosTag(word.meaning ?? "")}</span>
        </span>
      }
      ariaLabel={`Word details: ${word.headword}`}
      bg={wordColor(word)}
      width={bp === "lg" ? 760 : 700}
      onClose={onClose}
    >
      <div role="tablist" aria-label="Word details" className="no-scrollbar -mx-1 flex shrink-0 gap-1.5 overflow-x-auto px-1 pt-0.5 pb-1.5">
        {tabs.map((t, i) => {
          const on = t.key === current.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(t.key)}
              className="flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap"
              style={{
                height: 38,
                padding: "0 14px",
                borderRadius: 999,
                border: "2.5px solid var(--line)",
                background: on ? "var(--btn)" : "var(--plain)",
                color: on ? "var(--btnText)" : "var(--plainText)",
                fontSize: 14,
                fontWeight: 700,
                transform: on ? "rotate(-2deg)" : "none",
                boxShadow: on ? "2px 2px 0 var(--shadow)" : "none",
              }}
            >
              <span style={{ fontSize: 11, opacity: 0.7 }}>{ROMAN[i]}</span>
              {t.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" style={{ "--cf": bp === "sm" ? "13px" : "15px" } as CSSProperties}>
        {current.render()}
      </div>
    </Modal>
  );
}
