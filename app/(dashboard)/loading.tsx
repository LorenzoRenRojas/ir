import MetatronLoader from '@/components/MetatronLoader'

// Segment loading state — shows inside the dashboard shell during
// page-to-page navigation while server components resolve.
export default function DashboardLoading() {
  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <MetatronLoader size={140} label="LOADING…" />
    </div>
  )
}
