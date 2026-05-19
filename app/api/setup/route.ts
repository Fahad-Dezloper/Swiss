import { db } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const walletAddress = searchParams.get('walletAddress')

  // Find or create the default org
  let org = await db.organization.findFirst()
  if (!org) {
    org = await db.organization.create({
      data: { name: 'Default Organization' },
    })
  }

  let user

  if (walletAddress) {
    // Upsert user by walletAddress within this org
    user = await db.user.findFirst({ where: { walletAddress } })
    if (!user) {
      user = await db.user.create({
        data: {
          orgId: org.id,
          walletAddress,
        },
      })
    }
  } else {
    // Fall back to first user in org
    user = await db.user.findFirst({ where: { orgId: org.id } })
    if (!user) {
      user = await db.user.create({
        data: {
          orgId: org.id,
          walletAddress: 'demo-wallet-address',
        },
      })
    }
  }

  return Response.json({
    orgId: org.id,
    userId: user.id,
    orgName: org.name,
    walletAddress: user.walletAddress,
  })
}
