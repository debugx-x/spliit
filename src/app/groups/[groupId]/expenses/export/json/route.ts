import { getSession } from '@/lib/auth'
import { getMembership } from '@/lib/membership'
import { prisma } from '@/lib/prisma'
import contentDisposition from 'content-disposition'
import { NextResponse } from 'next/server'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const { groupId } = await params
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const membership = await getMembership(groupId, session.userId)
  if (!membership?.isMember) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      name: true,
      currency: true,
      currencyCode: true,
      expenses: {
        select: {
          createdAt: true,
          expenseDate: true,
          title: true,
          category: { select: { grouping: true, name: true } },
          amount: true,
          originalAmount: true,
          originalCurrency: true,
          conversionRate: true,
          paidById: true,
          paidFor: { select: { participantId: true, shares: true } },
          isReimbursement: true,
          splitMode: true,
          recurrenceRule: true,
        },
        orderBy: [{ expenseDate: 'asc' }, { createdAt: 'asc' }],
      },
      participants: { select: { id: true, name: true } },
    },
  })
  if (!group)
    return NextResponse.json({ error: 'Invalid group ID' }, { status: 404 })

  const date = new Date().toISOString().split('T')[0]
  const filename = `Splitsville Export - ${date}`
  return NextResponse.json(group, {
    headers: {
      'content-type': 'application/json',
      'content-disposition': contentDisposition(`${filename}.json`),
    },
  })
}
