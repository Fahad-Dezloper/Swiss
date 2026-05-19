import { db } from '@/lib/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const run = await db.payrollRun.findUnique({
      where: { id },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
          include: { receipt: true },
        },
      },
    })

    if (!run) {
      return Response.json({ error: 'Payroll run not found' }, { status: 404 })
    }

    const result = {
      id: run.id,
      orgId: run.orgId,
      periodLabel: run.periodLabel,
      status: run.status,
      createdAt: run.createdAt,
      payments: run.payments.map((p) => ({
        id: p.id,
        recipientAddr: p.recipientAddr,
        amount: p.amount.toString(),
        currency: p.currency,
        status: p.status,
        txSignature: p.txSignature,
        createdAt: p.createdAt,
        receipt: p.receipt
          ? {
              id: p.receipt.id,
              receiptHash: p.receipt.receiptHash,
              createdAt: p.receipt.createdAt,
            }
          : null,
      })),
    }

    return Response.json(result)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
