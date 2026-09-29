import { updateGroup } from '@/lib/api'
import { groupFormSchema } from '@/lib/schemas'
import { memberProcedure } from '@/trpc/init'
import { z } from 'zod'

export const updateGroupProcedure = memberProcedure
  .input(
    z.object({
      groupFormValues: groupFormSchema,
      participantId: z.string().optional(),
    }),
  )
  .mutation(async ({ input: { groupId, groupFormValues, participantId } }) => {
    await updateGroup(groupId, groupFormValues, participantId)
  })
