# IR — Product Roadmap

## Phase 1: Core Product (Immediate)

| # | Feature | Est. Time | Notes |
|---|---------|-----------|-------|
| 1 | **Voyage AI semantic scoring** | ~2 hours | Already built — needs VOYAGE_API_KEY in Vercel + run /api/migrate + merge branch |
| 2 | **Saved contracts pipeline view** | ~4 hours | New /pipeline page, stage columns: Tracking → Pursuing → Submitted → Won/Lost |
| 3 | **Email alerts — daily digest** | ~6 hours | Resend or SendGrid, cron via Vercel, digest of new matching opportunities |
| 4 | **Pricing page + Stripe paid tier** | ~8 hours | $49/mo solo, $149/mo team, gate features behind subscription |
| 5 | **Documents page** | ~2 hours | /documents page already linked from contract detail — needs to actually exist |

## Phase 2: Competitive Parity (1–3 months)

| # | Feature | Est. Time | Notes |
|---|---------|-----------|-------|
| 6 | **Proposal drafting AI** | ~3 days | Claude-powered draft from RFP description, biggest win rate feature |
| 7 | **Pre-RFP tracking** | ~1 week | Monitor SOURCES SOUGHT + RFI notices, surface 60–90 days before solicitation |
| 8 | **SLED coverage** | ~1 week | State/local contracts via separate API (e.g. OpenGov, BidNet) — expands TAM |
| 9 | **Mobile-responsive UI** | ~1 day | Current layout breaks on mobile, must fix before paid launch |
| 10 | **Filter persistence** | ~2 hours | Save filters to localStorage or URL params across reloads |

## Phase 3: Enterprise & Acquisition-Ready (3–12 months)

| # | Feature | Est. Time | Notes |
|---|---------|-----------|-------|
| 11 | **CRM integration** (HubSpot first) | ~2 weeks | Push opportunities to existing BD workflows |
| 12 | **SOC 2 Type II** | 6–12 months + ~$30K | Compliance process, not a dev task — needed for enterprise sales |
| 13 | **FedRAMP Ready status** | 12–24 months | Required for defense contractors — plan for this early |
| 14 | **Team analytics dashboard** | ~3 days | Win rate, pipeline velocity, top opportunity sources per team |
| 15 | **Data flywheel documentation** | ongoing | Track and surface: "Your match quality improves with each save" — key acquisition narrative |

## North Star Metrics for Acquisition Readiness
- 100+ paying customers
- NRR > 110%
- $500K+ ARR at 3x growth rate
- SOC 2 Type II certified
- No single customer > 10% of revenue
