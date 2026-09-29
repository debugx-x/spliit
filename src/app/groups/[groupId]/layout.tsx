import { getSession } from '@/lib/auth'
import { getMembership } from '@/lib/membership'
import { prisma } from '@/lib/prisma'
import { Metadata } from 'next'
import { PropsWithChildren } from 'react'
import { JoinGroup } from './join-group'
import { GroupLayoutClient } from './layout.client'
import { RedirectToLogin } from './redirect-to-login'

type Props = {
  params: Promise<{
    groupId: string
  }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { groupId } = await params
  // Only members get the group's name in the page title
  const session = await getSession()
  const membership = session && (await getMembership(groupId, session.userId))
  const group = membership?.isMember
    ? await prisma.group.findUnique({
        where: { id: groupId },
        select: { name: true },
      })
    : null

  return {
    title: {
      default: group?.name ?? 'Group',
      template: `%s · ${group?.name ?? 'Group'} · Splitsville`,
    },
  }
}

export default async function GroupLayout({
  children,
  params,
}: PropsWithChildren<Props>) {
  const { groupId } = await params
  const session = await getSession()
  if (!session) return <RedirectToLogin />
  const membership = await getMembership(groupId, session.userId)

  // The group link is the invite: non-members can join by picking their
  // participant (or adding themselves). Unknown groups get the same screen,
  // which shows "not found", so group IDs can't be probed.
  if (!membership?.isMember) {
    return <JoinGroup groupId={groupId} displayName={session.displayName} />
  }

  return (
    <GroupLayoutClient
      groupId={groupId}
      participantId={membership.participantId}
    >
      {children}
    </GroupLayoutClient>
  )
}
