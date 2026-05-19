import { db } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  let orgId = searchParams.get('orgId')

  if (!orgId) {
    const firstOrg = await db.organization.findFirst()
    if (!firstOrg) {
      return Response.json({ error: 'No organization found' }, { status: 404 })
    }
    orgId = firstOrg.id
  }

  const invoices = await db.invoice.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
    include: {
      payment: {
        include: { receipt: true },
      },
    },
  })

  const serialized = invoices.map((inv) => ({
    ...inv,
    amount: inv.amount.toString(),
    payment: inv.payment
      ? { ...inv.payment, amount: inv.payment.amount.toString() }
      : null,
  }))

  return Response.json(serialized)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { orgId: bodyOrgId, invoiceRef, ref, amount, currency, dueDate, memo } = body

    // Accept "ref" as alias for "invoiceRef"
    const resolvedRef: string | undefined = invoiceRef ?? ref

    // Resolve orgId — default to first org if not provided
    let orgId: string = bodyOrgId
    if (!orgId || typeof orgId !== 'string') {
      const firstOrg = await db.organization.findFirst()
      if (!firstOrg) {
        return Response.json(
          { error: 'No organization found and orgId not provided' },
          { status: 400 },
        )
      }
      orgId = firstOrg.id
    }

    if (!resolvedRef || typeof resolvedRef !== 'string') {
      return Response.json({ error: 'invoiceRef (or ref) is required' }, { status: 400 })
    }
    if (!amount || typeof amount !== 'string') {
      return Response.json({ error: 'amount is required and must be a string' }, { status: 400 })
    }

    let amountBigInt: bigint
    try {
      if (amount.includes('.')) {
        // Treat as USDC with 6 decimals (e.g. "100.50" → 100500000n)
        const [intPart, fracPart = ''] = amount.split('.')
        const frac = fracPart.padEnd(6, '0').slice(0, 6)
        amountBigInt = BigInt(intPart) * BigInt(1_000_000) + BigInt(frac)
      } else {
        amountBigInt = BigInt(amount)
      }
    } catch {
      return Response.json(
        { error: 'amount must be a valid integer or decimal string' },
        { status: 400 },
      )
    }

    const invoice = await db.invoice.create({
      data: {
        orgId,
        invoiceRef: resolvedRef,
        amount: amountBigInt,
        currency: currency ?? 'USDC',
        dueDate: dueDate ? new Date(dueDate) : undefined,
        memo: memo ?? undefined,
      },
    })

    return Response.json(
      { ...invoice, amount: invoice.amount.toString() },
      { status: 201 },
    )
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
