/**
 * @jest-environment node
 */
import {
  ACCOUNT_FAILURE_LIMIT,
  LOGIN_WINDOW_MS,
  RESET_REQUEST_IP_LIMIT,
  formatRetryAfter,
  getLoginRetryAfter,
  loginFailureKeys,
  recordLoginFailure,
  resetRequestKeys,
} from './login-rate-limit'

const mockDb = {
  loginFailure: {
    findMany: jest.fn(),
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  },
}
jest.mock('@/lib/prisma', () => ({
  get prisma() {
    return mockDb
  },
}))

beforeEach(() => jest.resetAllMocks())

describe('loginFailureKeys', () => {
  it('keys existing accounts by user id, whatever identifier was typed', () => {
    const byEmail = loginFailureKeys({
      userId: 'u1',
      identifier: 'A@x.io',
      ip: null,
    })
    const byId = loginFailureKeys({ userId: 'u1', identifier: 'amy', ip: null })
    expect(byEmail).toEqual(byId)
    expect(byEmail).toEqual([{ key: 'user:u1', limit: ACCOUNT_FAILURE_LIMIT }])
  })

  it('keys unknown accounts by normalized identifier, plus the IP when known', () => {
    expect(
      loginFailureKeys({ userId: null, identifier: ' Nobody ', ip: '1.2.3.4' }),
    ).toEqual([
      { key: 'id:nobody', limit: ACCOUNT_FAILURE_LIMIT },
      { key: 'ip:1.2.3.4', limit: 20 },
    ])
  })
})

describe('getLoginRetryAfter', () => {
  const now = Date.parse('2026-09-29T12:00:00Z')
  const minutesAgo = (m: number) => ({ createdAt: new Date(now - m * 60_000) })

  it('allows attempts under the limit', async () => {
    mockDb.loginFailure.findMany.mockResolvedValue([
      minutesAgo(1),
      minutesAgo(2),
    ])
    await expect(
      getLoginRetryAfter([{ key: 'user:u1', limit: 5 }], now),
    ).resolves.toBe(0)
  })

  it('blocks at the limit until the oldest counted failure leaves the window', async () => {
    // 5 failures, most recent first; the 5th most recent was 10 minutes ago
    mockDb.loginFailure.findMany.mockResolvedValue(
      [1, 2, 3, 4, 10].map(minutesAgo),
    )
    const retryAfter = await getLoginRetryAfter(
      [{ key: 'user:u1', limit: 5 }],
      now,
    )
    expect(retryAfter).toBe(LOGIN_WINDOW_MS - 10 * 60_000)
    const { where, take } = mockDb.loginFailure.findMany.mock.calls[0][0]
    expect(where.key).toBe('user:u1')
    expect(where.createdAt.gt).toEqual(new Date(now - LOGIN_WINDOW_MS))
    expect(take).toBe(5)
  })

  it('uses the longest wait across account and IP keys', async () => {
    mockDb.loginFailure.findMany
      .mockResolvedValueOnce([minutesAgo(1)]) // account: fine
      .mockResolvedValueOnce([1, 2, 14].map(minutesAgo)) // IP: at limit 3
    const retryAfter = await getLoginRetryAfter(
      [
        { key: 'user:u1', limit: 5 },
        { key: 'ip:1.2.3.4', limit: 3 },
      ],
      now,
    )
    expect(retryAfter).toBe(LOGIN_WINDOW_MS - 14 * 60_000)
  })
})

describe('recordLoginFailure', () => {
  it('records one failure per key and prunes old ones', async () => {
    await recordLoginFailure([{ key: 'user:u1' }, { key: 'ip:1.2.3.4' }])
    expect(mockDb.loginFailure.createMany).toHaveBeenCalledWith({
      data: [{ key: 'user:u1' }, { key: 'ip:1.2.3.4' }],
    })
    expect(mockDb.loginFailure.deleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: expect.any(Date) } },
    })
  })
})

describe('password reset requests', () => {
  it('are counted per IP address, separately from login failures', () => {
    expect(RESET_REQUEST_IP_LIMIT).toBe(5)
    expect(resetRequestKeys('1.2.3.4')).toEqual([
      { key: 'reset-ip:1.2.3.4', limit: 5 },
    ])
    expect(resetRequestKeys(null)).toEqual([])
  })

  it('block the 6th request from an IP within the window', async () => {
    const now = Date.parse('2026-09-29T12:00:00Z')
    const keys = resetRequestKeys('1.2.3.4')
    mockDb.loginFailure.findMany.mockResolvedValue(
      [1, 2, 3, 4].map((m) => ({ createdAt: new Date(now - m * 60_000) })),
    )
    await expect(getLoginRetryAfter(keys, now)).resolves.toBe(0)
    mockDb.loginFailure.findMany.mockResolvedValue(
      [1, 2, 3, 4, 5].map((m) => ({ createdAt: new Date(now - m * 60_000) })),
    )
    await expect(getLoginRetryAfter(keys, now)).resolves.toBe(
      LOGIN_WINDOW_MS - 5 * 60_000,
    )
    expect(mockDb.loginFailure.findMany.mock.calls[1][0].where.key).toBe(
      'reset-ip:1.2.3.4',
    )
  })

  it('record nothing without an IP address', async () => {
    await recordLoginFailure(resetRequestKeys(null))
    expect(mockDb.loginFailure.createMany).not.toHaveBeenCalled()
  })
})

describe('formatRetryAfter', () => {
  it('rounds up to whole minutes', () => {
    expect(formatRetryAfter(1)).toBe('Try again in 1 minute.')
    expect(formatRetryAfter(10 * 60_000 + 1)).toBe('Try again in 11 minutes.')
  })
})
