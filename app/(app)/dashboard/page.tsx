import { db } from '@/lib/db'
import { Card, CardTitle, CardValue, CardDescription } from '@/components/ui/card'
import { Users, ArrowUpRight, Receipt } from 'lucide-react'
import Link from 'next/link'
import { formatDate, truncateAddress } from '@/lib/utils'

export default async function DashboardPage() {
  const [
    runCount,
    payrollPayments,
    receiptCount,
    recentPayouts,
  ] = await Promise.all([
    db.payrollRun.count(),
    db.payment.findMany({
      where: { type: 'PAYROLL' },
      select: { amount: true },
    }),
    db.receipt.count({
      where: { payment: { type: 'PAYROLL' } },
    }),
    db.payment.findMany({
      where: { type: 'PAYROLL' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        payrollRun: { select: { periodLabel: true } },
        receipt: { select: { receiptHash: true } },
        proofEvents: { select: { verifierToken: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    }),
  ])

  const totalPaid = payrollPayments.reduce((sum, p) => sum + p.amount, BigInt(0))

  function formatAmount(lamports: bigint | number, currency: string): string {
    if (currency === 'SOL') {
      return (Number(lamports) / 1_000_000_000).toFixed(4) + ' SOL'
    }
    return (Number(lamports) / 1_000_000).toFixed(2) + ' ' + currency
  }

  const stats = [
    { label: 'Payroll Runs',       value: String(runCount),                                       delta: 'All time', icon: Users },
    { label: 'Total Paid Out',     value: formatAmount(totalPaid, 'SOL'),                          delta: 'Devnet', icon: ArrowUpRight },
    { label: 'Receipts Generated', value: String(receiptCount),                                   delta: 'Cryptographic proofs', icon: Receipt },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-[#888]">Private payroll — pay anyone, prove it cryptographically</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(({ label, value, delta, icon: Icon }) => (
          <Card key={label}>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{label}</CardTitle>
                <CardValue>{value}</CardValue>
                <CardDescription>{delta}</CardDescription>
              </div>
              <div className="h-8 w-8 rounded-lg bg-black border border-[#222] flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-[#888]" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent payouts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-white">Recent Payouts</h2>
          <Link href="/payroll" className="text-xs text-[#888] hover:text-white transition-colors">
            View all runs →
          </Link>
        </div>

        <div className="rounded-xl border border-[#222] bg-[#111] overflow-hidden">
          {recentPayouts.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-[#555]">
              No payouts yet.{' '}
              <Link href="/payroll/new" className="text-[#888] hover:text-white underline">
                Create a payroll run →
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#222]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Period</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Recipient</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Receipt</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Proof</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {recentPayouts.map((pmt) => (
                  <tr key={pmt.id} className="hover:bg-black transition-colors">
                    <td className="px-4 py-3 text-white text-xs font-mono">
                      {pmt.payrollRun?.periodLabel ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-[#888] text-xs font-mono">
                      {truncateAddress(pmt.recipientAddr)}
                    </td>
                    <td className="px-4 py-3 text-white text-xs font-mono">
                      {formatAmount(pmt.amount, pmt.currency)}
                    </td>
                    <td className="px-4 py-3">
                      {pmt.receipt ? (
                        <Link
                          href={`/receipt/${pmt.id}`}
                          className="text-xs text-[#888] hover:text-white underline font-mono"
                        >
                          view →
                        </Link>
                      ) : (
                        <span className="text-xs text-[#555]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#888] text-xs">
                      {formatDate(pmt.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {pmt.proofEvents[0] ? (
                        <a
                          href={`/verify/${pmt.proofEvents[0].verifierToken}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#888] hover:text-white underline font-mono"
                        >
                          verify →
                        </a>
                      ) : (
                        <span className="text-xs text-[#555]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
