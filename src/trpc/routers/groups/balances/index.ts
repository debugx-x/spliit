import { createTRPCRouter } from '@/trpc/init'
import { listGroupBalancesProcedure } from '@/trpc/routers/groups/balances/list.procedure'
import { listGroupPayeesProcedure } from '@/trpc/routers/groups/balances/payees.procedure'

export const groupBalancesRouter = createTRPCRouter({
  list: listGroupBalancesProcedure,
  payees: listGroupPayeesProcedure,
})
