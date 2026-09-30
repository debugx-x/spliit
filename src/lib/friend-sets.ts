import { getCurrency } from '@/lib/currency'
import { listNames } from '@/lib/friend-set-names'
import { prisma } from '@/lib/prisma'
import { GroupKind } from '@prisma/client'
import { nanoid } from 'nanoid'

// Expenses with friends outside groups live in a hidden group per exact set
// of people (you + Alex, or you + Alex + Sam): a Group with kind FRIEND_SET,
// so balances, settling up, notifications and exports work as in groups.
// Sets can't be joined by link and their members can't change.

export const MAX_FRIENDS_IN_SET = 9

export class FriendSetError extends Error {
  constructor(
    public code: 'BAD_REQUEST' | 'NOT_FOUND',
    message: string,
  ) {
    super(message)
  }
}

// Identifies a set of people whatever the order: sorted, unique user IDs.
export function memberKey(userIds: string[]) {
  return Array.from(new Set(userIds)).sort().join(':')
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === 'P2002'
  )
}

// The set of the user and these friends, created on first use with the
// user's default currency. Doesn't notify anyone: the first expense does.
export async function getOrCreateFriendSet(
  userId: string,
  friendUserIds: string[],
) {
  const friends = Array.from(new Set(friendUserIds)).filter(
    (id) => id !== userId,
  )
  if (friends.length === 0) {
    throw new FriendSetError('BAD_REQUEST', 'Pick at least one friend.')
  }
  if (friends.length > MAX_FRIENDS_IN_SET) {
    throw new FriendSetError(
      'BAD_REQUEST',
      `You can add up to ${MAX_FRIENDS_IN_SET} friends. Create a group for more.`,
    )
  }
  const key = memberKey([userId, ...friends])
  const existing = await findSet(key)
  if (existing) return existing

  const users = await prisma.user.findMany({
    where: { id: { in: [userId, ...friends] } },
    select: { id: true, displayName: true, defaultCurrency: true },
  })
  const byId = new Map(users.map((user) => [user.id, user]))
  if (users.length !== friends.length + 1 || !byId.has(userId)) {
    throw new FriendSetError('NOT_FOUND', 'User not found.')
  }
  const members = [userId, ...friends].map((id) => byId.get(id)!)
  const currency = getCurrency(byId.get(userId)!.defaultCurrency)

  // Participant names must be told apart: "Alex", "Alex (2)"
  const taken = new Set<string>()
  const participants = members.map((member) => {
    let name = member.displayName
    for (let i = 2; taken.has(name); i++) name = `${member.displayName} (${i})`
    taken.add(name)
    return { id: nanoid(), name, userId: member.id }
  })

  try {
    const group = await prisma.group.create({
      data: {
        id: nanoid(),
        kind: GroupKind.FRIEND_SET,
        memberKey: key,
        name: listNames(participants.map((p) => p.name)),
        currency: currency.symbol,
        currencyCode: currency.code.length ? currency.code : null,
        creatorId: userId,
        participants: { createMany: { data: participants } },
      },
      select: { id: true },
    })
    return { groupId: group.id }
  } catch (error) {
    // Someone created the same set at the same time
    if (isUniqueViolation(error)) {
      const created = await findSet(key)
      if (created) return created
    }
    throw error
  }
}

async function findSet(key: string) {
  const group = await prisma.group.findUnique({
    where: { memberKey: key },
    select: { id: true },
  })
  return group ? { groupId: group.id } : null
}
