-- Themenfeld was never shown or used anywhere after the Bento redesign (user decision 2026-09-26: remove it everywhere).
ALTER TABLE "Word" DROP COLUMN "themenfeld";

DROP TYPE "Themenfeld";
