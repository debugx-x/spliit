-- CreateTable
CREATE TABLE "UserGroupPreference" (
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "starred" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserGroupPreference_pkey" PRIMARY KEY ("userId","groupId")
);

-- Name-based auto-linking could link one user to several participants of the
-- same group. Keep one link per (group, user) before adding the constraint.
UPDATE "Participant" p
SET "userId" = NULL
WHERE p."userId" IS NOT NULL
  AND p."id" <> (
    SELECT MIN(p2."id") FROM "Participant" p2
    WHERE p2."groupId" = p."groupId" AND p2."userId" = p."userId"
  );

-- CreateIndex
CREATE UNIQUE INDEX "Participant_groupId_userId_key" ON "Participant"("groupId", "userId");

-- AddForeignKey
ALTER TABLE "UserGroupPreference" ADD CONSTRAINT "UserGroupPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGroupPreference" ADD CONSTRAINT "UserGroupPreference_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

