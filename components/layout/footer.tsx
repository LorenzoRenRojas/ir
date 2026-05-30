import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-3xl text-[#C8A96E] font-bold" style={{ fontFamily: 'serif' }}>ᛁ</span>
              <span className="text-xl font-bold text-white tracking-wide">IR</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              IR (Norse rune for peace) — connecting businesses with their perfect government contracts.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-white font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              <li><Link href="/#how-it-works" className="text-slate-400 hover:text-[#C8A96E] text-sm transition-colors">How It Works</Link></li>
              <li><Link href="/#pricing" className="text-slate-400 hover:text-[#C8A96E] text-sm transition-colors">Pricing</Link></li>
              <li><Link href="/dashboard" className="text-slate-400 hover:text-[#C8A96E] text-sm transition-colors">Dashboard</Link></li>
              <li><Link href="/documents" className="text-slate-400 hover:text-[#C8A96E] text-sm transition-colors">Documents</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              <li><Link href="#" className="text-slate-400 hover:text-[#C8A96E] text-sm transition-colors">About</Link></li>
              <li><Link href="#" className="text-slate-400 hover:text-[#C8A96E] text-sm transition-colors">Blog</Link></li>
              <li><Link href="#" className="text-slate-400 hover:text-[#C8A96E] text-sm transition-colors">Careers</Link></li>
              <li><Link href="#" className="text-slate-400 hover:text-[#C8A96E] text-sm transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li><Link href="#" className="text-slate-400 hover:text-[#C8A96E] text-sm transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="text-slate-400 hover:text-[#C8A96E] text-sm transition-colors">Terms of Service</Link></li>
              <li><Link href="#" className="text-slate-400 hover:text-[#C8A96E] text-sm transition-colors">Security</Link></li>
              <li><Link href="#" className="text-slate-400 hover:text-[#C8A96E] text-sm transition-colors">GDPR</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} IR Government Contract Matching. All rights reserved.
          </p>
          <p className="text-slate-600 text-xs">
            Data sourced from SAM.gov — official U.S. government contract database
          </p>
        </div>
      </div>
    </footer>
  )
}
