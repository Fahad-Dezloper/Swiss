import { db } from '@/lib/db'
import { Card, CardTitle, CardValue, CardDescription } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { FileText, ArrowUpRight, Receipt, Eye } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatDate, truncateHash } from '@/lib/utils'

export default async function DashboardPage() {
  const [
    invoiceCount,
    paymentCount,
    receiptCount,
    disclosureCount,
    recentPayments,
  ] = await Promise.all([
    db.invoice.count(),
    db.payment.count(),
    db.receipt.count(),
    db.disclosureEvent.count(),
    db.payment.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { invoice: true },
    }),
  ])

  const stats = [
    {
      label: 'Total Invoices',
      value: String(invoiceCount),
      delta: 'All time',
      icon: FileText,
    },
    {
      label: 'Private Payments',
      value: String(paymentCount),
      delta: 'All time',
      icon: ArrowUpRight,
    },
    {
      label: 'Receipts Generated',
      value: String(receiptCount),
      delta: 'All time',
      icon: Receipt,
    },
    {
      label: 'Disclosures Created',
      value: String(disclosureCount),
      delta: 'All time',
      icon: Eye,
    },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-[#888]">Overview of your private settlements</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Recent payments */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-white">Recent Payments</h2>
          <Link href="/invoices" className="text-xs text-[#888] hover:text-white transition-colors">
            View all invoices →
          </Link>
        </div>

        <div className="rounded-xl border border-[#222] bg-[#111] overflow-hidden">
          {recentPayments.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-[#555]">No payments yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#222]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Invoice</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Tx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {recentPayments.map((pmt) => (
                  <tr key={pmt.id} className="hover:bg-black transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/payments/${pmt.id}`}
                        className="text-white hover:text-[#888] font-mono text-xs transition-colors"
                      >
                        {pmt.invoice?.invoiceRef ?? pmt.invoiceId}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-white font-mono text-xs">
                      {formatCurrency(Number(pmt.amount) / 1_000_000, 'USDC')}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={pmt.status as 'pending' | 'delivered' | 'claimed' | 'disclosed' | 'failed'} type="payment" />
                    </td>
                    <td className="px-4 py-3 text-[#888] text-xs">{formatDate(pmt.createdAt)}</td>
                    <td className="px-4 py-3 text-[#555] font-mono text-xs">
                      {pmt.txSignature ? truncateHash(pmt.txSignature, 4) : '—'}
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
