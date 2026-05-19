import { LockKeyhole, CheckCircle, XCircle } from 'lucide-react'
import { PrivacyBadge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

interface VerifierData {
  fields?: Record<string, unknown>
  proofState?: string
  verifiedAt?: string
  packageHash?: string
  error?: string
}

async function getVerifierData(token: string): Promise<VerifierData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/verify/${token}`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default async function VerifierPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const data = await getVerifierData(token)

  const isValid = data !== null && !data.error && data.fields !== undefined

  // Count fields that are non-null and a rough hidden count
  const disclosedFields = data?.fields ?? {}
  const allPossibleFields = ['invoice_ref', 'payment_period', 'timestamp', 'settlement_status', 'amount', 'currency', 'rail']
  const disclosedCount = Object.values(disclosedFields).filter((v) => v !== null).length
  const hiddenCount = allPossibleFields.length - disclosedCount

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="h-6 w-6 rounded bg-white flex items-center justify-center">
            <LockKeyhole className="h-3.5 w-3.5 text-black" />
          </div>
          <span className="text-[#888] text-sm">Private Settlement Receipt</span>
        </div>

        {/* Status card */}
        <div className="rounded-xl border border-[#222] bg-[#111] overflow-hidden">
          {/* Header */}
          <div className={`px-6 py-5 flex items-center gap-4 border-b border-[#222] ${
            isValid ? 'bg-white/5' : 'bg-transparent'
          }`}>
            {isValid ? (
              <CheckCircle className="h-6 w-6 text-white shrink-0" />
            ) : (
              <XCircle className="h-6 w-6 text-[#555] shrink-0" />
            )}
            <div>
              <p className="text-sm font-semibold text-white">
                {isValid ? 'Payment Verified' : 'Not Found'}
              </p>
              <p className="text-xs text-[#888] mt-0.5">
                {isValid
                  ? 'This receipt is authentic and has not been tampered with.'
                  : 'This link is invalid or has expired.'}
              </p>
            </div>
          </div>

          {/* Disclosed fields */}
          {isValid && (
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-[#888] uppercase tracking-wider">
                  Disclosed Information
                </p>
                {hiddenCount > 0 && (
                  <PrivacyBadge fieldsHidden={hiddenCount} />
                )}
              </div>

              <div className="space-y-3">
                {disclosedFields.invoice_ref != null && (
                  <FieldRow label="Invoice Reference" value={String(disclosedFields.invoice_ref)} mono />
                )}
                {disclosedFields.timestamp != null && (
                  <FieldRow
                    label="Settlement Date"
                    value={formatDate(String(disclosedFields.timestamp))}
                  />
                )}
                {disclosedFields.settlement_status != null && (
                  <FieldRow label="Settlement Status" value={String(disclosedFields.settlement_status)} />
                )}
                {disclosedFields.amount != null && disclosedFields.currency != null && (
                  <FieldRow
                    label="Amount"
                    value={`${disclosedFields.amount} ${disclosedFields.currency}`}
                    mono
                  />
                )}
                {disclosedFields.amount != null && disclosedFields.currency == null && (
                  <FieldRow label="Amount" value={String(disclosedFields.amount)} mono />
                )}
                {disclosedFields.rail != null && (
                  <FieldRow label="Rail" value={String(disclosedFields.rail)} />
                )}
                {data?.proofState && (
                  <FieldRow label="Proof State" value={data.proofState} />
                )}
                {data?.packageHash && (
                  <FieldRow label="Package Hash" value={data.packageHash.slice(0, 20) + '…'} mono />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Explanation */}
        <div className="rounded-xl border border-[#222] bg-[#111] p-5 space-y-3">
          <p className="text-xs font-medium text-[#888] uppercase tracking-wider">What is this?</p>
          <p className="text-sm text-[#888] leading-relaxed">
            This page shows a selectively-disclosed payment receipt. The sender chose to reveal
            only specific fields from their private settlement — the rest remain cryptographically
            hidden and cannot be deduced from this link.
          </p>
          <p className="text-sm text-[#888] leading-relaxed">
            This receipt is anchored on-chain. The information shown here has been verified
            against the original transaction hash and cannot be forged.
          </p>
        </div>

        <p className="text-center text-xs text-[#555]">
          Powered by{' '}
          <span className="text-white">Private Settlement Receipts</span>
          {' '}— Send money privately. Prove it later.
        </p>
      </div>
    </main>
  )
}

function FieldRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-[#888] shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm text-white text-right ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}
