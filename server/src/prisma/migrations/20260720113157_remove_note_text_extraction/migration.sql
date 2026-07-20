-- Notes uploads (img/pdf/txt) are kept as-is; automatic text extraction was removed.
ALTER TABLE "UploadedFile" DROP COLUMN "extractedText";
ALTER TABLE "UploadedFile" DROP COLUMN "extractionStatus";
DROP TYPE "ExtractionStatus";
