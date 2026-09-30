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
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useActionState } from 'react'
import { loginAction } from '../actions'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, null)
  const next = useSearchParams().get('next') ?? ''

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <Image
            src="/logo/128x128.png"
            width={56}
            height={56}
            alt=""
            className="rounded-2xl mb-2"
          />
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your credentials to access your account.
          </CardDescription>
        </CardHeader>
        <form action={formAction}>
          <input type="hidden" name="next" value={next} />
          <CardContent className="space-y-4">
            {state?.error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-xl">
                {state.error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="uniqueId">Unique ID or Email</Label>
              <Input
                id="uniqueId"
                name="uniqueId"
                placeholder="johndoe123"
                defaultValue={state?.values?.uniqueId}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-muted-foreground underline hover:text-primary"
                >
                  Forgot password?
                </Link>
              </div>
              <Input id="password" name="password" type="password" required />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Logging in...' : 'Login'}
            </Button>
            <div className="text-sm text-center text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link
                href={
                  next
                    ? `/register?next=${encodeURIComponent(next)}`
                    : '/register'
                }
                className="underline hover:text-primary"
              >
                Create one
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
