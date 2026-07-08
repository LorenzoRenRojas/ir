import MetatronLoader from '@/components/MetatronLoader'

// Root loading state — shows during server-side work on first boot
// (auth, sidebar snapshot queries) before any page can paint.
export default function RootLoading() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8F8F7' }}>
      <MetatronLoader size={160} label="IR — INITIALIZING" />
    </div>
  )
}
