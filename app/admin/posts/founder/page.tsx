import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import { generatePosts } from '@/lib/post-generator'
import Shell from '../Shell'
import PostList from '../PostList'

export const dynamic = 'force-dynamic'

export default async function FounderPostsPage() {
  const session = await requireAdmin()
  if (!session) redirect('/dashboard')
  const posts = (await generatePosts()).filter(p => p.audience === 'founder')

  return (
    <Shell
      active="/admin/posts/founder"
      title="Posts for your profile."
      intro="First person and opinionated. People follow people, so this should never read like the company page wrote it. These are the ones that actually get engagement."
    >
      <PostList posts={posts} />
    </Shell>
  )
}
