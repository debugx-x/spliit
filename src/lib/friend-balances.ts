import { getGroupExpenses } from '@/lib/api'
import {
  Reimbursement,
  getBalances,
  getSuggestedReimbursements,
} from '@/lib/balances'
import { prisma } from '@/lib/prisma'
import { GroupKind } from '@prisma/client'

// What each friend owes you (or you owe them) across all your groups.
//
// Per group, the amounts are the group's suggested reimbursements (the ones
// its Balances page shows) that involve your participant. Amounts are merged
// across groups per friend and per currency; different currencies are never
// added together. Participants not linked to an account are listed per group:
// a name isn't an identity. Friends with an account who share a group with
// you but have no balance are listed too ("Settled up"), so you can add
// expenses with them.

export type GroupCurrency = { currency: string; currencyCode: string | null }

export type GroupBalanceInput = GroupCurrency & {
  id: string
  name: string
  kind: GroupKind
  participants: {
    id: string
    name: string
    userId: string | null
    user: { displayName: string; uniqueId: string } | null
  }[]
  reimbursements: Reimbursement[]
}

// Positive: they owe you. Negative: you owe them. In minor units.
export type Amount = GroupCurrency & { amount: number }

export type FriendBalance = {
  key: string
  userId: string | null
  displayName: string
  uniqueId: string | null
  // Set for participants without an account: the only group they're in
  groupName: string | null
  amounts: Amount[] // net per currency, zeros removed
  groups: (Amount & {
    groupId: string
    groupName: string
    kind: GroupKind
    // Friend sets: the other members' names, to label the line
    // "Non-group expenses" (a pair) or "Non-group · You, Alex & Sam"
    otherMembers: string[]
  })[]
}

export type CurrencyTotal = GroupCurrency & {
  owedToYou: number
  youOwe: number
}

function currencyKey({ currency, currencyCode }: GroupCurrency) {
  return currencyCode || `custom:${currency}`
}

export function summarizeFriendBalances(
  groups: GroupBalanceInput[],
  userId: string,
): { friends: FriendBalance[]; totals: CurrencyTotal[] } {
  const friends = new Map<string, FriendBalance>()

  for (const group of groups) {
    const me = group.participants.find((p) => p.userId === userId)
    if (!me) continue

    for (const { from, to, amount } of group.reimbursements) {
      const [otherId, signed] =
        to === me.id ? [from, amount] : from === me.id ? [to, -amount] : []
      if (!otherId || !signed) continue
      const other = group.participants.find((p) => p.id === otherId)
      if (!other) continue

      const key = other.userId
        ? `user:${other.userId}`
        : `participant:${other.id}`
      let friend = friends.get(key)
      if (!friend) {
        friend = {
          key,
          userId: other.userId,
          displayName: other.user?.displayName ?? other.name,
          uniqueId: other.user?.uniqueId ?? null,
          groupName: other.userId ? null : group.name,
          amounts: [],
          groups: [],
        }
        friends.set(key, friend)
      }

      const currency = {
        currency: group.currency,
        currencyCode: group.currencyCode,
      }
      friend.groups.push({
        groupId: group.id,
        groupName: group.name,
        kind: group.kind,
        otherMembers:
          group.kind === GroupKind.FRIEND_SET
            ? group.participants
                .filter((p) => p.id !== me.id)
                .map((p) => p.user?.displayName ?? p.name)
            : [],
        ...currency,
        amount: signed,
      })
      const net = friend.amounts.find(
        (a) => currencyKey(a) === currencyKey(currency),
      )
      if (net) net.amount += signed
      else friend.amounts.push({ ...currency, amount: signed })
    }
  }

  // Friends with an account you share a group with, without a balance
  for (const group of groups) {
    if (!group.participants.some((p) => p.userId === userId)) continue
    for (const other of group.participants) {
      if (!other.userId || other.userId === userId) continue
      const key = `user:${other.userId}`
      if (friends.has(key)) continue
      friends.set(key, {
        key,
        userId: other.userId,
        displayName: other.user?.displayName ?? other.name,
        uniqueId: other.user?.uniqueId ?? null,
        groupName: null,
        amounts: [],
        groups: [],
      })
    }
  }

  const totals = new Map<string, CurrencyTotal>()
  for (const friend of Array.from(friends.values())) {
    friend.amounts = friend.amounts.filter((a) => a.amount !== 0)
    for (const { amount, ...currency } of friend.amounts) {
      const key = currencyKey(currency)
      const total = totals.get(key) ?? { ...currency, owedToYou: 0, youOwe: 0 }
      if (amount > 0) total.owedToYou += amount
      else total.youOwe -= amount
      totals.set(key, total)
    }
  }

  const largest = (f: FriendBalance) =>
    Math.max(0, ...f.amounts.map((a) => Math.abs(a.amount)))
  return {
    friends: Array.from(friends.values()).sort(
      (a, b) =>
        largest(b) - largest(a) || a.displayName.localeCompare(b.displayName),
    ),
    totals: Array.from(totals.values()),
  }
}

export async function getFriendBalances(userId: string) {
  const groups = await prisma.group.findMany({
    where: { participants: { some: { userId } } },
    select: {
      id: true,
      name: true,
      kind: true,
      currency: true,
      currencyCode: true,
      participants: {
        select: {
          id: true,
          name: true,
          userId: true,
          user: { select: { displayName: true, uniqueId: true } },
        },
      },
    },
  })

  // One group at a time: loading expenses also creates due recurring
  // expenses, which must not run concurrently.
  const inputs: GroupBalanceInput[] = []
  for (const group of groups) {
    const expenses = await getGroupExpenses(group.id)
    inputs.push({
      ...group,
      reimbursements: getSuggestedReimbursements(getBalances(expenses)),
    })
  }
  return summarizeFriendBalances(inputs, userId)
}
