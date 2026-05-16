'use server'

import { prisma } from '@/lib/prisma'

export async function searchUsersAction(query: string) {
  if (!query || query.length < 2) return []

  return prisma.user.findMany({
    where: {
      OR: [
        { uniqueId: { contains: query } },
        { displayName: { contains: query } }
      ]
    },
    select: {
      id: true,
      uniqueId: true,
      displayName: true
    },
    take: 10
  })
}
