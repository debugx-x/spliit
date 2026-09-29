import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { createCallerFactory, createTRPCRouter, memberProcedure } from './init'

const mockGetMembership = jest.fn()

jest.mock('@/lib/membership', () => ({
  getMembership: (...args: unknown[]) => mockGetMembership(...args),
}))
jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }))
jest.mock('superjson', () => ({
  __esModule: true,
  default: {
    registerCustom: jest.fn(),
    serialize: (v: unknown) => ({ json: v }),
    deserialize: (v: { json: unknown }) => v.json,
  },
}))

const router = createTRPCRouter({
  probe: memberProcedure
    .input(z.object({ extra: z.string() }))
    .query(({ ctx, input }) => ({ membership: ctx.membership, input })),
})
const createCaller = createCallerFactory(router)

const session = { userId: 'u', uniqueId: 'amy', displayName: 'Amy' }

beforeEach(() => mockGetMembership.mockReset())

async function errorCode(promise: Promise<unknown>) {
  const error = await promise.catch((e) => e)
  expect(error).toBeInstanceOf(TRPCError)
  return (error as TRPCError).code
}

describe('memberProcedure', () => {
  it('rejects anonymous calls without looking up the group', async () => {
    const caller = createCaller({ session: null })
    expect(await errorCode(caller.probe({ groupId: 'g', extra: 'x' }))).toBe(
      'UNAUTHORIZED',
    )
    expect(mockGetMembership).not.toHaveBeenCalled()
  })

  it('answers NOT_FOUND to non-members', async () => {
    mockGetMembership.mockResolvedValue({
      isMember: false,
      isCreator: false,
      participantId: null,
    })
    const caller = createCaller({ session })
    expect(await errorCode(caller.probe({ groupId: 'g', extra: 'x' }))).toBe(
      'NOT_FOUND',
    )
  })

  it('answers NOT_FOUND for unknown groups, like for non-members', async () => {
    mockGetMembership.mockResolvedValue(null)
    const caller = createCaller({ session })
    expect(await errorCode(caller.probe({ groupId: 'g', extra: 'x' }))).toBe(
      'NOT_FOUND',
    )
  })

  it('lets members through with their membership and merged input', async () => {
    const membership = { isMember: true, isCreator: false, participantId: 'p1' }
    mockGetMembership.mockResolvedValue(membership)
    const caller = createCaller({ session })
    await expect(caller.probe({ groupId: 'g', extra: 'x' })).resolves.toEqual({
      membership,
      input: { groupId: 'g', extra: 'x' },
    })
    expect(mockGetMembership).toHaveBeenCalledWith('g', 'u')
  })
})
