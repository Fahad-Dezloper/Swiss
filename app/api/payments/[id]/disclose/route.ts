import { db } from '@/lib/db'
import { disclosureService } from '@/lib/disclosure/disclosure-service'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { disclosedById: bodyDisclosedById, fields, disclosedToEmail } = body

    if (!Array.isArray(fields) || fields.length === 0) {
      return Response.json({ error: 'fields must be a non-empty array' }, { status: 400 })
    }

    // Resolve disclosedById — default to first user if not provided
    let disclosedById: string = bodyDisclosedById
    if (!disclosedById || typeof disclosedById !== 'string') {
      const firstUser = await db.user.findFirst()
      if (!firstUser) {
        return Response.json({ error: 'No user found and disclosedById not provided' }, { status: 400 })
      }
      disclosedById = firstUser.id
    }

    const payment = await db.payment.findUnique({
      where: { id },
      include: { receipt: true },
    })

    if (!payment) {
      return Response.json({ error: 'Payment not found' }, { status: 404 })
    }
    if (!payment.receipt) {
      return Response.json({ error: 'No receipt found for this payment' }, { status: 404 })
    }

    const { verifierToken, disclosureEvent } = await disclosureService.disclose({
      receipt: payment.receipt,
      disclosedById,
      fields: fields as string[],
      disclosedToEmail: disclosedToEmail ?? undefined,
    })

    return Response.json(
      { verifierToken: disclosureEvent.verifierToken, disclosureId: disclosureEvent.id },
      { status: 201 },
    )
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
