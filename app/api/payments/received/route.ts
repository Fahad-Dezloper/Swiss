import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('walletAddress')

    if (!walletAddress) {
      return Response.json({ error: 'walletAddress is required' }, { status: 400 })
    }

    const payments = await db.payment.findMany({
      where: { recipientAddr: walletAddress },
      orderBy: { createdAt: 'desc' },
      include: {
        receipt: { select: { id: true, receiptHash: true } },
        proofEvents: {
          select: { verifierToken: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        payrollRun: { select: { periodLabel: true } },
      },
    })

    return Response.json(
      payments.map((p) => ({
        id: p.id,
        type: p.type,
        status: p.status,
        amount: p.amount.toString(),
        currency: p.currency,
        txSignature: p.txSignature,
        recipientAddr: p.recipientAddr,
        createdAt: p.createdAt,
        payrollRun: p.payrollRun,
        receiptId: p.receipt?.id ?? null,
        receiptHash: p.receipt?.receiptHash ?? null,
        verifierToken: p.proofEvents[0]?.verifierToken ?? null,
      }))
    )
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
