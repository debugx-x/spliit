import { prisma } from '@/lib/prisma'

// Login rate limiting: too many failed logins for one account, or from one
// IP address, within a window block further attempts until the oldest
// failure leaves the window. Checked before the password is verified, so a
// blocked account doesn't reveal whether a guess was right.

export const LOGIN_WINDOW_MS = 15 * 60 * 1000
export const ACCOUNT_FAILURE_LIMIT = 5
export const IP_FAILURE_LIMIT = 20
// Password reset emails requested from one IP address per window
export const RESET_REQUEST_IP_LIMIT = 5
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

// Password reset requests are counted (every request, not just failures)
// per IP address, so one visitor can't use up the email quota by cycling
// through account names. Each account is also limited to one email a minute
// (see password-reset.ts).
export function resetRequestKeys(ip: string | null) {
  return ip ? [{ key: `reset-ip:${ip}`, limit: RESET_REQUEST_IP_LIMIT }] : []
}

// "Try again in 3 minutes."
export function formatRetryAfter(retryAfter: number) {
  const minutes = Math.ceil(retryAfter / 60_000)
  return `Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`
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
  if (keys.length === 0) return
  await prisma.loginFailure.createMany({
    data: keys.map(({ key }) => ({ key })),
  })
  // Housekeeping: failures older than a day are no longer needed
  await prisma.loginFailure.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - RETENTION_MS) } },
  })
}

// After a successful login or a password reset, the account starts over
// (the IP count stays).
export async function clearAccountLoginFailures(userId: string) {
  await prisma.loginFailure.deleteMany({ where: { key: `user:${userId}` } })
}
