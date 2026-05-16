import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ProfileForm } from './profile-form'

export default async function ProfilePage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
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
