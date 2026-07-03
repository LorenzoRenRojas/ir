import { createClient } from '@libsql/client'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'

export async function GET() {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const client = createClient({
    url: process.env.DATABASE_URL!.split('?')[0],
    authToken: process.env.DATABASE_URL!.split('authToken=')[1],
  })

  const statements = [
    `CREATE TABLE IF NOT EXISTS "User" ("id" TEXT NOT NULL PRIMARY KEY,"email" TEXT NOT NULL,"emailVerified" DATETIME,"password" TEXT,"name" TEXT,"image" TEXT,"role" TEXT NOT NULL DEFAULT 'user',"subscriptionTier" TEXT NOT NULL DEFAULT 'free',"stripeCustomerId" TEXT,"onboardingDone" BOOLEAN NOT NULL DEFAULT false,"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS "Account" ("id" TEXT NOT NULL PRIMARY KEY,"userId" TEXT NOT NULL,"type" TEXT NOT NULL,"provider" TEXT NOT NULL,"providerAccountId" TEXT NOT NULL,"refresh_token" TEXT,"access_token" TEXT,"expires_at" INTEGER,"token_type" TEXT,"scope" TEXT,"id_token" TEXT,"session_state" TEXT,CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS "Session" ("id" TEXT NOT NULL PRIMARY KEY,"sessionToken" TEXT NOT NULL,"userId" TEXT NOT NULL,"expires" DATETIME NOT NULL,CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS "VerificationToken" ("identifier" TEXT NOT NULL,"token" TEXT NOT NULL,"expires" DATETIME NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS "CompanyProfile" ("id" TEXT NOT NULL PRIMARY KEY,"userId" TEXT NOT NULL,"companyName" TEXT NOT NULL,"uei" TEXT,"website" TEXT,"yearFounded" INTEGER,"businessTypes" TEXT NOT NULL DEFAULT '[]',"naicsCodes" TEXT NOT NULL DEFAULT '[]',"contractSizePrefs" TEXT NOT NULL DEFAULT '[]',"contractTypePrefs" TEXT NOT NULL DEFAULT '[]',"geoPrefs" TEXT NOT NULL DEFAULT '[]',"certifications" TEXT NOT NULL DEFAULT '[]',"clearanceLevel" TEXT,"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "CompanyProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS "SavedContract" ("id" TEXT NOT NULL PRIMARY KEY,"userId" TEXT NOT NULL,"contractId" TEXT NOT NULL,"samNoticeId" TEXT,"title" TEXT NOT NULL,"agency" TEXT NOT NULL,"value" REAL,"deadline" DATETIME,"matchScore" INTEGER,"status" TEXT NOT NULL DEFAULT 'saved',"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "SavedContract_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS "GeneratedDocument" ("id" TEXT NOT NULL PRIMARY KEY,"userId" TEXT NOT NULL,"type" TEXT NOT NULL,"title" TEXT NOT NULL,"content" TEXT NOT NULL,"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "GeneratedDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "Session"("sessionToken")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_token_key" ON "VerificationToken"("token")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "CompanyProfile_userId_key" ON "CompanyProfile"("userId")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "SavedContract_userId_contractId_key" ON "SavedContract"("userId", "contractId")`,
    // Team system tables
    `CREATE TABLE IF NOT EXISTS "Team" ("id" TEXT NOT NULL PRIMARY KEY,"name" TEXT NOT NULL,"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS "TeamMember" ("id" TEXT NOT NULL PRIMARY KEY,"teamId" TEXT NOT NULL,"userId" TEXT NOT NULL,"role" TEXT NOT NULL DEFAULT 'member',"permissions" TEXT NOT NULL DEFAULT '{"canSaveContracts":true,"canGenerateDocs":false,"canManageWatchlist":true,"canEditCompanyProfile":false}',"joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS "TeamInvite" ("id" TEXT NOT NULL PRIMARY KEY,"teamId" TEXT NOT NULL,"email" TEXT NOT NULL,"token" TEXT NOT NULL,"role" TEXT NOT NULL DEFAULT 'member',"expiresAt" DATETIME NOT NULL,"acceptedAt" DATETIME,"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "TeamInvite_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "TeamInvite_token_key" ON "TeamInvite"("token")`,
    // New CompanyProfile columns (ALTER TABLE ignores if column already exists via try-catch at runtime)
    `ALTER TABLE "CompanyProfile" ADD COLUMN "orgSize" TEXT`,
    `ALTER TABLE "CompanyProfile" ADD COLUMN "contractVehicles" TEXT NOT NULL DEFAULT '[]'`,
    `ALTER TABLE "CompanyProfile" ADD COLUMN "capabilityStatement" TEXT`,
    `ALTER TABLE "CompanyProfile" ADD COLUMN "pastPerformance" TEXT`,
    // New profile fields for win probability
    `ALTER TABLE "CompanyProfile" ADD COLUMN "annualRevenue" TEXT`,
    `ALTER TABLE "CompanyProfile" ADD COLUMN "agencyHistory" TEXT NOT NULL DEFAULT '[]'`,
    // Semantic learning tables
    `CREATE TABLE IF NOT EXISTS "ContractEmbedding" ("noticeId" TEXT NOT NULL PRIMARY KEY,"embedding" TEXT NOT NULL,"model" TEXT NOT NULL DEFAULT 'voyage-3-lite',"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    // Proposal system: link generated documents to contracts
    `ALTER TABLE "GeneratedDocument" ADD COLUMN "noticeId" TEXT`,
    `ALTER TABLE "GeneratedDocument" ADD COLUMN "contractTitle" TEXT`,
    `ALTER TABLE "GeneratedDocument" ADD COLUMN "agencyName" TEXT`,
    // Email observability
    `CREATE TABLE IF NOT EXISTS "EmailLog" ("id" TEXT NOT NULL PRIMARY KEY,"to" TEXT NOT NULL,"subject" TEXT NOT NULL,"status" TEXT NOT NULL,"error" TEXT,"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    // Full-market contract store
    `CREATE TABLE IF NOT EXISTS "ContractCache" ("noticeId" TEXT NOT NULL PRIMARY KEY,"payload" TEXT NOT NULL,"naicsCode" TEXT NOT NULL DEFAULT '',"setAside" TEXT NOT NULL DEFAULT '',"postedDate" DATETIME,"deadline" DATETIME,"updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE INDEX IF NOT EXISTS "ContractCache_naicsCode_idx" ON "ContractCache"("naicsCode")`,
    `CREATE INDEX IF NOT EXISTS "ContractCache_postedDate_idx" ON "ContractCache"("postedDate")`,
    // Coming-soon waitlist
    `CREATE TABLE IF NOT EXISTS "Waitlist" ("id" TEXT NOT NULL PRIMARY KEY,"email" TEXT NOT NULL,"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Waitlist_email_key" ON "Waitlist"("email")`,
    `CREATE TABLE IF NOT EXISTS "UserEmbedding" ("userId" TEXT NOT NULL PRIMARY KEY,"preferenceEmbedding" TEXT NOT NULL,"saveCount" INTEGER NOT NULL DEFAULT 0,"updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "UserEmbedding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  ]

  const results: string[] = []
  for (const sql of statements) {
    try {
      await client.execute(sql)
      results.push(`OK: ${sql.slice(0, 60)}...`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('duplicate column') || msg.includes('already exists')) {
        results.push(`SKIP (already exists): ${sql.slice(0, 60)}...`)
      } else {
        results.push(`ERROR: ${msg} | SQL: ${sql.slice(0, 60)}...`)
      }
    }
  }

  return NextResponse.json({ success: true, tables: results })
}
