import { getGroupExpenses } from '@/lib/api'
import {
  getBalances,
  getPublicBalances,
  getSuggestedReimbursements,
} from '@/lib/balances'
import { memberProcedure } from '@/trpc/init'

export const listGroupBalancesProcedure = memberProcedure.query(
  async ({ input: { groupId } }) => {
    const expenses = await getGroupExpenses(groupId)
    const balances = getBalances(expenses)
    const reimbursements = getSuggestedReimbursements(balances)
    const publicBalances = getPublicBalances(reimbursements)

    return { balances: publicBalances, reimbursements }
  },
)
