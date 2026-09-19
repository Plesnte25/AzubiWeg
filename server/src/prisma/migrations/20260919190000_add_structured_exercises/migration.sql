ALTER TYPE "SyllabusExerciseType" ADD VALUE 'multiple_choice';
ALTER TYPE "SyllabusExerciseType" ADD VALUE 'correction';

ALTER TABLE "SyllabusItem"
ADD COLUMN "exerciseOptions" JSONB;
