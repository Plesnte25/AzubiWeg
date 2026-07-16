-- CreateEnum
CREATE TYPE "FileKind" AS ENUM ('document', 'cv_photo');

-- CreateEnum
CREATE TYPE "CvTemplate" AS ENUM ('lebenslauf', 'ats');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('wishlist', 'applied', 'interview', 'offer', 'rejected');

-- CreateEnum
CREATE TYPE "ApplicationEventType" AS ENUM ('created', 'status_change', 'note', 'interview', 'follow_up');

-- CreateEnum
CREATE TYPE "ChecklistCategory" AS ENUM ('identity', 'education', 'visa', 'finances', 'insurance', 'application', 'after_arrival', 'other');

-- CreateEnum
CREATE TYPE "ChecklistStatus" AS ENUM ('todo', 'in_progress', 'done', 'not_applicable');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "checklistSeededAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "UploadedFile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checklistItemId" TEXT,
    "kind" "FileKind" NOT NULL DEFAULT 'document',
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadedFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cv" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "template" "CvTemplate" NOT NULL DEFAULT 'lebenslauf',
    "content" JSONB NOT NULL,
    "photoFileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cv_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "location" TEXT,
    "url" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "notes" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'wishlist',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "appliedAt" DATE,
    "cvId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationEvent" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "type" "ApplicationEventType" NOT NULL,
    "note" TEXT,
    "fromStatus" "ApplicationStatus",
    "toStatus" "ApplicationStatus",
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "ChecklistCategory" NOT NULL DEFAULT 'other',
    "status" "ChecklistStatus" NOT NULL DEFAULT 'todo',
    "expiresAt" DATE,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Application_userId_status_sortOrder_idx" ON "Application"("userId", "status", "sortOrder");

-- AddForeignKey
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "ChecklistItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cv" ADD CONSTRAINT "Cv_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_cvId_fkey" FOREIGN KEY ("cvId") REFERENCES "Cv"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationEvent" ADD CONSTRAINT "ApplicationEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
