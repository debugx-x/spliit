'use client'

import { GroupTabs } from '@/app/groups/[groupId]/group-tabs'
import { ShareButton } from '@/app/groups/[groupId]/share-button'
import { Skeleton } from '@/components/ui/skeleton'
import { friendSetTitle } from '@/lib/friend-set-names'
import { UserRound, Users } from 'lucide-react'
import Link from 'next/link'
import { useCurrentGroup } from './current-group-context'

export const GroupHeader = () => {
  const { isLoading, groupId, group, participantId } = useCurrentGroup()
  const isFriendSet = group?.kind === 'FRIEND_SET'

  const title = !group
    ? ''
    : isFriendSet
    ? friendSetTitle(
        group.participants
          .filter((p) => p.id !== participantId)
          .map((p) => p.name),
      )
    : group.name
  const subtitle = group
    ? `${group.participants.map((p) => p.name).join(', ')} · ${
        group.currencyCode || group.currency
      }`
    : ''

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/groups/${groupId}`} className="flex items-center gap-4">
        <span className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
          {isFriendSet ? (
            <UserRound className="w-7 h-7" />
          ) : (
            <Users className="w-7 h-7" />
          )}
        </span>
        <span className="min-w-0 flex flex-col gap-0.5">
          <h1 className="font-extrabold text-2xl tracking-tight truncate">
            {isLoading ? (
              <Skeleton className="mt-1.5 mb-1.5 h-5 w-32" />
            ) : (
              title
            )}
          </h1>
          {!isLoading && (
            <span className="text-sm text-muted-foreground truncate">
              {subtitle}
            </span>
          )}
        </span>
      </Link>

      <div className="flex gap-2 justify-between items-center">
        <GroupTabs groupId={groupId} isFriendSet={isFriendSet} />
        {/* Friend sets can't be joined by link */}
        {group && !isFriendSet && <ShareButton group={group} />}
      </div>
    </div>
  )
}
