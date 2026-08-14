import { prisma } from "../../db.js";
import { DEFAULT_CHECKLIST_ITEMS } from "./defaults.js";

/** Lazily seeds a user's checklist on first use — same one-shot-stamp
 * pattern as learningSeededAt/resourcesSeededAt (see syllabus-seed.ts /
 * saved-links-seed.ts). The stamp (not the item count) guards re-seeding,
 * so deleting all items later doesn't bring the defaults back. */
export async function ensureChecklistSeeded(userId: string): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.checklistSeededAt) return;

  await prisma.$transaction([
    prisma.checklistItem.createMany({
      data: DEFAULT_CHECKLIST_ITEMS.map((item, i) => ({
        userId,
        ...item,
        isDefault: true,
        sortOrder: i,
      })),
    }),
    prisma.user.update({
      where: { id: userId },
      data: { checklistSeededAt: new Date() },
    }),
  ]);
}
