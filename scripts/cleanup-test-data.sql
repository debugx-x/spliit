-- Deletes the throwaway accounts created while testing Split Karega, and the
-- groups only they were in. Run by .github/workflows/cleanup-test-data.yml,
-- which ends the transaction with ROLLBACK (preview) or COMMIT (delete).
--
-- Test accounts: emails at example.com, and plus-addresses of the owner's
-- Gmail used for real-email tests. Everyone else is kept.
-- A group is deleted when no remaining (real) account is in it and it wasn't
-- created by one. Groups with real people are kept; their test participants
-- stay as plain names (their account link is removed).

BEGIN;

CREATE TEMP TABLE test_users ON COMMIT DROP AS
  SELECT id FROM "User"
  WHERE email ILIKE '%@example.com'
     OR email ILIKE 'vaibhavsaini2013+%@gmail.com';

CREATE TEMP TABLE test_groups ON COMMIT DROP AS
  SELECT g.id FROM "Group" g
  WHERE NOT EXISTS (
      SELECT 1 FROM "Participant" p
      WHERE p."groupId" = g.id
        AND p."userId" IS NOT NULL
        AND p."userId" NOT IN (SELECT id FROM test_users)
    )
    AND (g."creatorId" IS NULL OR g."creatorId" IN (SELECT id FROM test_users));

\echo '== Before'
SELECT
  (SELECT count(*) FROM "User") AS users,
  (SELECT count(*) FROM test_users) AS test_users_to_delete,
  (SELECT count(*) FROM "Group") AS groups,
  (SELECT count(*) FROM test_groups) AS groups_to_delete;

\echo '== Accounts kept'
SELECT "uniqueId", "displayName", "createdAt"
FROM "User" WHERE id NOT IN (SELECT id FROM test_users)
ORDER BY "createdAt";

\echo '== Groups kept'
SELECT name, kind, "createdAt"
FROM "Group" WHERE id NOT IN (SELECT id FROM test_groups)
ORDER BY "createdAt";

-- Cascades to participants, expenses, activity and notifications
DELETE FROM "Group" WHERE id IN (SELECT id FROM test_groups);
-- Cascades to preferences, reset tokens and notifications; unlinks the rest
DELETE FROM "User" WHERE id IN (SELECT id FROM test_users);
-- Failed login attempts from testing
DELETE FROM "LoginFailure";

\echo '== After'
SELECT
  (SELECT count(*) FROM "User") AS users,
  (SELECT count(*) FROM "Group") AS groups,
  (SELECT count(*) FROM "Expense") AS expenses,
  (SELECT count(*) FROM "Notification") AS notifications;
