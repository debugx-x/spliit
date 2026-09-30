'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useActionState } from 'react'
import { logoutAction, updateProfileAction } from './actions'

export function ProfileForm({
  user,
}: {
  user: {
    displayName: string
    uniqueId: string
    email: string
    defaultCurrency: string
    interacEmail: string | null
  }
}) {
  const [state, formAction, isPending] = useActionState(
    updateProfileAction,
    null,
  )

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
          <CardDescription>Update your personal information.</CardDescription>
        </CardHeader>
        <form action={formAction}>
          <CardContent className="space-y-4">
            {state?.error && (
              <div className="p-3 text-sm text-red-500 bg-red-100 rounded-md">
                {state.error}
              </div>
            )}
            {state?.success && (
              <div className="p-3 text-sm text-green-700 bg-green-100 rounded-md">
                {state.success}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                name="displayName"
                defaultValue={user.displayName}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="uniqueId">Unique ID</Label>
              <Input
                id="uniqueId"
                name="uniqueId"
                defaultValue={user.uniqueId}
                disabled
                className="bg-slate-100"
              />
              <p className="text-xs text-muted-foreground">
                Your Unique ID cannot be changed.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={user.email}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interacEmail">Interac e-Transfer email</Label>
              <Input
                id="interacEmail"
                name="interacEmail"
                type="email"
                defaultValue={user.interacEmail ?? ''}
              />
              <p className="text-xs text-muted-foreground">
                Shown to members of your groups when they pay you back. Leave
                empty to hide it. Your login email is never shown to others.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultCurrency">Default Currency</Label>
              <Input
                id="defaultCurrency"
                name="defaultCurrency"
                defaultValue={user.defaultCurrency}
                maxLength={3}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={logoutAction}>
            <Button variant="destructive" type="submit">
              Log Out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
