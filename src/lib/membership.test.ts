/**
 * @jest-environment node
 */
import { Prisma } from '@prisma/client'
import {
  MembershipError,
  addSelfAsParticipant,
  assignParticipantLinks,
  claimParticipant,
  getJoinPreview,
  getMembership,
  listUserGroups,
} from './membership'

describe('assignParticipantLinks', () => {
  const validUserIds = new Set(['amy', 'bob', 'creator'])

  it('links requested accounts that exist', () => {
    expect(
      assignParticipantLinks(
        [
          { name: 'Amy', userId: 'amy' },
          { name: 'Jack', userId: undefined },
        ],
        { validUserIds },
      ),
    ).toEqual([{ name: 'Amy', userId: 'amy' }, { name: 'Jack' }])
  })

  it('ignores unknown, duplicate and already linked accounts', () => {
    expect(
      assignParticipantLinks(
        [
          { name: 'Ghost', userId: 'nobody' },
          { name: 'Amy', userId: 'amy' },
          { name: 'Amy again', userId: 'amy' },
          { name: 'Bob', userId: 'bob' },
        ],
        { validUserIds, alreadyLinkedUserIds: ['bob'] },
      ),
    ).toEqual([
      { name: 'Ghost' },
      { name: 'Amy', userId: 'amy' },
      { name: 'Amy again' },
      { name: 'Bob' },
    ])
  })

  it("links the creator's own participant by display name, once", () => {
    expect(
      assignParticipantLinks(
        [{ name: 'Carla' }, { name: 'Carla' }, { name: 'Jack' }],
        { validUserIds, creatorId: 'creator', creatorDisplayName: 'Carla' },
      ),
    ).toEqual([
      { name: 'Carla', userId: 'creator' },
      { name: 'Carla' },
      { name: 'Jack' },
    ])
  })

  it('does not link the creator twice when they were added explicitly', () => {
    expect(
      assignParticipantLinks(
        [
          { name: 'Me', userId: 'creator' },
          { name: 'Carla', userId: null },
        ],
        { validUserIds, creatorId: 'creator', creatorDisplayName: 'Carla' },
      ),
    ).toEqual([{ name: 'Me', userId: 'creator' }, { name: 'Carla' }])
  })
})

const mockDb = {
  group: { findUnique: jest.fn(), findMany: jest.fn() },
  participant: {
    updateMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
}

jest.mock('@/lib/prisma', () => ({
  get prisma() {
    return mockDb
  },
}))
const db = mockDb
jest.mock('nanoid', () => ({ nanoid: () => 'new-participant' }))

const uniqueViolation = () =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  })

beforeEach(() => jest.resetAllMocks())

describe('getMembership', () => {
  it('returns null for an unknown group', async () => {
    db.group.findUnique.mockResolvedValue(null)
    expect(await getMembership('g', 'u')).toBeNull()
  })

  it('treats the creator as a member, even without a participant', async () => {
    db.group.findUnique.mockResolvedValue({ creatorId: 'u', participants: [] })
    expect(await getMembership('g', 'u')).toEqual({
      isMember: true,
      isCreator: true,
      participantId: null,
    })
  })

  it('treats a user linked to a participant as a member', async () => {
    db.group.findUnique.mockResolvedValue({
      creatorId: 'someone-else',
      participants: [{ id: 'p1' }],
    })
    expect(await getMembership('g', 'u')).toEqual({
      isMember: true,
      isCreator: false,
      participantId: 'p1',
    })
  })

  it('does not treat other users as members', async () => {
    db.group.findUnique.mockResolvedValue({
      creatorId: 'someone-else',
      participants: [],
    })
    expect(await getMembership('g', 'u')).toMatchObject({ isMember: false })
  })
})

describe('claimParticipant', () => {
  it('links an unclaimed participant, only if still unclaimed', async () => {
    db.participant.updateMany.mockResolvedValue({ count: 1 })
    await expect(claimParticipant('g', 'p1', 'u')).resolves.toEqual({
      participantId: 'p1',
    })
    expect(db.participant.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'p1',
        groupId: 'g',
        userId: null,
        group: { kind: 'GROUP' },
      },
      data: { userId: 'u' },
    })
  })

  it('reports a conflict when someone already claimed the participant', async () => {
    db.participant.updateMany.mockResolvedValue({ count: 0 })
    db.participant.findFirst.mockResolvedValue({ id: 'p1' })
    await expect(claimParticipant('g', 'p1', 'u')).rejects.toMatchObject({
      code: 'CONFLICT',
    })
  })

  it('reports not found for a participant of another group', async () => {
    db.participant.updateMany.mockResolvedValue({ count: 0 })
    db.participant.findFirst.mockResolvedValue(null)
    await expect(claimParticipant('g', 'p-other', 'u')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })

  it('reports a conflict when the user is already linked in the group', async () => {
    db.participant.updateMany.mockRejectedValue(uniqueViolation())
    const error = await claimParticipant('g', 'p2', 'u').catch((e) => e)
    expect(error).toBeInstanceOf(MembershipError)
    expect(error.code).toBe('CONFLICT')
  })
})

describe('addSelfAsParticipant', () => {
  it('returns the existing participant if the user is already linked', async () => {
    db.group.findUnique.mockResolvedValue({
      participants: [{ id: 'p1', name: 'Amy', userId: 'u' }],
    })
    await expect(
      addSelfAsParticipant('g', { id: 'u', displayName: 'Amy' }),
    ).resolves.toEqual({ participantId: 'p1' })
    expect(db.participant.create).not.toHaveBeenCalled()
  })

  it('adds the user under a free name', async () => {
    db.group.findUnique.mockResolvedValue({
      participants: [
        { id: 'p1', name: 'Amy', userId: null },
        { id: 'p2', name: 'Amy (2)', userId: 'other' },
      ],
    })
    db.participant.create.mockResolvedValue({ id: 'new-participant' })
    await addSelfAsParticipant('g', { id: 'u', displayName: 'Amy' })
    expect(db.participant.create).toHaveBeenCalledWith({
      data: {
        id: 'new-participant',
        name: 'Amy (3)',
        groupId: 'g',
        userId: 'u',
      },
      select: { id: true },
    })
  })

  it('reports not found for an unknown group', async () => {
    db.group.findUnique.mockResolvedValue(null)
    await expect(
      addSelfAsParticipant('g', { id: 'u', displayName: 'Amy' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('friend sets', () => {
  it('are not listed in My groups', async () => {
    db.group.findMany.mockResolvedValue([])
    await listUserGroups('u')
    expect(db.group.findMany.mock.calls[0][0].where.kind).toBe('GROUP')
  })

  it("can't be previewed or joined", async () => {
    db.group.findUnique.mockResolvedValue({
      name: 'Priya & Alex',
      kind: 'FRIEND_SET',
      creatorId: 'p',
      participants: [],
    })
    await expect(getJoinPreview('g', 'u')).resolves.toBeNull()
    db.group.findUnique.mockResolvedValue({
      kind: 'FRIEND_SET',
      participants: [],
    })
    await expect(
      addSelfAsParticipant('g', { id: 'u', displayName: 'Dev' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(db.participant.create).not.toHaveBeenCalled()
  })
})
