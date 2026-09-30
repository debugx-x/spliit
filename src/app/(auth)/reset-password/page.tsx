import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { isResetTokenValid } from '@/lib/password-reset'
import Image from 'next/image'
import Link from 'next/link'
import { ResetPasswordForm } from './reset-password-form'

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  if (token && (await isResetTokenValid(token))) {
    return <ResetPasswordForm token={token} />
  }

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
          <CardTitle className="text-2xl">Link expired</CardTitle>
          <CardDescription>
            This password reset link is invalid, expired or already used.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/forgot-password" className="text-sm underline">
            Request a new link
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
