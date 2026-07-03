import { auth } from './auth'
import { prisma } from './prisma'

// A session counts as admin if:
//  1. the DB role says so, or
//  2. it matches the ADMIN_EMAIL env var, or
//  3. (bootstrap) no ADMIN_EMAIL is configured and this is the FIRST account
//     ever created — the founder. This breaks the chicken-and-egg where
//     migrations and admin tooling were unreachable until an env var was set.
export async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.email) return null

  if (session.user.role === 'admin') return session

  const adminEmail = process.env.ADMIN_EMAIL
  if (adminEmail) {
    return session.user.email.toLowerCase() === adminEmail.toLowerCase() ? session : null
  }

  // Bootstrap mode: no ADMIN_EMAIL configured — the oldest account is admin
  try {
    const firstUser = await prisma.user.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    })
    if (firstUser && firstUser.id === session.user.id) return session
  } catch { /* DB unreachable — deny */ }

  return null
}
