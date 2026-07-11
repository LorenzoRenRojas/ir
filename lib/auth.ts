import { NextAuthOptions, getServerSession } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        // Emails are stored lowercased (register normalizes) — match that here.
        // Explicit select: a default SELECT * includes columns added in code
        // but not yet created in prod (RUN DB MIGRATION is manual), and a
        // "no such column" here reads as "wrong password" to every user
        const user = await prisma.user.findUnique({
          where: { email: (credentials.email as string).toLowerCase().trim() },
          select: { id: true, email: true, name: true, image: true, password: true },
        })

        if (!user || !user.password) return null

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!passwordMatch) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      if (token.id) {
        const base = { subscriptionTier: true, onboardingDone: true, role: true, emailVerified: true } as const
        let dbUser: { subscriptionTier: string; onboardingDone: boolean; role: string; emailVerified: Date | null; passwordChangedAt?: Date | null } | null = null
        try {
          try {
            dbUser = await prisma.user.findUnique({
              where: { id: token.id as string },
              select: { ...base, passwordChangedAt: true },
            })
          } catch {
            // passwordChangedAt column missing pre-migration — query without it
            dbUser = await prisma.user.findUnique({ where: { id: token.id as string }, select: base })
          }
        } catch {
          // DB hiccup — keep the session as-is rather than logging everyone out
          return token
        }

        if (dbUser) {
          // Password changed after this token was issued → the old session
          // (possibly a stolen one — that's WHY people change passwords)
          // must die instead of riding out its 30-day JWT lifetime
          const issuedAt = typeof token.iat === 'number' ? token.iat * 1000 : 0
          if (dbUser.passwordChangedAt && issuedAt > 0 && dbUser.passwordChangedAt.getTime() > issuedAt) {
            delete token.id
            return token
          }
          token.subscriptionTier = dbUser.subscriptionTier
          token.onboardingDone = dbUser.onboardingDone
          token.role = dbUser.role
          token.emailVerified = dbUser.emailVerified?.toISOString() ?? null
        } else {
          // Account no longer exists (deleted) — kill the session instead of
          // letting the JWT keep authorizing API calls until it expires
          delete token.id
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.subscriptionTier = token.subscriptionTier as string
        session.user.onboardingDone = token.onboardingDone as boolean
        session.user.role = token.role as string
      }
      return session
    },
  },
}

export function auth() {
  return getServerSession(authOptions)
}
