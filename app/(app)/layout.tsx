import Link from 'next/link'
import { LayoutDashboard, Users, Inbox, BookUser, LockKeyhole } from 'lucide-react'
import WalletButton from '@/components/wallet-button'

const navItems = [
  { href: '/dashboard',  label: 'Dashboard', icon: LayoutDashboard },
  { href: '/payroll',    label: 'Payroll',   icon: Users },
  { href: '/received',   label: 'Received',  icon: Inbox },
  { href: '/contacts',   label: 'Contacts',  icon: BookUser },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-black overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col border-r border-[#222] bg-black">
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-[#222]">
          <div className="h-6 w-6 rounded bg-white flex items-center justify-center shrink-0">
            <LockKeyhole className="h-3.5 w-3.5 text-black" />
          </div>
          <div>
            <p className="text-white font-semibold tracking-tight text-sm leading-none">PSR</p>
            <p className="text-[#555] text-[10px] leading-none mt-0.5">Private Payroll</p>
          </div>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[#888] hover:text-white hover:bg-[#111] transition-colors"
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-[#222]">
          <WalletButton />
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center justify-end px-6 border-b border-[#222] bg-black shrink-0">
          <WalletButton />
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
