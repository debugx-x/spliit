'use client'

import { CopyButton } from '@/components/copy-button'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { Currency } from '@/lib/currency'
import { formatCurrency } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'

// There's no bank API: the payer sends the e-Transfer from their bank's app
// (copying the email, amount and message from here), then records it here in
// one tap, as a reimbursement like "Mark as paid" does.
export function PayWithInterac({
  groupId,
  groupName,
  fromParticipantId,
  payee,
  amount,
  currency,
}: {
  groupId: string
  groupName: string
  fromParticipantId: string
  payee: { participantId: string; displayName: string; interacEmail: string }
  amount: number // minor units
  currency: Currency
}) {
  const t = useTranslations('Balances.Interac')
  const locale = useLocale()
  const { toast } = useToast()
  const utils = trpc.useUtils()
  const [open, setOpen] = useState(false)

  const formatted = formatCurrency(currency, amount, locale)
  const plainAmount = (amount / 10 ** currency.decimal_digits).toFixed(
    currency.decimal_digits,
  )
  const message = t('messageText', { group: groupName })

  const record = trpc.groups.expenses.create.useMutation({
    onSuccess: async () => {
      setOpen(false)
      toast({
        title: t('recordedTitle'),
        description: t('recordedDescription', {
          amount: formatted,
          name: payee.displayName,
        }),
      })
      await Promise.all([
        utils.groups.balances.invalidate(),
        utils.groups.expenses.invalidate(),
        utils.groups.activities.invalidate(),
        utils.friends.invalidate(),
      ])
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="link" className="-mx-4 -my-3">
          {t('button')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('title', { amount: formatted, name: payee.displayName })}
          </DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <dl className="flex flex-col gap-3 text-sm">
          <CopyRow label={t('email')} value={payee.interacEmail} />
          <CopyRow label={t('amount')} value={plainAmount} shown={formatted} />
          <CopyRow label={t('message')} value={message} />
        </dl>
        {record.error && (
          <p className="text-sm text-destructive">{t('error')}</p>
        )}
        <DialogFooter className="gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            {t('cancel')}
          </Button>
          <Button
            disabled={record.isPending}
            onClick={() =>
              record.mutate({
                groupId,
                participantId: fromParticipantId,
                expenseFormValues: {
                  expenseDate: new Date(),
                  title: t('expenseTitle'),
                  category: 1, // Payment
                  amount,
                  paidBy: fromParticipantId,
                  paidFor: [{ participant: payee.participantId, shares: 1 }],
                  splitMode: 'EVENLY',
                  saveDefaultSplittingOptions: false,
                  isReimbursement: true,
                  documents: [],
                  notes: message,
                  recurrenceRule: 'NONE',
                },
              })
            }
          >
            {record.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            {t('sent')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CopyRow({
  label,
  value,
  shown = value,
}: {
  label: string
  value: string
  shown?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <dt className="text-muted-foreground">{label}</dt>
        <dd className="font-medium break-all">{shown}</dd>
      </div>
      <CopyButton text={value} />
    </div>
  )
}
