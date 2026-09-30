'use client'

import { BalancesSummary } from '@/components/balances-summary'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Amount } from '@/lib/friend-balances'
import { formatCurrency, getCurrencyFromGroup } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { AppRouterOutput } from '@/trpc/routers/_app'
import { ChevronRight, Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'

type Friend = AppRouterOutput['friends']['list']['friends'][number]

export function useFormatAmount() {
  const locale = useLocale()
  return (amount: Amount) =>
    formatCurrency(
      getCurrencyFromGroup(amount),
      Math.abs(amount.amount),
      locale,
    )
}

export function FriendsList() {
  const t = useTranslations('Friends')
  const { data, isLoading } = trpc.friends.list.useQuery()

  if (isLoading || !data) {
    return (
      <p>
        <Loader2 className="w-4 mr-2 inline animate-spin" /> {t('loading')}
      </p>
    )
  }

  const outstanding = data.friends.filter((f) => f.amounts.length > 0)
  const settled = data.friends.filter((f) => f.amounts.length === 0)

  return (
    <>
      <h1 className="font-bold text-2xl">{t('title')}</h1>
      <BalancesSummary totals={data.totals} />
      {data.friends.length === 0 ? (
        <p className="text-sm">
          {t('empty')}{' '}
          <Link href="/groups" className="underline">
            {t('goToGroups')}
          </Link>
        </p>
      ) : (
        <>
          {outstanding.length > 0 && <FriendCards friends={outstanding} />}
          {settled.length > 0 && (
            <>
              <h2 className="text-muted-foreground">{t('settledTitle')}</h2>
              <FriendCards friends={settled} />
            </>
          )}
        </>
      )}
    </>
  )
}

function FriendCards({ friends }: { friends: Friend[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {friends.map((friend) => (
        <li key={friend.key}>
          <FriendCard friend={friend} />
        </li>
      ))}
    </ul>
  )
}

function FriendCard({ friend }: { friend: Friend }) {
  const t = useTranslations('Friends')
  const format = useFormatAmount()
  const name = friend.displayName

  return (
    <Card>
      <details className="group">
        <summary className="list-none cursor-pointer">
          <CardHeader className="p-4 flex flex-row items-center justify-between gap-4 space-y-0">
            <div className="min-w-0">
              <CardTitle className="text-base truncate">
                {name}
                {friend.uniqueId && (
                  <span className="ml-2 font-normal text-sm text-muted-foreground">
                    @{friend.uniqueId}
                  </span>
                )}
              </CardTitle>
              {friend.groupName && (
                <p className="text-xs text-muted-foreground">
                  {t('inGroup', { group: friend.groupName })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-right">
              <div className="flex flex-col">
                {friend.amounts.length === 0 ? (
                  <span className="text-muted-foreground">
                    {t('settledUp')}
                  </span>
                ) : (
                  friend.amounts.map((amount) => (
                    <span
                      key={`${amount.currencyCode}${amount.currency}`}
                      className={
                        amount.amount > 0 ? 'text-green-600' : 'text-red-600'
                      }
                    >
                      {amount.amount > 0
                        ? t('owesYou', { amount: format(amount) })
                        : t('youOwe', { amount: format(amount) })}
                    </span>
                  ))
                )}
              </div>
              <ChevronRight className="w-4 h-4 flex-shrink-0 transition-transform group-open:rotate-90" />
            </div>
          </CardHeader>
        </summary>
        <CardContent className="px-4 pb-4 pt-0">
          <ul className="text-sm divide-y">
            {friend.groups.map((line, index) => (
              <li
                key={`${line.groupId}-${index}`}
                className="py-2 flex items-center justify-between gap-4"
              >
                <Button variant="link" asChild className="p-0 h-auto">
                  <Link href={`/groups/${line.groupId}/balances`}>
                    {line.groupName}
                  </Link>
                </Button>
                <span className="flex items-center gap-3">
                  <span
                    className={
                      line.amount > 0 ? 'text-green-600' : 'text-red-600'
                    }
                  >
                    {line.amount > 0
                      ? t('owesYou', { amount: format(line) })
                      : t('youOwe', { amount: format(line) })}
                  </span>
                  {line.amount < 0 && (
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/groups/${line.groupId}/balances`}>
                        {t('pay')}
                      </Link>
                    </Button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </details>
    </Card>
  )
}
