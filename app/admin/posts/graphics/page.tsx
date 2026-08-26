import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import Shell from '../Shell'
import GraphicMaker from './GraphicMaker'

export const dynamic = 'force-dynamic'

export default async function GraphicsPage() {
  const session = await requireAdmin()
  if (!session) redirect('/dashboard')

  return (
    <Shell
      active="/admin/posts/graphics"
      title="Make a graphic for any number."
      intro="Branded 1200×1200 artwork in IR's palette. Type a stat, get a PNG. Use it for the drafts that do not ship with one, or for anything you want to post with a number attached."
    >
      <GraphicMaker />
    </Shell>
  )
}
