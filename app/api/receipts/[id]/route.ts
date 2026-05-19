import { db } from '@/lib/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paymentId } = await params

    const receipt = await db.receipt.findUnique({
      where: { paymentId },
      select: {
        id: true,
        paymentId: true,
        receiptHash: true,
        senderWallet: true,
        recipientWallet: true,
        createdAt: true,
      },
    })

    if (!receipt) {
      return Response.json({ error: 'Receipt not found' }, { status: 404 })
    }

    // Fetch payment metadata (non-sensitive)
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        type: true,
        status: true,
        amount: true,
        currency: true,
        recipientAddr: true,
        rail: true,
        createdAt: true,
        payrollRun: { select: { periodLabel: true } },
      },
    })

    return Response.json({
      ...receipt,
      payment: payment
        ? { ...payment, amount: payment.amount.toString() }
        : null,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
