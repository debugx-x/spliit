'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSession, createSession } from '@/lib/auth'

const profileSchema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  defaultCurrency: z.string().length(3, 'Currency must be a 3-letter code'),
})

export async function updateProfileAction(prevState: any, formData: FormData) {
  const session = await getSession()
  if (!session) {
    return { error: 'Not authenticated' }
  }

  const parsed = profileSchema.safeParse(Object.fromEntries(formData))

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { displayName, email, defaultCurrency } = parsed.data

  try {
    const existingEmailUser = await prisma.user.findFirst({
      where: {
        email,
        NOT: {
          id: session.userId,
        },
      },
    })

    if (existingEmailUser) {
      return { error: 'Email is already in use.' }
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: {
        displayName,
        email,
        defaultCurrency,
      },
    })

    await createSession({
      userId: updatedUser.id,
      uniqueId: updatedUser.uniqueId,
      displayName: updatedUser.displayName,
    })

    return { success: 'Profile updated successfully.', error: null }
  } catch (error) {
    return { error: 'Failed to update profile.', success: null }
  }
}

export async function logoutAction() {
  const { deleteSession } = await import('@/lib/auth')
  await deleteSession()
  const { redirect } = await import('next/navigation')
  redirect('/login')
}
