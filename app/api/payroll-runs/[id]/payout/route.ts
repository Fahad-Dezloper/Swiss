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
    const { senderUserId: bodySenderUserId, recipientAddr, amount, currency, txSignature } = body
    const senderUserId: string = (typeof bodySenderUserId === 'string' && bodySenderUserId)
      ? bodySenderUserId
      : ((await db.user.findFirst())?.id ?? '')
    if (!senderUserId) return Response.json({ error: 'No user found' }, { status: 400 })
    if (!recipientAddr || typeof recipientAddr !== 'string') {
      return Response.json({ error: 'recipientAddr is required' }, { status: 400 })
    }
    if (!amount || typeof amount !== 'string') {
      return Response.json({ error: 'amount is required and must be a string' }, { status: 400 })
    }
    if (!txSignature || typeof txSignature !== 'string') {
      return Response.json({ error: 'txSignature is required' }, { status: 400 })
    }

    let amountBigInt: bigint
    try {
      if (amount.includes('.')) {
        const [intPart, fracPart = ''] = amount.split('.')
        const frac = fracPart.padEnd(6, '0').slice(0, 6)
        amountBigInt = BigInt(intPart) * BigInt(1_000_000) + BigInt(frac)
      } else {
        amountBigInt = BigInt(amount)
      }
    } catch {
      return Response.json({ error: 'amount must be a valid number string' }, { status: 400 })
    }

    const payrollRun = await db.payrollRun.findUnique({ where: { id } })
    if (!payrollRun) {
      return Response.json({ error: 'Payroll run not found' }, { status: 404 })
    }

    const payment = await db.payment.create({
      data: {
        type: 'PAYROLL',
        payrollRunId: id,
        senderUserId,
        recipientAddr,
        txSignature,
        amount: amountBigInt,
        currency: currency ?? 'USDC',
        status: 'DELIVERED',
      },
    })

    const receipt = await receiptService.createReceipt(payment)

    const proof = await proofService.generateProof({
      paymentId: payment.id,
      proofType: 'DELIVERED',
      generatedById: senderUserId,
    })

    return Response.json(
      {
        payment: { ...payment, amount: payment.amount.toString() },
        receipt,
        proofToken: proof.verifierToken,
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
