import { listUserGroups } from '@/lib/membership'
import { authedProcedure } from '@/trpc/init'

// The groups the logged-in user belongs to (created or joined).
export const listGroupsProcedure = authedProcedure.query(async ({ ctx }) => {
  const groups = await listUserGroups(ctx.session.userId)
  return { groups }
})
