import { createExpense } from '@/lib/api'
import { expenseFormSchema } from '@/lib/schemas'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'

export const createGroupExpenseProcedure = baseProcedure
  .input(
    z.object({
      groupId: z.string().min(1),
      expenseFormValues: expenseFormSchema,
      participantId: z.string().optional(),
    }),
  )
  .mutation(
    async ({ input: { groupId, expenseFormValues, participantId }, ctx }) => {
      if (!ctx.session?.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }
      const expense = await createExpense(
        expenseFormValues,
        groupId,
        participantId,
      )
      return { expenseId: expense.id }
    },
  )
