import { env } from '@/lib/env'
import { jwtVerify, SignJWT } from 'jose'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const key = new TextEncoder().encode(env.JWT_SECRET)

export type SessionPayload = {
  userId: string
  uniqueId: string
  displayName: string
}

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(key)
}

export async function decrypt(session: string | undefined = '') {
  try {
    const { payload } = await jwtVerify(session, key, {
      algorithms: ['HS256'],
    })
    return payload as SessionPayload
  } catch (error) {
    return null
  }
}

export async function createSession(payload: SessionPayload) {
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const session = await encrypt(payload)

  const cookieStore = await cookies()
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expires,
    sameSite: 'lax',
    path: '/',
  })
}

export async function getSession() {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')?.value
  if (!session) return null
  return await decrypt(session)
}

// Returns the session, or redirects to the login page (coming back to
// `next` afterwards) when the user isn't logged in.
export async function requireSession(next: string) {
  const session = await getSession()
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(next)}`)
  }
  return session
}

// Only allow same-origin relative paths as post-login redirect targets,
// so `?next=` can't be used to send users to another site.
export function safeRedirectPath(next: unknown, fallback = '/') {
  if (
    typeof next !== 'string' ||
    !next.startsWith('/') ||
    next.startsWith('//') ||
    next.startsWith('/\\')
  ) {
    return fallback
  }
  return next
}

export async function deleteSession() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
}
