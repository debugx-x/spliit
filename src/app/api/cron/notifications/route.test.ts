/**
 * @jest-environment node
 */
const mockEnv: { CRON_SECRET?: string; NEXT_PUBLIC_BASE_URL: string } = {
  NEXT_PUBLIC_BASE_URL: 'https://sk.app',
}
const mockSend = jest.fn()
jest.mock('@/lib/env', () => ({
  get env() {
    return mockEnv
  },
}))
jest.mock('@/lib/notification-digest', () => ({
  sendNotificationDigests: (...args: unknown[]) => mockSend(...args),
}))

import { GET } from './route'

const call = (authorization?: string) =>
  GET(
    new Request('https://sk.app/api/cron/notifications', {
      headers: authorization ? { authorization } : {},
    }),
  )

beforeEach(() => {
  mockSend.mockReset().mockResolvedValue({ sent: 1, skipped: 0, failed: 0 })
  mockEnv.CRON_SECRET = 'a-long-random-secret'
})

it('refuses requests without the right secret', async () => {
  expect((await call()).status).toBe(401)
  expect((await call('Bearer wrong')).status).toBe(401)
  expect(mockSend).not.toHaveBeenCalled()
})

it('sends the summaries with the right secret', async () => {
  const response = await call('Bearer a-long-random-secret')
  expect(response.status).toBe(200)
  await expect(response.json()).resolves.toEqual({
    sent: 1,
    skipped: 0,
    failed: 0,
  })
  expect(mockSend).toHaveBeenCalledWith('https://sk.app')
})
