/**
 * @jest-environment node
 */
import {
  ExpenseSnapshot,
  describeNotification,
  notificationPath,
  planAddedToGroup,
  planExpenseCreated,
  planExpenseDeleted,
  planExpenseUpdated,
} from './notifications'

jest.mock('@/lib/prisma', () => ({ prisma: {} }))

// Alex (actor), Bea and Cy have accounts; Dan is a name only
const participants = [
  { id: 'pA', name: 'Alex', userId: 'uA' },
  { id: 'pB', name: 'Bea', userId: 'uB' },
  { id: 'pC', name: 'Cy', userId: 'uC' },
  { id: 'pD', name: 'Dan', userId: null },
]

const groceries: ExpenseSnapshot = {
  title: 'Groceries',
  amount: 9800,
  paidById: 'pA',
  splitMode: 'EVENLY',
  isReimbursement: false,
  paidFor: [
    { participantId: 'pA', shares: 1 },
    { participantId: 'pB', shares: 1 },
    { participantId: 'pD', shares: 1 },
    { participantId: 'pC', shares: 1 },
  ],
}

const group = { name: 'Cabin', currency: '$', currencyCode: 'CAD' }
const describe_ = (type: any, data: object, actorName = 'Alex') =>
  describeNotification({ type, data, actorName, groupId: 'g1', group })

describe('planExpenseCreated', () => {
  it('notifies linked people in the expense, never the actor or unlinked names', () => {
    const planned = planExpenseCreated(groceries, participants, 'uA')
    expect(planned.map((p) => p.userId)).toEqual(['uB', 'uC'])
    expect(planned[0]).toEqual({
      userId: 'uB',
      type: 'EXPENSE_ADDED',
      data: { title: 'Groceries', amount: 9800, share: 2450, paidByYou: false },
    })
  })

  it('includes the payer when someone else added the expense', () => {
    const planned = planExpenseCreated(
      {
        ...groceries,
        paidById: 'pB',
        paidFor: [{ participantId: 'pC', shares: 1 }],
      },
      participants,
      'uA',
    )
    expect(planned).toEqual([
      expect.objectContaining({
        userId: 'uB',
        data: expect.objectContaining({ share: 0, paidByYou: true }),
      }),
      expect.objectContaining({
        userId: 'uC',
        data: expect.objectContaining({ share: 9800, paidByYou: false }),
      }),
    ])
  })

  it('turns reimbursements into "paid you" for the recipient only', () => {
    const payment: ExpenseSnapshot = {
      title: 'Interac e-Transfer',
      amount: 5000,
      paidById: 'pC',
      splitMode: 'EVENLY',
      isReimbursement: true,
      paidFor: [{ participantId: 'pB', shares: 1 }],
    }
    // Recorded by the payer
    expect(planExpenseCreated(payment, participants, 'uC')).toEqual([
      {
        userId: 'uB',
        type: 'PAYMENT_RECEIVED',
        data: { amount: 5000, payerName: 'Cy', recordedByOther: false },
      },
    ])
    // Recorded by someone else
    expect(planExpenseCreated(payment, participants, 'uA')[0].data).toEqual({
      amount: 5000,
      payerName: 'Cy',
      recordedByOther: true,
    })
    // Recorded by the recipient ("Mark as paid" on money they got): nothing
    expect(planExpenseCreated(payment, participants, 'uB')).toEqual([])
  })
})

describe('planExpenseUpdated', () => {
  it('ignores changes that leave the split alone (title, notes, date...)', () => {
    expect(
      planExpenseUpdated(
        groceries,
        { ...groceries, title: 'Food' },
        participants,
        'uA',
      ),
    ).toEqual([])
  })

  it('reports amount changes with old and new amounts and the new share', () => {
    const planned = planExpenseUpdated(
      groceries,
      { ...groceries, amount: 11000 },
      participants,
      'uA',
    )
    expect(planned.map((p) => p.userId)).toEqual(['uB', 'uC'])
    expect(planned[0].data).toEqual({
      title: 'Groceries',
      amount: 11000,
      oldAmount: 9800,
      share: 2750,
    })
  })

  it('reports split-only changes and people removed from the expense', () => {
    const after = {
      ...groceries,
      paidFor: [
        { participantId: 'pA', shares: 1 },
        { participantId: 'pB', shares: 1 },
      ],
    }
    const planned = planExpenseUpdated(groceries, after, participants, 'uA')
    expect(planned).toEqual([
      expect.objectContaining({
        userId: 'uB',
        type: 'EXPENSE_CHANGED',
        data: { title: 'Groceries', amount: 9800, share: 4900 },
      }),
      expect.objectContaining({
        userId: 'uC',
        data: { title: 'Groceries', removed: true },
      }),
    ])
  })

  it('tells people newly added to an expense', () => {
    const before = {
      ...groceries,
      paidFor: [{ participantId: 'pA', shares: 1 }],
    }
    const planned = planExpenseUpdated(before, groceries, participants, 'uA')
    expect(planned.map((p) => p.userId)).toEqual(['uB', 'uC'])
    expect(planned[0].data).toMatchObject({ share: 2450 })
  })
})

describe('planExpenseDeleted and planAddedToGroup', () => {
  it('notifies the people who were in a deleted expense', () => {
    expect(planExpenseDeleted(groceries, participants, 'uB')).toEqual([
      {
        userId: 'uA',
        type: 'EXPENSE_DELETED',
        data: { title: 'Groceries', amount: 9800 },
      },
      {
        userId: 'uC',
        type: 'EXPENSE_DELETED',
        data: { title: 'Groceries', amount: 9800 },
      },
    ])
  })

  it('notifies newly linked friends once, not the actor', () => {
    expect(planAddedToGroup(['uB', null, 'uA', 'uB', undefined], 'uA')).toEqual(
      [{ userId: 'uB', type: 'ADDED_TO_GROUP', data: {} }],
    )
  })
})

describe('describeNotification', () => {
  it('writes each type as a sentence with the group currency', () => {
    expect(
      describe_('PAYMENT_RECEIVED', {
        amount: 5000,
        payerName: 'Cy',
        recordedByOther: false,
      }),
    ).toBe('Cy paid you CA$50.00 in Cabin')
    expect(
      describe_('PAYMENT_RECEIVED', {
        amount: 5000,
        payerName: 'Cy',
        recordedByOther: true,
      }),
    ).toBe('Cy paid you CA$50.00 in Cabin (recorded by Alex)')
    expect(describe_('ADDED_TO_GROUP', {})).toBe('Alex added you to Cabin')
    expect(
      describe_('EXPENSE_ADDED', {
        title: 'Groceries',
        amount: 9800,
        share: 2450,
        paidByYou: false,
      }),
    ).toBe('Alex added “Groceries” (CA$98.00) in Cabin · your share CA$24.50')
    expect(
      describe_('EXPENSE_ADDED', {
        title: 'Gas',
        amount: 4000,
        share: 0,
        paidByYou: true,
      }),
    ).toBe('Alex added “Gas” (CA$40.00) in Cabin · paid by you')
    expect(
      describe_('EXPENSE_CHANGED', {
        title: 'Groceries',
        amount: 11000,
        oldAmount: 9800,
        share: 2750,
      }),
    ).toBe(
      'Alex changed “Groceries” in Cabin: CA$98.00 → CA$110.00 · your share CA$27.50',
    )
    expect(
      describe_('EXPENSE_CHANGED', {
        title: 'Groceries',
        amount: 9800,
        share: 4900,
      }),
    ).toBe(
      'Alex changed how “Groceries” is split in Cabin · your share CA$49.00',
    )
    expect(
      describe_('EXPENSE_CHANGED', { title: 'Groceries', removed: true }),
    ).toBe('Alex removed you from “Groceries” in Cabin')
    expect(
      describe_('EXPENSE_DELETED', { title: 'Groceries', amount: 9800 }),
    ).toBe('Alex deleted “Groceries” (CA$98.00) in Cabin')
  })

  it('uses the symbol for groups without a currency code', () => {
    expect(
      describeNotification({
        type: 'EXPENSE_DELETED',
        data: { title: 'Pizza', amount: 1250 },
        actorName: 'Alex',
        groupId: 'g1',
        group: { name: 'Flat', currency: '₹', currencyCode: null },
      }),
    ).toContain('₹12.50')
  })
})

describe('notificationPath', () => {
  it('links payments to balances, groups to the group and expenses to the list', () => {
    expect(notificationPath({ type: 'PAYMENT_RECEIVED', groupId: 'g1' })).toBe(
      '/groups/g1/balances',
    )
    expect(notificationPath({ type: 'ADDED_TO_GROUP', groupId: 'g1' })).toBe(
      '/groups/g1',
    )
    expect(notificationPath({ type: 'EXPENSE_CHANGED', groupId: 'g1' })).toBe(
      '/groups/g1/expenses',
    )
  })
})
