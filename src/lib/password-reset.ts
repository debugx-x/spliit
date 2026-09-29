import { sendEmail } from '@/lib/email'
import { prisma } from '@/lib/prisma'
import { createHash, randomBytes } from 'crypto'

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour
export const RESET_EMAIL_COOLDOWN_MS = 60 * 1000 // one email per minute per account

// Tokens are only stored hashed: a leaked database doesn't leak usable links.
export function hashResetToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function createResetToken() {
  const token = randomBytes(32).toString('base64url')
  return { token, tokenHash: hashResetToken(token) }
}

// Emails a reset link to the account matching `identifier` (email or Unique
// ID). Does nothing, silently, if there's no such account or a link was sent
// less than a minute ago: callers must not reveal which accounts exist.
export async function requestPasswordReset(
  identifier: string,
  baseUrl: string,
) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: identifier, mode: 'insensitive' } },
        { uniqueId: { equals: identifier, mode: 'insensitive' } },
      ],
    },
    select: { id: true, email: true, displayName: true },
  })
  if (!user) return

  const recent = await prisma.passwordResetToken.findFirst({
    where: {
      userId: user.id,
      createdAt: { gt: new Date(Date.now() - RESET_EMAIL_COOLDOWN_MS) },
    },
    select: { id: true },
  })
  if (recent) return

  const { token, tokenHash } = createResetToken()
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  })

  const link = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`
  await sendEmail({
    to: user.email,
    subject: 'Reset your Splitsville password',
    text: `Hi ${user.displayName},\n\nSomeone (hopefully you) asked to reset your Splitsville password. Open this link to choose a new one:\n\n${link}\n\nThe link works once and expires in 1 hour. If you didn't ask for this, you can ignore this email.`,
    html: `<p>Hi ${escapeHtml(
      user.displayName,
    )},</p><p>Someone (hopefully you) asked to reset your Splitsville password.</p><p><a href="${escapeHtml(
      link,
    )}">Choose a new password</a></p><p>The link works once and expires in 1 hour. If you didn't ask for this, you can ignore this email.</p>`,
  })
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Whether a reset link is still usable (to show the form or an error).
export async function isResetTokenValid(token: string) {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    select: { usedAt: true, expiresAt: true },
  })
  return !!record && !record.usedAt && record.expiresAt > new Date()
}

// Sets a new password using a reset link. The token is consumed atomically,
// so it works only once. Returns the user, or null if the link is invalid,
// expired or already used.
export async function resetPasswordWithToken(
  token: string,
  newPasswordHash: string,
) {
  const tokenHash = hashResetToken(token)
  return prisma.$transaction(async (tx) => {
    const now = new Date()
    const { count } = await tx.passwordResetToken.updateMany({
      where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    })
    if (count !== 1) return null

    const { userId } = await tx.passwordResetToken.findUniqueOrThrow({
      where: { tokenHash },
      select: { userId: true },
    })
    const user = await tx.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
      select: { id: true, uniqueId: true, displayName: true },
    })
    // Any other outstanding links for this account stop working
    await tx.passwordResetToken.deleteMany({
      where: { userId, tokenHash: { not: tokenHash } },
    })
    return user
  })
}
