'use client'

import { searchUsersAction } from '@/app/actions/users'
import { useEffect, useState } from 'react'
import { useDebounce } from 'use-debounce'

export type FoundUser = Awaited<ReturnType<typeof searchUsersAction>>[number]

// Accounts matching a name or Unique ID (at least 2 characters), debounced.
// `results` is null until there's something to search for.
export function useUserSearch(query: string) {
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

  return { results, loading }
}
