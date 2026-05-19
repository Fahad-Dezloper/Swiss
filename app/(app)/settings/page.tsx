import { Card } from '@/components/ui/card'
import { truncateAddress } from '@/lib/utils'
import ComplianceToggle from './compliance-toggle'

const MOCK_WALLET = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-[#e2e8f0]">Settings</h1>
        <p className="mt-1 text-sm text-[#6b7280]">Manage your account and preferences</p>
      </div>

      {/* Wallet section */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-[#6b7280] uppercase tracking-wider">Wallet</h2>
        <Card>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-[#6b7280]">Connected Wallet</p>
              <p className="text-sm font-mono text-[#e2e8f0] break-all">{MOCK_WALLET}</p>
              <p className="text-xs text-[#6b7280]">
                Shortened: <span className="text-[#e2e8f0]">{truncateAddress(MOCK_WALLET)}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-4">
              <span className="h-2 w-2 rounded-full bg-[#10b981]" />
              <span className="text-xs text-[#10b981]">Connected</span>
            </div>
          </div>
        </Card>
      </section>

      {/* Organization */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-[#6b7280] uppercase tracking-wider">Organization</h2>
        <Card>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="orgName" className="block text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                Organization Name
              </label>
              <input
                id="orgName"
                type="text"
                defaultValue="Meridian Capital Partners"
                className="w-full px-3 py-2 bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg text-sm text-[#e2e8f0] placeholder-[#6b7280] focus:outline-none focus:ring-1 focus:ring-[#6366f1] focus:border-[#6366f1] transition-colors"
              />
            </div>
            <p className="text-xs text-[#6b7280]">
              Used on invoices and disclosure receipts. Not shared publicly on-chain.
            </p>
          </div>
        </Card>
      </section>

      {/* Compliance */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-[#6b7280] uppercase tracking-wider">Compliance</h2>
        <Card>
          <ComplianceToggle />
        </Card>
      </section>

      {/* Danger zone */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-[#6b7280] uppercase tracking-wider">Account</h2>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#e2e8f0]">Disconnect Wallet</p>
              <p className="text-xs text-[#6b7280] mt-0.5">
                Remove your wallet connection from this session
              </p>
            </div>
            <button className="px-3 py-1.5 text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors">
              Disconnect
            </button>
          </div>
        </Card>
      </section>
    </div>
  )
}
