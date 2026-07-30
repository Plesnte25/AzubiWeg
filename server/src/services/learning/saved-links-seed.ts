import { prisma } from "../../db.js";
import { DEFAULT_SAVED_LINKS } from "./saved-links-defaults.js";

/** Lazily seeds a user's saved links on first use — same one-shot pattern as
 * checklistSeededAt/learningSeededAt. Unlike the syllabus/roadmap, there's no
 * version bump here: once seeded, a user's SavedLink rows are entirely their
 * own to edit or delete, never overwritten from this list again. */
export async function ensureSavedLinksSeeded(userId: string): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.resourcesSeededAt) return;

  await prisma.$transaction([
    prisma.savedLink.createMany({ data: DEFAULT_SAVED_LINKS.map((link) => ({ userId, ...link })) }),
    prisma.user.update({ where: { id: userId }, data: { resourcesSeededAt: new Date() } }),
  ]);
}
