import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('walletAddress')
    const tab = searchParams.get('tab') ?? 'paid'

    if (!walletAddress) {
      return Response.json({ error: 'walletAddress is required' }, { status: 400 })
    }

    const where =
      tab === 'received'
        ? { recipientWallet: walletAddress }
        : { senderWallet: walletAddress }

    const receipts = await db.receipt.findMany({
      where,
      include: {
        payment: {
          include: {
            payrollRun: { select: { periodLabel: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const result = receipts.map((r) => ({
      id: r.id,
      paymentId: r.paymentId,
      receiptHash: r.receiptHash,
      senderWallet: r.senderWallet,
      recipientWallet: r.recipientWallet,
      createdAt: r.createdAt,
      payment: r.payment
        ? {
            id: r.payment.id,
            amount: r.payment.amount.toString(),
            currency: r.payment.currency,
            status: r.payment.status,
            txSignature: r.payment.txSignature,
            recipientAddr: r.payment.recipientAddr,
            rail: r.payment.rail,
            createdAt: r.payment.createdAt,
            payrollRun: r.payment.payrollRun,
          }
        : null,
    }))

    return Response.json(result)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
