// Shared FAQ content — used by the pricing UI and by the FAQ structured-data
// markup in page.tsx. Kept in a plain module so the server page can import the
// data across the client boundary.
export const FAQS = [
  { q: 'Is there a free tier?', a: 'Yes — sign up free, build your profile, and preview your matches before paying anything.' },
  { q: 'Do I need a sales call?', a: 'No. Self-serve signup, and your SAM.gov UEI auto-fills your profile in about 40 seconds.' },
  { q: 'Can I cancel anytime?', a: 'Yes. Month to month, no contracts, no cancellation calls.' },
  { q: 'Where does the data come from?', a: 'Live from official U.S. government sources: SAM.gov for solicitations and USAspending.gov for award and expiration intelligence.' },
]
