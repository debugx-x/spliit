import { requireSession } from '@/lib/auth'
import { Metadata } from 'next'
import { NotificationList } from './notification-list'

export const metadata: Metadata = {
  title: 'Notifications',
}

export default async function NotificationsPage() {
  await requireSession('/notifications')
  return <NotificationList />
}
