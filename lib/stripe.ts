import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder', {
  apiVersion: '2026-04-22.dahlia',
})

export const STRIPE_PRICES = {
  starter: process.env.STRIPE_STARTER_PRICE_ID || '',
  pro: process.env.STRIPE_PRO_PRICE_ID || '',
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID || '',
}

export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    matches: 5,
    documents: 0,
    features: ['5 contract previews/month', 'Basic profile'],
  },
  starter: {
    name: 'Starter',
    price: 79,
    matches: 25,
    documents: 3,
    features: [
      '25 contract matches/month',
      '3 document templates',
      'Email support',
      'Basic match scoring',
    ],
    priceId: STRIPE_PRICES.starter,
  },
  pro: {
    name: 'Pro',
    price: 199,
    matches: Infinity,
    documents: Infinity,
    features: [
      'Unlimited contract matches',
      'Full document suite',
      'AI-drafted responses',
      'Priority support',
      'Advanced match scoring',
      'SAM.gov direct integration',
    ],
    priceId: STRIPE_PRICES.pro,
  },
  enterprise: {
    name: 'Enterprise',
    price: 499,
    matches: Infinity,
    documents: Infinity,
    features: [
      'Everything in Pro',
      '5 team seats',
      'White-label documents',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
    ],
    priceId: STRIPE_PRICES.enterprise,
  },
} as const

export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  returnUrl: string
): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${returnUrl}/settings?success=true`,
    cancel_url: `${returnUrl}/settings?canceled=true`,
  })

  return session.url || ''
}

export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${returnUrl}/settings`,
  })

  return session.url
}
