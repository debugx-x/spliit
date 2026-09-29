-- AlterTable
ALTER TABLE "User" ADD COLUMN     "interacEmail" TEXT;


-- Users entered their email "For Interac" at registration: start from it
UPDATE "User" SET "interacEmail" = "email" WHERE "interacEmail" IS NULL;
