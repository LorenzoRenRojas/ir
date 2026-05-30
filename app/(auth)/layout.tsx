import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4">
      <div className="mb-8">
        <Link href="/" className="text-3xl font-bold" style={{ color: '#C8A96E' }}>
          ᛁ IR
        </Link>
      </div>
      {children}
    </div>
  )
}
