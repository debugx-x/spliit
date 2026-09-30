import { PayWithInterac } from '@/app/groups/[groupId]/pay-with-interac'
import { Avatar } from '@/components/avatar'
import { Button } from '@/components/ui/button'
import { Reimbursement } from '@/lib/balances'
import { Currency } from '@/lib/currency'
import { formatCurrency } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { Participant } from '@prisma/client'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'

type Props = {
  reimbursements: Reimbursement[]
  participants: Participant[]
  currency: Currency
  groupId: string
  groupName: string
}

export function ReimbursementList({
  reimbursements,
  participants,
  currency,
  groupId,
  groupName,
}: Props) {
  const locale = useLocale()
  const t = useTranslations('Balances.Reimbursements')
  const { data: payeesData } = trpc.groups.balances.payees.useQuery({
    groupId,
  })
  // "Pay with Interac" is offered for your own debts, to members who have an
  // Interac email
  const interacPayee = (reimbursement: Reimbursement) =>
    payeesData && reimbursement.from === payeesData.myParticipantId
      ? payeesData.payees.find((p) => p.participantId === reimbursement.to)
      : undefined
  if (reimbursements.length === 0) {
    return <p className="text-sm pb-6">{t('noImbursements')}</p>
  }

  const getParticipant = (id: string) => participants.find((p) => p.id === id)
  return (
    <ul className="text-sm divide-y">
      {reimbursements.map((reimbursement, index) => (
        <li className="py-4 flex flex-col gap-3" key={index}>
          <div className="flex items-center gap-3">
            <Avatar
              name={getParticipant(reimbursement.from)?.name ?? '?'}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              {t.rich('owes', {
                from: getParticipant(reimbursement.from)?.name ?? '',
                to: getParticipant(reimbursement.to)?.name ?? '',
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </div>
            <div className="font-bold text-base tabular-nums whitespace-nowrap">
              {formatCurrency(currency, reimbursement.amount, locale)}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pl-11">
            {interacPayee(reimbursement) && (
              <PayWithInterac
                groupId={groupId}
                groupName={groupName}
                fromParticipantId={reimbursement.from}
                payee={interacPayee(reimbursement)!}
                amount={reimbursement.amount}
                currency={currency}
              />
            )}
            <Button variant="outline" size="sm" asChild>
              <Link
                href={`/groups/${groupId}/expenses/create?reimbursement=yes&from=${reimbursement.from}&to=${reimbursement.to}&amount=${reimbursement.amount}`}
              >
                {t('markAsPaid')}
              </Link>
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}
