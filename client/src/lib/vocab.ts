import type { Themenfeld } from "../api/types";

/** Fixed 14-item Themenfeld list (frozen, no free text) — same order everywhere it's listed. */
export const THEMENFELD_ORDER: Themenfeld[] = [
  "person_familie",
  "alltag_zuhause",
  "essen_einkaufen",
  "arbeit_ausbildung",
  "bildung",
  "gesundheit",
  "reise_verkehr",
  "freizeit_kultur",
  "medien_technik",
  "geld",
  "amt_buerokratie",
  "gefuehle_meinung",
  "natur_umwelt",
  "gesellschaft",
];

export const THEMENFELD_LABELS: Record<Themenfeld, string> = {
  person_familie: "Person & Familie",
  alltag_zuhause: "Alltag & Zuhause",
  essen_einkaufen: "Essen & Einkaufen",
  arbeit_ausbildung: "Arbeit & Ausbildung",
  bildung: "Bildung",
  gesundheit: "Gesundheit",
  reise_verkehr: "Reise & Verkehr",
  freizeit_kultur: "Freizeit & Kultur",
  medien_technik: "Medien & Technik",
  geld: "Geld",
  amt_buerokratie: "Amt & Bürokratie",
  gefuehle_meinung: "Gefühle & Meinung",
  natur_umwelt: "Natur & Umwelt",
  gesellschaft: "Gesellschaft",
};
