import { describeNotification, notificationPath } from '@/lib/notifications'
import { prisma } from '@/lib/prisma'

export const FEED_LENGTH = 50

// The user's latest notifications as sentences with links, for the bell.
export async function listNotifications(userId: string) {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: FEED_LENGTH,
    include: {
      group: {
        select: {
          name: true,
          currency: true,
          currencyCode: true,
          kind: true,
          participants: { select: { name: true, userId: true } },
        },
      },
    },
  })
  return notifications.map((notification) => ({
    id: notification.id,
    text: describeNotification(notification),
    path: notificationPath(notification),
    createdAt: notification.createdAt,
    read: notification.readAt !== null,
  }))
}

export function countUnreadNotifications(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } })
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  })
}
