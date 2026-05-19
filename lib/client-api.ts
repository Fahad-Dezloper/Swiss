export async function setupSession() {
  const res = await fetch('/api/setup')
  if (!res.ok) throw new Error('Setup failed')
  return res.json()
}

export async function createInvoice(data: Record<string, unknown>) {
  const res = await fetch('/api/invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error || `Request failed: ${res.status}`)
  }
  return res.json()
}

export async function getInvoices(orgId: string) {
  const res = await fetch(`/api/invoices?orgId=${encodeURIComponent(orgId)}`)
  if (!res.ok) throw new Error('Failed to fetch invoices')
  return res.json()
}

export async function payInvoice(invoiceId: string, data: Record<string, unknown>) {
  const res = await fetch(`/api/invoices/${invoiceId}/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error || `Payment failed: ${res.status}`)
  }
  return res.json()
}

export async function getPayment(id: string) {
  const res = await fetch(`/api/payments/${id}`)
  if (!res.ok) throw new Error('Failed to fetch payment')
  return res.json()
}

export async function disclosPayment(
  paymentId: string,
  fields: string[],
  disclosedById: string,
) {
  const res = await fetch(`/api/payments/${paymentId}/disclose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields, disclosedById }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error || `Disclose failed: ${res.status}`)
  }
  return res.json()
}

export async function getDashboard(orgId: string) {
  const res = await fetch(`/api/dashboard?orgId=${encodeURIComponent(orgId)}`)
  if (!res.ok) throw new Error('Failed to fetch dashboard')
  return res.json()
}
