import { db } from '@/lib/db'
import { receiptService } from '@/lib/receipt/receipt-service'
import { proofService } from '@/lib/proof/proof-service'

async function getOrCreateDefaultOrg(): Promise<string> {
  const existing = await db.organization.findFirst()
  if (existing) return existing.id
  const created = await db.organization.create({ data: { name: 'Default' } })
  return created.id
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { recipientAddr, amount, currency, txSignature, senderWallet, rail } = body

    if (!recipientAddr || typeof recipientAddr !== 'string') {
      return Response.json({ error: 'recipientAddr is required' }, { status: 400 })
    }
    if (!amount || typeof amount !== 'string') {
      return Response.json({ error: 'amount is required as string' }, { status: 400 })
    }
    if (!txSignature || typeof txSignature !== 'string') {
      return Response.json({ error: 'txSignature is required' }, { status: 400 })
    }
    if (!senderWallet || typeof senderWallet !== 'string') {
      return Response.json({ error: 'senderWallet is required' }, { status: 400 })
    }

    let amountBigInt: bigint
    try {
      amountBigInt = BigInt(amount)
    } catch {
      return Response.json({ error: 'amount must be a valid integer string' }, { status: 400 })
    }

    // Get or create default user (needed for Payment.senderUserId FK)
    const senderUser = (await db.user.findFirst()) ??
      (await db.user.create({ data: { walletAddress: senderWallet } }))
    const senderUserId = senderUser.id

    // Auto-create or find today's payroll run
    const todayLabel = new Date().toISOString().slice(0, 10)
    const orgId = await getOrCreateDefaultOrg()

    let run = await db.payrollRun.findFirst({ where: { periodLabel: todayLabel } })
    if (!run) {
      run = await db.payrollRun.create({ data: { orgId, periodLabel: todayLabel } })
    }

    const payment = await db.payment.create({
      data: {
        payrollRunId: run.id,
        type: 'PAYROLL',
        status: 'DELIVERED',
        senderUserId,
        recipientAddr,
        amount: amountBigInt,
        currency: currency || 'SOL',
        rail: rail || 'umbra',
        txSignature,
      },
    })

    const receipt = await receiptService.createReceipt(payment, senderWallet)

    const proofEvent = await proofService.generateDeliveredProof(payment.id, senderUserId)

    return Response.json(
      {
        payment: { ...payment, amount: payment.amount.toString() },
        receipt: { id: receipt.id, receiptHash: receipt.receiptHash },
        proofToken: proofEvent.verifierToken,
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
