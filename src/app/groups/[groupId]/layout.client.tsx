'use client'

import { useToast } from '@/components/ui/use-toast'
import { trpc } from '@/trpc/client'
import { useTranslations } from 'next-intl'
import { PropsWithChildren, useEffect } from 'react'
import { CurrentGroupProvider } from './current-group-context'
import { GroupHeader } from './group-header'

export function GroupLayoutClient({
  groupId,
  participantId,
  children,
}: PropsWithChildren<{ groupId: string; participantId: string | null }>) {
  // The participant linked to the user's account is their "active user" in
  // this group. Set it before children read it on first render (idempotent).
  if (
    participantId &&
    typeof window !== 'undefined' &&
    localStorage.getItem(`${groupId}-activeUser`) !== participantId
  ) {
    localStorage.setItem(`${groupId}-activeUser`, participantId)
  }

  const { data, isLoading } = trpc.groups.get.useQuery({ groupId })
  const t = useTranslations('Groups.NotFound')
  const { toast } = useToast()

  useEffect(() => {
    if (data && !data.group) {
      toast({
        description: t('text'),
        variant: 'destructive',
      })
    }
  }, [data])

  const props =
    isLoading || !data?.group
      ? { isLoading: true as const, groupId, group: undefined, participantId }
      : {
          isLoading: false as const,
          groupId,
          group: data.group,
          participantId,
        }

  if (isLoading) {
    return (
      <CurrentGroupProvider {...props}>
        <GroupHeader />
        {children}
      </CurrentGroupProvider>
    )
  }

  return (
    <CurrentGroupProvider {...props}>
      <GroupHeader />
      {children}
    </CurrentGroupProvider>
  )
}
