import { createGroup } from '@/lib/api'
import { groupFormSchema } from '@/lib/schemas'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'

export const createGroupProcedure = baseProcedure
  .input(
    z.object({
      groupFormValues: groupFormSchema,
    }),
  )
  .mutation(async ({ input: { groupFormValues }, ctx }) => {
    if (!ctx.session?.userId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' })
    }
    const creatorId = ctx.session.userId
    const creatorDisplayName = ctx.session.displayName
    const group = await createGroup(groupFormValues, creatorId, creatorDisplayName)
    return { groupId: group.id }
  })
