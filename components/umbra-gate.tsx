'use client'

import { useState } from 'react'
import { useWallets } from '@privy-io/react-auth/solana'
import { ShieldCheck, RefreshCw, X } from 'lucide-react'
import { useUmbraClient } from '@/hooks/use-umbra-client'

export default function UmbraGate({ children }: { children: React.ReactNode }) {
  const { wallets } = useWallets()
  const wallet = wallets[0] ?? null
  const umbra = useUmbraClient(wallet)
  const [errorDismissed, setErrorDismissed] = useState(false)

  // No wallet connected — let auth handle it
  if (!wallet) return <>{children}</>

  // Already registered — pass through regardless of SDK status
  if (umbra.isRegistered) return <>{children}</>

  // Initializing — brief spinner (fast for returning users thanks to localStorage cache)
  if (umbra.status === 'initializing') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 rounded-full border border-[#333] animate-pulse mx-auto" />
          <p className="text-sm text-[#555]">Connecting to Umbra…</p>
        </div>
      </div>
    )
  }

  // Registering — show progress
  if (umbra.status === 'registering') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 rounded-full border border-[#333] animate-pulse mx-auto" />
          <p className="text-sm text-[#555]">Registering with Umbra — approve the signature in your wallet…</p>
        </div>
      </div>
    )
  }

  // Init error (SDK/network failed) — pass through with dismissible banner
  if (umbra.status === 'error' && umbra.errorKind === 'init') {
    return (
      <>
        {!errorDismissed && (
          <div className="flex items-start justify-between gap-3 px-4 py-3 bg-[#111] border-b border-[#222] text-xs text-[#888]">
            <span>
              <span className="text-white font-medium">Umbra connection failed</span>
              {' — '}could not reach the Umbra network. Sending and claiming may not work.{' '}
              <button
                onClick={() => window.location.reload()}
                className="underline text-[#aaa] hover:text-white"
              >
                Refresh to retry.
              </button>
            </span>
            <button
              onClick={() => setErrorDismissed(true)}
              className="shrink-0 text-[#555] hover:text-white transition-colors mt-0.5"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {children}
      </>
    )
  }

  // Ready (or registration error — button stays enabled to retry) — show onboarding screen
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-sm w-full space-y-6 text-center">
        <div className="h-12 w-12 rounded-xl bg-[#111] border border-[#222] flex items-center justify-center mx-auto">
          <ShieldCheck className="h-6 w-6 text-white" />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-white">Set up private payments</h2>
          <p className="text-sm text-[#888] leading-relaxed">
            Swiss routes payroll through Umbra's stealth pool. Register once —
            this stores your public keys on-chain so senders can create stealth UTXOs only you can claim.
          </p>
        </div>

        <div className="rounded-xl border border-[#222] bg-[#111] p-4 space-y-2 text-left">
          {[
            'One-time ZK proof + on-chain tx — stores your public keys',
            'Required to send and receive on Swiss',
            'Senders route privately; only you can scan & claim',
          ].map((item) => (
            <div key={item} className="flex items-start gap-2">
              <span className="text-white mt-0.5 shrink-0">·</span>
              <span className="text-xs text-[#888]">{item}</span>
            </div>
          ))}
        </div>

        {umbra.error && umbra.errorKind === 'registration' && (
          <div className="rounded-lg border border-[#2a1a1a] bg-[#1a0e0e] px-4 py-3 text-left">
            <p className="text-xs text-[#cc6666] leading-relaxed">{umbra.error}</p>
          </div>
        )}

        <button
          onClick={async () => {
            try { await umbra.register() } catch { /* error shown above */ }
          }}
          disabled={(umbra.status as any) === 'registering'}
          className="w-full px-4 py-3 rounded-lg bg-[#43AED6] text-white text-sm font-medium hover:bg-[#3a9dc3] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {umbra.errorKind === 'registration' ? (
            <><RefreshCw className="h-4 w-4" /> Retry Registration</>
          ) : (
            'Register with Umbra →'
          )}
        </button>
      </div>
    </div>
  )
}
