import {
  MembershipError,
  addSelfAsParticipant,
  claimParticipant,
  getJoinPreview,
} from '@/lib/membership'
import { authedProcedure, createTRPCRouter } from '@/trpc/init'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

// Joining is open to any logged-in user who has the group's link: the link
// is the invite.
const groupInput = z.object({ groupId: z.string().min(1) })

function toTRPCError(error: unknown): never {
  if (error instanceof MembershipError) {
    throw new TRPCError({ code: error.code, message: error.message })
  }
  throw error
}

export const joinGroupRouter = createTRPCRouter({
  preview: authedProcedure
    .input(groupInput)
    .query(async ({ input: { groupId }, ctx }) => {
      const preview = await getJoinPreview(groupId, ctx.session.userId)
      if (!preview) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Group not found.' })
      }
      return preview
    }),

  claim: authedProcedure
    .input(groupInput.extend({ participantId: z.string().min(1) }))
    .mutation(async ({ input: { groupId, participantId }, ctx }) => {
      try {
        return await claimParticipant(
          groupId,
          participantId,
          ctx.session.userId,
        )
      } catch (error) {
        toTRPCError(error)
      }
    }),

  addSelf: authedProcedure
    .input(groupInput)
    .mutation(async ({ input: { groupId }, ctx }) => {
      try {
        return await addSelfAsParticipant(groupId, {
          id: ctx.session.userId,
          displayName: ctx.session.displayName,
        })
      } catch (error) {
        toTRPCError(error)
      }
    }),
})
