/**
 * @jest-environment node
 */
import { getInteracPayees } from './interac'

const mockFindMany = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    participant: { findMany: (args: unknown) => mockFindMany(args) },
  },
}))

describe('getInteracPayees', () => {
  it('lists linked participants with an Interac email, never the login email', async () => {
    mockFindMany.mockResolvedValue([
      { id: 'p1', user: { displayName: 'Amy', interacEmail: 'amy@bank.ca' } },
      { id: 'p2', user: null },
    ])
    await expect(getInteracPayees('g1')).resolves.toEqual([
      { participantId: 'p1', displayName: 'Amy', interacEmail: 'amy@bank.ca' },
    ])
    const { where, select } = mockFindMany.mock.calls[0][0]
    expect(where).toEqual({
      groupId: 'g1',
      user: { interacEmail: { not: null } },
    })
    expect(select.user.select).toEqual({
      displayName: true,
      interacEmail: true,
    })
    expect(JSON.stringify(select)).not.toContain('"email"')
  })
})
