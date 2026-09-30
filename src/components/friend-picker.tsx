'use client'

import { Avatar } from '@/components/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { trpc } from '@/trpc/client'
import { Loader2, UserPlus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useUserSearch } from './use-user-search'

export type PickableFriend = {
  userId: string
  displayName: string
  uniqueId: string | null
}

// Opens (creating it on first use) the hidden group for expenses with these
// friends outside groups, then its new-expense form.
export function useAddExpenseWithFriends() {
  const router = useRouter()
  const { mutateAsync, isPending, error } = trpc.friends.openSet.useMutation()
  return {
    isPending,
    error: error?.message ?? null,
    open: async (friendUserIds: string[]) => {
      const { groupId } = await mutateAsync({ friendUserIds })
      router.push(`/groups/${groupId}/expenses/create`)
    },
  }
}

// Pick one or more friends (or anyone with an account, by name or Unique ID)
// to add an expense with, outside groups.
export function FriendPicker({ friends }: { friends: PickableFriend[] }) {
  const t = useTranslations('FriendPicker')
  const [query, setQuery] = useState('')
  const { results, loading } = useUserSearch(query)
  const [found, setFound] = useState<PickableFriend[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const { open, isPending, error } = useAddExpenseWithFriends()

  const listed = [
    ...friends,
    ...found.filter((f) => !friends.some((g) => g.userId === f.userId)),
  ]
  const toggle = (userId: string) =>
    setSelected((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    )
  const searchResults = results?.filter(
    (user) => !listed.some((f) => f.userId === user.id),
  )

  return (
    <div className="flex flex-col gap-4">
      <Input
        className="text-base"
        placeholder={t('searchPlaceholder')}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {loading && (
        <p className="text-sm">
          <Loader2 className="w-4 h-4 mr-2 inline animate-spin" />
          {t('searching')}
        </p>
      )}
      {!loading && searchResults && (
        <ul className="flex flex-col gap-1">
          {searchResults.length === 0 && (
            <li className="text-sm text-muted-foreground">{t('noResults')}</li>
          )}
          {searchResults.map((user) => (
            <li key={user.id}>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start h-auto py-2"
                onClick={() => {
                  setFound((current) => [
                    ...current,
                    {
                      userId: user.id,
                      displayName: user.displayName,
                      uniqueId: user.uniqueId,
                    },
                  ])
                  setSelected((current) => [...current, user.id])
                  setQuery('')
                }}
              >
                <span className="truncate">{user.displayName}</span>
                <span className="ml-2 text-muted-foreground truncate">
                  @{user.uniqueId}
                </span>
              </Button>
            </li>
          ))}
        </ul>
      )}

      {listed.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('noFriends')}</p>
      ) : (
        <ul className="flex flex-col gap-1 max-h-64 overflow-y-auto">
          {listed.map((friend) => (
            <li key={friend.userId}>
              <label className="flex items-center gap-3 rounded-xl px-2 py-2 min-h-12 text-sm cursor-pointer hover:bg-accent">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={selected.includes(friend.userId)}
                  onChange={() => toggle(friend.userId)}
                />
                <Avatar name={friend.displayName} size="sm" />
                <span className="truncate">{friend.displayName}</span>
                {friend.uniqueId && (
                  <span className="text-muted-foreground truncate">
                    @{friend.uniqueId}
                  </span>
                )}
              </label>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        type="button"
        disabled={selected.length === 0 || isPending}
        onClick={() => open(selected).catch(() => {})}
      >
        {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {selected.length === 0
          ? t('pickFriends')
          : t('continue', { count: selected.length })}
      </Button>
    </div>
  )
}

// A button opening the friend picker in a dialog
export function AddExpenseWithFriendsButton({
  friends,
  variant = 'default',
}: {
  friends: PickableFriend[]
  variant?: 'default' | 'secondary'
}) {
  const t = useTranslations('FriendPicker')
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={variant}>
          <UserPlus className="w-4 h-4 mr-2" />
          {t('button')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <FriendPicker friends={friends} />
      </DialogContent>
    </Dialog>
  )
}
