import { env } from '@/lib/env'
import { sendNotificationDigests } from '@/lib/notification-digest'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Called once a day by Vercel Cron (see vercel.json), which sends
// "Authorization: Bearer <CRON_SECRET>". Without CRON_SECRET, only allowed in
// development, for testing.
export async function GET(request: Request) {
  if (!isAuthorized(request.headers.get('authorization'))) {
    return new Response('Unauthorized', { status: 401 })
  }
  const result = await sendNotificationDigests(env.NEXT_PUBLIC_BASE_URL)
  return Response.json(result)
}

function isAuthorized(authorization: string | null) {
  if (env.CRON_SECRET) return authorization === `Bearer ${env.CRON_SECRET}`
  return process.env.NODE_ENV !== 'production'
}
