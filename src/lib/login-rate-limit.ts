import { prisma } from '@/lib/prisma'

// Login rate limiting: too many failed logins for one account, or from one
// IP address, within a window block further attempts until the oldest
// failure leaves the window. Checked before the password is verified, so a
// blocked account doesn't reveal whether a guess was right.

export const LOGIN_WINDOW_MS = 15 * 60 * 1000
export const ACCOUNT_FAILURE_LIMIT = 5
export const IP_FAILURE_LIMIT = 20
const RETENTION_MS = 24 * 60 * 60 * 1000

// The keys a login attempt counts against. Existing accounts are keyed by
// user id (so switching between email and Unique ID doesn't give extra
// tries); unknown identifiers by the identifier itself.
export function loginFailureKeys({
  userId,
  identifier,
  ip,
}: {
  userId: string | null
  identifier: string
  ip: string | null
}) {
  const keys = [
    {
      key: userId ? `user:${userId}` : `id:${identifier.trim().toLowerCase()}`,
      limit: ACCOUNT_FAILURE_LIMIT,
    },
  ]
  if (ip) keys.push({ key: `ip:${ip}`, limit: IP_FAILURE_LIMIT })
  return keys
}

// Milliseconds until another attempt is allowed, or 0 if not blocked.
export async function getLoginRetryAfter(
  keys: { key: string; limit: number }[],
  now = Date.now(),
) {
  let retryAfter = 0
  for (const { key, limit } of keys) {
    const failures = await prisma.loginFailure.findMany({
      where: { key, createdAt: { gt: new Date(now - LOGIN_WINDOW_MS) } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { createdAt: true },
    })
    if (failures.length >= limit) {
      // Blocked until the limit-th most recent failure leaves the window
      const unblockAt =
        failures[limit - 1].createdAt.getTime() + LOGIN_WINDOW_MS
      retryAfter = Math.max(retryAfter, unblockAt - now)
    }
  }
  return retryAfter
}

export async function recordLoginFailure(keys: { key: string }[]) {
  await prisma.loginFailure.createMany({
    data: keys.map(({ key }) => ({ key })),
  })
  // Housekeeping: failures older than a day are no longer needed
  await prisma.loginFailure.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - RETENTION_MS) } },
  })
}

// After a successful login, the account starts over (the IP count stays).
export async function clearAccountLoginFailures(userId: string) {
  await prisma.loginFailure.deleteMany({ where: { key: `user:${userId}` } })
}
