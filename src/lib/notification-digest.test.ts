/**
 * @jest-environment node
 */
import {
  NOTIFICATION_RETENTION_MS,
  buildDigestEmail,
  sendNotificationDigests,
  wantsEmail,
} from './notification-digest'

const mockDb = {
  notification: {
    findMany: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
}
const mockSendEmail = jest.fn()
jest.mock('@/lib/prisma', () => ({
  get prisma() {
    return mockDb
  },
}))
jest.mock('@/lib/email', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}))

beforeEach(() => jest.resetAllMocks())

const cabin = { name: 'Cabin', currency: '$', currencyCode: 'CAD' }
const trip = { name: 'Road <trip>', currency: '$', currencyCode: 'CAD' }
const allOn = {
  notifyPayments: true,
  notifyAddedToGroup: true,
  notifyNewExpenses: true,
  notifyExpenseChanges: true,
}
const payment = {
  type: 'PAYMENT_RECEIVED' as const,
  actorName: 'Cy',
  data: { amount: 5000, payerName: 'Cy', recordedByOther: false },
  groupId: 'g1',
  group: cabin,
}
const added = {
  type: 'ADDED_TO_GROUP' as const,
  actorName: 'Alex',
  data: {},
  groupId: 'g2',
  group: trip,
}
const newExpense = {
  type: 'EXPENSE_ADDED' as const,
  actorName: 'Alex',
  data: { title: 'Groceries', amount: 9800, share: 2450 },
  groupId: 'g1',
  group: cabin,
}

describe('wantsEmail', () => {
  it('maps each type to its profile checkbox', () => {
    const noExpenses = { ...allOn, notifyNewExpenses: false }
    expect(wantsEmail(noExpenses, 'EXPENSE_ADDED')).toBe(false)
    expect(wantsEmail(noExpenses, 'PAYMENT_RECEIVED')).toBe(true)
    const noChanges = { ...allOn, notifyExpenseChanges: false }
    expect(wantsEmail(noChanges, 'EXPENSE_CHANGED')).toBe(false)
    expect(wantsEmail(noChanges, 'EXPENSE_DELETED')).toBe(false)
  })
})

describe('buildDigestEmail', () => {
  it('uses the sentence as the subject for a single update', () => {
    const email = buildDigestEmail('Bea', [payment], 'https://sk.app')
    expect(email.subject).toBe('Cy paid you CA$50.00 in Cabin')
  })

  it('groups several updates by group, with links, escaped HTML and the profile hint', () => {
    const email = buildDigestEmail(
      'Bea',
      [payment, added, newExpense],
      'https://sk.app',
    )
    expect(email.subject).toBe('Your Split Karega summary: 3 updates')
    // Cabin's two items stay together, before Road trip
    expect(email.text).toContain(
      'Cabin (https://sk.app/groups/g1)\n- Cy paid you CA$50.00 in Cabin\n- Alex added “Groceries” (CA$98.00) in Cabin · your share CA$24.50',
    )
    expect(email.text).toContain('Road <trip> (https://sk.app/groups/g2)')
    expect(email.text).toContain('https://sk.app/profile')
    expect(email.html).toContain('href="https://sk.app/groups/g1/balances"')
    expect(email.html).toContain('Road &lt;trip&gt;')
    expect(email.html).not.toContain('<trip>')
    expect(email.html).toContain('href="https://sk.app/notifications"')
    expect(email.html).not.toMatch(/unsubscribe/i)
  })
})

describe('buildDigestEmail for friend sets', () => {
  it('heads set sections "With <the others>"', () => {
    const item = {
      type: 'EXPENSE_ADDED' as const,
      actorName: 'Alex',
      data: { title: 'Taxi', amount: 9000, share: 3000 },
      groupId: 'g9',
      userId: 'uP',
      group: {
        name: 'Priya, Alex & Sam',
        currency: '$',
        currencyCode: 'CAD',
        kind: 'FRIEND_SET' as const,
        participants: [
          { name: 'Priya', userId: 'uP' },
          { name: 'Alex', userId: 'uA' },
          { name: 'Sam', userId: 'uS' },
        ],
      },
    }
    const email = buildDigestEmail('Priya', [item, item], 'https://sk.app')
    expect(email.text).toContain('With Alex & Sam (https://sk.app/groups/g9)')
    expect(email.html).toContain('With Alex &amp; Sam</a>')
    expect(email.text).not.toContain('Priya, Alex & Sam')
  })
})

describe('sendNotificationDigests', () => {
  const now = new Date('2026-10-01T13:00:00Z')
  const row = (id: string, userId: string, item: object, user: object) => ({
    id,
    userId,
    ...item,
    user: { email: `${userId}@x.io`, displayName: userId, ...allOn, ...user },
  })

  it('sends one email per user and marks only the sent or unwanted rows', async () => {
    mockDb.notification.findMany.mockResolvedValue([
      row('n1', 'bea', payment, { notifyNewExpenses: false }),
      row('n2', 'bea', newExpense, { notifyNewExpenses: false }),
      row('n3', 'bea', added, { notifyNewExpenses: false }),
      row('n4', 'dan', payment, {}),
    ])
    const result = await sendNotificationDigests('https://sk.app', now)

    expect(result).toEqual({ sent: 2, skipped: 1, failed: 0 })
    expect(mockSendEmail).toHaveBeenCalledTimes(2)
    const bea = mockSendEmail.mock.calls[0][0]
    expect(bea.to).toBe('bea@x.io')
    expect(bea.subject).toBe('Your Split Karega summary: 2 updates')
    expect(bea.text).not.toContain('Groceries')
    const marked = mockDb.notification.updateMany.mock.calls.map(
      (call) => call[0].where.id.in,
    )
    expect(marked).toEqual([['n2'], ['n1', 'n3'], ['n4']])
    expect(mockDb.notification.findMany.mock.calls[0][0].where).toEqual({
      emailedAt: null,
      createdAt: { lte: now },
    })
  })

  it('sends nothing to users who turned everything off, and still marks their rows', async () => {
    const off = {
      notifyPayments: false,
      notifyAddedToGroup: false,
      notifyNewExpenses: false,
      notifyExpenseChanges: false,
    }
    mockDb.notification.findMany.mockResolvedValue([
      row('n1', 'bea', payment, off),
    ])
    await expect(
      sendNotificationDigests('https://sk.app', now),
    ).resolves.toEqual({ sent: 0, skipped: 1, failed: 0 })
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('leaves rows pending when the email fails, and keeps going', async () => {
    mockDb.notification.findMany.mockResolvedValue([
      row('n1', 'bea', payment, {}),
      row('n2', 'dan', payment, {}),
    ])
    mockSendEmail.mockRejectedValueOnce(new Error('535 bad login'))
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const result = await sendNotificationDigests('https://sk.app', now)
    expect(result).toEqual({ sent: 1, skipped: 0, failed: 1 })
    expect(mockDb.notification.updateMany).toHaveBeenCalledTimes(1)
    expect(mockDb.notification.updateMany.mock.calls[0][0].where.id.in).toEqual(
      ['n2'],
    )
  })

  it('deletes notifications older than 60 days', async () => {
    mockDb.notification.findMany.mockResolvedValue([])
    await sendNotificationDigests('https://sk.app', now)
    expect(mockDb.notification.deleteMany).toHaveBeenCalledWith({
      where: {
        createdAt: { lt: new Date(now.getTime() - NOTIFICATION_RETENTION_MS) },
      },
    })
  })
})
