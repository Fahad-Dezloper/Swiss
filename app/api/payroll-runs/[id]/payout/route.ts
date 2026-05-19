import { db } from '@/lib/db'
import { receiptService } from '@/lib/receipt/receipt-service'
import { proofService } from '@/lib/proof/proof-service'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { senderUserId: bodySenderUserId, senderWallet, recipientAddr, amount, currency, txSignature } = body

    const senderUserId: string = (typeof bodySenderUserId === 'string' && bodySenderUserId)
      ? bodySenderUserId
      : ((await db.user.findFirst())?.id ?? '')
    if (!senderUserId) return Response.json({ error: 'No user found' }, { status: 400 })

    if (!recipientAddr || typeof recipientAddr !== 'string') {
      return Response.json({ error: 'recipientAddr is required' }, { status: 400 })
    }
    if (!amount || typeof amount !== 'string') {
      return Response.json({ error: 'amount is required (lamports as string)' }, { status: 400 })
    }
    if (!txSignature || typeof txSignature !== 'string') {
      return Response.json({ error: 'txSignature is required (real on-chain tx)' }, { status: 400 })
    }

    let amountBigInt: bigint
    try {
      amountBigInt = BigInt(amount)
    } catch {
      return Response.json({ error: 'amount must be a valid integer string (lamports)' }, { status: 400 })
    }

    const payrollRun = await db.payrollRun.findUnique({ where: { id } })
    if (!payrollRun) {
      return Response.json({ error: 'Payroll run not found' }, { status: 404 })
    }

    // Create payment record with real tx signature
    const payment = await db.payment.create({
      data: {
        type: 'PAYROLL',
        payrollRunId: id,
        senderUserId,
        recipientAddr,
        txSignature,
        amount: amountBigInt,
        currency: currency ?? 'SOL',
        status: 'DELIVERED',
      },
    })

    // Resolve sender wallet for receipt authorization
    const resolvedSenderWallet = senderWallet ?? (
      await db.user.findUnique({
        where: { id: senderUserId },
        select: { walletAddress: true },
      })
    )?.walletAddress ?? ''

    // Create receipt — just a record linking tx to payment, no encryption
    const receipt = await receiptService.createReceipt(payment, resolvedSenderWallet)

    // Create proof event
    const proof = await proofService.generateProof({
      paymentId: payment.id,
      proofType: 'DELIVERED',
      generatedById: senderUserId,
    })

    return Response.json(
      {
        payment: { ...payment, amount: payment.amount.toString() },
        receipt: {
          id: receipt.id,
          receiptHash: receipt.receiptHash,
          txSignature: payment.txSignature,
        },
        proofToken: proof.verifierToken,
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
