'use client'

import { searchUsersAction } from '@/app/actions/users'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Loader2, UserPlus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { useDebounce } from 'use-debounce'

type FoundUser = Awaited<ReturnType<typeof searchUsersAction>>[number]

// Adds a registered friend to the group's participants, linked to their
// account, so the group shows up in their "My groups" without the link.
export function AddFriendButton({
  excludedUserIds,
  onAdd,
}: {
  excludedUserIds: string[]
  onAdd: (user: FoundUser) => void
}) {
  const t = useTranslations('GroupForm.Participants')
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery] = useDebounce(query.trim(), 300)
  const [results, setResults] = useState<FoundUser[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults(null)
      return
    }
    let cancelled = false
    setLoading(true)
    searchUsersAction(debouncedQuery)
      .then((users) => !cancelled && setResults(users))
      .catch(() => !cancelled && setResults([]))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [debouncedQuery])

  const visible = results?.filter((u) => !excludedUserIds.includes(u.id))

  return (
    <Popover
      open={open}
      onOpenChange={(value) => {
        setOpen(value)
        if (!value) {
          setQuery('')
          setResults(null)
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="secondary" type="button">
          <UserPlus className="w-4 h-4 mr-2" />
          {t('addFriend')}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          {t('addFriendDescription')}
        </p>
        <Input
          autoFocus
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
        {!loading && visible && visible.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('noResults')}</p>
        )}
        {!loading && visible && visible.length > 0 && (
          <ul className="flex flex-col gap-1">
            {visible.map((user) => (
              <li key={user.id}>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-start h-auto py-2"
                  onClick={() => {
                    onAdd(user)
                    setOpen(false)
                    setQuery('')
                    setResults(null)
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
      </PopoverContent>
    </Popover>
  )
}
