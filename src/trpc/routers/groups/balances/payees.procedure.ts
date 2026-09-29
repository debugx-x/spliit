import { getInteracPayees } from '@/lib/interac'
import { memberProcedure } from '@/trpc/init'

// Who can be paid by Interac in this group, and which participant is you
// (to offer "Pay with Interac" only for your own debts). Members only.
export const listGroupPayeesProcedure = memberProcedure.query(
  async ({ input: { groupId }, ctx }) => ({
    myParticipantId: ctx.membership.participantId,
    payees: await getInteracPayees(groupId),
  }),
)
