'use client'

import { useWallets } from '@privy-io/react-auth/solana'
import { ShieldCheck } from 'lucide-react'
import { useUmbraClient } from '@/hooks/use-umbra-client'

export default function UmbraGate({ children }: { children: React.ReactNode }) {
  const { wallets } = useWallets()
  const wallet = wallets[0] ?? null
  const umbra = useUmbraClient(wallet)

  // No wallet connected — let auth handle it
  if (!wallet) return <>{children}</>

  // Initializing or registering
  if (umbra.status === 'initializing' || umbra.status === 'registering') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 rounded-full border border-[#333] animate-pulse mx-auto" />
          <p className="text-sm text-[#555]">
            {umbra.status === 'registering' ? 'Registering with Umbra…' : 'Connecting to Umbra…'}
          </p>
        </div>
      </div>
    )
  }

  // Registered or error (don't block on Umbra errors) — proceed
  if (umbra.isRegistered || umbra.status === 'error') return <>{children}</>

  // Ready but not registered — force onboarding
  if (umbra.status === 'ready' && !umbra.isRegistered) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-sm w-full space-y-6 text-center">
          <div className="h-12 w-12 rounded-xl bg-[#111] border border-[#222] flex items-center justify-center mx-auto">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-white">Set up private payments</h2>
            <p className="text-sm text-[#888] leading-relaxed">
              PSR uses Umbra's stealth pool for private payroll.
              Register your wallet once — takes one signature.
              Anyone sending you payroll on PSR will route it through Umbra so
              there's no on-chain link between payer and recipient.
            </p>
          </div>

          <div className="rounded-xl border border-[#222] bg-[#111] p-4 space-y-2 text-left">
            {[
              'One-time Ed25519 signature — no gas fee',
              'Your wallet is now scannable for stealth UTXOs',
              'Senders route payments privately through Umbra',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <span className="text-white mt-0.5 shrink-0">·</span>
                <span className="text-xs text-[#888]">{item}</span>
              </div>
            ))}
          </div>

          <button
            onClick={async () => {
              try {
                await umbra.register()
              } catch {
                // error shown via umbra.error
              }
            }}
            disabled={umbra.status !== 'ready'}
            className="w-full px-4 py-3 rounded-lg bg-white text-black text-sm font-medium hover:bg-[#e0e0e0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Register with Umbra →
          </button>

          {umbra.error && (
            <p className="text-xs text-[#888]">{umbra.error}</p>
          )}
        </div>
      </div>
    )
  }

  return <>{children}</>
}
