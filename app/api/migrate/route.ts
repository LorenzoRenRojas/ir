import { createClient } from '@libsql/client'
import { NextResponse } from 'next/server'

const MIGRATION_KEY = process.env.MIGRATION_KEY

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get('key') !== MIGRATION_KEY || !MIGRATION_KEY) {
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
  ]

  const results: string[] = []
  for (const sql of statements) {
    await client.execute(sql)
    results.push(`OK: ${sql.slice(0, 50)}...`)
  }

  return NextResponse.json({ success: true, tables: results })
}
