import { headers } from 'next/headers'

// The client's IP address, for rate limiting. On Vercel these headers are set
// by the platform (locally, Next.js sets x-forwarded-for to the loopback
// address). Without them, callers fall back to per-account limits only.
export async function getClientIp() {
  const requestHeaders = await headers()
  return (
    requestHeaders.get('x-real-ip') ??
    requestHeaders.get('x-forwarded-for')?.split(',')[0].trim() ??
    null
  )
}
