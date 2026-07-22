import type { RoadmapSkill } from "../api/types";

export interface Resource {
  skill: RoadmapSkill;
  title: string;
  url: string;
  note?: string;
}

/** Hand-authored from the source roadmap's "Resource Stack" section, adapted:
 * anything AzubiWeg already covers itself (vocab SRS, self-tests) is noted
 * rather than pointed at an external tool. */
export const RESOURCES: Resource[] = [
  { skill: "grammar", title: "Goethe-Institut online courses (A1–B1)", url: "https://www.goethe.de/", note: "Structured curriculum with tutor support." },
  { skill: "listening", title: "DW Nicos Weg", url: "https://learngerman.dw.com/en/nicos-weg/c-36519789", note: "Free video course, A1–B1 — already trackable as a Learning Source in this app." },
  { skill: "speaking", title: "Lingoda Sprint", url: "https://www.lingoda.com/", note: "Optional intensive live classes for speaking practice." },
  { skill: "grammar", title: "DeutschAkademie App", url: "https://www.deutschakademie.de/", note: "Free grammar drills." },
  { skill: "listening", title: "Seedlang", url: "https://seedlang.com/", note: "Story-based listening practice." },
  { skill: "vocab", title: "Your vocab manager", url: "/vocabulary", note: "AzubiWeg's own SRS system — the roadmap's vocab tasks already link here." },
  { skill: "listening", title: "DW Langsam Gesprochene Nachrichten", url: "https://learngerman.dw.com/en/langsam-gesprochene-nachrichten/", note: "Slow-spoken news, good for A1–A2." },
  { skill: "listening", title: "Easy German Podcast", url: "https://easygerman.org/podcast", note: "Normal-speed conversations with transcripts — good from B1 onward." },
  { skill: "reading", title: "Nachrichtenleicht", url: "https://www.nachrichtenleicht.de/", note: "Simplified news articles for reading practice." },
  { skill: "reading", title: "Hueber graded readers", url: "https://www.hueber.de/", note: "e.g. \"Café in Berlin\", \"Ferienhefte\" — level-appropriate short stories." },
  { skill: "listening", title: "Deutschlandfunk Nova", url: "https://www.deutschlandfunknova.de/", note: "Full-speed native content — save for after week 18 (B1)." },
  { skill: "speaking", title: "Tandem / HalloTalk", url: "https://www.tandem.net/", note: "Language exchange apps for daily speaking practice." },
  { skill: "speaking", title: "italki / Preply", url: "https://www.italki.com/", note: "Weekly tutor sessions for speaking confidence and corrections." },
  { skill: "writing", title: "LangCorrect / Journaly", url: "https://langcorrect.com/", note: "Native-speaker corrections for your writing practice." },
  { skill: "milestone", title: "Goethe-Institut exam info", url: "https://www.goethe.de/en/spr/prf.html", note: "Official A1/A2/B1 exam formats and registration." },
  { skill: "bureaucracy", title: "Make it in Germany", url: "https://www.make-it-in-germany.com/en/", note: "Official relocation/Ausbildung guidance — pairs with the Deutschland Context tasks." },
];
