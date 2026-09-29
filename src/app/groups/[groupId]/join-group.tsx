'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { trpc } from '@/trpc/client'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

// Shown instead of the group to logged-in users who aren't members yet: they
// join by picking their participant, or by adding themselves.
export function JoinGroup({
  groupId,
  displayName,
}: {
  groupId: string
  displayName: string
}) {
  const t = useTranslations('Groups.Join')
  const router = useRouter()
  const utils = trpc.useUtils()
  const { data, error, isLoading } = trpc.groups.join.preview.useQuery(
    { groupId },
    { retry: false },
  )
  const [participantId, setParticipantId] = useState<string>()

  const onJoined = async () => {
    await utils.invalidate()
    router.refresh()
  }
  const claim = trpc.groups.join.claim.useMutation({ onSuccess: onJoined })
  const addSelf = trpc.groups.join.addSelf.useMutation({ onSuccess: onJoined })
  const pending = claim.isPending || addSelf.isPending
  const mutationError = claim.error ?? addSelf.error

  // Became a member in the meantime (e.g. in another tab)
  useEffect(() => {
    if (data?.alreadyMember) router.refresh()
  }, [data?.alreadyMember, router])

  if (isLoading) {
    return (
      <p className="p-4">
        <Loader2 className="w-4 mr-2 inline animate-spin" /> {t('loading')}
      </p>
    )
  }

  if (error || !data) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle>{t('notFoundTitle')}</CardTitle>
          <CardDescription>{t('notFoundDescription')}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild variant="secondary">
            <Link href="/groups">{t('backToGroups')}</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  const selected = data.unclaimedParticipants.find(
    (p) => p.id === participantId,
  )

  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>{t('title', { name: data.name })}</CardTitle>
        <CardDescription>
          {data.unclaimedParticipants.length > 0
            ? t('description')
            : t('descriptionNoParticipants')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.unclaimedParticipants.length > 0 && (
          <RadioGroup
            value={participantId}
            onValueChange={setParticipantId}
            disabled={pending}
          >
            {data.unclaimedParticipants.map((participant) => (
              <div key={participant.id} className="flex items-center gap-2">
                <RadioGroupItem
                  value={participant.id}
                  id={`join-${participant.id}`}
                />
                <Label htmlFor={`join-${participant.id}`}>
                  {participant.name}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}
        {mutationError && (
          <p className="text-sm text-destructive">{mutationError.message}</p>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-2">
        {data.unclaimedParticipants.length > 0 && (
          <Button
            disabled={!selected || pending}
            onClick={() =>
              selected && claim.mutate({ groupId, participantId: selected.id })
            }
          >
            {claim.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            {selected ? t('joinAs', { name: selected.name }) : t('pickName')}
          </Button>
        )}
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => addSelf.mutate({ groupId })}
        >
          {addSelf.isPending && (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          )}
          {t(data.unclaimedParticipants.length > 0 ? 'notListed' : 'addMe', {
            name: displayName,
          })}
        </Button>
      </CardFooter>
    </Card>
  )
}
