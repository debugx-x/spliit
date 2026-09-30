import { Dashboard } from '@/app/dashboard'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getSession } from '@/lib/auth'
import { HandCoins, Sparkles, Users } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import Image from 'next/image'
import Link from 'next/link'

export default async function HomePage() {
  const t = await getTranslations()
  const session = await getSession()

  // Logged in: the dashboard. Otherwise the landing page.
  if (session) {
    return (
      <main className="flex-1 max-w-screen-md w-full mx-auto px-4 py-6 flex flex-col gap-6">
        <Dashboard displayName={session.displayName} />
      </main>
    )
  }

  const features = [
    { icon: Users, key: 'groups' },
    { icon: HandCoins, key: 'interac' },
    { icon: Sparkles, key: 'free' },
  ] as const

  return (
    <main className="flex-1">
      <section className="px-4 py-14 md:py-24">
        <div className="max-w-screen-md mx-auto flex flex-col items-center gap-6 text-center">
          <Image
            src="/logo/192x192.png"
            width={88}
            height={88}
            alt=""
            className="rounded-[1.75rem] shadow-lg shadow-primary/20"
            priority
          />
          <h1 className="!leading-tight font-extrabold tracking-tight text-4xl sm:text-5xl md:text-6xl landing-header pb-2">
            {t.rich('Homepage.title', {
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </h1>
          <p className="max-w-[36rem] leading-normal text-muted-foreground text-lg sm:text-xl sm:leading-8">
            {t('Homepage.description')}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild variant="marigold" size="lg">
              <Link href="/register">{t('Homepage.signUp')}</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">{t('Homepage.logIn')}</Link>
            </Button>
          </div>
        </div>
      </section>
      <section className="px-4 pb-16">
        <ul className="max-w-screen-md mx-auto grid gap-4 sm:grid-cols-3">
          {features.map(({ icon: Icon, key }) => (
            <li key={key}>
              <Card className="h-full">
                <CardContent className="p-5 flex flex-col gap-3">
                  <span className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </span>
                  <h2 className="font-bold">
                    {t(`Homepage.features.${key}.title`)}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t(`Homepage.features.${key}.text`)}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
