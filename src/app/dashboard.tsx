'use client'

import {
  pickableFriends,
  useFormatAmount,
  useLineLabel,
} from '@/app/friends/friends-list'
import {
  AddExpenseWithFriendsButton,
  FriendPicker,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CurrencyTotal } from '@/lib/friend-balances'
import { cn, formatCurrency, getCurrencyFromGroup } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { AppRouterOutput } from '@/trpc/routers/_app'
import { ChevronRight, HandCoins, Loader2, Plus } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { ReactNode } from 'react'

type Friend = AppRouterOutput['friends']['list']['friends'][number]
type Group = AppRouterOutput['groups']['list']['groups'][number]

// The logged-in homepage, laid out like Splitwise's dashboard: totals, who
// you owe and who owes you, your groups and recent activity.
export function Dashboard() {
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

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h1 className="font-bold text-2xl">{t('title')}</h1>
        <div className="flex gap-2">
          <AddExpenseDialog friends={pickable} groups={activeGroups} />
          <SettleUpDialog friends={friends.data.friends} />
        </div>
      </div>

      {groups.data.groups.length === 0 && friends.data.friends.length === 0 ? (
        <Welcome friends={pickable} />
      ) : (
        <>
          <Summary totals={friends.data.totals} />
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

// Total balance · You owe · You are owed, one line per currency
function Summary({ totals }: { totals: CurrencyTotal[] }) {
  const t = useTranslations('Dashboard')
  const locale = useLocale()
  const format = (total: CurrencyTotal, amount: number) =>
    formatCurrency(getCurrencyFromGroup(total), Math.abs(amount), locale)
  const column = (
    label: string,
    render: (total: CurrencyTotal) => ReactNode,
  ) => (
    <div className="flex flex-col items-center gap-1 p-3 sm:p-4 text-center">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {totals.length === 0 ? (
        <span className="font-semibold text-muted-foreground">—</span>
      ) : (
        totals.map((total) => (
          <span
            key={`${total.currencyCode}${total.currency}`}
            className="whitespace-nowrap text-sm sm:text-base"
          >
            {render(total)}
          </span>
        ))
      )}
    </div>
  )
  return (
    <Card>
      <CardContent className="p-0 grid grid-cols-3 divide-x">
        {column(t('totalBalance'), (total) => {
          const net = total.owedToYou - total.youOwe
          return (
            <span
              className={cn(
                'font-semibold',
                net > 0 && 'text-green-600',
                net < 0 && 'text-red-600',
              )}
            >
              {net < 0 ? '-' : net > 0 ? '+' : ''}
              {format(total, net)}
            </span>
          )
        })}
        {column(t('youOwe'), (total) => (
          <span
            className={cn('font-semibold', total.youOwe > 0 && 'text-red-600')}
          >
            {format(total, total.youOwe)}
          </span>
        ))}
        {column(t('youAreOwed'), (total) => (
          <span
            className={cn(
              'font-semibold',
              total.owedToYou > 0 && 'text-green-600',
            )}
          >
            {format(total, total.owedToYou)}
          </span>
        ))}
      </CardContent>
    </Card>
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
        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
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
                  <summary className="list-none cursor-pointer py-2 flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="font-medium truncate block">
                        {friend.displayName}
                      </span>
                      {amounts.map((amount) => (
                        <span
                          key={`${amount.currencyCode}${amount.currency}`}
                          className={cn(
                            'text-sm block',
                            sign > 0 ? 'text-green-600' : 'text-red-600',
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
                        className="py-1 pl-3 flex items-center justify-between gap-3"
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
                              line.amount > 0
                                ? 'text-green-600'
                                : 'text-red-600'
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
        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
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
                  className="py-2 flex items-center justify-between gap-3 text-sm hover:underline underline-offset-4"
                >
                  <span className="truncate">{group.name}</span>
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
        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
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

function AddExpenseDialog({
  friends,
  groups,
}: {
  friends: PickableFriend[]
  groups: Group[]
}) {
  const t = useTranslations('Dashboard')
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          {t('addExpense')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('addExpense')}</DialogTitle>
          <DialogDescription>{t('addExpenseDescription')}</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="friends">
          <TabsList className="w-full">
            <TabsTrigger value="friends" className="flex-1">
              {t('withFriends')}
            </TabsTrigger>
            <TabsTrigger value="group" className="flex-1">
              {t('inAGroup')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="friends" className="pt-2">
            <FriendPicker friends={friends} />
          </TabsContent>
          <TabsContent value="group" className="pt-2">
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('noGroups')}{' '}
                <Link href="/groups/create" className="underline">
                  {t('createGroup')}
                </Link>
              </p>
            ) : (
              <ul className="flex flex-col gap-1 max-h-72 overflow-y-auto">
                {groups.map((group) => (
                  <li key={group.id}>
                    <Button
                      asChild
                      variant="ghost"
                      className="w-full justify-between"
                    >
                      <Link href={`/groups/${group.id}/expenses/create`}>
                        <span className="truncate">{group.name}</span>
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

// Lines where you owe someone, each leading to the balances page where
// "Pay with Interac" and "Mark as paid" live
function SettleUpDialog({ friends }: { friends: Friend[] }) {
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
      <DialogTrigger asChild>
        <Button variant="secondary">
          <HandCoins className="w-4 h-4 mr-2" />
          {t('settleUp')}
        </Button>
      </DialogTrigger>
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
                className="py-2 flex items-center justify-between gap-3"
              >
                <span className="min-w-0">
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
                <Button asChild size="sm">
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
      <CardContent className="p-6 flex flex-col items-center gap-3 text-center">
        <h2 className="text-lg font-semibold">{t('welcomeTitle')}</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {t('welcomeText')}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href="/groups/create">{t('createGroup')}</Link>
          </Button>
          <AddExpenseWithFriendsButton friends={friends} variant="secondary" />
        </div>
      </CardContent>
    </Card>
  )
}
