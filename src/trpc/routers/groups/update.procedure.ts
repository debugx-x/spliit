import { updateGroup } from '@/lib/api'
import { groupFormSchema } from '@/lib/schemas'
import { baseProcedure } from '@/trpc/init'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

export const updateGroupProcedure = baseProcedure
  .input(
    z.object({
      groupId: z.string().min(1),
      groupFormValues: groupFormSchema,
      participantId: z.string().optional(),
    }),
  )
  .mutation(
    async ({ input: { groupId, groupFormValues, participantId }, ctx }) => {
      if (!ctx.session?.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }
      await updateGroup(groupId, groupFormValues, participantId)
    },
  )
