import { EditGroup } from '@/app/groups/[groupId]/edit/edit-group'
import { requireSession } from '@/lib/auth'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Settings',
}

export default async function EditGroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params
  await requireSession(`/groups/${groupId}/edit`)
  return <EditGroup />
}
