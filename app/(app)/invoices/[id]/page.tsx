import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { db } from '@/lib/db'
import PaymentModal from './payment-modal'

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const invoice = await db.invoice.findUnique({
    where: { id },
    include: {
      payment: {
        include: {
          receipt: true,
          proofEvents: true,
        },
      },
    },
  })

  if (!invoice) notFound()

  // Map DB enum to badge type
  const statusMap: Record<string, 'draft' | 'outstanding' | 'paid' | 'overdue'> = {
    PENDING: 'outstanding',
    PAID: 'paid',
    OVERDUE: 'overdue',
    CANCELLED: 'draft',
  }
  const badgeStatus = statusMap[invoice.status] ?? 'draft'
  const isPendingPayment = invoice.status === 'PENDING' || invoice.status === 'OVERDUE'
  const amountDisplay = formatCurrency(Number(invoice.amount) / 1_000_000, invoice.currency)

  const invoiceForModal = {
    id: invoice.id,
    invoiceRef: invoice.invoiceRef,
    amount: Number(invoice.amount),
    currency: invoice.currency,
    counterpartyAddress: '',
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/invoices" className="text-[#888] hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-white font-mono">{invoice.invoiceRef}</h1>
            <StatusBadge status={badgeStatus} type="invoice" />
          </div>
          <p className="mt-0.5 text-sm text-[#888]">Invoice detail</p>
        </div>
      </div>

      {/* Details card */}
      <Card>
        <div className="grid grid-cols-2 gap-y-4 gap-x-8">
          <div>
            <p className="text-xs text-[#888] uppercase tracking-wider">Amount</p>
            <p className="mt-1 text-lg font-semibold text-white font-mono">{amountDisplay}</p>
          </div>
          <div>
            <p className="text-xs text-[#888] uppercase tracking-wider">Currency</p>
            <p className="mt-1 text-sm text-white">{invoice.currency}</p>
          </div>
          {invoice.dueDate && (
            <div>
              <p className="text-xs text-[#888] uppercase tracking-wider">Due Date</p>
              <p className="mt-1 text-sm text-white">{formatDate(invoice.dueDate)}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-[#888] uppercase tracking-wider">Created</p>
            <p className="mt-1 text-sm text-white">{formatDate(invoice.createdAt)}</p>
          </div>
          {invoice.memo && (
            <div className="col-span-2">
              <p className="text-xs text-[#888] uppercase tracking-wider">Memo (private)</p>
              <p className="mt-1 text-sm text-[#888]">{invoice.memo}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Payment section */}
      {invoice.status === 'PAID' && invoice.payment && (
        <Card>
          <p className="text-xs text-[#888] uppercase tracking-wider mb-3">Settlement</p>
          <div className="flex items-center justify-between">
            <p className="text-sm text-white">This invoice has been settled privately.</p>
            <Link
              href={`/payments/${invoice.payment.id}`}
              className="text-xs text-[#888] hover:text-white transition-colors"
            >
              View receipt →
            </Link>
          </div>
        </Card>
      )}

      {isPendingPayment && (
        <PaymentModal invoice={invoiceForModal} />
      )}
    </div>
  )
}
