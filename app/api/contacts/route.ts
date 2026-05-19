import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('walletAddress')

    if (!walletAddress) {
      return Response.json({ error: 'walletAddress is required' }, { status: 400 })
    }

    const user = await db.user.findFirst({ where: { walletAddress } })
    if (!user) {
      return Response.json([])
    }

    const contacts = await db.contact.findMany({
      where: { userId: user.id },
      orderBy: { alias: 'asc' },
    })

    return Response.json(contacts)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { walletAddress, alias, destinationRef } = body

    if (!walletAddress || typeof walletAddress !== 'string') {
      return Response.json({ error: 'walletAddress is required' }, { status: 400 })
    }
    if (!alias || typeof alias !== 'string') {
      return Response.json({ error: 'alias is required' }, { status: 400 })
    }
    if (!destinationRef || typeof destinationRef !== 'string') {
      return Response.json({ error: 'destinationRef (Solana address) is required' }, { status: 400 })
    }

    const user = await db.user.findFirst({ where: { walletAddress } })
    if (!user) {
      return Response.json({ error: 'User not found — connect wallet first' }, { status: 404 })
    }

    const contact = await db.contact.create({
      data: { userId: user.id, alias, destinationRef },
    })

    return Response.json(contact, { status: 201 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
