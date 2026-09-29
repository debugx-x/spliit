import { getFriendBalances } from '@/lib/friend-balances'
import { authedProcedure, createTRPCRouter } from '@/trpc/init'

export const friendsRouter = createTRPCRouter({
  // What each friend owes you (or you owe them) across your groups
  list: authedProcedure.query(({ ctx }) =>
    getFriendBalances(ctx.session.userId),
  ),
})
