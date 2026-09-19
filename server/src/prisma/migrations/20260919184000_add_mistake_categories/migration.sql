CREATE TYPE "SyllabusMistakeCategory" AS ENUM (
  'gender_article', 'case', 'word_order', 'conjugation', 'vocabulary',
  'spelling', 'pronunciation', 'listening_detail', 'collocation', 'other'
);

ALTER TABLE "ExerciseAttempt"
ADD COLUMN "mistakeCategory" "SyllabusMistakeCategory";
