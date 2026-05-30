import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { Button } from '@/components/ui/button'

const PRICING_PLANS = [
  {
    name: 'Starter',
    price: 79,
    description: 'Perfect for small businesses just starting with government contracts.',
    features: [
      '25 contract matches/month',
      '3 document templates',
      'Basic match scoring',
      'Email support',
      'SAM.gov integration',
    ],
    cta: 'Start Free Trial',
    popular: false,
    tier: 'starter',
  },
  {
    name: 'Pro',
    price: 199,
    description: 'For established contractors ready to scale their government business.',
    features: [
      'Unlimited contract matches',
      'Full document suite',
      'AI-drafted responses',
      'Advanced match scoring',
      'Priority support',
      'Direct SAM.gov integration',
    ],
    cta: 'Start Free Trial',
    popular: true,
    tier: 'pro',
  },
  {
    name: 'Enterprise',
    price: 499,
    description: 'For agencies and large contractors managing multiple pursuits.',
    features: [
      'Everything in Pro',
      '5 team seats',
      'White-label documents',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
      'Priority 24/7 support',
    ],
    cta: 'Contact Sales',
    popular: false,
    tier: 'enterprise',
  },
]

const TESTIMONIALS = [
  {
    quote: "IR helped us find and win a $2.4M SDVOSB contract we would have completely missed. The match scoring is incredibly accurate.",
    author: "Marcus T.",
    company: "Veteran Tech Solutions",
    role: "CEO",
  },
  {
    quote: "The capability statement generator alone saved us 20 hours of work. We went from frustrated to fully qualified in days.",
    author: "Sarah K.",
    company: "Federal Consulting Group",
    role: "Business Development Manager",
  },
  {
    quote: "As an 8(a) company, we needed targeted matches. IR delivers exactly that — relevant contracts, zero noise.",
    author: "David R.",
    company: "R&D Federal Services",
    role: "President",
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#1E3A5F]/20 to-slate-950 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#C8A96E]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#1E3A5F]/50 border border-[#C8A96E]/30 mb-8 shadow-lg shadow-[#C8A96E]/10">
            <span className="text-5xl text-[#C8A96E]" style={{ fontFamily: 'serif' }}>ᛁ</span>
          </div>

          <div className="inline-flex items-center gap-2 bg-[#C8A96E]/10 border border-[#C8A96E]/20 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#C8A96E] animate-pulse" />
            <span className="text-[#C8A96E] text-sm font-medium">Live SAM.gov Integration</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
            Find Your Perfect{' '}
            <span className="text-[#C8A96E]">Government Contract</span>
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            IR uses intelligent matching to connect your business profile with the most relevant federal contract opportunities on SAM.gov — ranked by how well they match your certifications, NAICS codes, and preferences.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button variant="gold" size="lg" className="min-w-[200px]">
                Start Matching — Free
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button variant="outline" size="lg" className="min-w-[200px]">
                See How It Works
              </Button>
            </Link>
          </div>

          <p className="mt-6 text-sm text-slate-500">
            No credit card required &bull; 14-day free trial &bull; Cancel anytime
          </p>

          <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            {[
              { value: '50,000+', label: 'Active Opportunities' },
              { value: '$2.4T', label: 'Annual Contract Value' },
              { value: '98%', label: 'Match Accuracy' },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-[#C8A96E]">{stat.value}</div>
                <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-4 bg-slate-900/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              From Profile to Contract in{' '}
              <span className="text-[#C8A96E]">3 Simple Steps</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Our onboarding takes 5 minutes. Then we do the work of finding your best-fit opportunities.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Build Your Profile',
                description: 'Tell us about your company — NAICS codes, certifications, set-aside eligibility, geographic preferences, and contract size targets. Our 7-step wizard makes it simple.',
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                ),
              },
              {
                step: '02',
                title: 'Get Matched',
                description: 'Our algorithm scores every active SAM.gov opportunity against your profile — NAICS alignment, set-aside eligibility, contract size, and geographic fit. See your top matches ranked by score.',
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                ),
              },
              {
                step: '03',
                title: 'Win Contracts',
                description: 'Save promising opportunities, generate professional documents pre-filled with your company data, and track your pipeline to a successful award.',
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
            ].map((item, i) => (
              <div key={i} className="relative bg-slate-900 border border-slate-800 rounded-2xl p-8 hover:border-[#C8A96E]/30 transition-colors">
                <div className="absolute top-6 right-6 text-6xl font-bold text-slate-800 select-none">{item.step}</div>
                <div className="text-[#C8A96E] mb-4">{item.icon}</div>
                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-slate-400 leading-relaxed text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Built for <span className="text-[#C8A96E]">Serious Government Contractors</span>
            </h2>
            <p className="text-slate-400 text-lg">Everything you need to find, qualify, and pursue federal opportunities.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'Intelligent Match Scoring',
                desc: 'Every contract gets a 0–100 match score based on your NAICS codes, certifications, geography, and size preferences.',
                icon: '🎯',
              },
              {
                title: 'Real-Time SAM.gov Data',
                desc: 'Direct integration with SAM.gov Opportunities API ensures you see the most current solicitations and amendments.',
                icon: '📡',
              },
              {
                title: 'Document Generation',
                desc: 'Generate professional capability statements, letters of intent, and RFI responses pre-filled with your company data.',
                icon: '📄',
              },
              {
                title: 'Set-Aside Filtering',
                desc: 'Automatically surface opportunities matching your SBA, 8(a), SDVOSB, WOSB, or HUBZone certifications.',
                icon: '🏅',
              },
              {
                title: 'Saved Opportunities',
                desc: 'Build your pursuit pipeline by saving high-match contracts and tracking deadlines and status changes.',
                icon: '⭐',
              },
              {
                title: 'Team Collaboration',
                desc: 'Enterprise plans support up to 5 team seats so your business development team works from the same data.',
                icon: '👥',
              },
            ].map((feat, i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-[#C8A96E]/20 transition-colors">
                <div className="text-3xl mb-3">{feat.icon}</div>
                <h3 className="text-white font-semibold mb-2">{feat.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4 bg-slate-900/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Simple, Transparent <span className="text-[#C8A96E]">Pricing</span>
            </h2>
            <p className="text-slate-400 text-lg">One contract win pays for a year of IR. Start free, no credit card required.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {PRICING_PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative bg-slate-900 rounded-2xl p-8 border ${plan.popular ? 'border-[#C8A96E] shadow-xl shadow-[#C8A96E]/10' : 'border-slate-800'}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-[#C8A96E] text-slate-950 text-xs font-bold px-4 py-1.5 rounded-full">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                  <p className="text-slate-400 text-sm">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <span className="text-5xl font-bold text-white">${plan.price}</span>
                  <span className="text-slate-400 ml-2">/month</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <svg className="w-4 h-4 text-[#C8A96E] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href={plan.tier === 'enterprise' ? '/register?plan=enterprise' : '/register'}>
                  <Button
                    variant={plan.popular ? 'gold' : 'outline'}
                    size="lg"
                    className="w-full"
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Trusted by <span className="text-[#C8A96E]">Government Contractors</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <svg key={j} className="w-4 h-4 text-[#C8A96E]" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</p>
                <div>
                  <div className="font-semibold text-white text-sm">{t.author}</div>
                  <div className="text-slate-500 text-xs">{t.role}, {t.company}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-r from-[#1E3A5F]/30 via-slate-900 to-[#1E3A5F]/30">
        <div className="max-w-2xl mx-auto text-center">
          <span className="text-5xl block mb-6 text-[#C8A96E]" style={{ fontFamily: 'serif' }}>ᛁ</span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Start Finding Your{' '}
            <span className="text-[#C8A96E]">Perfect Match</span>
          </h2>
          <p className="text-slate-400 text-lg mb-8">
            Join hundreds of contractors who have discovered their best-fit government opportunities with IR.
          </p>
          <Link href="/register">
            <Button variant="gold" size="lg" className="min-w-[220px]">
              Create Free Account
            </Button>
          </Link>
          <p className="mt-4 text-slate-600 text-sm">14-day free trial &bull; No credit card required</p>
        </div>
      </section>

      <Footer />
    </div>
  )
}
