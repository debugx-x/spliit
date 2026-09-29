import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useMediaQuery } from '@/lib/hooks'
import { Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

// Opens a group from its link. Non-members land on the group's join screen.
export function AddGroupByUrlButton() {
  const t = useTranslations('Groups.AddByURL')
  const isDesktop = useMediaQuery('(min-width: 640px)')
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [error, setError] = useState(false)
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary">{t('button')}</Button>
      </PopoverTrigger>
      <PopoverContent
        align={isDesktop ? 'end' : 'start'}
        className="[&_p]:text-sm flex flex-col gap-3"
      >
        <h3 className="font-bold">{t('title')}</h3>
        <p>{t('description')}</p>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const [, groupId] =
              url.match(
                new RegExp(`${window.location.origin}/groups/([^/?#]+)`),
              ) ?? []
            if (!groupId) {
              setError(true)
              return
            }
            setOpen(false)
            setUrl('')
            router.push(`/groups/${groupId}`)
          }}
        >
          <Input
            type="url"
            required
            placeholder="https://spliit.app/..."
            className="flex-1 text-base"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value)
              setError(false)
            }}
          />
          <Button size="icon" type="submit">
            <Plus className="w-4 h-4" />
          </Button>
        </form>
        {error && <p className="text-destructive">{t('error')}</p>}
      </PopoverContent>
    </Popover>
  )
}
