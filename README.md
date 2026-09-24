# IR: federal contracting intelligence for small businesses

Live at **[ir-gov.app](https://ir-gov.app)**

## The problem

Large federal contractors pay capture analysts whose job is deciding which contracts are worth bidding on. A ten-person firm has no one in that seat, so it guesses. A serious federal proposal takes 40 to 80 hours to write, so every wrong guess is expensive.

## What IR does

- Finds open federal solicitations and scores each one against a company's profile (industry codes, set-aside certifications, contract size, location), with a written explanation for every part of the score.
- **Recompete Radar** surfaces contracts in the company's industry codes that expire in roughly the next 18 months, before the replacement solicitation is posted.
- Saved contracts with a pipeline status, deadline reminder emails, and a daily email digest of new matches.

## Status

IR is live and pre-revenue, with a couple of users. I built it solo starting in May 2026. AI wrote most of the code; I set the constraints, made the product and architectural calls, and integrated the data sources.

## Architecture

```
SAM.gov (about 10 requests/day) --> contract sync (scheduled + background, budget-gated) --+
USAspending (past awards)       --> Radar scans, incumbent lookups, award matching ---------+
Voyage AI                       --> text embeddings for re-ranking -------------------------+
                                                                                            |
                                                                                            v
                                       Turso database: live market, archive, caches, users, profiles
                                                                                            |
Federal Register --> regulatory feed (cached 12 hours) --+                                  |
                                                         v                                  v
                                            Dashboard (Next.js on Vercel)   Scheduled jobs --> email (Resend)
```

The core idea: users never wait on SAM.gov. SAM.gov allows a personal API key only a handful of requests a day, so IR copies the recent market into its own database on a schedule, and every page reads from that copy. Freshness can lag by a few hours, but a slow or exhausted upstream never takes the dashboard down. USAspending and the Federal Register are free, so IR calls them more freely and caches the results.

## Engineering decisions worth reading

### The SAM.gov daily request budget
**Constraint:** about 10 requests a day, shared by serverless instances that don't share memory. An in-memory counter would give each instance its own budget.
**Decision:** the counter lives in a database table and is claimed with a single conditional `UPDATE` ("add one only if the total stays under the ceiling"), so two instances can't both spend the last unit (`lib/sam-quota.ts`). The market sync may use the full budget; every other caller leaves six requests in reserve. When the budget is gone, everything serves stored data.
**Tradeoff:** data can be hours old, and the claim deliberately fails open if the database itself errors.

### The quota-burn incident
**Constraint:** the health endpoint checked SAM.gov on every request.
**What happened:** an uptime monitor pinging every five minutes used up the whole daily quota, which pushed the platform onto sample data.
**Decision:** the probe now runs at most once every six hours per instance and reuses its last result. Each probe also has to claim non-critical budget, so it can never touch the sync's reserve (`app/api/cron/health/route.ts`).
**Tradeoff:** the SAM.gov health signal can be up to six hours old.

### Recompete Radar
**Constraint:** USAspending can filter awards by the date they were signed, but not by when they end.
**Decision:** for each NAICS code, two scans run in parallel over different signing windows (6 to 2.5 years ago, and the last 2.5 years), sorted by end date and stopping once they pass today. Requests have timeouts and one retry. Results are cached for 24 hours per code, stale results are served if USAspending is down, and empty results are never cached (`lib/usaspending.ts`).
**Tradeoff:** awards signed more than six years ago are not scanned, and an end date can move if the government extends the contract.

### Time-budgeted scheduled jobs
**Constraint:** each scheduled job gets a 300-second hard limit.
**Decision:** jobs track their own clock, stop starting new work at 240 seconds, and record how many users they deferred to the next run. Genuine failures email the admin; one-off blips are only logged (`app/api/cron/`).
**Tradeoff:** deferred users get their email a day late.

### Honest failure modes
**Constraint:** with no data available, it would be easy to show something that looks real.
**Decision:** when the dashboard falls back to sample contracts, it shows a clear SAMPLE DATA banner. If the feed itself errors, it returns an explicit "temporarily unavailable" response instead of quietly serving sample data.
**Tradeoff:** outages are visible to users, which is the point.

## Tech stack

- Next.js (App Router)
- TypeScript
- Prisma + Turso (libSQL)
- NextAuth
- Vercel + Vercel Cron
- Resend
- Voyage AI embeddings

## Known limitations

- The fit score and win-probability labels are heuristics based on common capture rules of thumb. They are not calibrated against outcomes.
- An evidence-tiered scorer (Measured / Structural / Heuristic) is designed and coded (`lib/evidence-score.ts`) but not yet wired into the live score.
- Award matching (linking solicitations to their eventual awards) is experimental. Its confidence scores have known issues, and no user-facing score uses them.
- The scheduled jobs are configured, but I have not verified that they run in production.
- There are no automated tests yet.
- IR holds a synced subset of SAM.gov, not a complete census, so figures are stated as "IR tracked N", never "N exist."

A detailed walkthrough of how each part works, including what is and isn't verified, is in [`IR_SYSTEM_GUIDE.md`](IR_SYSTEM_GUIDE.md).

## Running locally

Requires Node.js.

```bash
npm install            # also runs prisma generate
cp .env.example .env   # then set NEXTAUTH_SECRET to any random string
npx prisma db push     # creates a local SQLite database from the schema
npm run dev            # http://localhost:3000
```

**Required:** `DATABASE_URL` (the example points at a local SQLite file), `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.

**Optional:**
- `SAM_GOV_API_KEY`: live contracts. Without it, the dashboard shows sample data.
- `RESEND_API_KEY`: email.
- `VOYAGE_API_KEY`: semantic re-ranking.
- `CRON_SECRET`: required for scheduled jobs in production.
- `ADMIN_EMAIL`
- `SAM_DAILY_BUDGET`
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: Google sign-in.

Never commit real values.

## Contact

Lorenzo Rojas
- [ir-gov.app](https://ir-gov.app)
- [LinkedIn](https://www.linkedin.com/in/lorenzo-ren-rojas/)
- lorenzo.rojas99x@gmail.com
