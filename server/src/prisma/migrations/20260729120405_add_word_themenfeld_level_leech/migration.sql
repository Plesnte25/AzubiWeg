-- CreateEnum
CREATE TYPE "Themenfeld" AS ENUM ('person_familie', 'alltag_zuhause', 'essen_einkaufen', 'arbeit_ausbildung', 'bildung', 'gesundheit', 'reise_verkehr', 'freizeit_kultur', 'medien_technik', 'geld', 'amt_buerokratie', 'gefuehle_meinung', 'natur_umwelt', 'gesellschaft');

-- AlterTable
ALTER TABLE "Word" ADD COLUMN     "leech" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "level" "CefrLevel",
ADD COLUMN     "themenfeld" "Themenfeld"[] DEFAULT ARRAY[]::"Themenfeld"[];
