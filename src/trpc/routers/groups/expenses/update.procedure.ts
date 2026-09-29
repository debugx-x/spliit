import { getExpense, updateExpense } from '@/lib/api'
import { expenseFormSchema } from '@/lib/schemas'
import { memberProcedure } from '@/trpc/init'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

export const updateGroupExpenseProcedure = memberProcedure
  .input(
    z.object({
      expenseId: z.string().min(1),
      expenseFormValues: expenseFormSchema,
      participantId: z.string().optional(),
    }),
  )
  .mutation(
    async ({
      input: { expenseId, groupId, expenseFormValues, participantId },
    }) => {
      if (!(await getExpense(groupId, expenseId))) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Expense not found' })
      }
      const expense = await updateExpense(
        groupId,
        expenseId,
        expenseFormValues,
        participantId,
      )
      return { expenseId: expense.id }
    },
  )
