import { db } from '@/lib/db'
import { disclosureService } from '@/lib/disclosure/disclosure-service'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Try ProofEvent first
    const proofEvent = await db.proofEvent.findUnique({
      where: { verifierToken: token },
    })

    if (proofEvent) {
      return Response.json({
        type: 'proof',
        proofType: proofEvent.proofType,
        paymentId: proofEvent.paymentId,
        createdAt: proofEvent.createdAt,
      })
    }

    // Try DisclosureEvent
    const disclosureEvent = await db.disclosureEvent.findUnique({
      where: { verifierToken: token },
    })

    if (disclosureEvent) {
      const verifierPackage = await disclosureService.verifyDisclosure(token)
      return Response.json(verifierPackage)
    }

    return Response.json({ error: 'Token not found' }, { status: 404 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
