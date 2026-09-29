import { createExpense } from '@/lib/api'
import { expenseFormSchema } from '@/lib/schemas'
import { memberProcedure } from '@/trpc/init'
import { z } from 'zod'

export const createGroupExpenseProcedure = memberProcedure
  .input(
    z.object({
      expenseFormValues: expenseFormSchema,
      participantId: z.string().optional(),
    }),
  )
  .mutation(
    async ({ input: { groupId, expenseFormValues, participantId } }) => {
      const expense = await createExpense(
        expenseFormValues,
        groupId,
        participantId,
      )
      return { expenseId: expense.id }
    },
  )
