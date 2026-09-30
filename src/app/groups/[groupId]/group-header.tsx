'use client'

import { GroupTabs } from '@/app/groups/[groupId]/group-tabs'
import { ShareButton } from '@/app/groups/[groupId]/share-button'
import { Skeleton } from '@/components/ui/skeleton'
import { friendSetTitle } from '@/lib/friend-set-names'
import Link from 'next/link'
import { useCurrentGroup } from './current-group-context'

export const GroupHeader = () => {
  const { isLoading, groupId, group, participantId } = useCurrentGroup()
  const isFriendSet = group?.kind === 'FRIEND_SET'

  return (
    <div className="flex flex-col justify-between gap-3">
      <h1 className="font-bold text-2xl">
        <Link href={`/groups/${groupId}`}>
          {isLoading ? (
            <Skeleton className="mt-1.5 mb-1.5 h-5 w-32" />
          ) : (
            <div className="flex">
              {isFriendSet
                ? friendSetTitle(
                    group.participants
                      .filter((p) => p.id !== participantId)
                      .map((p) => p.name),
                  )
                : group.name}
            </div>
          )}
        </Link>
      </h1>

      <div className="flex gap-2 justify-between">
        <GroupTabs groupId={groupId} isFriendSet={isFriendSet} />
        {/* Friend sets can't be joined by link */}
        {group && !isFriendSet && <ShareButton group={group} />}
      </div>
    </div>
  )
}
