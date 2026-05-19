import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const orgIdParam = searchParams.get('orgId')

    const orgId: string = orgIdParam
      ? orgIdParam
      : ((await db.organization.findFirst())?.id ?? '')

    if (!orgId) {
      return Response.json({ error: 'No organization found' }, { status: 400 })
    }

    const runs = await db.payrollRun.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { payments: true } },
      },
    })

    const result = runs.map((run) => ({
      id: run.id,
      orgId: run.orgId,
      periodLabel: run.periodLabel,
      status: run.status,
      createdAt: run.createdAt,
      paymentCount: run._count.payments,
    }))

    return Response.json(result)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { orgId, periodLabel } = body

    const resolvedOrgId: string = (typeof orgId === 'string' && orgId)
      ? orgId
      : ((await db.organization.findFirst())?.id ?? '')
    if (!resolvedOrgId) return Response.json({ error: 'No organization found' }, { status: 400 })

    if (!periodLabel || typeof periodLabel !== 'string') {
      return Response.json({ error: 'periodLabel is required' }, { status: 400 })
    }

    const payrollRun = await db.payrollRun.create({
      data: {
        orgId: resolvedOrgId,
        periodLabel,
      },
    })

    return Response.json(payrollRun, { status: 201 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
