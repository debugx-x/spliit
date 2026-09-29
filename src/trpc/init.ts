import { getMembership } from '@/lib/membership'
import { Prisma } from '@prisma/client'
import { initTRPC, TRPCError } from '@trpc/server'
import { cache } from 'react'
import superjson from 'superjson'
import { z } from 'zod'

superjson.registerCustom<Prisma.Decimal, string>(
  {
    isApplicable: (v): v is Prisma.Decimal => Prisma.Decimal.isDecimal(v),
    serialize: (v) => v.toJSON(),
    deserialize: (v) => new Prisma.Decimal(v),
  },
  'decimal.js',
)

import { getSession } from '@/lib/auth'

export const createTRPCContext = cache(async () => {
  const session = await getSession()
  return { session }
})

// Avoid exporting the entire t-object
// since it's not very descriptive.
// For instance, the use of a t variable
// is common in i18n libraries.
const t = initTRPC.context<typeof createTRPCContext>().create({
  /**
   * @see https://trpc.io/docs/server/data-transformers
   */
  transformer: superjson,
})

// Base router and procedure helpers
export const createTRPCRouter = t.router
export const createCallerFactory = t.createCallerFactory
export const baseProcedure = t.procedure

// Requires a logged-in user.
export const authedProcedure = baseProcedure.use(({ ctx, next }) => {
  if (!ctx.session?.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({ ctx: { session: ctx.session } })
})

// Requires the logged-in user to be a member of `input.groupId`. Non-members
// get NOT_FOUND, so group IDs can't be probed. Procedures add their own
// fields with `.input(...)`; tRPC merges object inputs.
export const memberProcedure = authedProcedure
  .input(z.object({ groupId: z.string().min(1) }))
  .use(async ({ ctx, input, next }) => {
    const membership = await getMembership(input.groupId, ctx.session.userId)
    if (!membership?.isMember) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Group not found.' })
    }
    return next({ ctx: { membership } })
  })
