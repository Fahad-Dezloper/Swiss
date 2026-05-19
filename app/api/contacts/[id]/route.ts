import { db } from '@/lib/db'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const contact = await db.contact.findUnique({ where: { id } })
    if (!contact) {
      return Response.json({ error: 'Contact not found' }, { status: 404 })
    }

    await db.contact.delete({ where: { id } })
    return Response.json({ deleted: true })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
