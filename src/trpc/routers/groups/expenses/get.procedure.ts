import { getExpense } from '@/lib/api'
import { memberProcedure } from '@/trpc/init'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

export const getGroupExpenseProcedure = memberProcedure
  .input(z.object({ expenseId: z.string().min(1) }))
  .query(async ({ input: { groupId, expenseId } }) => {
    const expense = await getExpense(groupId, expenseId)
    if (!expense) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Expense not found',
      })
    }
    return { expense }
  })
