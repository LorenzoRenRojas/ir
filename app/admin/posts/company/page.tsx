import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import { generatePosts } from '@/lib/post-generator'
import Shell from '../Shell'
import PostList from '../PostList'

export const dynamic = 'force-dynamic'

export default async function CompanyPostsPage() {
  const session = await requireAdmin()
  if (!session) redirect('/dashboard')
  const posts = (await generatePosts()).filter(p => p.audience === 'company')

  return (
    <Shell
      active="/admin/posts/company"
      title="Posts for the IR company page."
      intro="Plural and institutional, but written like a person runs it. Data forward, willing to hold an opinion, never corporate mush. These carry the market numbers and the capability story."
    >
      <PostList posts={posts} />
    </Shell>
  )
}
