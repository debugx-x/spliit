'use server'

import { createSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { compare, hash } from 'bcryptjs'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const registerSchema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  uniqueId: z
    .string()
    .min(3, 'Unique ID must be at least 3 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Only alphanumeric and underscores allowed'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export async function registerAction(prevState: any, formData: FormData) {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData))

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0].message,
    }
  }

  const { displayName, uniqueId, email, password } = parsed.data

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ uniqueId }, { email }],
      },
    })

    if (existingUser) {
      if (existingUser.uniqueId === uniqueId) {
        return { error: 'Unique ID is already taken.' }
      }
      return { error: 'Email is already registered.' }
    }

    const passwordHash = await hash(password, 10)

    const user = await prisma.user.create({
      data: {
        displayName,
        uniqueId,
        email,
        passwordHash,
      },
    })

    await createSession({
      userId: user.id,
      uniqueId: user.uniqueId,
      displayName: user.displayName,
    })
  } catch (error) {
    console.log(error)
    return { error: 'Something went wrong. Please try again.' }
  }

  redirect('/groups') // Or wherever the dashboard is
}

const loginSchema = z.object({
  uniqueId: z.string().min(1, 'Unique ID or Email is required'),
  password: z.string().min(1, 'Password is required'),
})

export async function loginAction(prevState: any, formData: FormData) {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData))

  if (!parsed.success) {
    return { error: 'Invalid credentials' }
  }

  const { uniqueId, password } = parsed.data

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ uniqueId: uniqueId }, { email: uniqueId }],
      },
    })

    if (!user) {
      return { error: 'Invalid credentials' }
    }

    const passwordsMatch = await compare(password, user.passwordHash)

    if (!passwordsMatch) {
      return { error: 'Invalid credentials' }
    }

    await createSession({
      userId: user.id,
      uniqueId: user.uniqueId,
      displayName: user.displayName,
    })
  } catch (error) {
    console.log(error)

    return { error: 'Something went wrong. Please try again.' }
  }

  redirect('/groups')
}
