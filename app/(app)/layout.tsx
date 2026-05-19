import Link from 'next/link'
import { LayoutDashboard, FileText, Users, Settings, LockKeyhole } from 'lucide-react'
import { truncateAddress } from '@/lib/utils'

const MOCK_WALLET = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'

const navItems = [
  { href: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/invoices',  label: 'Invoices',   icon: FileText },
  { href: '/payroll',   label: 'Payroll',    icon: Users },
  { href: '/settings',  label: 'Settings',   icon: Settings },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-black overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col border-r border-[#222] bg-black">
        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-[#222]">
          <div className="h-6 w-6 rounded bg-white flex items-center justify-center shrink-0">
            <LockKeyhole className="h-3.5 w-3.5 text-black" />
          </div>
          <span className="text-white font-semibold tracking-tight">PSR</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[#888] hover:text-white hover:bg-[#111] transition-colors group"
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Wallet display */}
        <div className="p-3 border-t border-[#222]">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#111] border border-[#222]">
            <span className="h-2 w-2 rounded-full bg-white shrink-0" />
            <span className="text-xs text-[#888] font-mono truncate">
              {truncateAddress(MOCK_WALLET)}
            </span>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 flex items-center justify-between px-6 border-b border-[#222] bg-black shrink-0">
          <div />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111] border border-[#222]">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              <span className="text-xs text-[#888] font-mono">
                {truncateAddress(MOCK_WALLET)}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
