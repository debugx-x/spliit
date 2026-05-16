import { CreateGroup } from '@/app/groups/create/create-group'
import { Metadata } from 'next'
import { getSession } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Create Group',
}

export default async function CreateGroupPage() {
  const session = await getSession()
  return <CreateGroup session={session} />
}
