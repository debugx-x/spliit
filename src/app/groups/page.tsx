import { RecentGroupList } from '@/app/groups/recent-group-list'
import { requireSession } from '@/lib/auth'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My groups',
}

export default async function GroupsPage() {
  await requireSession('/groups')
  return <RecentGroupList />
}
