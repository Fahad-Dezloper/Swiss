import { db } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  let orgId = searchParams.get('orgId')

  if (!orgId) {
    const firstOrg = await db.organization.findFirst()
    if (!firstOrg) {
      return Response.json({ error: 'No organization found' }, { status: 404 })
    }
    orgId = firstOrg.id
  }

  // Outstanding invoices (PENDING status)
  const outstandingInvoices = await db.invoice.findMany({
    where: { orgId, status: 'PENDING' },
    select: { amount: true },
  })

  const outstandingTotal = outstandingInvoices.reduce(
    (sum, inv) => sum + inv.amount,
    BigInt(0),
  )

  // All payments for invoices belonging to this org
  const allPayments = await db.payment.findMany({
    where: {
      invoice: { orgId },
    },
    select: { amount: true },
  })

  const paymentsTotal = allPayments.reduce(
    (sum, p) => sum + p.amount,
    BigInt(0),
  )

  // Receipts generated for this org's payments
  const receiptsCount = await db.receipt.count({
    where: {
      payment: {
        invoice: { orgId },
      },
    },
  })

  // Disclosures created for receipts tied to this org's payments
  const disclosuresCount = await db.disclosureEvent.count({
    where: {
      receipt: {
        payment: {
          invoice: { orgId },
        },
      },
    },
  })

  // Recent payments (last 10) with invoice relation
  const recentPaymentsRaw = await db.payment.findMany({
    where: {
      invoice: { orgId },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { invoice: true },
  })

  const recentPayments = recentPaymentsRaw.map((p) => ({
    ...p,
    amount: p.amount.toString(),
    invoice: p.invoice
      ? { ...p.invoice, amount: p.invoice.amount.toString() }
      : null,
  }))

  return Response.json({
    outstandingInvoices: {
      count: outstandingInvoices.length,
      totalAmount: outstandingTotal.toString(),
    },
    totalPayments: {
      count: allPayments.length,
      totalAmount: paymentsTotal.toString(),
    },
    receiptsGenerated: receiptsCount,
    disclosuresCreated: disclosuresCount,
    recentPayments,
  })
}
