import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { trpc } from '@/trpc/client'
import { AppRouterOutput } from '@/trpc/routers/_app'
import { StarFilledIcon } from '@radix-ui/react-icons'
import { Calendar, MoreHorizontal, Star, Users } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export function RecentGroupListCard({
  group,
}: {
  group: AppRouterOutput['groups']['list']['groups'][number]
}) {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('Groups')
  const utils = trpc.useUtils()
  const { mutate: setPreference } = trpc.groups.setPreference.useMutation({
    onSettled: () => utils.groups.list.invalidate(),
  })
  const isStarred = group.starred
  const isArchived = group.archived
  const groupDetail = group

  return (
    <li key={group.id}>
      <div
        className="h-full w-full p-4 rounded-2xl border border-border/70 bg-card shadow-[0_6px_20px_-8px_rgba(80,55,10,0.15)] dark:border-border dark:shadow-none hover:bg-accent transition-colors cursor-pointer"
        onClick={() => router.push(`/groups/${group.id}`)}
      >
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </span>
          <div className="min-w-0 flex-1 flex flex-col gap-1">
            <div className="text-base flex gap-2 justify-between">
              <Link
                href={`/groups/${group.id}`}
                className="flex-1 overflow-hidden text-ellipsis font-bold"
              >
                {group.name}
              </Link>
              <span className="flex-shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="-my-3 -ml-3 -mr-1.5"
                  onClick={(event) => {
                    event.stopPropagation()
                    setPreference(
                      isStarred
                        ? { groupId: group.id, starred: false }
                        : { groupId: group.id, starred: true, archived: false },
                    )
                  }}
                >
                  {isStarred ? (
                    <StarFilledIcon className="w-4 h-4 text-marigold" />
                  ) : (
                    <Star className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="-my-3 -mr-3 -ml-1.5"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(event) => {
                        event.stopPropagation()
                        setPreference(
                          isArchived
                            ? { groupId: group.id, archived: false }
                            : {
                                groupId: group.id,
                                archived: true,
                                starred: false,
                              },
                        )
                      }}
                    >
                      {t(isArchived ? 'unarchive' : 'archive')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </span>
            </div>
            <div className="text-muted-foreground font-normal text-xs">
              {groupDetail ? (
                <div className="w-full flex items-center justify-between">
                  <div className="flex items-center">
                    <Users className="w-3 h-3 inline mr-1" />
                    <span>{groupDetail._count.participants}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-3 h-3 inline mx-1" />
                    <span>
                      {new Date(groupDetail.createdAt).toLocaleDateString(
                        locale,
                        {
                          dateStyle: 'medium',
                        },
                      )}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-6 rounded-full" />
                  <Skeleton className="h-4 w-24 rounded-full" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </li>
  )
}
