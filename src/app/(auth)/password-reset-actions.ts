'use server'

import { createSession } from '@/lib/auth'
import { getClientIp } from '@/lib/client-ip'
import { isEmailConfigured } from '@/lib/email'
import { env } from '@/lib/env'
import {
  formatRetryAfter,
  getLoginRetryAfter,
  recordLoginFailure,
  resetRequestKeys,
} from '@/lib/login-rate-limit'
import {
  requestPasswordReset,
  resetPasswordWithToken,
} from '@/lib/password-reset'
import { passwordSchema } from '@/lib/schemas'
import { hash } from 'bcryptjs'
import { redirect } from 'next/navigation'

export async function forgotPasswordAction(prevState: any, formData: FormData) {
  const identifier = String(formData.get('identifier') ?? '').trim()
  if (!identifier) {
    return { error: 'Enter your email or Unique ID.', identifier }
  }
  if (!isEmailConfigured()) {
    return {
      error:
        "Password reset by email isn't set up on this site yet. Ask the person who runs it for help.",
      identifier,
    }
  }
  const limitKeys = resetRequestKeys(await getClientIp())
  const retryAfter = await getLoginRetryAfter(limitKeys)
  if (retryAfter > 0) {
    return {
      error: `Too many reset requests. ${formatRetryAfter(retryAfter)}`,
      identifier,
    }
  }
  await recordLoginFailure(limitKeys)
  try {
    await requestPasswordReset(identifier, env.NEXT_PUBLIC_BASE_URL)
  } catch (error) {
    // Same answer either way: don't reveal whether the account exists
    console.error('Could not send password reset email', error)
  }
  return { sent: true as const }
}

export async function resetPasswordAction(prevState: any, formData: FormData) {
  const token = String(formData.get('token') ?? '')
  const parsed = passwordSchema.safeParse(formData.get('password'))
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }
  const user = await resetPasswordWithToken(token, await hash(parsed.data, 10))
  if (!user) {
    return {
      error:
        'This reset link is invalid, expired or already used. Request a new one.',
    }
  }
  await createSession({
    userId: user.id,
    uniqueId: user.uniqueId,
    displayName: user.displayName,
  })
  redirect('/groups')
}
