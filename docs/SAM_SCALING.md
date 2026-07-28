# Raising the SAM.gov ceiling (do this when you register the LLC)

**Goal:** swap the small personal SAM.gov key for a higher-limit key tied to your
registered entity, so signups (UEI autofill) and market syncs have real headroom.

**Good news:** this is a *paperwork + one env var* change. **Zero code changes.**
The app already auto-discovers whatever limit the new key allows and clamps
itself to it — you cannot overspend or crash anything by setting the cap high.

---

## Why this is the lever

- The feed does **not** cost SAM budget per user — the whole market is synced once
  into `ContractCache` and every user is scored against that shared copy. 1 user or
  5,000 users = the same ~3 sync calls/day. (See HANDBOOK → Data architecture.)
- The only per-user SAM cost is **UEI autofill at signup** (1 request each). A
  small personal key throttles how many new users can autofill per day.
- A key tied to a **registered SAM.gov entity** sits in a higher rate tier than an
  unregistered personal key. Registering the entity is what lifts the ceiling.

---

## The checklist

Do these in order. Steps 1–4 are the slow part (days to weeks); 5–6 take minutes.

1. **Form the LLC + get the EIN.** (You're already planning this.) You need the
   legal entity before SAM will register it.

2. **Create a Login.gov account** if you don't have one — SAM.gov sign-in runs
   through Login.gov. Use the company email you set up for IR.

3. **Register the entity in SAM.gov** (sam.gov → "Register Your Entity"). This is
   free, and issues your **UEI** (and CAGE code). It's the step that takes the
   longest — expect validation and possible mailed confirmation. Budget a few
   weeks. This is also the registration your customers go through, so doing it
   yourself is useful product research.

4. **Get the API key tied to your account.** In SAM.gov → your profile →
   **Account Details → "Request/Generate API Key."** A key generated from your
   registered-entity account carries the higher, non-public rate tier. Copy it.
   - Optional, only if you later need very high programmatic volume: SAM.gov also
     supports **System Accounts** under a registered entity (Workspace → System
     Accounts). Our public Opportunities API only needs the `api_key`, so the
     account API key above is sufficient for now — don't overcomplicate it.

5. **Flip it in Vercel** (Settings → Environment Variables, Production scope):
   - `SAM_GOV_API_KEY` → paste the new key (replace the old one)
   - `SAM_DAILY_BUDGET` → set it high, e.g. `500`. **You can't overspend** — the
     app clamps to SAM's real limit automatically.
   - **Redeploy** (env changes only apply to new deployments).

6. **Verify + read your real limit** (the source of truth):
   - Go to **/admin** → click **SYNC CONTRACTS NOW** (runs one real sync).
   - Look at the **"SAM.GOV BUDGET TODAY"** card. The subtitle now shows
     **`SAM allows N/day`** — that **N is your actual ceiling**, measured from
     SAM's own response headers, not a guess.
   - You're done. Optionally set `SAM_DAILY_BUDGET` down to exactly `N` for a
     tidy gauge, but leaving it high is fine — the clamp does the work.

---

## What happens automatically (so you don't have to worry)

- **Auto-clamp:** effective budget = `min(SAM_DAILY_BUDGET, SAM's real limit)`.
  Setting the cap to 500 when SAM allows, say, 200 just means it uses 200 and
  serves the warm store — never a crash, never wasted calls. (`lib/sam-quota.ts`)
- **Sync reserve:** a floor of budget is reserved for the twice-daily market
  sync, so a surge of signups (UEI lookups) can never starve everyone's feed.
- **Nothing in code cares which key it is** — the endpoint and auth are identical;
  only the rate tier changes.

---

## If the entity key still isn't enough (later, at real scale)

The next lever — a bigger project, not needed at launch — is switching market
ingestion from the paginated API to **SAM.gov's daily bulk data extract** (the
entire Contract Opportunities dataset as one download). That removes per-request
limits from ingestion entirely. Flag it when you're consistently near the ceiling
in /admin; it's a self-contained change to `syncContractsToDb()`.
