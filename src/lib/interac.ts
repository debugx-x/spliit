import { prisma } from '@/lib/prisma'

// The members of a group who can be paid by Interac e-Transfer: participants
// linked to an account that has an Interac email. Only the Interac email is
// ever returned, never the login email.
export async function getInteracPayees(groupId: string) {
  const participants = await prisma.participant.findMany({
    where: { groupId, user: { interacEmail: { not: null } } },
    select: {
      id: true,
      user: { select: { displayName: true, interacEmail: true } },
    },
  })
  return participants.flatMap(({ id, user }) =>
    user?.interacEmail
      ? [
          {
            participantId: id,
            displayName: user.displayName,
            interacEmail: user.interacEmail,
          },
        ]
      : [],
  )
}
