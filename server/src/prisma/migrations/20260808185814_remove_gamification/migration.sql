-- DropForeignKey
ALTER TABLE "UserBadge" DROP CONSTRAINT "UserBadge_userId_fkey";

-- AlterTable
ALTER TABLE "RoadmapDay" DROP COLUMN "bonusAwardedAt";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "points";

-- DropTable
DROP TABLE "UserBadge";

