'use client'

import {
  pickableFriends,
  useFormatAmount,
  useLineLabel,
} from '@/app/friends/friends-list'
import { AddExpenseDialog } from '@/components/add-expense-dialog'
import { Avatar } from '@/components/avatar'
import {
  AddExpenseWithFriendsButton,
  PickableFriend,
} from '@/components/friend-picker'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { CurrencyTotal } from '@/lib/friend-balances'
import { cn, formatCurrency, getCurrencyFromGroup } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { AppRouterOutput } from '@/trpc/routers/_app'
import { ChevronRight, HandCoins, Loader2, Plus, Users } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import { ReactNode } from 'react'

type Friend = AppRouterOutput['friends']['list']['friends'][number]
type Group = AppRouterOutput['groups']['list']['groups'][number]

// The logged-in homepage, laid out like Splitwise's dashboard: totals, who
// you owe and who owes you, your groups and recent activity.
export function Dashboard({ displayName }: { displayName: string }) {
  const t = useTranslations('Dashboard')
  const friends = trpc.friends.list.useQuery()
  const groups = trpc.groups.list.useQuery()

  if (!friends.data || !groups.data) {
    return (
      <p>
        <Loader2 className="w-4 mr-2 inline animate-spin" /> {t('loading')}
      </p>
    )
  }

  const pickable = pickableFriends(friends.data.friends)
  const activeGroups = groups.data.groups.filter((g) => !g.archived)
  const firstName = displayName.trim().split(/\s+/)[0]

  return (
    <>
      <h1 className="font-extrabold text-2xl sm:text-3xl tracking-tight">
        {t('greeting', { name: firstName })}
      </h1>

      {groups.data.groups.length === 0 && friends.data.friends.length === 0 ? (
        <Welcome friends={pickable} />
      ) : (
        <>
          <Summary
            totals={friends.data.totals}
            actions={
              <>
                <AddExpenseDialog
                  trigger={
                    <Button
                      variant="marigold"
                      size="lg"
                      className="flex-1 min-w-0 px-3 sm:flex-none sm:px-7"
                    >
                      <Plus className="hidden min-[400px]:block w-5 h-5 mr-1 shrink-0" />
                      <span className="truncate">{t('addExpenseShort')}</span>
                    </Button>
                  }
                />
                <SettleUpDialog
                  friends={friends.data.friends}
                  trigger={
                    <Button
                      size="lg"
                      variant="outline"
                      className="flex-1 min-w-0 px-3 sm:flex-none sm:px-7 bg-transparent border-hero-foreground/40 text-hero-foreground hover:bg-hero-foreground/10 hover:text-hero-foreground"
                    >
                      <HandCoins className="hidden min-[400px]:block w-5 h-5 mr-1 shrink-0" />
                      <span className="truncate">{t('settleUp')}</span>
                    </Button>
                  }
                />
              </>
            }
          />
          <div className="grid gap-4 md:grid-cols-2">
            <BalanceColumn
              title={t('youOwe')}
              empty={t('youOweNobody')}
              friends={friends.data.friends}
              sign={-1}
            />
            <BalanceColumn
              title={t('youAreOwed')}
              empty={t('nobodyOwesYou')}
              friends={friends.data.friends}
              sign={1}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <YourGroups groups={activeGroups} />
            <RecentActivity />
          </div>
        </>
      )}
    </>
  )
}

// The mint card: overall, you owe / you're owed / hisaab barabar, per
// currency, with the main actions
function Summary({
  totals,
  actions,
}: {
  totals: CurrencyTotal[]
  actions: ReactNode
}) {
  const t = useTranslations('Dashboard')
  const locale = useLocale()
  const format = (total: CurrencyTotal, amount: number) =>
    formatCurrency(getCurrencyFromGroup(total), Math.abs(amount), locale)
  const nets = totals.map((total) => ({
    total,
    net: total.owedToYou - total.youOwe,
  }))
  const settled = nets.every(({ net }) => net === 0)
  const single = nets.length === 1 ? nets[0] : null

  return (
    <section className="rounded-3xl bg-hero text-hero-foreground p-4 sm:p-6 flex flex-col gap-5">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-hero-muted">
            {settled
              ? t('overall')
              : single
              ? single.net < 0
                ? t('overallYouOwe')
                : t('overallYouAreOwed')
              : t('overall')}
          </span>
          {settled ? (
            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {t('settled')}
            </span>
          ) : (
            nets
              .filter(({ net }) => net !== 0)
              .map(({ total, net }) => (
                <span
                  key={`${total.currencyCode}${total.currency}`}
                  className={cn(
                    'font-extrabold tracking-tight tabular-nums',
                    single ? 'text-4xl sm:text-5xl' : 'text-2xl sm:text-3xl',
                  )}
                >
                  {!single && (
                    <span className="text-base font-semibold text-hero-muted mr-2">
                      {net < 0 ? t('youOweShort') : t('youAreOwedShort')}
                    </span>
                  )}
                  {format(total, net)}
                </span>
              ))
          )}
        </div>
        {totals.length > 0 && (
          <dl className="flex gap-6 text-sm">
            {totals.map((total) => (
              <div
                key={`${total.currencyCode}${total.currency}`}
                className="flex gap-6"
              >
                <div>
                  <dt className="text-hero-muted font-semibold">
                    {t('youOwe')}
                  </dt>
                  <dd className="font-bold tabular-nums">
                    {format(total, total.youOwe)}
                  </dd>
                </div>
                <div>
                  <dt className="text-hero-muted font-semibold">
                    {t('youAreOwed')}
                  </dt>
                  <dd className="font-bold tabular-nums">
                    {format(total, total.owedToYou)}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        )}
      </div>
      <div className="flex gap-3">{actions}</div>
    </section>
  )
}

// Friends you owe (sign -1) or who owe you (sign 1), with their amounts in
// that direction. A friend can be in both, in different currencies.
function BalanceColumn({
  title,
  empty,
  friends,
  sign,
}: {
  title: string
  empty: string
  friends: Friend[]
  sign: 1 | -1
}) {
  const t = useTranslations('Friends')
  const format = useFormatAmount()
  const lineLabel = useLineLabel()
  const rows = friends
    .map((friend) => ({
      friend,
      amounts: friend.amounts.filter((a) => Math.sign(a.amount) === sign),
      // All lines, both ways, so they add up to the amount shown
      lines: friend.groups,
    }))
    .filter((row) => row.amounts.length > 0)

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm font-bold text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="divide-y">
            {rows.map(({ friend, amounts, lines }) => (
              <li key={friend.key}>
                <details className="group">
                  <summary className="list-none cursor-pointer py-2.5 flex items-center gap-3">
                    <Avatar name={friend.displayName} />
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold truncate block">
                        {friend.displayName}
                      </span>
                      {amounts.map((amount) => (
                        <span
                          key={`${amount.currencyCode}${amount.currency}`}
                          className={cn(
                            'text-sm block',
                            sign > 0 ? 'text-owed' : 'text-owe',
                          )}
                        >
                          {sign > 0
                            ? t('owesYou', { amount: format(amount) })
                            : t('youOwe', { amount: format(amount) })}
                        </span>
                      ))}
                    </span>
                    <ChevronRight className="w-4 h-4 flex-shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                  </summary>
                  <ul className="pb-2 text-sm">
                    {lines.map((line, index) => (
                      <li
                        key={`${line.groupId}-${index}`}
                        className="py-1.5 pl-[3.25rem] flex items-center justify-between gap-3"
                      >
                        <Link
                          href={`/groups/${line.groupId}/balances`}
                          className="underline-offset-4 hover:underline truncate"
                        >
                          {lineLabel(line)}
                        </Link>
                        <span className="flex items-center gap-2 whitespace-nowrap">
                          <span
                            className={
                              line.amount > 0 ? 'text-owed' : 'text-owe'
                            }
                          >
                            {line.amount > 0
                              ? t('owesYou', { amount: format(line) })
                              : t('youOwe', { amount: format(line) })}
                          </span>
                          {line.amount < 0 && (
                            <Button asChild size="sm" variant="marigold">
                              <Link href={`/groups/${line.groupId}/balances`}>
                                {t('pay')}
                              </Link>
                            </Button>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function YourGroups({ groups }: { groups: Group[] }) {
  const t = useTranslations('Dashboard')
  return (
    <Card>
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-bold text-muted-foreground">
          {t('yourGroups')}
        </CardTitle>
        <Link href="/groups" className="text-sm underline">
          {t('seeAll')}
        </Link>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('noGroups')}{' '}
            <Link href="/groups/create" className="underline">
              {t('createGroup')}
            </Link>
          </p>
        ) : (
          <ul className="divide-y">
            {groups.slice(0, 4).map((group) => (
              <li key={group.id}>
                <Link
                  href={`/groups/${group.id}`}
                  className="py-2 flex items-center gap-3 text-sm hover:underline underline-offset-4"
                >
                  <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </span>
                  <span className="truncate flex-1 font-semibold">
                    {group.name}
                  </span>
                  <span className="text-muted-foreground whitespace-nowrap">
                    {t('people', { count: group._count.participants })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function RecentActivity() {
  const t = useTranslations('Dashboard')
  const { data } = trpc.notifications.list.useQuery()
  return (
    <Card>
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-bold text-muted-foreground">
          {t('recentActivity')}
        </CardTitle>
        <Link href="/notifications" className="text-sm underline">
          {t('seeAll')}
        </Link>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {!data ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noActivity')}</p>
        ) : (
          <ul className="divide-y">
            {data.slice(0, 5).map((notification) => (
              <li key={notification.id}>
                <Link
                  href={notification.path}
                  className="py-2 block text-sm hover:underline underline-offset-4"
                >
                  {notification.text}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

// Lines where you owe someone, each leading to the balances page where
// "Pay with Interac" and "Mark as paid" live
function SettleUpDialog({
  friends,
  trigger,
}: {
  friends: Friend[]
  trigger: ReactNode
}) {
  const t = useTranslations('Dashboard')
  const tFriends = useTranslations('Friends')
  const format = useFormatAmount()
  const lineLabel = useLineLabel()
  const debts = friends.flatMap((friend) =>
    friend.groups
      .filter((line) => line.amount < 0)
      .map((line) => ({ friend, line })),
  )
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('settleUp')}</DialogTitle>
          <DialogDescription>{t('settleUpDescription')}</DialogDescription>
        </DialogHeader>
        {debts.length === 0 ? (
          <p className="text-sm">{t('allSettled')}</p>
        ) : (
          <ul className="divide-y text-sm">
            {debts.map(({ friend, line }, index) => (
              <li
                key={`${line.groupId}-${friend.key}-${index}`}
                className="py-2.5 flex items-center gap-3"
              >
                <Avatar name={friend.displayName} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">
                    {t.rich('youOweFriend', {
                      name: friend.displayName,
                      amount: format(line),
                      strong: (chunks) => (
                        <span className="font-medium">{chunks}</span>
                      ),
                    })}
                  </span>
                  <span className="block text-muted-foreground truncate">
                    {lineLabel(line)}
                  </span>
                </span>
                <Button asChild size="sm" variant="marigold">
                  <Link href={`/groups/${line.groupId}/balances`}>
                    {tFriends('pay')}
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Welcome({ friends }: { friends: PickableFriend[] }) {
  const t = useTranslations('Dashboard')
  return (
    <Card>
      <CardContent className="p-6 sm:p-8 flex flex-col items-center gap-3 text-center">
        <Image
          src="/logo/128x128.png"
          width={64}
          height={64}
          alt=""
          className="rounded-2xl"
        />
        <h2 className="text-xl font-extrabold">{t('welcomeTitle')}</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {t('welcomeText')}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild variant="marigold">
            <Link href="/groups/create">{t('createGroup')}</Link>
          </Button>
          <AddExpenseWithFriendsButton friends={friends} variant="secondary" />
        </div>
      </CardContent>
    </Card>
  )
}
