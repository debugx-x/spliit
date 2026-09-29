import { deleteExpense, getExpense } from '@/lib/api'
import { memberProcedure } from '@/trpc/init'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

export const deleteGroupExpenseProcedure = memberProcedure
  .input(
    z.object({
      expenseId: z.string().min(1),
      participantId: z.string().optional(),
    }),
  )
  .mutation(async ({ input: { expenseId, groupId, participantId } }) => {
    if (!(await getExpense(groupId, expenseId))) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Expense not found' })
    }
    await deleteExpense(groupId, expenseId, participantId)
    return {}
  })
