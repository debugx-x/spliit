'use client'

import { pickableFriends } from '@/app/friends/friends-list'
import { FriendPicker } from '@/components/friend-picker'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { trpc } from '@/trpc/client'
import { ChevronRight, Loader2, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { ReactNode, useState } from 'react'

// "Add an expense": with friends outside groups, or in one of your groups.
// Used by the dashboard and the phone tab bar's + button. Its data loads
// when it opens (already cached on the dashboard).
export function AddExpenseDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const t = useTranslations('Dashboard')
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const setOpen = onOpenChange ?? setUncontrolledOpen
  const friends = trpc.friends.list.useQuery(undefined, { enabled: open })
  const groups = trpc.groups.list.useQuery(undefined, { enabled: open })
  const activeGroups = groups.data?.groups.filter((g) => !g.archived) ?? []

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('addExpense')}</DialogTitle>
          <DialogDescription>{t('addExpenseDescription')}</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="friends">
          <TabsList className="w-full">
            <TabsTrigger value="friends" className="flex-1">
              {t('withFriends')}
            </TabsTrigger>
            <TabsTrigger value="group" className="flex-1">
              {t('inAGroup')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="friends" className="pt-2">
            {friends.data ? (
              <FriendPicker friends={pickableFriends(friends.data.friends)} />
            ) : (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
          </TabsContent>
          <TabsContent value="group" className="pt-2">
            {!groups.data ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : activeGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('noGroups')}{' '}
                <Link href="/groups/create" className="underline">
                  {t('createGroup')}
                </Link>
              </p>
            ) : (
              <ul className="flex flex-col gap-1 max-h-72 overflow-y-auto">
                {activeGroups.map((group) => (
                  <li key={group.id}>
                    <Button
                      asChild
                      variant="ghost"
                      className="w-full justify-between rounded-xl h-12"
                    >
                      <Link
                        href={`/groups/${group.id}/expenses/create`}
                        onClick={() => setOpen(false)}
                      >
                        <span className="flex items-center gap-3 min-w-0">
                          <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Users className="w-4 h-4" />
                          </span>
                          <span className="truncate">{group.name}</span>
                        </span>
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
