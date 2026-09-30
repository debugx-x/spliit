'use client'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTranslations } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'

type Props = {
  groupId: string
  // Friend sets have no information page
  isFriendSet?: boolean
}

export function GroupTabs({ groupId, isFriendSet = false }: Props) {
  const t = useTranslations()
  const pathname = usePathname()
  const value =
    pathname.replace(/\/groups\/[^\/]+\/([^/]+).*/, '$1') || 'expenses'
  const router = useRouter()

  return (
    <Tabs
      value={value}
      className="min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      onValueChange={(value) => {
        router.push(`/groups/${groupId}/${value}`)
      }}
    >
      <TabsList>
        <TabsTrigger value="expenses">{t('Expenses.title')}</TabsTrigger>
        <TabsTrigger value="balances">{t('Balances.title')}</TabsTrigger>
        {!isFriendSet && (
          <TabsTrigger value="information">
            {t('Information.title')}
          </TabsTrigger>
        )}
        <TabsTrigger value="stats">{t('Stats.title')}</TabsTrigger>
        <TabsTrigger value="activity">{t('Activity.title')}</TabsTrigger>
        <TabsTrigger value="edit">{t('Settings.title')}</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
