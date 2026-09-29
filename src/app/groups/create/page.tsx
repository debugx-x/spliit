import { CreateGroup } from '@/app/groups/create/create-group'
import { Metadata } from 'next'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = {
  title: 'Create Group',
}

export default async function CreateGroupPage() {
  const session = await requireSession('/groups/create')
  // The default currency isn't part of the session token, so read it from
  // the user's profile.
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { defaultCurrency: true },
  })
  return (
    <CreateGroup
      session={{ ...session, defaultCurrency: user?.defaultCurrency }}
    />
  )
}
