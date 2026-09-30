import { getFriendBalances } from '@/lib/friend-balances'
import { FriendSetError, getOrCreateFriendSet } from '@/lib/friend-sets'
import { authedProcedure, createTRPCRouter } from '@/trpc/init'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

export const friendsRouter = createTRPCRouter({
  // What each friend owes you (or you owe them) across your groups
  list: authedProcedure.query(({ ctx }) =>
    getFriendBalances(ctx.session.userId),
  ),

  // The hidden group for expenses with these friends outside groups,
  // created on first use
  openSet: authedProcedure
    .input(
      z.object({ friendUserIds: z.array(z.string().min(1)).min(1).max(20) }),
    )
    .mutation(async ({ input: { friendUserIds }, ctx }) => {
      try {
        return await getOrCreateFriendSet(ctx.session.userId, friendUserIds)
      } catch (error) {
        if (error instanceof FriendSetError) {
          throw new TRPCError({ code: error.code, message: error.message })
        }
        throw error
      }
    }),
})
