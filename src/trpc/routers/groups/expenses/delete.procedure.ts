import { deleteExpense } from '@/lib/api'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'

export const deleteGroupExpenseProcedure = baseProcedure
  .input(
    z.object({
      expenseId: z.string().min(1),
      groupId: z.string().min(1),
      participantId: z.string().optional(),
    }),
  )
  .mutation(async ({ input: { expenseId, groupId, participantId }, ctx }) => {
    if (!ctx.session?.userId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' })
    }
    await deleteExpense(groupId, expenseId, participantId)
    return {}
  })
