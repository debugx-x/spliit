'use client'
import { AddGroupByUrlButton } from '@/app/groups/add-group-by-url-button'
import { Button } from '@/components/ui/button'
import { trpc } from '@/trpc/client'
import { AppRouterOutput } from '@/trpc/routers/_app'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { PropsWithChildren } from 'react'
import { RecentGroupListCard } from './recent-group-list-card'

type GroupListItem = AppRouterOutput['groups']['list']['groups'][number]

// The groups the logged-in user belongs to, with their starred/archived
// preferences (stored in their account, so they follow them across devices).
export function RecentGroupList() {
  const t = useTranslations('Groups')
  const { data, isLoading } = trpc.groups.list.useQuery()

  if (isLoading || !data) {
    return (
      <GroupsPage>
        <p>
          <Loader2 className="w-4 m-4 mr-2 inline animate-spin" />{' '}
          {t('loadingRecent')}
        </p>
      </GroupsPage>
    )
  }

  if (data.groups.length === 0) {
    return (
      <GroupsPage>
        <div className="text-sm space-y-2">
          <p>{t('NoRecent.description')}</p>
          <p>
            <Button variant="link" asChild className="-m-4">
              <Link href={`/groups/create`}>{t('NoRecent.create')}</Link>
            </Button>{' '}
            {t('NoRecent.orAsk')}
          </p>
        </div>
      </GroupsPage>
    )
  }

  const starred = data.groups.filter((group) => group.starred)
  const active = data.groups.filter((g) => !g.starred && !g.archived)
  const archived = data.groups.filter((g) => !g.starred && g.archived)

  return (
    <GroupsPage>
      {starred.length > 0 && (
        <>
          <h2 className="mb-2">{t('starred')}</h2>
          <GroupList groups={starred} />
        </>
      )}

      {active.length > 0 && (
        <>
          <h2 className="mt-6 mb-2">{t('recent')}</h2>
          <GroupList groups={active} />
        </>
      )}

      {archived.length > 0 && (
        <>
          <h2 className="mt-6 mb-2 opacity-50">{t('archived')}</h2>
          <div className="opacity-50">
            <GroupList groups={archived} />
          </div>
        </>
      )}
    </GroupsPage>
  )
}

function GroupList({ groups }: { groups: GroupListItem[] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {groups.map((group) => (
        <RecentGroupListCard key={group.id} group={group} />
      ))}
    </ul>
  )
}

function GroupsPage({ children }: PropsWithChildren) {
  const t = useTranslations('Groups')
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h1 className="font-bold text-2xl flex-1">
          <Link href="/groups">{t('myGroups')}</Link>
        </h1>
        <div className="flex gap-2">
          <AddGroupByUrlButton />
          <Button asChild>
            <Link href="/groups/create">{t('create')}</Link>
          </Button>
        </div>
      </div>
      <div>{children}</div>
    </>
  )
}
