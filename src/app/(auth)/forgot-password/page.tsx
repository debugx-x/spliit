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
import Link from 'next/link'
import { useActionState } from 'react'
import { forgotPasswordAction } from '../password-reset-actions'

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(
    forgotPasswordAction,
    null,
  )

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Forgot your password?</CardTitle>
          <CardDescription>
            Enter your email or Unique ID and we&apos;ll email you a link to
            choose a new password.
          </CardDescription>
        </CardHeader>
        {state && 'sent' in state ? (
          <>
            <CardContent>
              <p className="text-sm">
                If an account matches, we&apos;ve emailed it a reset link. The
                link expires in 1 hour.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Don&apos;t see it after a minute? Check your Spam folder, and
                mark the email &quot;Not spam&quot; so the next ones reach your
                inbox.
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/login" className="text-sm underline">
                Back to login
              </Link>
            </CardFooter>
          </>
        ) : (
          <form action={formAction}>
            <CardContent className="space-y-4">
              {state?.error && (
                <div className="p-3 text-sm text-red-500 bg-red-100 rounded-md">
                  {state.error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="identifier">Email or Unique ID</Label>
                <Input
                  id="identifier"
                  name="identifier"
                  autoComplete="username"
                  defaultValue={state?.identifier}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'Sending...' : 'Email me a reset link'}
              </Button>
              <Link
                href="/login"
                className="text-sm text-center text-muted-foreground underline"
              >
                Back to login
              </Link>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  )
}
