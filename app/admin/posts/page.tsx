import { redirect } from 'next/navigation'

// The studio is split by voice — company and founder drafts must never be
// confused for each other, so there is no combined view.
export default function PostStudioIndex() {
  redirect('/admin/posts/company')
}
