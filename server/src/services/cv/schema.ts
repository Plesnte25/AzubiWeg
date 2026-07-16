import { z } from "zod";

// The CV is stored and edited as one JSON document: the client form edits
// this object, PUT saves it whole, and react-pdf renders it. Dates inside are
// display-only strings ("2024-09" / "2024-09-01"), never used for date math.
// The client keeps a hand-maintained TS mirror in client/src/api/types.ts.

const shortText = z.string().max(200);
const dateLike = z
  .string()
  .regex(/^\d{4}(-\d{2}){0,2}$/, "Use YYYY, YYYY-MM, or YYYY-MM-DD")
  .or(z.literal(""));

const entryId = z.string().max(64);

const experienceEntry = z.strictObject({
  id: entryId,
  role: shortText,
  company: shortText,
  location: shortText.optional(),
  from: dateLike,
  to: dateLike.optional(),
  current: z.boolean().default(false),
  bullets: z.array(z.string().max(300)).max(10).default([]),
});

const educationEntry = z.strictObject({
  id: entryId,
  degree: shortText,
  institution: shortText,
  location: shortText.optional(),
  from: dateLike,
  to: dateLike.optional(),
  description: z.string().max(500).optional(),
});

const languageEntry = z.strictObject({
  id: entryId,
  name: shortText,
  // CEFR level ("B1") or free text like "Muttersprache"
  level: shortText,
});

const skillEntry = z.strictObject({ id: entryId, name: shortText });

const certificationEntry = z.strictObject({
  id: entryId,
  name: shortText,
  issuer: shortText.optional(),
  date: dateLike.optional(),
});

export const cvContentSchema = z.strictObject({
  personal: z.strictObject({
    firstName: shortText,
    lastName: shortText,
    headline: shortText.optional(),
    email: shortText,
    phone: shortText.optional(),
    street: shortText.optional(),
    postalCodeCity: shortText.optional(),
    birthDate: shortText.optional(),
    birthPlace: shortText.optional(),
    nationality: shortText.optional(),
    linkedin: shortText.optional(),
    website: shortText.optional(),
  }),
  summary: z.string().max(2000).optional(),
  experience: z.array(experienceEntry).max(30).default([]),
  education: z.array(educationEntry).max(30).default([]),
  languages: z.array(languageEntry).max(20).default([]),
  skills: z.array(skillEntry).max(50).default([]),
  certifications: z.array(certificationEntry).max(30).default([]),
  interests: z.string().max(500).optional(),
  // the customary "Ort, Datum" signature line on a German Lebenslauf
  signature: z.strictObject({
    city: shortText.optional(),
    date: shortText.optional(),
  }),
});

export type CvContent = z.infer<typeof cvContentSchema>;

export function emptyCvContent(user: { name: string; email: string }): CvContent {
  const [firstName, ...rest] = user.name.trim().split(/\s+/);
  return {
    personal: {
      firstName: firstName ?? "",
      lastName: rest.join(" "),
      email: user.email,
    },
    experience: [],
    education: [],
    languages: [],
    skills: [],
    certifications: [],
    signature: {},
  };
}
