import { db } from '@/lib/db'
import { receiptService } from '@/lib/receipt/receipt-service'
import { proofService } from '@/lib/proof/proof-service'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { senderUserId: bodySenderUserId, recipientAddr, txSignature } = body

    // Resolve senderUserId — default to first user if not provided
    let senderUserId: string = bodySenderUserId
    if (!senderUserId || typeof senderUserId !== 'string') {
      const firstUser = await db.user.findFirst()
      if (!firstUser) {
        return Response.json({ error: 'No user found and senderUserId not provided' }, { status: 400 })
      }
      senderUserId = firstUser.id
    }

    if (!recipientAddr || typeof recipientAddr !== 'string') {
      return Response.json({ error: 'recipientAddr is required' }, { status: 400 })
    }
    if (!txSignature || typeof txSignature !== 'string') {
      return Response.json({ error: 'txSignature is required' }, { status: 400 })
    }

    const invoice = await db.invoice.findUnique({ where: { id } })
    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 })
    }
    if (invoice.status !== 'PENDING') {
      return Response.json(
        { error: `Invoice is not payable (status: ${invoice.status})` },
        { status: 400 },
      )
    }

    const payment = await db.payment.create({
      data: {
        type: 'INVOICE',
        invoiceId: id,
        senderUserId,
        recipientAddr,
        txSignature,
        amount: invoice.amount,
        currency: invoice.currency,
        status: 'DELIVERED',
      },
    })

    const receipt = await receiptService.createReceipt(payment)

    const proof = await proofService.generateProof({
      paymentId: payment.id,
      proofType: 'DELIVERED',
      generatedById: senderUserId,
    })

    await db.invoice.update({
      where: { id },
      data: { status: 'PAID' },
    })

    return Response.json(
      {
        payment: { ...payment, amount: payment.amount.toString() },
        receipt,
        proofToken: proof.verifierToken,
      },
      { status: 201 },
    )
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
