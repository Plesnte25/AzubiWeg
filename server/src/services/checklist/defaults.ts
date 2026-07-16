import type { ChecklistCategory } from "@prisma/client";

export interface DefaultChecklistItem {
  title: string;
  description: string;
  category: ChecklistCategory;
}

/**
 * Default document checklist for a non-EU applicant coming to Germany for an
 * Ausbildung (§16a AufenthG). Seeded once per user; items are editable and
 * deletable afterwards. Where two paths exist (e.g. blocked account vs.
 * salary proof) both are listed — mark the unused one "not applicable".
 */
export const DEFAULT_CHECKLIST_ITEMS: DefaultChecklistItem[] = [
  // identity
  {
    title: "Valid passport (Reisepass)",
    description:
      "Should be valid well beyond your planned entry — many embassies expect at least 15 months. Set the expiry date on this item!",
    category: "identity",
  },
  {
    title: "Biometric passport photos",
    description: "35×45 mm, no older than 6 months. Needed for the visa and later for the residence permit.",
    category: "identity",
  },

  // education
  {
    title: "School and college certificates (Zeugnisse)",
    description: "Originals plus copies of all school-leaving and higher-education certificates.",
    category: "education",
  },
  {
    title: "Apostille / legalization of certificates",
    description: "Certificates usually need an apostille or embassy legalization from the issuing country.",
    category: "education",
  },
  {
    title: "Certified German translations (beglaubigte Übersetzungen)",
    description: "Translations of certificates by a sworn translator (vereidigter Übersetzer).",
    category: "education",
  },
  {
    title: "German language certificate",
    description: "Usually B1 (sometimes B2) is expected for the Ausbildung visa — Goethe, telc, or ÖSD.",
    category: "education",
  },

  // application
  {
    title: "Lebenslauf (CV) — German format",
    description: "Tabular German CV with photo. Build it in the CV section of this app.",
    category: "application",
  },
  {
    title: "Anschreiben (cover letter)",
    description: "Tailored cover letter per application.",
    category: "application",
  },
  {
    title: "Signed Ausbildungsvertrag (training contract)",
    description: "The signed contract with your Ausbildungsbetrieb — the core document for the visa.",
    category: "application",
  },
  {
    title: "Vorabzustimmung of the Bundesagentur für Arbeit",
    description:
      "Pre-approval from the Federal Employment Agency; usually the employer requests it, or it is obtained during the visa process.",
    category: "application",
  },

  // visa
  {
    title: "National visa (D) appointment booked",
    description: "Visa for vocational training under §16a AufenthG at your German embassy/consulate.",
    category: "visa",
  },
  {
    title: "Visa application form (VIDEX) filled and printed",
    description: "videx.diplo.de — print and sign both copies.",
    category: "visa",
  },
  {
    title: "Motivation letter for the embassy",
    description: "Why this Ausbildung, why Germany, and your plans afterwards.",
    category: "visa",
  },
  {
    title: "Police clearance certificate",
    description: "Only if your embassy requires it — check the local checklist.",
    category: "visa",
  },

  // finances
  {
    title: "Blocked account (Sperrkonto)",
    description:
      "Only needed if the Ausbildung salary doesn't cover living costs — check the current required amount. Otherwise mark as not applicable.",
    category: "finances",
  },
  {
    title: "Proof training salary covers living costs",
    description:
      "Ausbildungsvertrag showing sufficient monthly gross salary; alternative to the blocked account (mark the unused one not applicable).",
    category: "finances",
  },
  {
    title: "Visa fee paid (receipt)",
    description: "Fee for the national D visa; keep the receipt for the appointment.",
    category: "finances",
  },

  // insurance
  {
    title: "Travel / incoming health insurance",
    description: "Covers the period between arrival and the start of public insurance.",
    category: "insurance",
  },
  {
    title: "Public health insurance (gesetzliche Krankenversicherung)",
    description: "Starts with the Ausbildung contract — choose a Krankenkasse (TK, AOK, Barmer…).",
    category: "insurance",
  },

  // after arrival
  {
    title: "Anmeldung (register your address)",
    description:
      "Register at the Bürgeramt within 14 days of moving in — you receive the Meldebescheinigung, needed for almost everything else.",
    category: "after_arrival",
  },
  {
    title: "Aufenthaltstitel appointment (residence permit)",
    description:
      "Book at the Ausländerbehörde before your visa expires. Set your visa expiry as this item's date!",
    category: "after_arrival",
  },
  {
    title: "German bank account (Girokonto)",
    description: "Needed for the Ausbildung salary; most banks want the Meldebescheinigung.",
    category: "after_arrival",
  },
  {
    title: "Tax ID (steuerliche Identifikationsnummer)",
    description: "Arrives by post automatically a few weeks after the Anmeldung; give it to your employer.",
    category: "after_arrival",
  },
  {
    title: "Vaccination and health records copy",
    description: "Impfpass and any relevant medical records, ideally with translations.",
    category: "after_arrival",
  },
];
