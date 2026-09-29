import { createGroup } from '@/lib/api'
import { groupFormSchema } from '@/lib/schemas'
import { authedProcedure } from '@/trpc/init'
import { z } from 'zod'

export const createGroupProcedure = authedProcedure
  .input(
    z.object({
      groupFormValues: groupFormSchema,
    }),
  )
  .mutation(async ({ input: { groupFormValues }, ctx }) => {
    const group = await createGroup(
      groupFormValues,
      ctx.session.userId,
      ctx.session.displayName,
    )
    return { groupId: group.id }
  })
