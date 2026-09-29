import { searchUsersAction } from './users'

const mockGetSession = jest.fn()
const mockFindMany = jest.fn()

jest.mock('@/lib/auth', () => ({
  getSession: () => mockGetSession(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: { user: { findMany: (args: unknown) => mockFindMany(args) } },
}))

describe('searchUsersAction', () => {
  beforeEach(() => {
    mockGetSession.mockReset()
    mockFindMany.mockReset().mockResolvedValue([])
  })

  it('returns nothing and skips the query when logged out', async () => {
    mockGetSession.mockResolvedValue(null)
    expect(await searchUsersAction('john')).toEqual([])
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it('ignores queries shorter than 2 characters', async () => {
    mockGetSession.mockResolvedValue({ userId: 'me' })
    expect(await searchUsersAction('j')).toEqual([])
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it('searches case-insensitively and excludes the current user', async () => {
    mockGetSession.mockResolvedValue({ userId: 'me' })
    await searchUsersAction('john')
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: { not: 'me' },
          OR: [
            { uniqueId: { contains: 'john', mode: 'insensitive' } },
            { displayName: { contains: 'john', mode: 'insensitive' } },
          ],
        },
      }),
    )
  })
})
