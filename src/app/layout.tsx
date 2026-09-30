import { ApplePwaSplash } from '@/app/apple-pwa-splash'
import { BottomNav } from '@/components/bottom-nav'
import { ProgressBar } from '@/components/progress-bar'
import { SiteHeader } from '@/components/site-header'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { getSession } from '@/lib/auth'
import { env } from '@/lib/env'
import { cn } from '@/lib/utils'
import { TRPCProvider } from '@/trpc/client'
import type { Metadata, Viewport } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { Suspense } from 'react'
import './globals.css'

// Self-hosted at build time: no request to Google when the app runs
const fontSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_BASE_URL),
  title: {
    default: 'Split Karega · Money Please',
    template: '%s · Split Karega',
  },
  description:
    'Split Karega is a free, minimalist web app to split expenses with your friends. No ads, no limits.',
  openGraph: {
    title: 'Split Karega · Money Please',
    description:
      'Split Karega is a free, minimalist web app to split expenses with your friends. No ads, no limits.',
    images: `/banner.png`,
    type: 'website',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@scastiel',
    site: '@scastiel',
    images: `/banner.png`,
    title: 'Split Karega · Money Please',
    description:
      'Split Karega is a free, minimalist web app to split expenses with your friends. No ads, no limits.',
  },
  appleWebApp: {
    capable: true,
    title: 'Split Karega',
  },
  applicationName: 'Split Karega',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFF8EC' },
    { media: '(prefers-color-scheme: dark)', color: '#17130D' },
  ],
  // Lets the tab bar sit above the iPhone home indicator
  viewportFit: 'cover',
}

function Content({
  children,
  session,
}: {
  children: React.ReactNode
  session: { displayName: string } | null
}) {
  return (
    <TRPCProvider>
      <SiteHeader
        session={session ? { displayName: session.displayName } : null}
      />
      {/* Logged in, phones get a bottom tab bar: leave room for it */}
      <div
        className={cn('pt-16 flex-1 flex flex-col', session && 'pb-24 md:pb-0')}
      >
        {children}
      </div>
      {session && <BottomNav />}
      <Toaster />
    </TRPCProvider>
  )
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()
  const session = await getSession()
  return (
    <html lang={locale} className={fontSans.variable} suppressHydrationWarning>
      <ApplePwaSplash icon="/logo-with-text.png" color="#08775A" />
      <body className="min-h-[100dvh] flex flex-col items-stretch bg-background font-sans">
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Suspense>
              <ProgressBar />
            </Suspense>
            <Content session={session}>{children}</Content>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
