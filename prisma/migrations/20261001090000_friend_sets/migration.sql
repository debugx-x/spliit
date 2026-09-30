-- CreateEnum
CREATE TYPE "GroupKind" AS ENUM ('GROUP', 'FRIEND_SET');

-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "kind" "GroupKind" NOT NULL DEFAULT 'GROUP',
ADD COLUMN     "memberKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Group_memberKey_key" ON "Group"("memberKey");

