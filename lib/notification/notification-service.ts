import type { PaymentStatus } from '@/app/generated/prisma/client'

export async function notifyRecipient(paymentId: string, recipientAddr: string): Promise<void> {
  console.log('[notify] recipient', { paymentId, recipientAddr })

  const webhookUrl = process.env.WEBHOOK_URL
  if (!webhookUrl) return

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'payment.delivered', paymentId, recipientAddr }),
  })
}

export async function notifyStateChange(
  paymentId: string,
  newStatus: PaymentStatus,
): Promise<void> {
  console.log('[notify] state change', { paymentId, newStatus })

  const webhookUrl = process.env.WEBHOOK_URL
  if (!webhookUrl) return

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'payment.status_changed', paymentId, newStatus }),
  })
}
