import crypto from 'node:crypto'
import { db } from '@/lib/db'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex')
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const run = await db.payrollRun.findUnique({
      where: { id },
      include: {
        org: { select: { name: true } },
        payments: {
          orderBy: { createdAt: 'asc' },
          include: {
            receipt: { select: { receiptHash: true } },
            proofEvents: {
              select: { verifierToken: true },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    })

    if (!run) {
      return Response.json({ error: 'Payroll run not found' }, { status: 404 })
    }

    const exportedAt = new Date().toISOString()
    const totalLamports = run.payments.reduce((sum, p) => sum + p.amount, BigInt(0))
    const totalSOL = Number(totalLamports) / LAMPORTS_PER_SOL

    const paymentLines = run.payments.map((p, i) => ({
      index: i + 1,
      recipient: p.recipientAddr,
      amountSOL: (Number(p.amount) / LAMPORTS_PER_SOL).toFixed(9),
      currency: p.currency,
      txSignature: p.txSignature ?? '',
      receiptHash: p.receipt?.receiptHash ?? '',
      verifierToken: p.proofEvents[0]?.verifierToken ?? '',
      date: p.createdAt.toISOString(),
    }))

    // Build canonical attestation string and hash it
    const attestationBody = JSON.stringify({
      org: run.org.name,
      period: run.periodLabel,
      status: run.status,
      exportedAt,
      totalRecipients: run.payments.length,
      totalSOL: totalSOL.toFixed(9),
      payments: paymentLines,
    })
    const attestationHash = sha256Hex(attestationBody)

    return Response.json({
      org: run.org.name,
      period: run.periodLabel,
      runId: run.id,
      status: run.status,
      exportedAt,
      totalRecipients: run.payments.length,
      totalSOL: totalSOL.toFixed(9),
      payments: paymentLines,
      attestationHash,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
