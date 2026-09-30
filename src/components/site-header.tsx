'use client'

import { Avatar } from '@/components/avatar'
import { NotificationBell } from '@/components/notification-bell'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Desktop: logo, Dashboard / Groups / Friends, bell, theme, your avatar.
// Phones: logo, theme and avatar; the rest is in the bottom tab bar.
export function SiteHeader({
  session,
}: {
  session: { displayName: string } | null
}) {
  const t = useTranslations('Header')
  const pathname = usePathname()
  const links = [
    { href: '/', label: t('dashboard'), active: pathname === '/' },
    {
      href: '/groups',
      label: t('groups'),
      active: pathname.startsWith('/groups'),
    },
    {
      href: '/friends',
      label: t('friends'),
      active: pathname.startsWith('/friends'),
    },
  ]

  return (
    <header className="fixed top-0 inset-x-0 z-50 h-16 border-b bg-background/85 backdrop-blur-md">
      <div className="h-full max-w-screen-lg mx-auto px-4 flex items-center gap-2">
        <Link
          href="/"
          aria-label="Split Karega"
          className="flex items-center gap-2.5 mr-2"
        >
          <Image
            src="/logo/128x128.png"
            className="rounded-xl"
            width={36}
            height={36}
            alt=""
          />
          <span className="font-extrabold text-lg tracking-tight whitespace-nowrap">
            Split <span className="text-primary">Karega</span>
          </span>
        </Link>
        {session && (
          <nav
            aria-label={t('menu')}
            className="hidden md:flex items-center gap-1"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={link.active ? 'page' : undefined}
                className={cn(
                  'h-10 px-4 rounded-full flex items-center text-sm font-semibold transition-colors',
                  link.active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
        <span className="flex-1" />
        {session && (
          <span className="hidden md:block">
            <NotificationBell />
          </span>
        )}
        <ThemeToggle />
        {session ? (
          <Link
            href="/profile"
            aria-label={t('profile', { name: session.displayName })}
            className="ml-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Avatar name={session.displayName} size="sm" />
          </Link>
        ) : (
          <>
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">{t('login')}</Link>
            </Button>
            <Button
              asChild
              variant="marigold"
              size="sm"
              className="hidden sm:inline-flex"
            >
              <Link href="/register">{t('signUp')}</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  )
}
