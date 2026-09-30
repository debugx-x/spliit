import { Currency } from '@/lib/currency'
import { listNames } from '@/lib/friend-set-names'
import { prisma } from '@/lib/prisma'
import { calculateShare } from '@/lib/totals'
import { formatCurrency, getCurrencyFromGroup } from '@/lib/utils'
import {
  Group,
  GroupKind,
  NotificationType,
  Participant,
  Prisma,
  SplitMode,
} from '@prisma/client'

// Notifications tell users about payments, new expenses, changes and groups
// they were added to. Rows are created when the change is saved (never for
// the person who made it) and read by the in-app bell and the daily email.

export type Actor = { userId: string; displayName: string }

// The parts of an expense that notifications care about, from either the
// expense form or the database.
export type ExpenseSnapshot = {
  title: string
  amount: number
  paidById: string
  splitMode: SplitMode
  isReimbursement: boolean
  paidFor: { participantId: string; shares: number }[]
}

// Snapshot of what the sentence needs, taken when the change is saved.
// Amounts are in cents.
export type NotificationData = {
  title?: string
  amount?: number
  oldAmount?: number
  share?: number
  paidByYou?: boolean
  removed?: boolean
  payerName?: string
  recordedByOther?: boolean
}

export type PlannedNotification = {
  userId: string
  type: NotificationType
  data: NotificationData
}

type GroupParticipant = Pick<Participant, 'id' | 'name' | 'userId'>

export function expenseSnapshotFromForm(values: {
  title: string
  amount: number
  paidBy: string
  splitMode: SplitMode
  isReimbursement: boolean
  paidFor: { participant: string; shares: number }[]
}): ExpenseSnapshot {
  return {
    title: values.title,
    amount: values.amount,
    paidById: values.paidBy,
    splitMode: values.splitMode,
    isReimbursement: values.isReimbursement,
    paidFor: values.paidFor.map((p) => ({
      participantId: p.participant,
      shares: Number(p.shares),
    })),
  }
}

// A participant's share of an expense, in cents. For reimbursements, the
// amount they receive.
export function shareOf(participantId: string, expense: ExpenseSnapshot) {
  const share = calculateShare(participantId, {
    amount: expense.amount,
    splitMode: expense.splitMode,
    isReimbursement: false,
    paidFor: expense.paidFor.map((p) => ({
      participant: { id: p.participantId },
      shares: p.shares,
    })),
  } as Parameters<typeof calculateShare>[1])
  return Math.round(share)
}

function involvedIds(expense: ExpenseSnapshot) {
  return new Set([
    expense.paidById,
    ...expense.paidFor.map((p) => p.participantId),
  ])
}

// Linked participants among `ids`, except the actor's own.
function recipients(
  ids: Iterable<string>,
  participants: GroupParticipant[],
  actorUserId: string,
) {
  const wanted = new Set(ids)
  return participants.filter(
    (p): p is GroupParticipant & { userId: string } =>
      wanted.has(p.id) && !!p.userId && p.userId !== actorUserId,
  )
}

export function planExpenseCreated(
  expense: ExpenseSnapshot,
  participants: GroupParticipant[],
  actorUserId: string,
): PlannedNotification[] {
  if (expense.isReimbursement) {
    const payer = participants.find((p) => p.id === expense.paidById)
    return recipients(
      expense.paidFor.map((p) => p.participantId),
      participants,
      actorUserId,
    )
      .filter((p) => p.id !== expense.paidById)
      .map((p) => ({
        userId: p.userId,
        type: NotificationType.PAYMENT_RECEIVED,
        data: {
          amount: shareOf(p.id, expense),
          payerName: payer?.name ?? 'Someone',
          recordedByOther: payer?.userId !== actorUserId,
        },
      }))
  }
  return recipients(involvedIds(expense), participants, actorUserId).map(
    (p) => ({
      userId: p.userId,
      type: NotificationType.EXPENSE_ADDED,
      data: {
        title: expense.title,
        amount: expense.amount,
        share: shareOf(p.id, expense),
        paidByYou: expense.paidById === p.id,
      },
    }),
  )
}

function sameSplit(before: ExpenseSnapshot, after: ExpenseSnapshot) {
  if (
    before.amount !== after.amount ||
    before.paidById !== after.paidById ||
    before.splitMode !== after.splitMode ||
    before.isReimbursement !== after.isReimbursement ||
    before.paidFor.length !== after.paidFor.length
  )
    return false
  const shares = new Map(
    before.paidFor.map((p) => [p.participantId, Number(p.shares)]),
  )
  return after.paidFor.every(
    (p) => shares.get(p.participantId) === Number(p.shares),
  )
}

// Only changes to who pays, who's in it, the amount or the split notify:
// renaming, notes, category or date alone don't.
export function planExpenseUpdated(
  before: ExpenseSnapshot,
  after: ExpenseSnapshot,
  participants: GroupParticipant[],
  actorUserId: string,
): PlannedNotification[] {
  if (sameSplit(before, after)) return []
  const afterIds = involvedIds(after)
  return recipients(
    Array.from(involvedIds(before)).concat(Array.from(afterIds)),
    participants,
    actorUserId,
  ).map((p) => ({
    userId: p.userId,
    type: NotificationType.EXPENSE_CHANGED,
    data: afterIds.has(p.id)
      ? {
          title: after.title,
          amount: after.amount,
          ...(before.amount !== after.amount
            ? { oldAmount: before.amount }
            : {}),
          ...(after.isReimbursement ? {} : { share: shareOf(p.id, after) }),
        }
      : { title: after.title, removed: true },
  }))
}

export function planExpenseDeleted(
  expense: ExpenseSnapshot,
  participants: GroupParticipant[],
  actorUserId: string,
): PlannedNotification[] {
  return recipients(involvedIds(expense), participants, actorUserId).map(
    (p) => ({
      userId: p.userId,
      type: NotificationType.EXPENSE_DELETED,
      data: { title: expense.title, amount: expense.amount },
    }),
  )
}

export function planAddedToGroup(
  linkedUserIds: (string | null | undefined)[],
  actorUserId: string,
): PlannedNotification[] {
  return Array.from(new Set(linkedUserIds))
    .filter((id): id is string => !!id && id !== actorUserId)
    .map((userId) => ({
      userId,
      type: NotificationType.ADDED_TO_GROUP,
      data: {},
    }))
}

// Saves planned notifications. Never throws: a notification problem must not
// fail the change that caused it.
export async function saveNotifications(
  planned: PlannedNotification[],
  context: { groupId: string; expenseId?: string; actor: Actor },
) {
  if (planned.length === 0) return
  try {
    await prisma.notification.createMany({
      data: planned.map(({ userId, type, data }) => ({
        userId,
        type,
        groupId: context.groupId,
        expenseId: context.expenseId,
        actorName: context.actor.displayName,
        data: data as Prisma.InputJsonObject,
      })),
    })
  } catch (error) {
    console.error('Could not save notifications', error)
  }
}

export async function getGroupParticipants(groupId: string) {
  return prisma.participant.findMany({
    where: { groupId },
    select: { id: true, name: true, userId: true },
  })
}

type DescribableNotification = {
  type: NotificationType
  actorName: string
  data: unknown
  groupId: string
  // The recipient: friend sets are described relative to them
  userId?: string
  group: Pick<Group, 'name' | 'currency' | 'currencyCode'> & {
    kind?: GroupKind
    participants?: { name: string; userId: string | null }[]
  }
}

// Friend sets: the members other than the recipient ("Alex", "Alex & Sam")
export function otherSetMembers(notification: DescribableNotification) {
  return (notification.group.participants ?? [])
    .filter((p) => !notification.userId || p.userId !== notification.userId)
    .map((p) => p.name)
}

// Where it happened: " in Cabin" for groups. For friend sets, nothing for a
// pair (it's just the two of you) or " with Sam" for the other people in a
// larger set, besides the one who made the change.
function place(notification: DescribableNotification, withOthers: boolean) {
  if (notification.group.kind !== GroupKind.FRIEND_SET)
    return ` in ${notification.group.name}`
  if (!withOthers) return ''
  const others = otherSetMembers(notification).filter(
    (name) => name !== notification.actorName,
  )
  const members = otherSetMembers(notification)
  return members.length > 1 && others.length > 0
    ? ` with ${listNames(others)}`
    : ''
}

// The notification as a sentence, e.g. "Sam paid you $50.00 in Cabin".
// Shared by the in-app list and the email summary.
export function describeNotification(notification: DescribableNotification) {
  const data = (notification.data ?? {}) as NotificationData
  const currency: Currency = getCurrencyFromGroup(notification.group)
  const money = (amount = 0) => formatCurrency(currency, amount, 'en-US')
  const actor = notification.actorName
  const where = place(notification, true)
  const title = `“${data.title ?? 'an expense'}”`
  const yourShare =
    data.share && data.share > 0 ? ` · your share ${money(data.share)}` : ''

  switch (notification.type) {
    case NotificationType.PAYMENT_RECEIVED:
      // A payment is between two people: no "with …" in friend sets
      return `${data.payerName} paid you ${money(data.amount)}${place(
        notification,
        false,
      )}${data.recordedByOther ? ` (recorded by ${actor})` : ''}`
    case NotificationType.ADDED_TO_GROUP:
      return `${actor} added you to ${notification.group.name}`
    case NotificationType.EXPENSE_ADDED:
      return `${actor} added ${title} (${money(
        data.amount,
      )})${where}${yourShare}${data.paidByYou ? ' · paid by you' : ''}`
    case NotificationType.EXPENSE_CHANGED:
      if (data.removed) return `${actor} removed you from ${title}${where}`
      if (data.oldAmount !== undefined)
        return `${actor} changed ${title}${where}: ${money(
          data.oldAmount,
        )} → ${money(data.amount)}${yourShare}`
      return `${actor} changed how ${title} is split${where}${yourShare}`
    case NotificationType.EXPENSE_DELETED:
      return `${actor} deleted ${title} (${money(data.amount)})${where}`
  }
}

// Where the notification leads in the app.
export function notificationPath(notification: {
  type: NotificationType
  groupId: string
}) {
  const base = `/groups/${notification.groupId}`
  switch (notification.type) {
    case NotificationType.PAYMENT_RECEIVED:
      return `${base}/balances`
    case NotificationType.ADDED_TO_GROUP:
      return base
    default:
      return `${base}/expenses`
  }
}
