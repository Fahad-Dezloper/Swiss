import { db } from '@/lib/db'

export async function GET() {
  // Find or create the default org
  let org = await db.organization.findFirst()
  if (!org) {
    org = await db.organization.create({
      data: { name: 'Default Organization' },
    })
  }

  // Find or create the default user linked to that org
  let user = await db.user.findFirst({ where: { orgId: org.id } })
  if (!user) {
    user = await db.user.create({
      data: {
        orgId: org.id,
        walletAddress: 'demo-wallet-address',
      },
    })
  }

  return Response.json({
    orgId: org.id,
    userId: user.id,
    orgName: org.name,
    walletAddress: user.walletAddress,
  })
}
