# IR — Project Handbook

**Read this first.** This document is the complete context for IR — what it is, how it works,
every operational detail, and where it's going. Written so that any developer or AI session
can pick up exactly where the last one left off.

---

## What IR is

IR ("GovCon Intelligence", ir-gov.app) is a SaaS platform that helps small businesses find and
win U.S. federal contracts. The core loop — and the pitch — is:

**Find → Foresee → Track → Draft → Send**

1. **Find** — every active SAM.gov solicitation scored 0–100 against the user's company profile
   (NAICS 40pts / set-aside eligibility 25 / contract size 20 / geography 15 — see `lib/matching.ts`)
2. **Foresee** — Recompete Radar: awards in the user's NAICS codes expiring within 18 months,
   pulled from USAspending.gov (free API, no key) — pre-RFP intel before SAM.gov shows anything
3. **Track** — bid pipeline (saved → pursuing → submitted → won/lost) with dollar totals
4. **Draft** — 4-volume proposal generator (guided questionnaire) + one-click capability statements
5. **Send** — email the proposal to the contracting officer listed on the SAM.gov notice,
   reply-to routed to the user

**Positioning:** the incumbents (GovWin IQ ~$12k/yr, GovTribe, HigherGov, EZGovOpps) sell to
companies that already win. IR serves the first-time and small contractor at $79–499/mo. The moat
being built: (a) the full loop in one tool — nobody bundles proposal drafting, (b) pipeline
outcome data — over time IR learns what actually predicts small-business wins.

**Founder:** Lorenzo Rojas (lorenzo.rojas99x@gmail.com), Florida, solo, non-technical.
Launch date on the coming-soon countdown: **July 28, 2026**.

---

## Stack

- **Next.js 16 App Router** (this version has breaking changes vs training data — read
  `node_modules/next/dist/docs/` before assuming APIs; e.g. `useSearchParams()` requires Suspense)
- **Auth:** NextAuth v4, JWT strategy. JWT caches `emailVerified` etc — users must sign out/in
  after DB changes to those fields. Google OAuth is coded but needs `GOOGLE_CLIENT_ID/SECRET`.
- **DB:** Prisma + Turso (libSQL/SQLite). **No prisma migrate** — schema changes go in TWO places:
  `prisma/schema.prisma` AND raw SQL in `app/api/migrate/route.ts` (idempotent statements, run via
  the admin console's RUN DB MIGRATION button).
- **Email:** Resend via raw fetch (`lib/email.ts`), FROM `IR <noreply@ir-gov.app>` (domain verified).
  Every send is logged to the `EmailLog` table with status/error.
- **Hosting:** Vercel (Hobby plan — max 2 cron jobs, once daily each).
- **Git:** two remotes; push to `github` remote, branch `main`. All work is on main.

## Data architecture (the important part)

**SAM.gov quota is tiny** (personal key, ~10 req/day). Everything is built around never exhausting it:

- `ContractCache` table = the market. Refreshed by daily cron (`/api/cron/daily-digest` runs
  `syncContractsToDb()`: up to 3 pages × 1000 contracts, 45-day window). Users are served from
  this table — zero SAM calls per page view. 10-min in-memory cache on top (`lib/sam-api.ts`).
- `lib/sam-quota.ts` = global daily budget (default 8, override `SAM_DAILY_BUDGET`), enforced
  through the `Kv` table across all serverless instances. EVERY code path that touches
  api.sam.gov must call `tryConsumeSamRequests(n)` first. When spent → fall back to stored data.
- Contract descriptions: SAM search returns a URL, not text. `fetchContractDescription()` fetches
  on demand (budget-gated), strips HTML, and writes back into ContractCache — each notice fetched
  at most once ever.
- **USAspending.gov is free and keyless** — incumbents (`fetchIncumbent`) and Recompete Radar
  (`getRecompetes`) live there. Radar: per-NAICS parallel queries (single-code queries only —
  multi-code + end-date sort times out), dual strategy (end-date walk + value sweep), cached in
  `Kv` 24h, stale-served on upstream failure, empty results never cached. Prewarmed nightly by cron.
- Mock data (`MOCK_CONTRACTS`) serves when SAM key missing/quota dead — dashboard shows a red
  SAMPLE DATA banner so it's never mistaken for live data.

## Automation (self-running layer)

- **Cron 1** `/api/cron/daily-digest` (12:00 UTC): contract sync → per-user match digest emails
  (score ≥55, posted <48h, top 5) → recompete prewarm. Self-reports failures to ADMIN_EMAIL.
- **Cron 2** `/api/cron/deadline-reminders` (13:00 UTC): emails at ~3 days and ~1 day before
  saved-contract deadlines (windowed so no "reminded" flag needed).
- **Health** `/api/cron/health`: DB + env + SAM key probe (throttled 6h + budget-gated — an
  unthrottled probe once burned the whole SAM quota via UptimeRobot). Returns 503 when degraded;
  point a free uptime monitor at it.
- Cron auth: Vercel sends `Authorization: Bearer $CRON_SECRET` if set; `lib/cron.ts` enforces.

## Admin

- `/admin` — metrics, contract store status, SAM budget gauge, env config presence grid, email
  log, waitlist, recent signups. Actions: RUN DB MIGRATION, SYNC CONTRACTS NOW, SEND TEST EMAIL,
  CHECK SYSTEM HEALTH.
- Access (`lib/admin.ts` `requireAdmin`): DB role `admin` OR email matches `ADMIN_EMAIL` env OR
  (bootstrap, when no ADMIN_EMAIL set) the first account ever created. Founder = first account.

## Env vars (Vercel)

| Var | Status | Purpose |
|---|---|---|
| `DATABASE_URL` | set | Turso (url + authToken query param) |
| `NEXTAUTH_URL` | set (`https://ir-gov.app`) | email links, auth callbacks |
| `NEXTAUTH_SECRET` | check | session security |
| `SAM_GOV_API_KEY` | set | live contracts (tiny daily quota!) |
| `RESEND_API_KEY` | set | all outbound email |
| `ADMIN_EMAIL` | pending | admin access + alert emails |
| `CRON_SECRET` | pending | cron endpoint auth |
| `SAM_DAILY_BUDGET` | optional | override the 8/day default |
| `GOOGLE_CLIENT_ID/SECRET` | pending (free!) | Google sign-in |
| `STRIPE_SECRET_KEY` + price IDs | pending (account issue) | billing — code fully ready in `lib/stripe.ts` |
| `VOYAGE_API_KEY` | pending (free tier) | semantic matching layer — fully coded in `lib/embeddings.ts`, silently skipped without key |
| `MIGRATION_KEY` | optional | `/api/admin/grant` (promote admins) |

**Env changes only apply to NEW deployments — always redeploy after adding one.**

## Coded but dormant (just add the key)

Stripe billing, Google OAuth, Voyage semantic matching (learns from saves, blends with metadata
score — the sleeper feature), enterprise team system (works, gated to enterprise tier).

## Public pages / SEO

Coming-soon gate (`COMING_SOON = true` in `middleware.ts`) redirects logged-out users from
app pages; the bypass list includes all public/marketing pages: `/coming-soon`, auth pages,
`/naics` (+30 per-code SEO pages), `/capabilities`, `/how-it-works`, `/pricing`, `/security`,
`/terms`, `/privacy`, sitemap, robots. Marketing pages share `components/marketing.tsx`
(nav/CountUp/useInView) and `components/MetatronBackdrop.tsx` (the folding-cube animation;
`pulse` prop = breathing glow, used on /capabilities). JSON-LD org+product schema in root layout.
**Pending human action: Google Search Console verification + sitemap submission.**

## Brand

- Colors: crimson `#C41230` on near-black `#0A0A0A`; terminal/monospace aesthetic (Geist Mono).
- **Logo**: the Metatron cube animation frozen at exactly half-fold, rotated -15° (flat-top,
  mirror-symmetric — deliberately NOT the canonical hexagram). Files: `public/logo.svg` (base),
  `logo-card.svg` (glow + glossy IR), `logo-card-pearl.svg` (pale ivory wordmark, for dark stock),
  `logo-card-onyx.svg` (glossy black wordmark, for light stock). Geometry lives in
  `components/HeroMetatron.tsx` / `MetatronBackdrop.tsx` (`fold=0.5, g=-15°`).
- Card design: black front (Pearl mark + "GOVCON INTELLIGENCE"), warm-white back (Onyx mark,
  name/title bottom-left, domain/email bottom-right, blank middle = writing space).
- The ᛁ rune is the legacy inline mark, still used in nav/emails — site-wide rollout of the new
  logo is a pending task.
- **Marketing claims policy**: never say "only platform with X". GovWin IQ, Bloomberg Government,
  and HigherGov all track expiring contracts/recompetes. The defensible Recompete Radar claims:
  it's included at self-serve prices (legacy tools price it into $10K+/yr terminals), it's scored
  against the user's own profile + learned taste, and it's wired to alerts + pipeline. Same
  discipline for every feature claim — price-tier and integration claims, not existence claims.

## Known issues / pending

1. Founder must run RUN DB MIGRATION + SYNC CONTRACTS NOW after SAM quota reset (midnight UTC).
2. Google Search Console + Bing Webmaster submission (human action, ~10 min).
3. Env vars marked "pending" above.
4. Stripe account verification issue → fallback plan: Paddle/Lemon Squeezy (~1 day rework).
5. Proposals are smart templates, not LLM-generated. Next big feature: Claude API integration
   for real narrative drafting + a "scan" feature (read statement of work → structured brief:
   scope, requirements, red flags). Needs ANTHROPIC_API_KEY and small per-use budget.
6. Site-wide logo rollout (favicon, nav, emails, OG share image) — awaiting founder go.
7. LLC formation in progress (Florida/Sunbiz, ~$125; annual report due May 1 yearly, $400 late
   fee). After formation: domain email (lorenzo@ir-gov.app), SAM.gov UEI registration for the
   company itself, Stripe under the LLC, footer/terms updated with entity name.

## Roadmap (agreed priorities)

1. **Get 10 real users** — APEX Accelerators outreach (free gov-funded counselors, the #1
   channel), hand-onboard everyone, collect testimonials. Growth > features now.
2. Claude-powered proposal drafting + contract scan (the "worth $299/mo" unlock)
3. Awarded-contract intel depth (USAspending history per agency/NAICS)
4. Weekly pipeline report email; PDF export for proposals/capability statements
5. Referral system; annual billing (2 months free)
6. SLED (state/local) expansion — explicitly deferred until federal PMF
7. Raise Pro to $299 after 10 paying logos (grandfather early users, tell them so)

## Working with the founder

Lorenzo is non-technical, works a day job, often on phone-only. Give him: plain-English
explanations of what broke and why, concise phone-friendly to-do lists for anything requiring
the Vercel dashboard or external accounts, and honest assessments (he explicitly asks for
"brutal honesty" — give it, with warmth). He ships fast and wants momentum: bias toward
building the thing rather than describing it, verify with real renders/screenshots, and always
commit + push to `github` remote when done.
