import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import { fetchRegTopics } from '@/lib/reg-topics'
import Shell from '../Shell'
import TopicList from './TopicList'

// Auth makes this dynamic regardless; the six-hour unstable_cache inside
// fetchRegTopics is what actually keeps the four upstream queries off page
// loads, so the countdowns stay accurate without hammering the register.
export const dynamic = 'force-dynamic'

export default async function TopicsPage() {
  const session = await requireAdmin()
  if (!session) redirect('/dashboard')

  // Never let an upstream outage take the studio down — an empty queue is a
  // legible state, a 500 is not.
  const topics = await fetchRegTopics(12, 45).catch(() => [])

  return (
    <Shell
      active="/admin/posts/topics"
      title="What the government did this month"
      intro="Every proposed and final rule from the Federal Register that touches procurement, newest first, with open comment windows on top. The facts are primary source and quotable as written. The analysis is deliberately blank — that part is yours, because it is the part nobody has checked for you."
    >
      <TopicList topics={topics} />
    </Shell>
  )
}
