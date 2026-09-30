/**
 * @jest-environment node
 */
import { friendSetTitle, listNames } from './friend-set-names'
import {
  FriendSetError,
  MAX_FRIENDS_IN_SET,
  getOrCreateFriendSet,
  memberKey,
} from './friend-sets'

const mockDb = {
  group: { findUnique: jest.fn(), create: jest.fn() },
  user: { findMany: jest.fn() },
}
let mockIds = 0
jest.mock('nanoid', () => ({ nanoid: () => `id${++mockIds}` }))
jest.mock('@/lib/prisma', () => ({
  get prisma() {
    return mockDb
  },
}))

const users = [
  { id: 'u1', displayName: 'Priya', defaultCurrency: 'CAD' },
  { id: 'u2', displayName: 'Alex', defaultCurrency: 'USD' },
  { id: 'u3', displayName: 'Alex', defaultCurrency: 'EUR' },
]

beforeEach(() => {
  jest.resetAllMocks()
  mockDb.user.findMany.mockImplementation(({ where }) =>
    users.filter((u) => where.id.in.includes(u.id)),
  )
  mockDb.group.create.mockResolvedValue({ id: 'g-new' })
})

describe('names', () => {
  it('lists names Splitwise-style, relative to the viewer', () => {
    expect(listNames(['Alex'])).toBe('Alex')
    expect(listNames(['Alex', 'Sam'])).toBe('Alex & Sam')
    expect(listNames(['Priya', 'Alex', 'Sam'])).toBe('Priya, Alex & Sam')
    expect(friendSetTitle(['Alex'])).toBe('You & Alex')
    expect(friendSetTitle(['Alex', 'Sam'])).toBe('You, Alex & Sam')
  })
})

describe('memberKey', () => {
  it('is the same whatever the order, ignoring duplicates', () => {
    expect(memberKey(['u2', 'u1'])).toBe(memberKey(['u1', 'u2', 'u1']))
    expect(memberKey(['u1', 'u2'])).not.toBe(memberKey(['u1', 'u2', 'u3']))
  })
})

describe('getOrCreateFriendSet', () => {
  it('returns the existing set for the same people', async () => {
    mockDb.group.findUnique.mockResolvedValue({ id: 'g1' })
    await expect(getOrCreateFriendSet('u2', ['u1'])).resolves.toEqual({
      groupId: 'g1',
    })
    expect(mockDb.group.findUnique).toHaveBeenCalledWith({
      where: { memberKey: 'u1:u2' },
      select: { id: true },
    })
    expect(mockDb.group.create).not.toHaveBeenCalled()
  })

  it("creates a set with everyone linked, in the starter's currency", async () => {
    mockDb.group.findUnique.mockResolvedValue(null)
    await expect(
      getOrCreateFriendSet('u1', ['u2', 'u3', 'u1']),
    ).resolves.toEqual({ groupId: 'g-new' })
    const { data } = mockDb.group.create.mock.calls[0][0]
    expect(data).toMatchObject({
      kind: 'FRIEND_SET',
      memberKey: 'u1:u2:u3',
      name: 'Priya, Alex & Alex (2)',
      currency: 'CA$',
      currencyCode: 'CAD',
      creatorId: 'u1',
    })
    expect(
      data.participants.createMany.data.map((p: any) => [p.name, p.userId]),
    ).toEqual([
      ['Priya', 'u1'],
      ['Alex', 'u2'],
      ['Alex (2)', 'u3'],
    ])
  })

  it('returns the set someone else created at the same time', async () => {
    mockDb.group.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'g-theirs' })
    mockDb.group.create.mockRejectedValue(
      Object.assign(new Error('Unique constraint'), { code: 'P2002' }),
    )
    await expect(getOrCreateFriendSet('u1', ['u2'])).resolves.toEqual({
      groupId: 'g-theirs',
    })
  })

  it('refuses no friends, only yourself, unknown users or too many friends', async () => {
    mockDb.group.findUnique.mockResolvedValue(null)
    await expect(getOrCreateFriendSet('u1', [])).rejects.toThrow(FriendSetError)
    await expect(getOrCreateFriendSet('u1', ['u1'])).rejects.toThrow(
      'Pick at least one friend.',
    )
    await expect(getOrCreateFriendSet('u1', ['nobody'])).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
    const many = Array.from(
      { length: MAX_FRIENDS_IN_SET + 1 },
      (_, i) => `f${i}`,
    )
    await expect(getOrCreateFriendSet('u1', many)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    })
    expect(mockDb.group.create).not.toHaveBeenCalled()
  })
})
