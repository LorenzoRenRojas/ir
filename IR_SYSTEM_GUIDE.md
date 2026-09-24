# IR System Guide

A study guide to how IR actually works, written from the code as it stands on
2026-09-23 (commit `c9c8dc7`). It is for the person who directed the build and
wants to be able to explain it, and for the Claude that will teach from it.

**Note to the teaching Claude:** the learner set the constraints and made the
product calls but can't yet read the code fluently. Teach one part at a time.
After each part, ask them to explain it back in their own words before moving
on. Every claim here points at a file and line so you can open the code and
check. If the code has changed since this was written, trust the code.

**The ownership line, and the limits on it.** "AI wrote most of the code. I set
the constraints, made the product calls, and I can walk you through how the
core pieces work." Never claim any of the following: revenue (there is none),
paying customers (there are none), more than about two users, a CS degree, an
engineering job, AI-written proposals (the generator fills templates), a
calibrated score (it isn't), or anything that has run at scale.

---

## Architecture on one page

IR is a website plus a set of scheduled jobs. Both run on **Vercel**, a hosting
service that runs the code on demand across many short-lived copies rather than
one always-on server. Everything IR remembers lives in one database (**Turso**,
a hosted version of SQLite).

```
                 OUTSIDE WORLD                          IR
  ┌───────────────────────────┐
  │ SAM.gov Opportunities API │  ~10 requests/day   ┌──────────────────────────┐
  │ (open solicitations)      │ ──────────────────▶ │ Contract sync            │
  └───────────────────────────┘  (budget-gated)     │ lib/sam-api.ts           │
                                                    └────────────┬─────────────┘
  ┌───────────────────────────┐                                  │ writes
  │ USAspending.gov API       │                                  ▼
  │ (past awards; free,       │               ┌────────────────────────────────┐
  │  no key)                  │               │ DATABASE (Turso)               │
  └─────┬───────────┬─────────┘               │  ContractCache  = live market  │
        │           │                         │  ContractArchive = expired     │
        │           │                         │  ContractOutcome = matched     │
        │           │                         │                    awards      │
        │           │                         │  Kv = counters, locks, caches  │
        │           │                         │  User, CompanyProfile, ...     │
        │           │                         └───────┬────────────────┬───────┘
        │           │                                 │ reads          │ reads
        │           │                                 ▼                ▼
        │           │           ┌──────────────────────────┐  ┌─────────────────────┐
        │           └─────────▶ │ Dashboard feed + scoring │  │ Scheduled jobs      │
        │  incumbent, small-biz │ app/api/contracts        │  │ (crons, vercel.json)│
        │  share (top 12 rows)  │ lib/matching.ts          │  │ sync, digest,       │
        │                       │ lib/win-probability.ts   │  │ reminders, weekly   │
        │                       └──────────────────────────┘  └──────────┬──────────┘
        │                                                                │
        ├──▶ Recompete Radar (lib/usaspending.ts getRecompetes) ◀────────┤ nightly
        └──▶ Award matching  (lib/outcomes.ts collectOutcomes)  ◀────────┘ nightly
                                                                 │
  ┌───────────────────────────┐                                  │ emails
  │ Voyage AI (embeddings)    │ ◀── semantic re-ranking          ▼
  └───────────────────────────┘                          ┌────────────────┐
                                                         │ Resend (email) │
                                                         └────────────────┘
```

The core idea: **users never wait on SAM.gov.** SAM.gov allows only a handful of
requests a day, so IR copies the market into its own database a few times a day
and every page reads from that copy. USAspending is free, so IR calls it more
freely and caches the answers.

---

## Part 1: How a solicitation gets from SAM.gov into IR

### What it does
IR keeps its own copy of recently posted federal opportunities, refreshed from
SAM.gov a few times a day. When you open the dashboard you're reading that copy,
not SAM.gov itself, so the page loads even when SAM.gov is slow, down, or out of
requests for the day.

### Why it exists
SAM.gov gives a personal API key roughly 10 requests per day (the handbook's
figure). If a single page called SAM.gov on load, one busy morning would use up
the day's requests and every user would see errors. So the constraint is
**spend a tiny number of requests on a schedule, and serve everything else from
storage.**

### How it works
1. **Trigger.** A sync can start three ways, all through
   `maybeSyncContracts()` (`lib/contract-refresh.ts:73`):
   - the `sync-contracts` cron at 00:00 UTC (`vercel.json`), with `force: true`
   - the `daily-digest` cron at 12:00 UTC, also with `force: true`
   - a logged-in user loading the feed. The contracts route schedules a
     background refresh *after* the response is sent, using Next's `after()`
     (`app/api/contracts/route.ts:101`).
2. **Throttle.** Unless forced, it skips if the last attempt was under 6 hours
   ago (`contract-refresh.ts:24`). The exception is a "thin" store: fewer than
   400 live contracts (`:30`) triggers a sync regardless.
3. **Lock.** It checks a lock in the `Kv` table. If another copy started a sync
   in the last 5 minutes it stops; if not, it sets the lock
   (`contract-refresh.ts:88-90`).
4. **Budget check.** Before *each* SAM.gov request, the sync asks the global
   budget for permission: `tryConsumeSamRequests(1, { critical: true })`
   (`lib/sam-quota.ts:83`). "Critical" means the sync may use the whole daily
   budget; everything else must leave 6 requests in reserve (`sam-quota.ts:25`).
5. **Phase 1 fetch.** One broad request pulls the newest ~1,000 notices from the
   last 45 days (`lib/sam-api.ts:515-522`).
6. **Phase 2 fetch.** SAM.gov returns about 1,000 records per query, and asking
   for the next page returns nothing. To go deeper, the sync asks for one older
   day at a time (day 2, day 3, …) until it has made 5 requests in total or the
   budget says no (`sam-api.ts:458`, `:528-539`).
7. **Save.** Each notice is converted to IR's `Contract` shape and upserted into
   `ContractCache` in chunks of 100. If a whole chunk fails, it retries row by
   row (`sam-api.ts:468-511`).
8. **Archive, then prune.** Notices whose deadline has passed (or with no
   deadline, posted over 90 days ago) are copied into `ContractArchive` and then
   deleted from `ContractCache` (`sam-api.ts:541-582`).
9. **Read path.** When a page needs contracts, `fetchContracts()`
   (`sam-api.ts:694`) reads `ContractCache` and keeps a 10-minute copy in the
   memory of that server instance.

### Key files
| File | Responsibility |
|---|---|
| `lib/sam-api.ts` | Calls SAM.gov, converts its format, runs the sync, reads the store, holds the mock data |
| `lib/sam-quota.ts` | The shared daily request budget, auto-clamp, and 429 backoff |
| `lib/contract-refresh.ts` | Decides *whether* to sync now (throttle, thin-store check, lock) |
| `app/api/cron/sync-contracts/route.ts` | The midnight cron. Checks the cron password, then calls the coordinator |
| `app/api/admin/sync-contracts/route.ts` | The admin "SYNC CONTRACTS NOW" button. Calls the sync directly and skips the lock |

### Code excerpt 1: the atomic budget claim (`lib/sam-quota.ts:91-93`)
```ts
await prisma.$executeRaw`INSERT INTO "Kv" ("key", "value", "updatedAt")
  VALUES (${key}, '0', CURRENT_TIMESTAMP) ON CONFLICT ("key") DO NOTHING`
const claimed = await prisma.$executeRaw`UPDATE "Kv"
  SET "value" = CAST(CAST("value" AS INTEGER) + ${n} AS TEXT), ...
  WHERE "key" = ${key} AND CAST("value" AS INTEGER) + ${n} <= ${ceiling}`
return claimed > 0
```
- **Line 1:** make sure today's counter row exists (the key looks like
  `sam-quota:2026-09-23`). If it's already there, do nothing.
- **Lines 2-4:** in *one* database statement, add `n` to the counter, **but
  only if** the new total stays within the ceiling. The check and the increment
  happen together, so two copies of the server can't both read "3 used", both
  decide there's room, and both spend.
- **Line 5:** the database reports how many rows it changed. 1 means you got the
  budget. 0 means the day's budget is spent, so skip the call and use stored data.

### Code excerpt 2: the fallback chain (`lib/sam-api.ts:694-707`)
```ts
export async function fetchContracts(profile?: CompanyProfile) {
  const apiKey = process.env.SAM_GOV_API_KEY
  if (!apiKey) return MOCK_CONTRACTS
  const fromDb = await readContractsFromDb()
  if (fromDb && fromDb.length > 0) return fromDb
  try {
    return await getCachedContracts()
  } catch (error) {
    return MOCK_CONTRACTS
  }
}
```
- With no API key configured, show 12 hard-coded sample contracts.
- Normally, return the stored market from `ContractCache`.
- If the store is empty, try one live 100-row SAM.gov call (budget-gated, and
  its answer is cached for 6 hours).
- If that fails too, show the sample contracts. The dashboard shows a red
  SAMPLE DATA banner when it sees them
  (`app/(dashboard)/dashboard/page.tsx:792`).

### Database tables
- **`ContractCache`** (the live market): `noticeId` (SAM's ID for the notice,
  the primary key), `payload` (the whole contract as JSON text), `naicsCode`,
  `setAside`, `postedDate`, `deadline`. Indexed on the last three so lookups by
  them are fast.
- **`ContractArchive`**: same shape, plus `archivedAt`. It only grows. Expired
  notices end up here.
- **`Kv`** (a key/value table): `sam-quota:<date>` (requests used today),
  `sam-daily-limit` (the limit SAM.gov reports in its response headers),
  `sam-rate-hit:<date>` (today's backoff after a 429),
  `contracts:last-sync-attempt` and `contracts:sync-lock` (both timestamps).

### What happens when it fails
- **Budget spent:** the sync stops early and reports `quotaBlocked: true`. Pages
  keep serving the existing store.
- **SAM.gov returns 429 (too many requests):** it records a backoff for the rest
  of the UTC day, capped so it can't drop below 4 requests
  (`sam-quota.ts:36`, `:113-119`), and the sync throws. The store is unchanged.
- **Timeout:** a request gets 20 seconds, then one retry with 30 seconds
  (`sam-api.ts:406-418`). One failed older-day window doesn't stop the others,
  but a Phase 1 failure ends the whole sync.
- **Database error during the budget claim:** the claim returns `true`, which
  allows the call (`sam-quota.ts:94-96`). This is a deliberate "fail open" so
  things work before the table exists, but it means a database outage switches
  off the budget.
- **Empty store, no budget:** users see sample data with the banner.

### Known weak spots
- **The quota numbers disagree.** Code comments say "~8 req/day, one sync costs
  3" (`contract-refresh.ts:20`) and "reserve enough for two syncs, 3 pages each"
  (`sam-quota.ts:23`). The handbook says ~10/day and 3 pages. The code actually
  defaults to a budget of 20 (`sam-quota.ts:22`) and up to 5 requests per sync
  (`sam-api.ts:458`). The auto-clamp only corrects this if SAM.gov sends
  rate-limit headers, and nothing checked in shows whether it does.
- **The retry isn't counted.** A retried timeout is a second real request to
  SAM.gov but claims only one budget unit, so the counter can undercount.
- **The lock isn't atomic.** It reads, then writes, so two copies can both take
  it at the same moment. The budget still caps total spend, so the worst case is
  duplicate work, not overspending.
- **Each dashboard load reads the whole store** (thousands of JSON rows) into
  memory, cached for only 10 minutes per instance (`sam-api.ts:600-624`).
- **"IR tracked N", never "N exist."** The store is a subset of SAM.gov (at most
  roughly 5,000 notices from 5 requests), not a complete census. Every public
  number should be worded that way.
- **The digest cron doesn't check for sample data.** If the store were empty and
  the live fallback failed, `fetchContracts()` would return the mock contracts,
  whose posted dates are relative to "now". The digest would treat them as fresh
  and could email them to users. That needs several failures at once, but
  nothing prevents it.

---

## Part 2: How a solicitation gets scored against a company profile

**Read this first. The code doesn't match the five-part outline you gave me.**
The MEASURED / STRUCTURAL / HEURISTIC scorer exists (`lib/evidence-score.ts`),
but **no page, API route or cron calls it.** The same goes for the market
base-rate function it depends on (`segmentBaseRate` in `lib/base-rates.ts`) and
the UEI firm-history endpoint (`app/api/firm-lookup/route.ts`, which no page
calls). The scores users actually see come from two other, simpler functions.
The homepage (`app/page.tsx:238-240`) and the capabilities page describe the
tiers as how the score works, so the public claim runs ahead of the product.
Learn both, and in interviews describe the tiers as "designed and coded, not yet
wired into the live score."

### What it does (the live version)
Every contract in the feed gets a 0-100 fit score based on four things about
your company: your industry codes, your small-business certifications, the
contract sizes you pursue, and where you work. The top 40 contracts also get a
"win probability" label (HIGH, MEDIUM, LOW or INELIGIBLE) with a verdict of
PURSUE, CONDITIONAL, LONG SHOT or INELIGIBLE.

### Why it exists
A small firm can't read hundreds of notices a week. The first cut is mechanical:
is this in my line of work, am I legally allowed to bid it, is it the right
size, is it somewhere I can deliver? That can be computed from data already on
the notice and the profile, at no API cost.

### How it works
1. The feed route loads your `CompanyProfile` (`app/api/contracts/route.ts:60-94`).
2. It reads the market from the store (Part 1) and applies your filters (search,
   agency, set-aside, NAICS, due date).
3. **Match score** (`lib/matching.ts:118`), out of 100:
   - **NAICS, 40 points:** 40 for an exact code match; 28, 20 or 10 when only
     the first 4, 3 or 2 digits match
   - **Set-aside, 25 points:** 25 if it's open competition or you hold the
     certification; 15 if IR can't map the set-aside type; 0 if you're not
     eligible
   - **Size, 20 points:** based on how many size bands the contract is from your
     preference. An unposted value counts as neutral (12)
   - **Geography, 15 points**
4. An optional filter hides set-asides you can't bid on (`isSetAsideEligible`).
5. Sort by score, with a hidden +3 for agencies you've worked with, and keep the
   top 100 (`route.ts:206`).
6. **Semantic re-ranking** (only if the Voyage key is set): each contract's text
   is turned into an embedding and compared with your preference vector. The
   displayed score **becomes a blend**, 30% semantic at first and up to 75%
   semantic after 15+ saves (`lib/embeddings.ts:66`, `route.ts:390`).
7. **Enrichment** for the top 12: two USAspending lookups, the "incumbent" and
   the small-business share of the market, with a 6-second deadline
   (`route.ts:248`).
8. **Win probability** for the top 40 (`lib/win-probability.ts:69`): set-aside
   eligibility (40 points, or 15 for open competition), NAICS (20), size against
   your revenue (20), competition (15) and agency history (5).

### Key files
| File | Responsibility |
|---|---|
| `lib/matching.ts` | The live 4-factor match score and the eligibility filter |
| `lib/win-probability.ts` | The live win-probability label and verdict |
| `lib/embeddings.ts` | Voyage embeddings, similarity, the blend |
| `app/api/contracts/route.ts` | The feed: loads, filters, scores, ranks, enriches |
| `lib/evidence-score.ts` | The **unwired** tiered scorer |
| `lib/base-rates.ts` | Market statistics from matched awards. Only `coverage()` is used, on `/admin` |
| `lib/firm-history.ts` | UEI → a firm's award history (only reachable through the unused firm-lookup route) |

### Code excerpt 1: the eligibility gate (`lib/win-probability.ts:80-96`)
```ts
const required = SET_ASIDE_ELIGIBILITY[contract.setAsideType]
if (required) {
  const eligible = profile.businessTypes.some((bt) => required.includes(bt))
  if (!eligible) {
    return { score: 0, label: 'INELIGIBLE', ... }
  }
  score += 40
} else {
  score += 15
}
```
- Look up which status this set-aside requires, for example `SDVOSBC` →
  "SDVOSB".
- If the contract is set aside and you don't hold that status, stop: you can't
  bid it as prime, and the score is 0.
- If you qualify, add 40, because the field is limited to firms like you.
- Open competition earns only 15, because anyone can bid.
- This is the one part that really is "structural": it applies a published rule.

### Code excerpt 2: the tier roll-up that isn't used (`lib/evidence-score.ts:204-207`)
```ts
const total = Math.max(0, Math.min(100, components.reduce((s, c) => s + c.points, 0)))
const measuredPoints = components.filter(c => c.tier === 'measured')...
const structuralPoints = components.filter(c => c.tier === 'structural')...
const measuredShare = total > 0 ? +((measuredPoints + structuralPoints) / total).toFixed(2) : 0
```
- Add up every component's points and clamp the total between 0 and 100.
- Separately total the points from the MEASURED and STRUCTURAL tiers.
- `measuredShare` is the fraction of the score that is evidence rather than
  assumption. Note that it counts structural points as evidence. This was
  designed to be shown to users, and currently isn't.

### Database tables
Reads `CompanyProfile`: `naicsCodes`, `businessTypes`, `certifications`,
`contractSizePrefs` and `geoPrefs` (all JSON arrays stored as text), plus
`agencyHistory` and `annualRevenue`. Reads and writes `ContractEmbedding`
(`noticeId` → a 512-number vector) and `UserEmbedding` (`preferenceEmbedding`,
`saveCount`). The unwired scorer would read `ContractOutcome` and `FirmHistory`.

### What happens when it fails
A missing or corrupt profile gives an unscored feed rather than an error. An
embedding failure keeps the metadata score. If USAspending takes longer than 6
seconds, the feed returns without incumbents, and win probability degrades to
its defaults. If the whole route throws, it returns a 503 with an honest message
rather than sample data (`route.ts:305-324`).

### Known weak spots
- **The tiered scorer is advertised but not used.** This is the biggest gap
  between what the site says and what the code does.
- **There are three different eligibility tables that disagree.**
  `matching.ts:44` maps `8A` to "8(a)" and has no entries for the sole-source
  codes (`8AN`, `SDVOSBS`, `WOSBSS`, `HZS`) or `HZC`, the HUBZone code SAM
  actually uses. The matcher calls those "unmappable" and gives a neutral 15
  instead of checking eligibility. `win-probability.ts` and
  `evidence-score.ts` map "8(a) Certified" and do include those codes. So the
  same contract can be "eligible" in one score and "INELIGIBLE" in another.
- **The "incumbent" isn't this contract's incumbent.** `_fetchIncumbent`
  receives the agency but never uses it (`lib/usaspending.ts:10-19`). It returns
  the single largest award in that NAICS code since 2022, from any agency.
- **Blending breaks the arithmetic.** With embeddings on, the number shown is
  partly semantic, so the four factor scores no longer add up to it. The
  contract detail page recomputes the plain metadata score
  (`app/(dashboard)/contracts/[id]/page.tsx:123`), so it can show a different
  number from the feed card.
- **None of this is calibrated.** The thresholds (70 = PURSUE, 40 =
  CONDITIONAL) borrow the common capture rule of thumb. They haven't been tested
  against any outcomes.
- A code comment calls the 75%-semantic stage "well-calibrated"
  (`embeddings.ts`). It isn't. That comment is a label, not a measurement.

---

## Part 3: Recompete Radar

### What it does
It shows federal contracts in your industry codes that are due to end within
about the next 18 months, with who holds them now and how much they're worth.
Most service contracts are competed again when they end, so this gives you
months of warning before the new solicitation appears on SAM.gov.

### Why it exists
By the time a solicitation posts, the firms that knew it was coming have
already met the agency and shaped the requirement. A contract's end date is
public in award data, so you can see the opportunity early. USAspending is free
and needs no key, so this costs no SAM.gov budget.

### How it works
1. **Trigger:** the Radar page calls `GET /api/recompetes`
   (`app/api/recompetes/route.ts`), or the daily-digest cron runs it for each
   user who opted in (`daily-digest/route.ts:236-313`).
2. Read up to 8 NAICS codes from your profile.
3. For each code, check the cache: a `Kv` row `recompete:v5:<code>`. If it holds
   results less than 24 hours old, use them (`lib/usaspending.ts:368`).
4. Otherwise **scan** the code (`scanCode`, `:300`). USAspending can't filter by
   end date, only by the date an award was signed. So the scan runs two searches
   in parallel: awards signed 6 to 2.5 years ago (up to 3 pages of 100) and
   awards signed in the last 2.5 years (up to 4 pages). Both are sorted by end
   date, newest first, and stop once they pass today.
5. **Keep** awards ending between now and 18 × 30 days from now (`:302`).
6. **Quality gate** (`:322`): drop rows with no internal ID, no description, no
   named recipient, or under $10K.
7. Save the fresh result to the cache, but never an empty one.
8. Merge all codes, remove duplicates, drop anything already expired, and sort
   soonest first.
9. The API route **scores** each award out of 100: timing (35; 6 to 12 months
   out is the sweet spot), size against your preferences (25), agency
   familiarity (20), and "taste" from embeddings (20, or a neutral 10 without
   them) (`recompetes/route.ts:21-141`).
10. The digest cron emails each user up to 8 **new** awards, then records *all*
    new ones as seen in `Kv` `recompete-alerted:<userId>`.

### Key files
| File | Responsibility |
|---|---|
| `lib/usaspending.ts` | `getRecompetes`, `scanCode`, `scanWindow`, `fetchRecompetePage`, the cache |
| `app/api/recompetes/route.ts` | Loads the profile, calls the scan, scores and sorts |
| `app/(dashboard)/recompetes/page.tsx` | The Radar tab |
| `app/api/cron/daily-digest/route.ts` | The nightly scan plus alert emails |

### Code excerpt 1: the quality gate (`lib/usaspending.ts:326-331`)
```ts
const internalId = row.generated_internal_id?.trim()
const description = row['Description']?.trim()
const incumbent = row['Recipient Name']?.trim()
const amount = typeof row['Award Amount'] === 'number' ? row['Award Amount'] : null
if (!internalId || !description || !incumbent) continue
if (amount === null || amount < 10_000) continue
```
- Pull four fields from each award and trim the whitespace.
- If any of ID, description or recipient is missing, skip the award.
  `continue` means "move on to the next row".
- Skip awards with no amount or under $10,000. Federal award data has many
  near-empty rows, and the gate stops those showing up as useless cards.

### Code excerpt 2: stale-if-error caching (`lib/usaspending.ts`, inside `getRecompetes`)
```ts
if (parsed.length > 0 && Date.now() - new Date(row.updatedAt).getTime() < RECOMPETE_TTL_MS) {
  return parsed
}
if (parsed.length > 0) stale = parsed
...
} catch (err) {
  if (stale) return stale
  throw err
}
```
- If the cached list isn't empty and is under 24 hours old, use it.
- If it's older, keep it aside as `stale`.
- If the live scan then fails, return yesterday's list rather than an error.
  Only when there's no cache at all does the error reach the user.

### Database tables
`Kv` only: `recompete:v5:<naics>` (a JSON list of awards, with `updatedAt`
showing its age) and `recompete-alerted:<userId>` (award IDs already emailed,
capped at the last 800). `ContractEmbedding` rows keyed `award:<id>` hold award
embeddings for the taste score.

### What happens when it fails
USAspending is often slow. Each page gets 25 seconds, and one retry with 40
seconds on a timeout or 5xx error. If the end-date sort is rejected with a 400
error, it falls back to sorting by amount. If one code fails, the other codes
still show. If everything fails with no cache, the page gets a 502 with the
error message. In the cron, a failure is logged as "degraded" and doesn't email
the admin.

### Known weak spots
- **"18 months" means 540 days.** A month is treated as 30 days.
- **An end date isn't a recompete.** The "current end date" can be pushed out by
  options or extensions, and some work is never competed again. It's a strong
  signal, not a guarantee.
- **The signing windows are a heuristic.** Awards signed more than 6 years ago
  that still run (long IDIQ orders) are never searched, and page caps can cut
  off large NAICS codes. Only award types A to D are included.
- **Alert overflow is silent.** Only 8 awards are emailed, but every new one is
  marked as seen, so the 9th and later are never alerted.
- **The digest's "deferred" count is wrong.** It subtracts alerts *sent*, not
  users *processed* (`daily-digest/route.ts:258`), and the starting user rotates
  on `getUTCDate() % n`.

---

## Part 4: Award matching (the "ground truth" collector)

### What it does
When a solicitation IR tracked expires, IR later looks up the public award
records to find out who actually won it, and for how much. Each match is saved
with a confidence score and the method used, building a record of what really
happened.

### Why it exists
The score can't honestly be called a probability until you can check it against
outcomes. Awards post weeks or months after a solicitation closes, so the data
has to be collected as it arrives. You can't go back and reconstruct it later
for notices you never archived. That's the reasoning behind the whole idea.

### How it works
1. **Trigger:** only the daily-digest cron, and only if more than 20 seconds of
   its 240-second budget remain (`daily-digest/route.ts:318-329`). There's no
   admin button or other caller.
2. Load the notice IDs already in `ContractOutcome` (the first 5,000), then the
   oldest 160 rows in `ContractArchive`, and keep up to 40 that haven't been
   matched yet (`lib/outcomes.ts:191-198`).
3. For each one, `matchAward()` (`:83`) searches USAspending for awards within a
   window of 30 days before to 400 days after the deadline:
   - **Exact:** search for the solicitation number. If an award's ID
     *contains* that number, confidence **100**. If the fuzzy search returns
     exactly one award, confidence **75**.
   - **Statistical:** otherwise fetch the 25 *largest* awards in that NAICS in
     the window, keep those whose agency name contains the *first word* of the
     solicitation's agency, then:
     - one award within 3x of the advertised value → **55**
     - several → the closest one at **40**
     - no value, but exactly one agency award → **45**
4. Save a row to `ContractOutcome` with the award, the confidence, the method,
   and a snapshot of the features (value ratio, days to award).
5. Stop at 40 rows or when the time budget runs out.
6. **Reading it:** only the `/admin` page reads this table, through
   `coverage()`. It shows counts and a stage (COLLECTING below 500 "quotable"
   rows, CALIBRATION from 500, TRAINING from 5,000), where quotable means
   confidence ≥ 55 (`lib/base-rates.ts:19`). No user-facing score uses it.

### Key files
| File | Responsibility |
|---|---|
| `lib/outcomes.ts` | `matchAward`, `collectOutcomes`, `outcomeCount` |
| `lib/base-rates.ts` | Statistics over outcomes (`segmentBaseRate`, unused) and `coverage()` (used on admin) |
| `app/api/cron/daily-digest/route.ts` | The only caller |
| `app/api/migrate/route.ts` | Creates the `ContractOutcome` table (line 96) |

### Code excerpt 1: the exact match (`lib/outcomes.ts:123-127`)
```ts
const cited = exact.find(a =>
  String(a['Award ID'] ?? '').toUpperCase().includes(sol.solicitationNumber.toUpperCase())
)
if (cited) return shape(cited, 100, 'solicitation-number')
if (exact.length === 1) return shape(exact[0], 75, 'solicitation-keyword')
```
- Look for an award whose ID contains the solicitation number. If found, record
  it at 100.
- **The weak line:** if the fuzzy keyword search returned exactly one award of
  any kind, record it at 75. The comment two lines above says "a loose hit is
  not evidence", and this line then treats a loose hit as fairly strong
  evidence.

### Code excerpt 2: the agency filter (`lib/outcomes.ts:143-148`)
```ts
const agency = sol.agency.toLowerCase()
const sameAgency = candidates.filter(a =>
  agency && String(a['Awarding Agency'] ?? '').toLowerCase().includes(agency.split(' ')[0])
)
const pool = sameAgency.length > 0 ? sameAgency : []
if (pool.length === 0) return null
```
- Take the solicitation's agency name, lowercase it, and keep only its **first
  word**.
- Keep candidate awards whose agency name contains that word.
- If the name is "Department of Defense", the word is "department", which
  matches the Department of Energy, of Agriculture, of Veterans Affairs, and so
  on. If SAM formats it as "DEPT OF DEFENSE", the word is "dept", which may
  match nothing in USAspending's names. Which one happens depends on SAM's
  format, and I couldn't check that without the database. Either way, the
  filter doesn't do what its name says.

### Database tables
Reads `ContractArchive`. Writes `ContractOutcome`:
- `noticeId`: the solicitation
- `awardId`, `awardee`, `awardeeUei`, `awardAmount`, `awardDate`: the award
- `matchConfidence` (0-100) and `matchMethod`: how sure the match is and why
- `features`: a JSON snapshot
- `offersReceived` and `awardeeIsSmall`: **always null.** The code says so
  openly (`outcomes.ts:103-106`).

### What happens when it fails
Every USAspending error or timeout returns an empty list, so the notice is
counted as "skipped", not as an error, and is retried the next night. If the
`ContractOutcome` table doesn't exist, the first query fails and the collector
records one error and returns. The handbook says this migration still had to be
run as of the September funnel work. Nothing emails anyone about a collector
failure; it's only logged as "degraded".

### Known weak spots (why the confidence scores can't be trusted yet)
1. **The first-word agency filter**, described above.
2. **Candidates are the 25 largest awards**, sorted by amount. For a big NAICS
   code these are enormous contracts, and the true award for a small
   solicitation is unlikely to be among them. When the value is missing, the
   "only one agency award" rule then gives 45 to whatever large award survived.
3. **A single fuzzy keyword hit scores 75**, above the "quotable" threshold of
   55. That means weak matches count as quotable, and "quotable" would feed the
   MEASURED tier if the tier were ever wired in.
4. **Award IDs rarely contain the solicitation number.** Award numbers and
   solicitation numbers are usually different, so the 100-confidence path
   probably fires rarely. This is an inference; nobody has measured it.
5. **`update: {}` on upsert.** A match is written once and never revisited, so a
   wrong early match stays forever.
6. **Oldest-first over only 160 rows**: if those 160 keep getting "skipped", the
   collector keeps retrying the same rows every night and never reaches newer
   archives.

---

## Part 5: The scheduled jobs

### What it does
Four jobs run on a timer. One refreshes the contract store at midnight UTC. One
sends each user a daily email of new matches, scans for expiring contracts, and
collects award outcomes. One reminds users about approaching deadlines on
contracts they saved. One sends a weekly pipeline summary on Mondays.

### Why it exists
The product has to keep working when nobody is logged in. The store has to stay
fresh, alerts have to go out, and the outcome dataset only grows if something
runs every day.

### How it works
| Job (`vercel.json`) | When (UTC) | What it does |
|---|---|---|
| `/api/cron/sync-contracts` | 00:00 daily | `maybeSyncContracts({force:true})`, then returns stats |
| `/api/cron/daily-digest` | 12:00 daily | Sync; email each verified, opted-in user up to 5 matches scoring ≥ 55 posted in the last 48h, plus up to 3 watchlist hits, never repeating a notice; pre-embed up to 512 contracts; Radar scan and alerts; outcome collection; delete `EmailLog` rows older than 90 days |
| `/api/cron/deadline-reminders` | 13:00 daily | Email when a saved contract's deadline is 2-3 days or 0-1 days away |
| `/api/cron/weekly-report` | 13:30 Mondays | Per-user pipeline summary, plus the founder brief to the admin |

Each run follows the same flow:
1. Vercel calls the URL. If `CRON_SECRET` is set in the project, Vercel adds the
   header `Authorization: Bearer <secret>`.
2. `isAuthorizedCron()` (`lib/cron.ts:7`) checks it. **In production, if
   `CRON_SECRET` isn't set, every request is refused with 401.**
3. The job tracks its own clock and stops starting new work at 240 seconds,
   leaving time before the 300-second hard limit.
4. Failures go into two buckets. **problems** (something is really broken)
   email the admin. **degraded** (one bounced email, an external API blip, a
   deferred user) is only logged.

### Key files
`vercel.json` (the schedule), `lib/cron.ts` (the password check), the four
routes under `app/api/cron/`, `app/api/cron/health/route.ts` (not scheduled;
it's meant for an external uptime monitor), and `lib/email.ts` (sending and
`EmailLog`).

### Code excerpt 1: the password check (`lib/cron.ts:7-11`)
```ts
export function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return process.env.NODE_ENV !== 'production'
  return req.headers.get('authorization') === `Bearer ${secret}`
}
```
- Read the secret from the environment.
- With no secret: allow it on your laptop, refuse it in production. This is
  "fail closed": without it, anyone who found the URL could trigger emails and
  spend the SAM.gov budget.
- With a secret: allow only requests carrying the matching header.
- **The consequence:** if `CRON_SECRET` was never set, no scheduled job has ever
  succeeded in production, and nothing will tell you. The 401 returns before any
  alerting code runs.

### Code excerpt 2: the time budget (`app/api/cron/daily-digest/route.ts:66-67, 101-104`)
```ts
const startedAt = Date.now()
const timeBudgetLeft = () => 240_000 - (Date.now() - startedAt)
...
if (timeBudgetLeft() <= 0) {
  degraded.push(`Digest stopped at time budget — ${users.length - usersProcessed} users deferred`)
  break
}
```
- Record when the job started.
- A small function works out how many of the 240 seconds are left.
- Before each user, if time has run out, record how many users were skipped and
  leave the loop. That way the job still reaches its summary and alert step
  instead of being killed mid-loop.

### Database tables
They read `User` (`emailVerified`, `notifyDigest`, `notifyRadar`,
`notifyDeadlines`), `CompanyProfile`, `SavedContract` (`deadline`, `status`)
and `ContractCache`. They write `Kv`: `digest-sent:<userId>` (notices already
emailed, last 800), `watch:<userId>` (read), `recompete-alerted:<userId>`, and
the sync keys. They also write `EmailLog` through `lib/email.ts`, and
`ContractOutcome`.

### What happens when it fails
- One user's profile is corrupt: that user is skipped and everyone else is
  processed.
- One email bounces: logged as degraded.
- Every email fails: this counts as a problem, and the admin is emailed.
- The sync fails inside the digest: the digest runs on the existing store.
- Time runs out: the remaining users are deferred to tomorrow.
- The job never runs (401, the plan's limits, a deploy problem): **nothing
  happens and nobody is told.**

### Known weak spots
- **No dead-man's switch.** Nothing notices when a job *didn't* run. The only
  indirect sign is the `/admin` store gauge going red ("STARVED") when live
  contracts drop below 400.
- **`sync-contracts` always returns `ok: true`**, even when the sync failed or
  was blocked by the budget, and it never alerts.
- **The digest loop doesn't rotate its starting user**, so if it keeps running
  out of time, the same users at the end of the list are skipped every day.
- **Deadline reminders depend on run time.** The windows are measured from the
  moment the job runs. Vercel's timing can drift, so a deadline can land in a
  window twice or never, and there's no "already reminded" flag.
- **The weekly report counts days with `Math.ceil` on timestamps**
  (`weekly-report/route.ts:64`). That's the same hour-dependent countdown bug
  fixed elsewhere in the post generator.
- **The health probe is throttled per instance, not globally.** See the next
  section.

---

## VERIFIED vs UNVERIFIED

What this section is based on: this session had **no access to production**.
`ir-gov.app` and Vercel were blocked by the network, and there's no database
access. The evidence below is the code, the config, the handbook and the git
history. There are **no automated tests** in the repository.

### 1. Do the scheduled jobs actually run in production?
- **What the code shows:** four jobs are scheduled in `vercel.json`, and all
  four refuse to run in production without `CRON_SECRET`.
- **Evidence:** commit `9175eb8` (2026-07-30) records a production symptom: the
  feed showed about 2 opportunities, with the root cause given as "CRON_SECRET
  unset → the sync crons fail closed and never run." The handbook's env table
  still lists `CRON_SECRET` as **pending**, and no later commit says it was set.
- **Verdict: UNVERIFIED, with evidence pointing to NO as of late July.** A
  healthy-looking feed proves nothing either way, because user traffic also
  triggers syncs through `after()`.
- **How to check:**
  1. `/admin` → the env grid has a `CRON_SECRET` row (`app/admin/page.tsx:178`).
  2. Vercel → Project → Settings → Environment Variables. Is `CRON_SECRET`
     there for Production? If you add it, **redeploy**.
  3. Vercel → Project → Settings → Cron Jobs → open each job's logs. You want to
     see 200s, not 401s.
  4. In the database, if the digest ran recently there should be `Kv` rows with
     keys starting `digest-sent:` and `recompete-alerted:`, and `EmailLog` rows
     with digest subjects.

### 2. Does the nightly award-matching job actually populate data?
- **What the code shows:** it only runs inside the daily digest, and it needs
  the `ContractOutcome` table to exist. That table comes from the admin RUN DB
  MIGRATION button.
- **Verdict: UNVERIFIED, and probably not.** It depends on item 1 and on the
  migration having been run. The handbook (Known issues, item 0) says the
  migration was still pending and that "the nightly outcome collector fails
  silently until this runs."
- **How to check:** `/admin` shows an outcomes tile. A count of 0 means nothing
  has been collected. Or run this in the Turso shell:
  `SELECT matchMethod, COUNT(*) FROM ContractOutcome GROUP BY matchMethod;`

### 3. Do the award-matching confidence scores work as intended?
- **Verdict: NO. The code has bugs that directly affect the scores.** See
  Part 4, weak spots 1 to 5: the first-word agency filter, the top-25-by-amount
  candidate pool, a single fuzzy hit scoring 75 (above the "quotable" line of
  55), the 100-point path that probably fires rarely, and matches that are never
  revisited. The rows also carry `offersReceived` and `awardeeIsSmall` as null,
  always.
- **How to check, once rows exist:** take 20 rows with `matchConfidence` of 75
  or 55, open each award on usaspending.gov, and judge by eye whether it is
  really the award for that solicitation. The fraction that are right is your
  real precision.

### 4. Does the SAM.gov request budget hold across instances?
- **What the code shows:** the claim is one conditional `UPDATE` statement in a
  shared table. That's the correct pattern, and SQLite runs a single statement
  atomically, so by design two instances can't both spend the last unit.
- **Caveats:**
  - It fails open on a database error.
  - A timeout retry is a real request that isn't counted.
  - The 20/day default relies on SAM.gov sending rate-limit headers for the
    clamp.
  - The budget resets at UTC midnight, and SAM.gov's own reset time isn't
    confirmed.
- **Evidence:** the budget and its gauge exist. There's no record of a test
  under concurrent load.
- **Verdict: the design is sound, but production behaviour is UNVERIFIED.**
- **How to check:**
  1. `/admin` → the SAM budget tile shows `used/budget`. Its subtitle reads "SAM
     limit not yet observed" if the clamp has never seen headers.
  2. Turso: `SELECT * FROM Kv WHERE key LIKE 'sam-%' ORDER BY key DESC LIMIT 20;`
     No `sam-quota:` day should ever exceed the budget.
  3. On a day with 429s, look for a `sam-rate-hit:` row.

### 5. Does the probe throttle on the health endpoint work?
- **What the code shows:** the 6-hour throttle is a variable in the memory of
  one server instance (`app/api/cron/health/route.ts:16`). Every new instance
  starts at zero and may probe straight away. What actually protects the budget
  is that each probe must also claim a unit from the global budget as a
  non-critical call, so probes can never touch the 6 requests reserved for the
  sync.
- **Evidence:** commit `b1c5d46` (2026-07-03) records that an unthrottled probe
  once used up the whole quota through UptimeRobot, so the endpoint was being
  hit in production then. There's no evidence either way since.
- **Verdict: it partly works.** It can't starve the sync. Frequent cold starts
  can still spend the non-reserved budget, which is what UEI autofill and
  contract descriptions rely on. A new instance that can't get budget also
  reports SAM.gov as healthy, because it has no probe result of its own.
- **How to check:** is an uptime monitor still pointed at `/api/cron/health`,
  and how often? Compare the day's `sam-quota:` count in `Kv` with the number of
  syncs that ran.

---

## Other risks outside the five parts (from the earlier code review)

- **Admin takeover.** `lib/admin.ts` checks the email address but not whether
  it's verified. Login allows unverified accounts, and if `ADMIN_EMAIL` isn't
  set, the first account ever created is admin. Anyone who registers the admin's
  address first could get admin rights.
- **No login rate limit.** The limiter in `lib/rate-limit.ts` is also
  per-instance memory, so it resets on every cold start.
- **The schema is defined in two places:** `prisma/schema.prisma` and the raw
  SQL in `app/api/migrate/route.ts`. A column added to one and not the other
  breaks queries.
- **No automated tests and no error monitoring.**

---

## Glossary: technical terms

- **API:** a way for one program to ask another for data over the internet.
- **API key:** a password that identifies your program to an API. It's also how
  the API counts your requests.
- **Rate limit / quota:** a cap on how many requests you may make in a period
  (SAM.gov: about 10 a day).
- **429:** the HTTP status code meaning "too many requests; you hit the rate
  limit."
- **401 / 403:** "not authenticated" and "not allowed."
- **502 / 503:** "an upstream service failed" and "temporarily unavailable."
- **Serverless:** your code runs in short-lived copies started on demand. Copies
  don't share memory and can disappear at any moment.
- **Instance:** one of those running copies.
- **Cold start:** a brand-new instance starting up with empty memory.
- **Vercel:** the hosting platform IR runs on.
- **Cron / cron job:** a task scheduled to run at set times. `0 12 * * *` means
  12:00 every day.
- **UTC:** the reference time zone that servers use. 12:00 UTC is 8:00 a.m.
  Eastern in summer.
- **Environment variable (env var):** a setting stored outside the code, such as
  `CRON_SECRET`. Changes take effect only after a redeploy.
- **Deploy / redeploy:** publishing a new version of the site.
- **Database:** where data is stored permanently.
- **Table / row / column:** a spreadsheet-like sheet, one record in it, one
  field of each record.
- **Primary key:** the column that uniquely identifies each row.
- **Index:** a lookup structure that makes searching a column fast.
- **SQL:** the language for querying databases.
- **SQLite / libSQL / Turso:** a small file-based database, a fork of it, and
  the company hosting it.
- **Prisma:** a library that lets TypeScript code talk to the database.
- **Migration:** a change to the database's structure, such as adding a table.
- **Idempotent:** safe to run twice. The second run changes nothing.
- **Upsert:** update the row if it exists, insert it if it doesn't.
- **Transaction:** a group of database writes that succeed or fail together.
- **Atomic:** happens as one indivisible step. Nothing can slip in between.
- **Race condition:** a bug where the result depends on which of two parallel
  actions happens first.
- **Lock:** a marker meaning "someone is already doing this; wait."
- **TTL (time to live):** how long a cached value is trusted.
- **Cache:** a saved copy of an answer so you don't have to fetch it again.
- **Stale-if-error:** serving an old cached answer when the live source fails.
- **Key/value store (`Kv`):** a table of names mapped to values, used for
  counters, locks and caches.
- **Fail open / fail closed:** on an error, allow (open) or block (closed).
- **Throttle:** a limit on how often something may happen.
- **Timeout:** giving up on a request after a set time.
- **Retry:** trying a failed request again.
- **JSON:** a text format for structured data.
- **Payload:** the main body of data in a message or row.
- **Route / endpoint:** a URL on the server that runs code, such as
  `/api/contracts`.
- **GET / POST:** a request to read data, and a request to send or change it.
- **Next.js / App Router:** the web framework IR is built with, and its
  folder-based way of defining pages and routes.
- **`after()`:** a Next.js function that runs work after the response has been
  sent to the user.
- **`unstable_cache`:** a Next.js function that caches a function's result
  across requests for a set time.
- **ISR (incremental static regeneration):** building pages ahead of time and
  refreshing them periodically. IR uses time-based revalidation in the same
  spirit.
- **Edge runtime:** a lightweight, restricted server environment. IR uses it for
  social images.
- **JWT (JSON Web Token):** a signed token stored in the browser that holds your
  login session. IR uses the JWT strategy (`lib/auth.ts:10`), so some user
  fields are cached in the token until you sign in again.
- **NextAuth:** the login library.
- **OAuth:** "Sign in with Google"-style login.
- **Hydration:** when the browser takes over a page the server rendered. A
  *hydration mismatch* is when the two disagree.
- **Embedding:** a list of numbers representing the meaning of a text, so that
  similar texts get similar numbers.
- **Voyage AI:** the service that produces IR's embeddings.
- **Vector:** a list of numbers, such as an embedding.
- **Cosine similarity:** a measure from -1 to 1 of how closely two vectors point
  the same way.
- **Heuristic:** a reasoned rule of thumb that hasn't been proven.
- **Calibrated:** a score whose "70%" really wins about 70% of the time,
  confirmed against outcomes.
- **Precision:** of the matches you made, the share that were right.
- **Resend:** the email-sending service.
- **Uptime monitor:** a service that pings a URL and alerts you if it fails.
- **Dead-man's switch:** an alert that fires when an expected job *doesn't*
  report in.

## Glossary: federal contracting terms

- **Solicitation:** the government's request for bids or proposals, posted on
  SAM.gov.
- **Notice:** any SAM.gov posting (solicitation, presolicitation, sources
  sought, award notice).
- **SAM.gov:** the official federal site for opportunities and vendor
  registration.
- **USAspending.gov:** the public database of federal awards and spending.
- **FPDS:** the system contract awards are reported into. USAspending draws on
  it.
- **Award:** the contract the government signs with the winner.
- **Award ID / PIID:** the award's identifier. It's usually not the same as the
  solicitation number.
- **Solicitation number:** the identifier on the request for bids.
- **Obligation:** money legally committed to a contract. "Award Amount" in these
  APIs is usually obligated to date, not the full ceiling.
- **Period of performance:** the dates the work runs. Its "current end date" can
  move.
- **Option:** a pre-priced extension the government may exercise.
- **Recompete:** competing a contract again when it expires.
- **Incumbent:** the firm currently holding the contract.
- **NAICS code:** a 6-digit industry code. The first 2, 3 and 4 digits are the
  sector, subsector and industry group.
- **Set-aside:** a contract restricted to a class of small business.
- **Full and open competition:** anyone may bid.
- **Small business size standard:** the SBA's revenue or headcount cap, by
  NAICS, for counting as "small."
- **SBA:** the Small Business Administration.
- **8(a):** the SBA program for socially and economically disadvantaged firms.
- **SDVOSB / VOSB:** service-disabled veteran-owned and veteran-owned small
  business.
- **WOSB / EDWOSB:** women-owned, and economically disadvantaged women-owned,
  small business.
- **HUBZone:** small businesses in historically underutilized business zones.
- **Sole source:** awarded to one firm without competition.
- **SAM set-aside codes:**
  - `SBA`: total small business
  - `SBP`: partial small business
  - `8A` / `8AN`: 8(a) competitive and 8(a) sole source
  - `SDVOSBC` / `SDVOSBS`: SDVOSB competitive and sole source
  - `WOSB` / `WOSBSS`: WOSB competitive and sole source
  - `HZC` / `HZS`: HUBZone competitive and sole source
- **UEI:** the 12-character unique entity ID every federal vendor registers.
- **Prime / subcontractor:** the firm holding the contract, and a firm working
  under it.
- **Teaming:** firms partnering to bid together.
- **IDIQ:** indefinite-delivery/indefinite-quantity, an umbrella contract that
  work is ordered under.
- **Task order / delivery order:** an individual order under an IDIQ.
- **Capture:** the work of positioning to win a specific contract before it
  posts.
- **PWin:** probability of win, the capture team's estimate.
- **Bid/no-bid:** the decision whether to pursue.
- **Sources sought / RFI:** early market research notices, often with no
  deadline.
- **RFP / RFQ:** request for proposal and request for quote.
- **Contracting officer (CO):** the government official who can sign the
  contract.
- **Fiscal year (FY):** the federal FY runs from October 1 to September 30.

---

## 15 interview questions (answers at the end, so quiz yourself first)

1. Walk me through what happens when a user opens the dashboard.
2. Why does IR store contracts in its own database instead of calling SAM.gov
   live?
3. How do you stop many serverless instances overspending a 10-request daily
   limit?
4. Why not just retry when SAM.gov returns a 429?
5. What happens if SAM.gov is down for a whole day?
6. How is a contract scored for a company?
7. Tell me about the MEASURED / STRUCTURAL / HEURISTIC tiers. Are they live?
8. Is your win probability a real probability?
9. How does Recompete Radar find expiring contracts when the API can't filter by
   end date?
10. How do you link a solicitation to the award that came out of it, and how
    much do you trust those links?
11. What scheduled jobs run, and how do you know they ran?
12. What happens if the daily digest runs out of time?
13. What's the weakest part of the system right now?
14. What would you fix first with one more week?
15. How much of this did you write, and how well do you understand it?

---

## Model answers

**1.** The browser calls `/api/contracts`. The route checks that I'm logged in
and loads my company profile. It reads the market from IR's own database, not
from SAM.gov. It applies my filters, scores every contract against my profile,
sorts, and keeps the top 100. For the top 12 it adds award context from
USAspending, with a 6-second cutoff so a slow API can't hang the page. After the
response is sent, it may kick off a background refresh of the store if the store
is stale.

**2.** SAM.gov gives me about 10 requests a day. If pages called it live, one
busy hour would use the day up and everyone would get errors. So a few scheduled
requests copy about the last 45 days of notices into a table, and every page
reads that table. Freshness can slip by a few hours, but the page is always up.

**3.** The counter lives in the database, not in memory, because instances don't
share memory. Claiming budget is a single conditional update: "add one if the
total stays under the ceiling." The check and the write happen together, so two
instances can't both take the last unit. The sync is marked critical and can use
the full budget. Everything else has to leave six requests in reserve.

**4.** Because it's a *daily* limit, not a brief blip. Retrying spends requests
you don't have. On a 429, IR records a backoff for the rest of the UTC day and
serves stored data. That backoff has a floor so it can't block tomorrow's sync.

**5.** Users keep seeing the stored market. It just gets older. Expired notices
are pruned only when a sync runs, so the store doesn't empty itself. If the
store were ever empty and SAM.gov were unreachable, the dashboard would fall back
to sample data with a red banner.

**6.** A 100-point fit score: 40 for NAICS alignment (graduated by how many
digits match), 25 for set-aside eligibility, 20 for size fit, 15 for geography.
Every factor comes with a sentence explaining itself. With embeddings enabled,
the score is blended with semantic similarity to what the user has saved. The
top 40 also get a win-probability label.

**7.** The design is that every score component carries its evidence type:
counted from real awards, true by published rule, or reasoned but unvalidated. I
wrote that scorer. It isn't wired into the live feed yet; the live score is the
four-factor match. The one structural part that *is* live is set-aside
eligibility, which works as a hard gate.

**8.** No. It's a heuristic mapped onto the common capture thresholds (above 70
pursue, below 40 walk away). It hasn't been calibrated against outcomes, and the
product says so. Calibrating it needs a validated outcome dataset, which I don't
have yet.

**9.** USAspending can filter by signing date but not by end date. So for each
NAICS code I run two searches: awards signed 6 to 2.5 years ago, and awards
signed in the last 2.5 years. Both are sorted by end date and stop once they
pass today. I keep awards ending in the next ~18 months, drop thin records, and
cache each code for 24 hours, serving yesterday's result if the API is down.

**10.** First by solicitation number: an award that cites it gets 100. Then by a
statistical match on NAICS, agency and value, at 40 to 55. Every row stores its
method and confidence. Honestly, I don't trust those links yet. The agency filter
compares only the first word of the agency name, the candidate pool is the 25
largest awards, and one fuzzy keyword hit scores 75. I'd hand-check a sample of
matches before relying on any of it.

**11.** There are four, set in `vercel.json`: a midnight sync, a noon digest
(which also runs the Radar alerts and outcome collection), deadline reminders,
and a Monday weekly report. They only run in production if `CRON_SECRET` is
set; otherwise they refuse every call. In July they weren't running because it
wasn't set. To confirm they run, I'd look at the Vercel cron logs and check the
database for digest records.

**12.** It tracks its own clock and stops starting new work at 240 seconds,
logs how many users were deferred, and still reaches its alert step. The
deferred users get their digest the next day. Outcome collection runs last and
only with time to spare, because a late dataset row costs nothing and a late
user email does.

**13.** Anything that affects what I claim publicly. The evidence-tier scorer is
described on the site but isn't live. The award matcher's confidence scores have
known bugs. And I can't yet prove the scheduled jobs run in production. The
common thread is that nothing alerts me when something *didn't* happen.

**14.** In order:
1. Set and verify `CRON_SECRET`.
2. Add a check that alerts when a job hasn't reported in.
3. Fix the matcher's agency filter and candidate pool, then hand-check 20
   matches.
4. Either wire in the tiered scorer or change the site copy to match the live
   score.

**15.** "AI wrote most of the code. I set the constraints, made the product
calls, and I can walk you through how the core pieces work." For example: why
the budget lives in the database, why the sync reserves headroom, why the radar
searches by signing date, and where the matcher is weak. I'm still learning to
read and debug the code fluently.
