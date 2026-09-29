'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

// Layouts don't know the full URL, so logged-out visitors of any group page
// are sent to the login page from the client, keeping the page they asked for.
export function RedirectToLogin() {
  const router = useRouter()
  useEffect(() => {
    const next = window.location.pathname + window.location.search
    router.replace(`/login?next=${encodeURIComponent(next)}`)
  }, [router])
  return null
}
