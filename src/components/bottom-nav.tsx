'use client'

import { AddExpenseDialog } from '@/components/add-expense-dialog'
import { cn } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { Bell, Home, Plus, User, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

// Forms have their own full-width Save bar: no tab bar there
const HIDDEN_ON = [
  /^\/groups\/create$/,
  /^\/groups\/[^/]+\/edit$/,
  /^\/groups\/[^/]+\/expenses\/create$/,
  /^\/groups\/[^/]+\/expenses\/[^/]+\/edit$/,
]

// The group whose pages we're on, if any (for the + button)
function currentGroupId(pathname: string) {
  const match = pathname.match(/^\/groups\/([^/]+)/)
  return match && match[1] !== 'create' ? match[1] : null
}

// Phone tab bar: Home, Groups, a big + (Add expense), Friends, Activity
export function BottomNav() {
  const t = useTranslations('BottomNav')
  const pathname = usePathname()
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const { data: unread = 0 } = trpc.notifications.unreadCount.useQuery(
    undefined,
    { refetchInterval: 60_000, refetchOnWindowFocus: true },
  )

  if (HIDDEN_ON.some((pattern) => pattern.test(pathname))) return null
  const groupId = currentGroupId(pathname)

  const tab = (
    href: string,
    label: string,
    icon: React.ReactNode,
    active: boolean,
    badge = 0,
  ) => (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-0.5 min-h-12 text-[11px] font-semibold',
        active ? 'text-primary' : 'text-muted-foreground',
      )}
    >
      <span className="relative flex">
        {icon}
        {badge > 0 && (
          <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-owe text-[10px] leading-[18px] text-center text-background font-bold">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
      {label}
    </Link>
  )

  return (
    <nav
      aria-label={t('label')}
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex items-center h-16 px-2">
        {tab('/', t('home'), <Home className="w-5 h-5" />, pathname === '/')}
        {tab(
          '/groups',
          t('groups'),
          <Users className="w-5 h-5" />,
          pathname.startsWith('/groups'),
        )}
        <div className="flex flex-1 justify-center">
          <button
            type="button"
            aria-label={t('addExpense')}
            onClick={() =>
              groupId
                ? router.push(`/groups/${groupId}/expenses/create`)
                : setAddOpen(true)
            }
            className="-mt-6 w-14 h-14 rounded-full bg-marigold text-marigold-foreground shadow-lg shadow-marigold/30 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
          >
            <Plus className="w-7 h-7" strokeWidth={2.5} />
          </button>
        </div>
        {tab(
          '/friends',
          t('friends'),
          <User className="w-5 h-5" />,
          pathname.startsWith('/friends'),
        )}
        {tab(
          '/notifications',
          t('activity'),
          <Bell className="w-5 h-5" />,
          pathname.startsWith('/notifications'),
          unread,
        )}
      </div>
      <AddExpenseDialog open={addOpen} onOpenChange={setAddOpen} />
    </nav>
  )
}
