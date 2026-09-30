/**
 * @jest-environment node
 */
import {
  RESET_TOKEN_TTL_MS,
  createResetToken,
  hashResetToken,
  requestPasswordReset,
  resetEmail,
  resetPasswordWithToken,
} from './password-reset'

const mockDb = {
  user: { findFirst: jest.fn(), update: jest.fn() },
  loginFailure: { deleteMany: jest.fn() },
  passwordResetToken: {
    findFirst: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: (fn: (tx: unknown) => unknown) => fn(mockDb),
}
const mockSendEmail = jest.fn()

jest.mock('@/lib/prisma', () => ({
  get prisma() {
    return mockDb
  },
}))
jest.mock('@/lib/email', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}))

const user = { id: 'u1', email: 'amy@example.com', displayName: 'Amy' }

beforeEach(() => {
  jest.resetAllMocks()
})

describe('reset tokens', () => {
  it('are random and only their hash is stored', () => {
    const a = createResetToken()
    const b = createResetToken()
    expect(a.token).not.toEqual(b.token)
    expect(a.token.length).toBeGreaterThanOrEqual(43) // 32 bytes, base64url
    expect(a.tokenHash).toEqual(hashResetToken(a.token))
    expect(a.tokenHash).not.toContain(a.token)
  })
})

describe('requestPasswordReset', () => {
  it('emails a one-hour link to a matching account', async () => {
    mockDb.user.findFirst.mockResolvedValue(user)
    mockDb.passwordResetToken.findFirst.mockResolvedValue(null)
    const before = Date.now()
    await requestPasswordReset('AMY@example.com', 'https://split.example')

    const { data } = mockDb.passwordResetToken.create.mock.calls[0][0]
    expect(data.userId).toBe('u1')
    const ttl = data.expiresAt.getTime() - before
    expect(ttl).toBeGreaterThanOrEqual(RESET_TOKEN_TTL_MS - 1000)
    expect(ttl).toBeLessThanOrEqual(RESET_TOKEN_TTL_MS + 1000)

    const email = mockSendEmail.mock.calls[0][0]
    expect(email.to).toBe('amy@example.com')
    const token = decodeURIComponent(
      email.text.match(/reset-password\?token=(\S+)/)[1],
    )
    expect(email.text).toContain('https://split.example/reset-password?token=')
    expect(hashResetToken(token)).toBe(data.tokenHash)
  })

  it('does nothing for unknown accounts', async () => {
    mockDb.user.findFirst.mockResolvedValue(null)
    await requestPasswordReset('nobody@example.com', 'https://x')
    expect(mockDb.passwordResetToken.create).not.toHaveBeenCalled()
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('sends at most one email per minute per account', async () => {
    mockDb.user.findFirst.mockResolvedValue(user)
    mockDb.passwordResetToken.findFirst.mockResolvedValue({ id: 'recent' })
    await requestPasswordReset('amy@example.com', 'https://x')
    expect(mockDb.passwordResetToken.create).not.toHaveBeenCalled()
    expect(mockSendEmail).not.toHaveBeenCalled()
  })
})

describe('resetPasswordWithToken', () => {
  it('consumes a valid token, sets the password and drops other links', async () => {
    mockDb.passwordResetToken.updateMany.mockResolvedValue({ count: 1 })
    mockDb.passwordResetToken.findUniqueOrThrow.mockResolvedValue({
      userId: 'u1',
    })
    mockDb.user.update.mockResolvedValue({
      id: 'u1',
      uniqueId: 'amy',
      displayName: 'Amy',
    })

    await expect(resetPasswordWithToken('tok', 'new-hash')).resolves.toEqual({
      id: 'u1',
      uniqueId: 'amy',
      displayName: 'Amy',
    })
    const { where } = mockDb.passwordResetToken.updateMany.mock.calls[0][0]
    expect(where).toMatchObject({
      tokenHash: hashResetToken('tok'),
      usedAt: null,
    })
    expect(where.expiresAt.gt).toBeInstanceOf(Date)
    expect(mockDb.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { passwordHash: 'new-hash' } }),
    )
    expect(mockDb.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1', tokenHash: { not: hashResetToken('tok') } },
    })
    // The failed-login lockout is lifted, so the new password works at once
    expect(mockDb.loginFailure.deleteMany).toHaveBeenCalledWith({
      where: { key: 'user:u1' },
    })
  })

  it('refuses invalid, expired or already used tokens', async () => {
    mockDb.passwordResetToken.updateMany.mockResolvedValue({ count: 0 })
    await expect(resetPasswordWithToken('tok', 'new-hash')).resolves.toBeNull()
    expect(mockDb.user.update).not.toHaveBeenCalled()
    expect(mockDb.loginFailure.deleteMany).not.toHaveBeenCalled()
  })
})

describe('resetEmail', () => {
  it('is branded and escapes the name and link in the HTML version', () => {
    const email = resetEmail('<Amy & co>', 'https://x/reset-password?token=a"b')
    expect(email.subject).toBe('Reset your Split Karega password')
    expect(email.text).toContain('Hi <Amy & co>,')
    expect(email.text).toContain('https://x/reset-password?token=a"b')
    expect(email.html).toContain('Hi &lt;Amy &amp; co&gt;,')
    expect(email.html).toContain(
      'href="https://x/reset-password?token=a&quot;b"',
    )
    expect(email.html).not.toContain('<Amy')
    expect(email.html).not.toContain('Splitsville')
  })
})
