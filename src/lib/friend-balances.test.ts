/**
 * @jest-environment node
 */
import { GroupBalanceInput, summarizeFriendBalances } from './friend-balances'

jest.mock('@/lib/prisma', () => ({ prisma: {} }))
jest.mock('@/lib/api', () => ({ getGroupExpenses: jest.fn() }))

const me = { id: 'me-p', name: 'Me', userId: 'me', user: null }
const alex = (id: string) => ({
  id,
  name: 'Alex',
  userId: 'alex',
  user: { displayName: 'Alex', uniqueId: 'alex1' },
})
const cad = { currency: '$', currencyCode: 'CAD' }
const usd = { currency: '$', currencyCode: 'USD' }

function group(
  id: string,
  currency: { currency: string; currencyCode: string | null },
  participants: GroupBalanceInput['participants'],
  reimbursements: GroupBalanceInput['reimbursements'],
): GroupBalanceInput {
  return { id, name: `Group ${id}`, ...currency, participants, reimbursements }
}

describe('summarizeFriendBalances', () => {
  it('merges a friend across groups in the same currency', () => {
    const { friends, totals } = summarizeFriendBalances(
      [
        group(
          'g1',
          cad,
          [me, alex('a1')],
          [{ from: 'a1', to: 'me-p', amount: 5000 }],
        ),
        group(
          'g2',
          cad,
          [me, alex('a2')],
          [{ from: 'me-p', to: 'a2', amount: 1500 }],
        ),
      ],
      'me',
    )
    expect(friends).toHaveLength(1)
    expect(friends[0]).toMatchObject({
      userId: 'alex',
      displayName: 'Alex',
      uniqueId: 'alex1',
      amounts: [{ ...cad, amount: 3500 }],
    })
    expect(friends[0].groups.map((g) => g.amount)).toEqual([5000, -1500])
    expect(totals).toEqual([{ ...cad, owedToYou: 3500, youOwe: 0 }])
  })

  it('keeps different currencies apart', () => {
    const { friends, totals } = summarizeFriendBalances(
      [
        group(
          'g1',
          cad,
          [me, alex('a1')],
          [{ from: 'a1', to: 'me-p', amount: 5000 }],
        ),
        group(
          'g3',
          usd,
          [me, alex('a3')],
          [{ from: 'me-p', to: 'a3', amount: 1000 }],
        ),
      ],
      'me',
    )
    expect(friends[0].amounts).toEqual([
      { ...cad, amount: 5000 },
      { ...usd, amount: -1000 },
    ])
    expect(totals).toEqual([
      { ...cad, owedToYou: 5000, youOwe: 0 },
      { ...usd, owedToYou: 0, youOwe: 1000 },
    ])
  })

  it('lists participants without an account per group', () => {
    const jack = { id: 'j', name: 'Jack', userId: null, user: null }
    const { friends } = summarizeFriendBalances(
      [group('g1', cad, [me, jack], [{ from: 'j', to: 'me-p', amount: 700 }])],
      'me',
    )
    expect(friends[0]).toMatchObject({
      key: 'participant:j',
      userId: null,
      displayName: 'Jack',
      groupName: 'Group g1',
    })
  })

  it('keeps friends who net to zero, with no outstanding amount', () => {
    const { friends, totals } = summarizeFriendBalances(
      [
        group(
          'g1',
          cad,
          [me, alex('a1')],
          [{ from: 'a1', to: 'me-p', amount: 1000 }],
        ),
        group(
          'g2',
          cad,
          [me, alex('a2')],
          [{ from: 'me-p', to: 'a2', amount: 1000 }],
        ),
      ],
      'me',
    )
    expect(friends[0].amounts).toEqual([])
    expect(friends[0].groups).toHaveLength(2)
    expect(totals).toEqual([])
  })

  it("ignores groups where you have no participant and others' debts", () => {
    const bob = { id: 'b', name: 'Bob', userId: 'bob', user: null }
    const { friends } = summarizeFriendBalances(
      [
        group(
          'g1',
          cad,
          [alex('a1'), bob],
          [{ from: 'b', to: 'a1', amount: 900 }],
        ),
        group(
          'g2',
          cad,
          [me, alex('a2'), bob],
          [{ from: 'b', to: 'a2', amount: 400 }],
        ),
      ],
      'me',
    )
    expect(friends).toEqual([])
  })

  it('sorts by largest outstanding amount, then name', () => {
    const p = (id: string, name: string) => ({
      id,
      name,
      userId: id,
      user: { displayName: name, uniqueId: id },
    })
    const { friends } = summarizeFriendBalances(
      [
        group(
          'g1',
          cad,
          [me, p('b', 'Bea'), p('c', 'Cal'), p('d', 'Dee')],
          [
            { from: 'b', to: 'me-p', amount: 100 },
            { from: 'me-p', to: 'c', amount: 900 },
            { from: 'd', to: 'me-p', amount: 100 },
          ],
        ),
      ],
      'me',
    )
    expect(friends.map((f) => f.displayName)).toEqual(['Cal', 'Bea', 'Dee'])
  })
})
