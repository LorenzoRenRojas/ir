import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import { generatePosts } from '@/lib/post-generator'
import { buildFounderBrief } from '@/lib/founder-brief'
import Shell from '../Shell'
import GraphicMaker, { type Preset } from './GraphicMaker'

export const dynamic = 'force-dynamic'

const n = (x: number) => x.toLocaleString('en-US')

export default async function GraphicsPage() {
  const session = await requireAdmin()
  if (!session) redirect('/dashboard')

  // Presets come from live data, not placeholders. Every generated draft that
  // carries a headline number already computed one from the store, so those
  // become the starting points — nothing here is a number someone typed.
  const [posts, brief] = await Promise.all([
    generatePosts().catch(() => []),
    buildFounderBrief().catch(() => null),
  ])

  const presets: Preset[] = []
  for (const p of posts) {
    if (p.image) presets.push({ name: p.label, ...p.image })
  }

  // A few extra angles the drafts do not cover, still from real counts.
  if (brief) {
    if (brief.liveCount > 0) {
      presets.push({
        name: 'Live market size',
        stat: n(brief.liveCount),
        label: 'OPEN SOLICITATIONS TRACKED',
        sub: 'Scored against your business, continuously',
      })
    }
    if (brief.topNaics.length > 0) {
      presets.push({
        name: 'Busiest NAICS',
        stat: brief.topNaics[0].code,
        label: 'BUSIEST NAICS CODE THIS WEEK',
        sub: `${n(brief.topNaics[0].count)} new solicitations tracked`,
      })
    }
    if (brief.smallBizPct !== null && brief.postedThisWeek > 0) {
      presets.push({
        name: 'Set-aside share',
        stat: `${brief.smallBizPct}%`,
        label: 'OF THIS WEEK CARRIES A SET-ASIDE',
        sub: `Across ${n(brief.postedThisWeek)} solicitations tracked`,
      })
    }
  }

  return (
    <Shell
      active="/admin/posts/graphics"
      title="Make a graphic for any number."
      intro="Branded 1200×1200 artwork in IR's palette. Presets are filled from live data in the contract store, so the numbers are real before you touch anything. Every field stays editable."
    >
      <GraphicMaker presets={presets} />
    </Shell>
  )
}
