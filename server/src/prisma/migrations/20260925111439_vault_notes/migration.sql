-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastVaultPath" TEXT,
ADD COLUMN     "vaultWriteNotes" BOOLEAN NOT NULL DEFAULT true;
