import { auth } from './auth'

// A session counts as admin if the DB role says so, OR if it belongs to the
// bootstrap admin identified by the ADMIN_EMAIL env var. The env fallback
// breaks the chicken-and-egg where granting admin required already being
// admin, which made /api/migrate unreachable in production.
export async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.email) return null

  if (session.user.role === 'admin') return session

  const adminEmail = process.env.ADMIN_EMAIL
  if (adminEmail && session.user.email.toLowerCase() === adminEmail.toLowerCase()) {
    return session
  }

  return null
}
