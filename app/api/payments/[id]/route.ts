import { db } from '@/lib/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const payment = await db.payment.findUnique({
      where: { id },
      include: {
        receipt: true,
        proofEvents: true,
      },
    })

    if (!payment) {
      return Response.json({ error: 'Payment not found' }, { status: 404 })
    }

    return Response.json({
      ...payment,
      amount: payment.amount.toString(),
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
