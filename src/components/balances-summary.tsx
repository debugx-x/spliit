'use client'

import { Card, CardContent } from '@/components/ui/card'
import { CurrencyTotal } from '@/lib/friend-balances'
import { formatCurrency, getCurrencyFromGroup } from '@/lib/utils'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'

const amountColor = (amount: number, color: string) =>
  amount === 0 ? 'text-muted-foreground' : color

// "Overall: you're owed $35.00 · you owe $12.00", one line per currency.
export function BalancesSummary({
  totals,
  showFriendsLink = false,
}: {
  totals: CurrencyTotal[]
  showFriendsLink?: boolean
}) {
  const t = useTranslations('Friends')
  const locale = useLocale()
  const format = (total: CurrencyTotal, amount: number) =>
    formatCurrency(getCurrencyFromGroup(total), amount, locale)

  return (
    <Card>
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
        <div className="flex flex-col gap-1">
          <span className="font-semibold">{t('overall')}</span>
          {totals.length === 0 ? (
            <span className="text-muted-foreground">{t('allSettled')}</span>
          ) : (
            totals.map((total) => (
              <span key={`${total.currencyCode}${total.currency}`}>
                <span className={amountColor(total.owedToYou, 'text-owed')}>
                  {t('owedToYouTotal', {
                    amount: format(total, total.owedToYou),
                  })}
                </span>
                {' · '}
                <span className={amountColor(total.youOwe, 'text-owe')}>
                  {t('youOweTotal', { amount: format(total, total.youOwe) })}
                </span>
              </span>
            ))
          )}
        </div>
        {showFriendsLink && (
          <Link href="/friends" className="underline whitespace-nowrap">
            {t('seeByFriend')}
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
