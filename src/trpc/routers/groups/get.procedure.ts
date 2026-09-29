import { getGroup } from '@/lib/api'
import { memberProcedure } from '@/trpc/init'

export const getGroupProcedure = memberProcedure.query(
  async ({ input: { groupId } }) => {
    const group = await getGroup(groupId)
    return { group }
  },
)
