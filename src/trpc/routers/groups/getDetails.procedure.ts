import { getGroup, getGroupExpensesParticipants } from '@/lib/api'
import { memberProcedure } from '@/trpc/init'
import { TRPCError } from '@trpc/server'

export const getGroupDetailsProcedure = memberProcedure.query(
  async ({ input: { groupId } }) => {
    const group = await getGroup(groupId)
    if (!group) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Group not found.',
      })
    }

    const participantsWithExpenses = await getGroupExpensesParticipants(groupId)
    return { group, participantsWithExpenses }
  },
)
