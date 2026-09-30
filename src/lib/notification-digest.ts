import { sendEmail } from '@/lib/email'
import { emailButton, emailLayout, escapeHtml } from '@/lib/email-layout'
import { describeNotification, notificationPath } from '@/lib/notifications'
import { prisma } from '@/lib/prisma'
import { Group, NotificationType, User } from '@prisma/client'

// The daily email summary: once a day (Vercel Cron), each user gets one email
// with their notifications not yet emailed, for the types they chose in
// their profile. Nothing is sent to users with nothing new.

export const NOTIFICATION_RETENTION_MS = 60 * 24 * 60 * 60 * 1000 // 60 days

type Preferences = Pick<
  User,
  | 'notifyPayments'
  | 'notifyAddedToGroup'
  | 'notifyNewExpenses'
  | 'notifyExpenseChanges'
>

const PREFERENCE_BY_TYPE: Record<NotificationType, keyof Preferences> = {
  PAYMENT_RECEIVED: 'notifyPayments',
  ADDED_TO_GROUP: 'notifyAddedToGroup',
  EXPENSE_ADDED: 'notifyNewExpenses',
  EXPENSE_CHANGED: 'notifyExpenseChanges',
  EXPENSE_DELETED: 'notifyExpenseChanges',
}

export function wantsEmail(preferences: Preferences, type: NotificationType) {
  return preferences[PREFERENCE_BY_TYPE[type]]
}

type DigestItem = {
  type: NotificationType
  actorName: string
  data: unknown
  groupId: string
  group: Pick<Group, 'name' | 'currency' | 'currencyCode'>
}

// One email for all of a user's items (oldest first), grouped by group.
export function buildDigestEmail(
  displayName: string,
  items: DigestItem[],
  baseUrl: string,
) {
  const groups = new Map<string, DigestItem[]>()
  for (const item of items) {
    groups.set(item.groupId, [...(groups.get(item.groupId) ?? []), item])
  }
  const sections = Array.from(groups.values())
  const allUrl = `${baseUrl}/notifications`
  const profileUrl = `${baseUrl}/profile`

  const subject =
    items.length === 1
      ? describeNotification(items[0])
      : `Your Split Karega summary: ${items.length} updates`

  const text = [
    `Hi ${displayName},`,
    `Here's what happened in your groups:`,
    ...sections.map((section) =>
      [
        `${section[0].group.name} (${baseUrl}/groups/${section[0].groupId})`,
        ...section.map((item) => `- ${describeNotification(item)}`),
      ].join('\n'),
    ),
    `See all in the app: ${allUrl}`,
    `Choose which updates you get by email in your profile: ${profileUrl}`,
  ].join('\n\n')

  const html = emailLayout(`<p>Hi ${escapeHtml(displayName)},</p>
<p>Here's what happened in your groups:</p>
${sections
  .map(
    (
      section,
    ) => `<p style="margin:20px 0 4px;font-weight:600"><a href="${escapeHtml(
      `${baseUrl}/groups/${section[0].groupId}`,
    )}" style="color:#047857;text-decoration:none">${escapeHtml(
      section[0].group.name,
    )}</a></p>
<ul style="margin:0;padding-left:20px">
${section
  .map(
    (item) =>
      `<li style="margin:4px 0"><a href="${escapeHtml(
        baseUrl + notificationPath(item),
      )}" style="color:#111827;text-decoration:none">${escapeHtml(
        describeNotification(item),
      )}</a></li>`,
  )
  .join('\n')}
</ul>`,
  )
  .join('\n')}
${emailButton(escapeHtml(allUrl), 'See all in the app')}
<p style="font-size:12px;color:#6b7280">Choose which updates you get by email in your <a href="${escapeHtml(
    profileUrl,
  )}" style="color:#047857">profile</a>.</p>`)

  return { subject, text, html }
}

// Sends the summaries. A user's notifications are marked as emailed only
// once their email is accepted, so failed sends are retried the next day.
// Types the user turned off are marked without sending.
export async function sendNotificationDigests(
  baseUrl: string,
  now = new Date(),
) {
  const pending = await prisma.notification.findMany({
    where: { emailedAt: null, createdAt: { lte: now } },
    orderBy: { createdAt: 'asc' },
    include: {
      group: { select: { name: true, currency: true, currencyCode: true } },
      user: {
        select: {
          email: true,
          displayName: true,
          notifyPayments: true,
          notifyAddedToGroup: true,
          notifyNewExpenses: true,
          notifyExpenseChanges: true,
        },
      },
    },
  })

  const byUser = new Map<string, typeof pending>()
  for (const notification of pending) {
    byUser.set(notification.userId, [
      ...(byUser.get(notification.userId) ?? []),
      notification,
    ])
  }

  const result = { sent: 0, skipped: 0, failed: 0 }
  for (const notifications of Array.from(byUser.values())) {
    const { user } = notifications[0]
    const wanted = notifications.filter((n) => wantsEmail(user, n.type))
    const unwanted = notifications.filter((n) => !wantsEmail(user, n.type))

    if (unwanted.length > 0) {
      await markEmailed(unwanted, now)
      result.skipped += unwanted.length
    }
    if (wanted.length === 0) continue
    try {
      await sendEmail({
        to: user.email,
        ...buildDigestEmail(user.displayName, wanted, baseUrl),
      })
      await markEmailed(wanted, now)
      result.sent++
    } catch (error) {
      console.error('Could not send notification summary', error)
      result.failed++
    }
  }

  await prisma.notification.deleteMany({
    where: {
      createdAt: { lt: new Date(now.getTime() - NOTIFICATION_RETENTION_MS) },
    },
  })
  return result
}

async function markEmailed(notifications: { id: string }[], now: Date) {
  await prisma.notification.updateMany({
    where: { id: { in: notifications.map((n) => n.id) } },
    data: { emailedAt: now },
  })
}
