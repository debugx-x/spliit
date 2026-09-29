import { requireSession } from '@/lib/auth'
import { Metadata } from 'next'
import { FriendsList } from './friends-list'

export const metadata: Metadata = {
  title: 'Friends',
}

export default async function FriendsPage() {
  await requireSession('/friends')
  return <FriendsList />
}
