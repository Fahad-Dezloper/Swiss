import { LockKeyhole } from 'lucide-react'
import { cn } from '@/lib/utils'

export type PaymentStatus = 'pending' | 'delivered' | 'claimed' | 'disclosed' | 'failed'
export type InvoiceStatus = 'draft' | 'outstanding' | 'paid' | 'overdue'

const paymentStatusStyles: Record<PaymentStatus, string> = {
  pending:   'border-[#333] text-[#666] bg-transparent',
  delivered: 'border-[#555] text-[#ccc] bg-transparent',
  claimed:   'border-[#888] text-white bg-transparent',
  disclosed: 'border-white/20 text-white bg-white/5',
  failed:    'border-[#333] text-[#444] bg-transparent',
}

const invoiceStatusStyles: Record<InvoiceStatus, string> = {
  draft:       'border-[#333] text-[#555] bg-transparent',
  outstanding: 'border-[#555] text-[#aaa] bg-transparent',
  paid:        'border-[#888] text-white bg-transparent',
  overdue:     'border-[#555] text-[#888] bg-transparent',
}

const paymentStatusLabel: Record<PaymentStatus, string> = {
  pending:   'Pending',
  delivered: 'Delivered',
  claimed:   'Claimed',
  disclosed: 'Disclosed',
  failed:    'Failed',
}

const invoiceStatusLabel: Record<InvoiceStatus, string> = {
  draft:       'Draft',
  outstanding: 'Outstanding',
  paid:        'Paid',
  overdue:     'Overdue',
}

interface StatusBadgeProps {
  status: PaymentStatus | InvoiceStatus
  type?: 'payment' | 'invoice'
  className?: string
}

export function StatusBadge({ status, type = 'payment', className }: StatusBadgeProps) {
  const styles =
    type === 'payment'
      ? paymentStatusStyles[status as PaymentStatus]
      : invoiceStatusStyles[status as InvoiceStatus]

  const label =
    type === 'payment'
      ? paymentStatusLabel[status as PaymentStatus]
      : invoiceStatusLabel[status as InvoiceStatus]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium border',
        styles,
        className
      )}
    >
      {label}
    </span>
  )
}

interface PrivacyBadgeProps {
  fieldsHidden: number
  className?: string
}

export function PrivacyBadge({ fieldsHidden, className }: PrivacyBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium',
        'bg-transparent text-[#888] border border-[#333]',
        className
      )}
    >
      <LockKeyhole className="h-3 w-3 text-[#888]" />
      {fieldsHidden} field{fieldsHidden !== 1 ? 's' : ''} hidden
    </span>
  )
}
