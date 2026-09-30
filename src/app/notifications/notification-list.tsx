'use client'

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { AppRouterOutput } from '@/trpc/routers/_app'
import { ChevronRight, Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useEffect, useRef } from 'react'

type Notification = AppRouterOutput['notifications']['list'][number]

export function NotificationList() {
  const t = useTranslations('Notifications')
  const utils = trpc.useUtils()
  // Fetched once: unread items stay highlighted while the page is open
  const { data, isLoading } = trpc.notifications.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
  })
  const { mutate: markAllRead } = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => utils.notifications.unreadCount.invalidate(),
  })

  // Opening the page marks everything as read
  const marked = useRef(false)
  useEffect(() => {
    if (!data || marked.current) return
    marked.current = true
    if (data.some((notification) => !notification.read)) markAllRead()
  }, [data, markAllRead])

  if (isLoading || !data) {
    return (
      <p>
        <Loader2 className="w-4 mr-2 inline animate-spin" /> {t('loading')}
      </p>
    )
  }

  return (
    <>
      <h1 className="font-bold text-2xl">{t('title')}</h1>
      {data.length === 0 ? (
        <p className="text-sm">{t('empty')}</p>
      ) : (
        groupByDay(data).map(([day, notifications]) => (
          <section key={day} className="flex flex-col gap-2">
            <h2 className="text-sm text-muted-foreground">
              <DayLabel date={notifications[0].createdAt} />
            </h2>
            <Card className="divide-y overflow-hidden">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                />
              ))}
            </Card>
          </section>
        ))
      )}
      <p className="text-sm text-muted-foreground">
        {t.rich('emailSettings', {
          link: (chunks) => (
            <Link href="/profile" className="underline">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </>
  )
}

function NotificationItem({ notification }: { notification: Notification }) {
  const locale = useLocale()
  return (
    <Link
      href={notification.path}
      className={cn(
        'flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent',
        !notification.read && 'bg-primary/10',
      )}
    >
      {!notification.read && (
        <span className="w-2 h-2 shrink-0 rounded-full bg-primary" />
      )}
      <span className="flex-1">{notification.text}</span>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {new Date(notification.createdAt).toLocaleTimeString(locale, {
          hour: 'numeric',
          minute: '2-digit',
        })}
      </span>
      <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
    </Link>
  )
}

function DayLabel({ date }: { date: Date | string }) {
  const t = useTranslations('Notifications')
  const locale = useLocale()
  const day = new Date(date)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (day.toDateString() === today.toDateString()) return <>{t('today')}</>
  if (day.toDateString() === yesterday.toDateString())
    return <>{t('yesterday')}</>
  return (
    <>
      {day.toLocaleDateString(locale, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })}
    </>
  )
}

// Newest first, grouped by the viewer's local day
function groupByDay(notifications: Notification[]) {
  const days = new Map<string, Notification[]>()
  for (const notification of notifications) {
    const day = new Date(notification.createdAt).toDateString()
    days.set(day, [...(days.get(day) ?? []), notification])
  }
  return Array.from(days.entries())
}
