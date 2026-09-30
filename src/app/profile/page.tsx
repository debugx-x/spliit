import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ProfileForm } from './profile-form'

export default async function ProfilePage() {
  const session = await requireSession('/profile')

  // Only what the form needs: this is passed to a client component, so
  // anything selected here (e.g. the password hash) would reach the browser.
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      displayName: true,
      uniqueId: true,
      email: true,
      defaultCurrency: true,
      interacEmail: true,
    },
  })

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl mt-8">
      <h1 className="text-3xl font-bold mb-6">Your Profile</h1>
      <ProfileForm user={user} />
    </div>
  )
}
