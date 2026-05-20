import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    organization: { findFirst: vi.fn(), create: vi.fn() },
    user: { findFirst: vi.fn(), create: vi.fn() },
    payrollRun: { findFirst: vi.fn(), create: vi.fn() },
    payment: { create: vi.fn(), findUniqueOrThrow: vi.fn(), findUnique: vi.fn() },
    receipt: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
    proofEvent: { create: vi.fn(), findUnique: vi.fn() },
  },
}))

import { GET } from '@/app/api/receipts/route'
import { db } from '@/lib/db'

const mockDb = db as any

function makeGetRequest(params: Record<string, string>) {
  const url = new URL('http://localhost/api/receipts')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new Request(url.toString())
}

describe('GET /api/receipts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 if walletAddress not provided', async () => {
    const req = makeGetRequest({})
    const res = await GET(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/walletAddress/)
  })

  it('queries by senderWallet when tab=paid', async () => {
    mockDb.receipt.findMany.mockResolvedValue([])

    const req = makeGetRequest({ walletAddress: 'my-wallet', tab: 'paid' })
    const res = await GET(req)

    expect(res.status).toBe(200)
    expect(mockDb.receipt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { senderWallet: 'my-wallet' },
      })
    )
  })

  it('queries by senderWallet by default (no tab param)', async () => {
    mockDb.receipt.findMany.mockResolvedValue([])

    const req = makeGetRequest({ walletAddress: 'my-wallet' })
    const res = await GET(req)

    expect(res.status).toBe(200)
    expect(mockDb.receipt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { senderWallet: 'my-wallet' },
      })
    )
  })

  it('queries by recipientWallet when tab=received', async () => {
    mockDb.receipt.findMany.mockResolvedValue([])

    const req = makeGetRequest({ walletAddress: 'my-wallet', tab: 'received' })
    const res = await GET(req)

    expect(res.status).toBe(200)
    expect(mockDb.receipt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { recipientWallet: 'my-wallet' },
      })
    )
  })

  it('serializes BigInt amount to string', async () => {
    const now = new Date('2024-01-15T10:00:00.000Z')
    mockDb.receipt.findMany.mockResolvedValue([
      {
        id: 'receipt-1',
        paymentId: 'payment-1',
        receiptHash: 'hash-abc',
        senderWallet: 'sender-wallet',
        recipientWallet: 'recipient-wallet',
        createdAt: now,
        payment: {
          id: 'payment-1',
          amount: BigInt(5000000),
          currency: 'SOL',
          status: 'DELIVERED',
          txSignature: 'sig-abc',
          recipientAddr: 'recipient-wallet',
          rail: 'umbra',
          createdAt: now,
          payrollRun: { periodLabel: '2024-01-15' },
        },
      },
    ])

    const req = makeGetRequest({ walletAddress: 'sender-wallet' })
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(typeof body[0].payment.amount).toBe('string')
    expect(body[0].payment.amount).toBe('5000000')
  })

  it('returns empty array (not error) if no receipts found', async () => {
    mockDb.receipt.findMany.mockResolvedValue([])

    const req = makeGetRequest({ walletAddress: 'any-wallet' })
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(0)
  })
})
