-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "aiFeedback" JSONB,
ADD COLUMN     "reflection" TEXT,
ADD COLUMN     "status" TEXT;
