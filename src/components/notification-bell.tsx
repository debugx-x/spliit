'use client'

import { Button } from '@/components/ui/button'
import { trpc } from '@/trpc/client'
import { Bell } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

// Header bell with the number of unread notifications
export function NotificationBell() {
  const t = useTranslations('Header')
  const { data: unread = 0 } = trpc.notifications.unreadCount.useQuery(
    undefined,
    { refetchInterval: 60_000, refetchOnWindowFocus: true },
  )
  return (
    <Button
      variant="ghost"
      size="icon"
      asChild
      className="-my-3 relative text-primary"
    >
      <Link
        href="/notifications"
        aria-label={
          unread > 0
            ? t('unreadNotifications', { count: unread })
            : t('notifications')
        }
        title={t('notifications')}
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold leading-4 text-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Link>
    </Button>
  )
}
