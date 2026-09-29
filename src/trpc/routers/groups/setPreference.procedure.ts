import { setGroupPreference } from '@/lib/membership'
import { memberProcedure } from '@/trpc/init'
import { z } from 'zod'

export const setGroupPreferenceProcedure = memberProcedure
  .input(
    z.object({
      starred: z.boolean().optional(),
      archived: z.boolean().optional(),
    }),
  )
  .mutation(async ({ input: { groupId, starred, archived }, ctx }) => {
    await setGroupPreference(ctx.session.userId, groupId, { starred, archived })
    return {}
  })
