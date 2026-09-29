'use server'

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function searchUsersAction(query: string) {
  const session = await getSession()
  if (!session) return []

  if (!query || query.length < 2) return []

  return prisma.user.findMany({
    where: {
      id: { not: session.userId },
      OR: [
        { uniqueId: { contains: query, mode: 'insensitive' } },
        { displayName: { contains: query, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      uniqueId: true,
      displayName: true,
    },
    take: 10,
  })
}
