import { db } from '@/lib/db'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { StatusBadge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'

const invStatusMap: Record<string, 'draft' | 'outstanding' | 'paid' | 'overdue'> = {
  PENDING: 'outstanding',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'draft',
}

export default async function InvoicesPage() {
  const invoices = await db.invoice.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Invoices</h1>
          <p className="mt-1 text-sm text-[#888]">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''} total</p>
        </div>
        <Link
          href="/invoices/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-[#e5e5e5] text-black text-sm rounded-lg font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Invoice
        </Link>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#222] bg-[#111] overflow-hidden">
        {invoices.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-[#555]">
            No invoices yet.{' '}
            <Link href="/invoices/new" className="text-white hover:text-[#888] underline">
              Create your first invoice
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#222]">
                <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Invoice Ref</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Memo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Due Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-black transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/invoices/${inv.id}`} className="text-white hover:text-[#888] font-mono text-xs transition-colors">
                      {inv.invoiceRef}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[#555] text-xs font-mono">{inv.memo ?? '—'}</td>
                  <td className="px-4 py-3 text-white font-mono text-xs">
                    {formatCurrency(Number(inv.amount) / 1_000_000, inv.currency ?? 'USDC')}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={invStatusMap[inv.status] ?? 'draft'} type="invoice" />
                  </td>
                  <td className="px-4 py-3 text-[#888] text-xs">{inv.dueDate ? formatDate(inv.dueDate) : '—'}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="text-xs text-[#888] hover:text-white transition-colors"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
