import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'

// A user is a member of a group if they created it or if one of its
// participants is linked to their account. Everyone else, including users
// who have the group's link, must join first (claim a participant or add
// themselves).

export type Membership = {
  isMember: boolean
  isCreator: boolean
  // The participant linked to the user in this group, if any
  participantId: string | null
}

export class MembershipError extends Error {
  constructor(
    public code: 'NOT_FOUND' | 'CONFLICT',
    message: string,
  ) {
    super(message)
  }
}

// Decides which *new* participants of a group get linked to an account:
// - a requested account (a friend added by Unique ID) if that user exists,
//   isn't already linked in the group and isn't requested twice;
// - otherwise, when creating a group, the creator's own participant (the
//   one carrying their display name).
// Anyone else becomes a plain name and can link themselves by joining.
export function assignParticipantLinks<
  P extends { name: string; userId?: string | null },
>(
  participants: P[],
  options: {
    validUserIds: Set<string>
    alreadyLinkedUserIds?: Iterable<string>
    creatorId?: string
    creatorDisplayName?: string
  },
): (Omit<P, 'userId'> & { userId?: string })[] {
  const linked = new Set(options.alreadyLinkedUserIds)
  const result = participants.map(({ userId, ...participant }) => {
    if (userId && options.validUserIds.has(userId) && !linked.has(userId)) {
      linked.add(userId)
      return { ...participant, userId }
    }
    return participant
  })

  const { creatorId, creatorDisplayName } = options
  if (creatorId && !linked.has(creatorId)) {
    const own = result.find(
      (p) => !('userId' in p) && p.name === creatorDisplayName,
    )
    if (own) Object.assign(own, { userId: creatorId })
  }
  return result
}

// Returns null when the group doesn't exist.
export async function getMembership(
  groupId: string,
  userId: string,
): Promise<Membership | null> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      creatorId: true,
      participants: { where: { userId }, select: { id: true } },
    },
  })
  if (!group) return null
  const isCreator = group.creatorId === userId
  const participantId = group.participants[0]?.id ?? null
  return { isMember: isCreator || !!participantId, isCreator, participantId }
}

// What a logged-in user may see before joining: the group name and the
// participants nobody has claimed yet.
export async function getJoinPreview(groupId: string, userId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      name: true,
      creatorId: true,
      participants: {
        select: { id: true, name: true, userId: true },
        orderBy: { name: 'asc' },
      },
    },
  })
  if (!group) return null
  const linked = group.participants.find((p) => p.userId === userId)
  return {
    name: group.name,
    alreadyMember: group.creatorId === userId || !!linked,
    hasParticipant: !!linked,
    unclaimedParticipants: group.participants
      .filter((p) => p.userId === null)
      .map(({ id, name }) => ({ id, name })),
  }
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === 'P2002'
  )
}

// Links an unclaimed participant to the user. Fails if the participant was
// claimed meanwhile, or if the user is already linked in this group.
export async function claimParticipant(
  groupId: string,
  participantId: string,
  userId: string,
) {
  try {
    const { count } = await prisma.participant.updateMany({
      where: { id: participantId, groupId, userId: null },
      data: { userId },
    })
    if (count === 0) {
      const exists = await prisma.participant.findFirst({
        where: { id: participantId, groupId },
        select: { id: true },
      })
      if (!exists)
        throw new MembershipError('NOT_FOUND', 'Participant not found.')
      throw new MembershipError(
        'CONFLICT',
        'Someone already joined as this participant.',
      )
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new MembershipError('CONFLICT', 'You already joined this group.')
    }
    throw error
  }
  return { participantId }
}

// Adds the user to the group as a new participant named after them
// ("Name (2)" etc. if that name is taken). Returns the existing participant
// if the user is already linked.
export async function addSelfAsParticipant(
  groupId: string,
  user: { id: string; displayName: string },
) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      participants: { select: { id: true, name: true, userId: true } },
    },
  })
  if (!group) throw new MembershipError('NOT_FOUND', 'Group not found.')

  const existing = group.participants.find((p) => p.userId === user.id)
  if (existing) return { participantId: existing.id }

  const taken = new Set(group.participants.map((p) => p.name))
  const base = user.displayName.slice(0, 44)
  let name = base
  for (let i = 2; taken.has(name); i++) name = `${base} (${i})`

  try {
    const participant = await prisma.participant.create({
      data: { id: nanoid(), name, groupId, userId: user.id },
      select: { id: true },
    })
    return { participantId: participant.id }
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new MembershipError('CONFLICT', 'You already joined this group.')
    }
    throw error
  }
}

// Groups the user belongs to, with their starred/archived preferences.
export async function listUserGroups(userId: string) {
  const groups = await prisma.group.findMany({
    where: {
      OR: [{ creatorId: userId }, { participants: { some: { userId } } }],
    },
    include: {
      _count: { select: { participants: true } },
      preferences: {
        where: { userId },
        select: { starred: true, archived: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
  return groups.map(({ preferences, ...group }) => ({
    ...group,
    createdAt: group.createdAt.toISOString(),
    starred: preferences[0]?.starred ?? false,
    archived: preferences[0]?.archived ?? false,
  }))
}

export async function setGroupPreference(
  userId: string,
  groupId: string,
  preference: { starred?: boolean; archived?: boolean },
) {
  await prisma.userGroupPreference.upsert({
    where: { userId_groupId: { userId, groupId } },
    create: { userId, groupId, ...preference },
    update: preference,
  })
}
