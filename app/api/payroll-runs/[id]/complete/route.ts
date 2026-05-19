import { db } from '@/lib/db'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const run = await db.payrollRun.findUnique({ where: { id } })
    if (!run) {
      return Response.json({ error: 'Payroll run not found' }, { status: 404 })
    }
    if (run.status === 'COMPLETED') {
      return Response.json({ error: 'Already completed' }, { status: 400 })
    }

    const updated = await db.payrollRun.update({
      where: { id },
      data: { status: 'COMPLETED' },
    })

    return Response.json({ id: updated.id, status: updated.status })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
