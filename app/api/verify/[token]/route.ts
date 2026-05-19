import { db } from '@/lib/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const proofEvent = await db.proofEvent.findUnique({
      where: { verifierToken: token },
      include: {
        payment: {
          include: {
            receipt: { select: { receiptHash: true } },
            payrollRun: { select: { periodLabel: true } },
          },
        },
      },
    })

    if (!proofEvent) {
      return Response.json({ error: 'Token not found' }, { status: 404 })
    }

    const { payment } = proofEvent

    return Response.json({
      type: 'proof',
      proofType: proofEvent.proofType,
      verifierPackageHash: proofEvent.verifierPackageHash,
      createdAt: proofEvent.createdAt,
      expiresAt: proofEvent.expiresAt,
      fields: {
        payment_period: payment.payrollRun?.periodLabel ?? null,
        amount: (Number(payment.amount) / 1_000_000).toFixed(6),
        currency: payment.currency,
        settlement_status: payment.status,
        timestamp: payment.createdAt,
        rail: payment.rail ?? 'umbra-stealth',
      },
      receiptHash: payment.receipt?.receiptHash ?? null,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
