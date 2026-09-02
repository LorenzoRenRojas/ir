# IR — Project Handbook

**Read this first.** This document is the complete context for IR — what it is, how it works,
every operational detail, and where it's going. Written so that any developer or AI session
can pick up exactly where the last one left off.

**Companion docs:** `GROWTH_PLAN.md` (GTM strategy) · `COMPETITION.md` (honest
competitive landscape, per-competitor breakdown, and APEX talking points —
read before touching any marketing claim) · `LAUNCH_SPRINT.md` (the July 28 →
Sept 30 launch plan: 30 paid users, demo cadence, pricing, critical path) ·
`YEAR_ONE.md` (Aug 2026–Aug 2027 operating plan: quarterly gates, backup
plans, the Knowledge/Capital/Execution pillars).

**Which plan is current (Sept 2026):** the targets in `LAUNCH_SPRINT.md` and
`YEAR_ONE.md` (30 paid by Sept 30, 60–70 paid by Dec 31) were not met and are
superseded. The operating plan is the deep-research marketing plan of Aug 27,
2026 plus the "500 Before 2027" plan of Sept 1, 2026 (artifact, linked from the
founder's pinned playbook): LinkedIn founder-voice + comments as the primary
channel, a weekly Federal Market Report as the second, SEO pages + free tools
(/eligibility, /sba-comment) + the owned email list as the volume engine.
Targets: 10 founding members by ~late Nov; first paid conversions after
LLC/EIN → Stripe; **500 free users by Dec 31, 2026 is the stretch goal** and
only reachable if SEO indexing and the email list start compounding by
October. **Product rule for the period: no new features** — funnel, capture,
claims accuracy and mobile only. Every marketing number obeys the claims policy
below (IR tracks a synced *subset* of SAM.gov — never claim completeness).

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
- **Hosting:** Vercel. Four crons are configured in `vercel.json` (sync-contracts,
  daily-digest, deadline-reminders, weekly-report); verify the plan tier allows
  them if a deploy ever complains.
- **Git:** two remotes; push to `github` remote, branch `main`. All work is on main.

## Data architecture (the important part)

**SAM.gov quota is tiny** (personal key, ~10 req/day). Everything is built around never exhausting it:

- `ContractCache` table = the market. Refreshed by daily cron (`/api/cron/daily-digest` runs
  `syncContractsToDb()`: up to 3 pages × 1000 contracts, 45-day window). Users are served from
  this table — zero SAM calls per page view. 10-min in-memory cache on top (`lib/sam-api.ts`).
- `lib/sam-quota.ts` = global daily budget (default 20, override `SAM_DAILY_BUDGET`), enforced
  through the `Kv` table across all serverless instances. EVERY code path that touches
  api.sam.gov must call `tryConsumeSamRequests(n, {critical?})` first. When spent → fall back to
  stored data. **Auto-clamp:** records SAM's reported rate limit (headers + 429) and caps the
  effective budget at `min(configured, SAM's real limit)` — so `SAM_DAILY_BUDGET` can be set high
  ("push to max") without ever overspending. **Sync reserve:** on-demand lookups (UEI, descriptions)
  leave a floor so the market sync (`critical`) is never starved. Real ceiling shows in `/admin`.
  To lift the ceiling: register the entity for a higher-tier key — see `docs/SAM_SCALING.md`.
- **Store stays warm (no cold starts):** `lib/contract-refresh.ts` `maybeSyncContracts()` refreshes
  the store when stale/empty, coordinated via `Kv` (6h throttle + lock). Triggered three ways —
  the `/api/cron/sync-contracts` cron, the digest cron, and traffic (the contracts route schedules
  it via `after()`), all sharing one throttle so budget is never stampeded.
- Contract descriptions: SAM search returns a URL, not text. `fetchContractDescription()` fetches
  on demand (budget-gated), strips HTML, and writes back into ContractCache — each notice fetched
  at most once ever.
- `ContractArchive` = the history moat. Every notice pruned from ContractCache is copied here
  first (best-effort, never blocks the sync) and accumulates forever — future award research,
  market trends, training data. Grows free from syncs we already run.
- **USAspending.gov is free and keyless** — incumbents (`fetchIncumbent`) and Recompete Radar
  (`getRecompetes`) live there. Radar: per-NAICS parallel queries (single-code queries only —
  multi-code + end-date sort times out), dual strategy (end-date walk + value sweep), cached in
  `Kv` 24h, stale-served on upstream failure, empty results never cached. Prewarmed nightly by cron.
- Mock data (`MOCK_CONTRACTS`) serves when SAM key missing/quota dead — dashboard shows a red
  SAMPLE DATA banner so it's never mistaken for live data.

## Automation (self-running layer)

- **Cron 1** `/api/cron/sync-contracts` (00:00 UTC): full-market refresh of `ContractCache` via
  `maybeSyncContracts({force})`. Keeps the store warm overnight so first logins are never cold.
- **Cron 2** `/api/cron/daily-digest` (12:00 UTC): contract sync (same coordinator) → per-user match
  digest emails (score ≥55, posted <48h, top 5) → recompete prewarm. Self-reports failures to ADMIN_EMAIL.
- **Cron 3** `/api/cron/deadline-reminders` (13:00 UTC): emails at ~3 days and ~1 day before
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
| `SAM_DAILY_BUDGET` | optional | override the 20/day default; safe to set high (auto-clamps to SAM's real limit — see `docs/SAM_SCALING.md`) |
| `GOOGLE_CLIENT_ID/SECRET` | pending (free!) | Google sign-in |
| `STRIPE_SECRET_KEY` + price IDs | pending (account issue) | billing — code fully ready in `lib/stripe.ts` |
| `VOYAGE_API_KEY` | **set** | semantic matching layer live (`lib/embeddings.ts`); daily-digest cron pre-embeds fresh contracts so the feed is a cache hit |
| `MIGRATION_KEY` | optional | `/api/admin/grant` (promote admins) |

**Env changes only apply to NEW deployments — always redeploy after adding one.**

## Coded but dormant (just add the key)

Stripe billing, Google OAuth, Voyage semantic matching (learns from saves, blends with metadata
score — the sleeper feature), enterprise team system (works, gated to enterprise tier).

## Public pages / SEO

Coming-soon gate (`COMING_SOON` in `middleware.ts`, **now `false` — site is public**)
redirects logged-out users from app pages when on; the bypass list includes public/marketing pages: `/coming-soon`, auth pages,
`/naics` (+32 per-code SEO pages), `/set-asides` (+7 per-program SEO pages: 8(a), WOSB,
EDWOSB, SDVOSB, VOSB, HUBZone, small-business — `lib/set-asides.ts`, each with live
SAM.gov opportunities + who-qualifies/how-to-certify explainer + FAQ JSON-LD),
`/capabilities`, `/how-it-works`, `/pricing`, `/security`,
`/terms`, `/privacy`, sitemap, robots. Marketing pages share `components/marketing.tsx`
(nav/CountUp/useInView) and `components/MetatronBackdrop.tsx` (the folding-cube animation;
`pulse` prop = breathing glow, used on /capabilities). JSON-LD org+product schema in root layout.
Also `/agencies` (+10 per-agency SEO pages: DoD, VA, DHS, GSA, HHS, NASA, USDA,
DOE, DOJ, DOT — `lib/agencies.ts`, live opportunities matched on `Contract.agency`
+ what-they-buy/how-to-win explainer + FAQ JSON-LD). All three directories
(NAICS / set-asides / agencies) cross-link each other and the homepage footer.

**Search Console verification is now zero-code.** In Search Console pick the
"HTML tag" method, copy the token, and set `GOOGLE_SITE_VERIFICATION` in Vercel
env (Bing: `BING_SITE_VERIFICATION`) — the meta tags render automatically from
`app/layout.tsx` `metadata.verification`. Then submit `sitemap.xml`.
**Pending human action: set that env var + submit the sitemap.**

New-user welcome email (`sendWelcomeEmail` in `lib/email.ts`) fires
fire-and-forget from `app/api/auth/verify-email` the first time an account
verifies — profile → matches → proposal, so signups never land in silence.

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

0. **Sept 2026 funnel work (shipped, needs founder actions):** RUN DB MIGRATION
   (adds `Waitlist.source`, `ContractOutcome`, `FirmHistory`, referral columns —
   the nightly outcome collector fails silently until this runs); set
   `GOOGLE_SITE_VERIFICATION` and submit the sitemap; confirm `hello@ir-gov.app`
   is a real mailbox (14 references on the site, including the Enterprise
   CONTACT button); Google sign-in button is hidden until `GOOGLE_CLIENT_ID/SECRET`
   exist; the weekly Federal Market Report list (`Waitlist` table, `source`
   column) is capturing on /, /eligibility and /sba-comment — first issue is
   promised for late September and must actually be sent (Post Studio draft →
   Resend; the send path is not built yet).
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
   → **When registering the SAM.gov entity, upgrade the API key** to the higher rate tier and flip
   `SAM_GOV_API_KEY` / raise `SAM_DAILY_BUDGET`. Zero code changes; auto-clamps to the real limit.
   Full checklist: `docs/SAM_SCALING.md`.

## Roadmap (agreed priorities)

1. **Get 10 real users** — APEX Accelerators outreach (free gov-funded counselors, the #1
   channel), hand-onboard everyone, collect testimonials. Growth > features now.
2. Claude-powered proposal drafting + contract scan (the "worth $299/mo" unlock)
3. Awarded-contract intel depth (USAspending history per agency/NAICS)
4. Weekly pipeline report email; PDF export for proposals/capability statements
5. Referral system; annual billing (2 months free)
6. SLED (state/local) expansion — explicitly deferred until federal PMF
7. Raise Pro to $299 after 10 paying logos (grandfather early users, tell them so)
8. **IR Compliance** (CMMC copilot) — the next big project AFTER IR is scaled;
   full plan + build gate in `docs/COMPLIANCE_MODULE.md`. Gate: ≥200 paying,
   churn <4%, proposal engine earning. Do not start early.

## Opportunity Signals (the capture-analyst layer)

`lib/signals.ts` derives the signals a seasoned capture manager acts on, from
data already on every contract (no new API calls, no SAM quota cost). Every
signal carries a one-sentence, user-facing `detail` — explainability is the rule;
we never fabricate the human PWin factors (customer-relationship strength,
solution differentiation), which stay the user's to own.

Research grounding (real capture methodology — Shipley/APMP, PWin):
- Capture scores three questions, not "fit": **is it real? / winnable? / worth it?**
  PWin thresholds: <40% no-bid, >70% full pursuit.
- **Sources Sought / RFI / Presolicitation** = the pre-RFP shaping window;
  responding early can influence requirements and even trigger a set-aside.
- Federal spending concentrates at fiscal year-end (Sept 30): Jul–Sep ≈ 33% of
  annual, September alone ≈ 16%, final week ≈ 5× a normal week.

Shipped (phase 1): `opportunitySignals(contract)` → early/shaping (SHAPE IT,
FORMING, EARLY LOOK from notice type), fiscal timing (FY-END PUSH, YEAR-END
RAMP), deadline urgency (DUE IN Nd). Attached in `app/api/contracts/route.ts`
on the visible page; rendered as `SignalBadges` on the dashboard card (tone →
color, full detail on hover).

Phase 2 (shipped): bid/no-bid verdict on `calculateWinProbability`
(`lib/win-probability.ts`) — PURSUE / CONDITIONAL / LONG SHOT / INELIGIBLE,
mapped to the standard PWin gate (<40 walk / >70 pursue), framed as a pursuit
recommendation (not a promised %), shown as a verdict pill on the dashboard card.

Phase 3 (shipped): Federal Register event feed — `lib/federal-register.ts`
(free, keyless official API; 12h cache; degrades to empty, never throws) +
`/api/regulatory` (derives search terms from the company's NAICS sectors) +
`RegulatoryRadar` dashboard widget. New/proposed rules are the demand-forming
"real-world events" a capture analyst reads before the contracts appear.

Future (not agreed/started): map user agencies → Federal Register agency slugs
for tighter relevance; a weekly "regulatory + recompete" digest email.

## Gap-closing features (agreed backlog, ranked by leverage/effort)

The honest weak spots in "does IR help you *win*", and how to close them:

1. **AI proposal narrative — already built, just needs credits.** `draftProposal()`
   flips template → Claude the moment `ANTHROPIC_API_KEY` + credits exist. Launch =
   add credits + set env var. No code work. Do first.
2. **Price Intelligence (price-to-win)** — ✅ SHIPPED. Price band (25th / median /
   75th pct of comparable award values) on the contract detail page via
   `lib/benchmarks.ts` + `MarketIntel`. Honestly scoped: the sample is the
   largest awards by dollar, so it's labeled the "major-award tier," and values
   are total obligated amounts (base+options+mods) — a sizing sanity-check, not
   a bid-to-win price. No new API calls. (A future refinement could add a
   representative, non-dollar-sorted sample for a truer whole-market median.)
3. **Certification Advisor** — rules-based: from the profile, name the set-aside cert
   they qualify for + its ROI ("veteran-owned → SDVOSB unlocks $X you can't prime now").
   Cheap, high-impact for beginners. Set-asides are the biggest win lever.
4. **Teaming / subcontracting** — help a new shop start as a sub to build past
   performance; match small biz to primes on big awards. Network feature → post-PMF.

## SEO / discoverability

- **"IR" alone is unrankable** — it's the IRS's forever. Do NOT chase it. Win on
  (a) intent keywords (the NAICS pages, /compare/*, /how-to-win, /how-it-works already
  target these — they just need indexing) and (b) the full brand phrase "IR GovCon"
  / ir-gov.app (consistent usage + backlinks + time).
- **#1 immediate action (founder, ~10 min):** submit the sitemap to Google Search
  Console + Bing Webmaster. The site was behind the coming-soon gate, so Google
  hasn't crawled it — nothing ranks until it's submitted and crawled.
- **Naming reality (founder call):** if brand discoverability matters, "IR" is a weak
  search name; a distinctive brand would be far more findable. Flagged, not decided.
- Technical SEO in place: robots + sitemap, per-page metadata + canonicals, Organization
  + SoftwareApplication JSON-LD, OG image, FAQ rich-result markup on /pricing, HowTo
  markup on /how-to-win, brand-carrying title template.

## Working with the founder

Lorenzo is non-technical, works a day job, often on phone-only. Give him: plain-English
explanations of what broke and why, concise phone-friendly to-do lists for anything requiring
the Vercel dashboard or external accounts, and honest assessments (he explicitly asks for
"brutal honesty" — give it, with warmth). He ships fast and wants momentum: bias toward
building the thing rather than describing it, verify with real renders/screenshots, and always
commit + push to `github` remote when done.
