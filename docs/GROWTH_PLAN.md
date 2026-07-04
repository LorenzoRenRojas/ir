# IR — Growth Plan

The operating strategy: marketing, funding, competition, and the founder's job.
Living document — revise as reality reports back. Companion to `HANDBOOK.md`.

---

## The one-line strategy

**Own the entry point of the GovCon market.** Every company that ever wins a federal
contract starts somewhere. Today they start confused — on SAM.gov, in APEX counseling
sessions, in Facebook groups. IR becomes where they start. The incumbents (GovWin et al.)
sell to companies that already win; they structurally cannot serve beginners at $79/mo
without destroying their own pricing. That's the moat: we grow where they can't follow,
and their future customers become our current ones.

GovWin doesn't die from a feature war. It dies from generational churn — a cohort of
contractors who started on IR, won on IR, and never saw a reason to graduate.

## Founder operating rhythm (post-ship)

The product builds itself on demand (AI sessions + HANDBOOK.md). The founder's job is
**distribution, judgment, and listening** — roughly:

| Share | Activity |
|---|---|
| 50% | Customer contact: onboarding calls, pipeline audits, user interviews, support |
| 25% | Content + channel: LinkedIn posts, weekly data drops, APEX/SBDC relationships |
| 15% | Product direction: prioritize from what users said, run AI build sessions |
| 10% | Ops: metrics review, billing, admin console, legal/finance hygiene |

**Weekly cadence:**
- **Mon:** 20-min metrics review in /admin (signups, verified %, digest sends, pipeline
  activity, email failures). Decide the week's single priority.
- **Tue–Thu:** 3–5 customer conversations. Every user gets a personal onboarding offer
  until that stops scaling (~50 users).
- **Wed:** publish the weekly data post (see Content Engine).
- **Fri:** build session — fix what the week surfaced, ship, push.
- **Monthly:** one in-person or virtual event (APEX workshop, SBA event, association call).

**Metrics that matter (in priority order):**
1. Signup → completed profile rate (onboarding health)
2. Weekly active users / digest open rate (is the core loop alive)
3. Save → proposal-generated rate (are they going deep)
4. Paying conversions + churn (once Stripe is live)
5. "Did IR help you win?" — track every user win manually; each one is a case study

## Money: how to spend

### Phase 1 — pre-revenue (now): target burn < $150/mo
- Infra that's earned it: Resend Pro (~$20) when digest volume needs it, Turso paid (~$29)
  when DB size needs it, domain email (free via Cloudflare Routing), Sentry free tier.
- LLC ($125 one-time, $138.75/yr Florida annual report — calendar May 1, $400 late fee).
- Business cards (~$50, matte black, spot gloss if offered).
- **$0 on ads. $0 on agencies. $0 on booths. $0 on tools with logos in their pricing pages.**

### Phase 2 — first revenue: reinvest 100%, rough split
- 40% growth experiments (each with a hypothesis and a kill criterion — e.g. $300 of
  LinkedIn ads against one ICP segment, measured to the signup)
- 30% product costs (Claude API for proposal drafting/scan — this is COGS, it scales
  with revenue; Voyage embeddings; infra upgrades)
- 20% cash buffer (never zero)
- 10% brand/events (walk conference floors with cards + phone demo; no booths year one)

### Rules
- Every dollar has a hypothesis. "Brand awareness" is not a hypothesis.
- Spend on things that compound (content, SEO, relationships, data) before things that
  stop when you stop paying (ads).
- The founder's time is the scarcest asset — buy it back first (e.g., $50/mo tools that
  save 5 hours are cheap).

## Funding — honest qualification map

### Definitely available (do these)
- **Cloud/AI startup credits** — AWS Activate, Google for Startups, Microsoft for
  Startups: $5k–$100k+ in credits; Anthropic and other AI providers run startup credit
  programs (would cover the Claude proposal engine). Low effort, real money. Requires the
  LLC + a company email/site (have both). *Verify current program terms at application time.*
- **Free advisory (not money, but worth money):** Florida SBDC (free consultants),
  SCORE mentors, APEX Accelerators — yes, IR's own channel also advises IR.
- **Pitch competitions:** local Florida/university/chamber competitions, $1k–$25k
  non-dilutive. Good forcing function for the pitch; the story (solo founder, live
  product, real market) competes well.

### Possible, with effort and honesty about fit
- **SBIR/STTR ("America's Seed Fund", NSF/DoD/GSA):** non-dilutive $50k–$275k+, but it
  funds *R&D with technical risk*, not commercial SaaS. IR could qualify only by framing
  a genuine research thread — e.g., the outcome-learning matching engine (predicting
  small-business win probability from award history) as novel applied research, or via
  DoD AFWERX open topics on acquisition tooling. Slow (6–12 months), competitive,
  paperwork-heavy, requires SAM registration (planned anyway). **Verdict: apply once,
  opportunistically, after launch — never let it distract from customers.**
- **Accelerators (YC, Techstars):** worth one application cycle once there's any traction.
  The story writes itself: non-technical solo founder + AI-built product + real revenue.
  Take only if the network is needed; the money is expensive (equity).

### Later, if wanted
- **Revenue-based financing** (Pipe-style) once MRR is stable — non-dilutive scaling capital.
- **VC:** GovTech SaaS is fundable at traction (comps: Unanet, Deltek's acquisitions,
  HigherGov's PE interest). But the default plan is bootstrap: the market is reachable
  without a war chest, and 100% ownership of a $2M ARR business beats 15% of a burned one.

### Not applicable (don't chase)
- Federal small-business *contracting* set-asides are for selling TO the government —
  not grants for building a product. (Though one day IR could sell to agencies — SBA,
  PTAC programs — that's a Year 2+ conversation.)

## Client acquisition — the anti-SaaS playbook

The GovCon audience is allergic to SaaS-speak. They read capability statements, past
performance, and numbers. So IR sells the way *they* sell:

1. **The Pipeline Audit (the wedge).** Never "book a demo." Offer: *"Give me your UEI.
   In 15 minutes I'll show you every contract in your NAICS codes expiring in the next
   18 months and what's currently open that matches you — free, keep the list."*
   That's not a pitch, it's a deliverable. The tool sells itself while delivering it.
   This works on calls, at conferences, in DMs, at APEX events.

2. **The Content Engine — publish the data, not opinions.** IR sits on live market data
   nobody else publishes free. Weekly LinkedIn posts, auto-draftable from our own DB:
   - "The government posted $X.XB across N small-business set-asides this week. Top 5 by
     value: …" (from ContractCache)
   - "N contracts in NAICS 541512 expire in the next 12 months, worth $XXM. The
     incumbents: …" (from Recompete Radar)
   - Monthly "State of Small-Biz GovCon" mini-report (PDF, gated by email — feeds waitlist)
   Numbers + specifics = shared by the community. Zero "streamline your workflow" language, ever.

3. **Channel: the advisor layer.** APEX counselors, SBDC advisors, 8(a)/SDVOSB/WOSB
   association staff advise thousands of exactly-ICP companies and have NO tool budget.
   Give every counselor a free Pro account + co-branded workshop material ("Finding your
   first federal contract" — 30-minute deck using IR live). One counselor = a recurring
   stream of warm signups. This is the highest-leverage channel and costs $0.

4. **Product-led loops.** Referral: give a month, get a month. Proposal emails to
   contracting officers carry a subtle "prepared with IR" line (visible to exactly the
   right audience). Digest emails are forwardable by design.

5. **The voice.** IR's brand IS the differentiation: blunt, terminal-dark, numbers-first,
   honest to a fault (we publish a security page that lists what we *don't* have).
   Copy rules: never "empower/unlock/seamless/game-changer." Always a number, a date, or
   an artifact. We're the anti-vendor in a market drowning in vendors.

## Competition — the kill-path, honestly

- **EZGovOpps/GovTribe tier:** beat on product now. Full loop + price + self-serve wins.
- **HigherGov:** the real medium-term rival — modern, data-strong, hungry. Beat by owning
  the beginner segment and the proposal workflow they don't have. Watch them quarterly.
- **GovWin IQ (Deltek):** don't attack the fortress; drain the moat. Their analyst-driven
  model can't price below ~$5k. Every contractor who starts on IR is a customer they never
  get. In 5 years their new-logo pipeline dries up from below. That's the grave — dug by
  demographics, not features.
- **Bloomberg (BGOV):** aspirational metaphor, not a competitor — they sell to policy
  shops and lobbyists. "The Bloomberg Terminal of GovCon" is OUR positioning language for
  what IR becomes at scale: the screen every contractor has open all day. The way you
  "bury" Bloomberg is by making the terminal the *default surface* of the workday for a
  market they never served.
- **The compounding moat:** pipeline outcome data. Every won/lost logged in IR trains the
  win-probability engine. Nobody — not Deltek, not Bloomberg — has ground-truth outcome
  data from small-business bidders. At 1,000 active users this becomes the dataset the
  whole industry wants. Protect it, never sell it, build on it.

## The sequenced plan

### Now → Launch (July 28)
1. Finish env vars (Stripe/Google/Voyage/ADMIN_EMAIL/CRON_SECRET) + migration + sync
2. Google Search Console + Bing; first 3 data posts on LinkedIn (pre-launch credibility)
3. APEX outreach: 5 Florida offices emailed, 2 conversations held
4. 10 hand-recruited beta users from those conversations — free Pro for feedback + a
   testimonial ask after first value moment
5. Claude proposal-drafting + scan feature shipped (the $299-justifying unlock)

### Launch → end of Q3
- Public launch to waitlist + socials + communities (genuinely useful posts, not ads)
- Weekly cadence begins (see rhythm above). Target: **25 paying by Sept 30**
- First 10 customers grandfathered forever at launch pricing — tell them so, publicly
- Apply: cloud/AI credit programs; one pitch competition
- Collect win stories obsessively; first case study published the week it exists

### Q4 → mid-2027
- Raise Pro to $299 for new users once 10 logos + case studies exist
- Annual billing (2 months free) — cash flow + churn armor
- SEO compounding: 100+ NAICS/agency/set-aside programmatic pages
- Advisor channel formalized (counselor accounts, co-branded decks, webinar circuit)
- Evaluate: SBIR shot, accelerator application, SLED expansion — from a position of traction
- Milestone that changes everything: **$30k MRR ≈ founder goes full-time.** That's the
  real target date for "quit the day job" math (adjust to personal runway).

## What "winning" looks like at each horizon

- **90 days:** 25 paying, 3 case studies, 2 advisor partnerships, search-visible
- **1 year:** ~$15–30k MRR, the default recommendation at APEX/SBDC offices in 5+ states,
  outcome dataset started
- **3 years:** the entry-point brand for federal contracting; GovWin's sub-$5M-revenue
  segment effectively gone; acquirers calling — and IR strong enough to say no.
