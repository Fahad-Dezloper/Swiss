import { db } from '@/lib/db'
import { proofService } from '@/lib/proof/proof-service'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { claimTxSignature, userId: bodyUserId } = body

    if (!claimTxSignature || typeof claimTxSignature !== 'string') {
      return Response.json({ error: 'claimTxSignature is required' }, { status: 400 })
    }

    const userId = bodyUserId ?? (await db.user.findFirst())?.id
    if (!userId) return Response.json({ error: 'No user found' }, { status: 400 })

    const payment = await db.payment.findUnique({ where: { id } })
    if (!payment) {
      return Response.json({ error: 'Payment not found' }, { status: 404 })
    }

    const updatedPayment = await db.payment.update({
      where: { id },
      data: {
        status: 'CLAIMED',
        txSignature: claimTxSignature,
      },
    })

    const proof = await proofService.generateProof({
      paymentId: id,
      proofType: 'CLAIMED',
      generatedById: userId,
    })

    return Response.json({
      payment: { ...updatedPayment, amount: updatedPayment.amount.toString() },
      proofToken: proof.verifierToken,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
