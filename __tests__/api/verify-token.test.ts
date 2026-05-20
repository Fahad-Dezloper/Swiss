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

import { GET } from '@/app/api/verify/[token]/route'
import { db } from '@/lib/db'

const mockDb = db as any

function makeGetRequest(token: string) {
  return new Request(`http://localhost/api/verify/${token}`)
}

describe('GET /api/verify/[token]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 if token not found', async () => {
    mockDb.proofEvent.findUnique.mockResolvedValue(null)

    const req = makeGetRequest('nonexistent-token')
    const res = await GET(req, { params: Promise.resolve({ token: 'nonexistent-token' }) })

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toMatch(/not found/i)
  })

  it('returns proof data with correct fields on happy path', async () => {
    const createdAt = new Date('2024-01-15T10:00:00.000Z')
    const expiresAt = new Date('2024-02-14T10:00:00.000Z')

    mockDb.proofEvent.findUnique.mockResolvedValue({
      id: 'proof-1',
      proofType: 'DELIVERED',
      verifierPackageHash: 'pkg-hash-abc',
      createdAt,
      expiresAt,
      payment: {
        id: 'payment-1',
        amount: BigInt(1000000000),
        currency: 'USDC',
        status: 'DELIVERED',
        rail: 'umbra',
        createdAt,
        receipt: { receiptHash: 'receipt-hash-xyz' },
        payrollRun: { periodLabel: '2024-01-15' },
      },
    })

    const req = makeGetRequest('valid-token-uuid')
    const res = await GET(req, { params: Promise.resolve({ token: 'valid-token-uuid' }) })

    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.type).toBe('proof')
    expect(body.proofType).toBe('DELIVERED')
    expect(body.verifierPackageHash).toBe('pkg-hash-abc')
    expect(body.receiptHash).toBe('receipt-hash-xyz')
    // fields.amount should be the human-readable value (divided by 1_000_000)
    expect(body.fields.amount).toBe('1000.000000')
    expect(body.fields.currency).toBe('USDC')
    expect(body.fields.settlement_status).toBe('DELIVERED')
    expect(body.fields.payment_period).toBe('2024-01-15')
  })

  it('returns null for receiptHash when receipt is missing', async () => {
    const createdAt = new Date('2024-01-15T10:00:00.000Z')

    mockDb.proofEvent.findUnique.mockResolvedValue({
      id: 'proof-2',
      proofType: 'DELIVERED',
      verifierPackageHash: 'pkg-hash-def',
      createdAt,
      expiresAt: new Date(),
      payment: {
        id: 'payment-2',
        amount: BigInt(500000000),
        currency: 'SOL',
        status: 'DELIVERED',
        rail: 'umbra',
        createdAt,
        receipt: null,
        payrollRun: null,
      },
    })

    const req = makeGetRequest('another-token')
    const res = await GET(req, { params: Promise.resolve({ token: 'another-token' }) })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.receiptHash).toBeNull()
    expect(body.fields.payment_period).toBeNull()
    expect(body.fields.rail).toBe('umbra')
  })

  it('uses umbra-stealth as default rail when rail is null', async () => {
    const createdAt = new Date('2024-01-15T10:00:00.000Z')

    mockDb.proofEvent.findUnique.mockResolvedValue({
      id: 'proof-3',
      proofType: 'CLAIMED',
      verifierPackageHash: 'pkg-hash-ghi',
      createdAt,
      expiresAt: new Date(),
      payment: {
        id: 'payment-3',
        amount: BigInt(100000),
        currency: 'SOL',
        status: 'DELIVERED',
        rail: null,
        createdAt,
        receipt: null,
        payrollRun: null,
      },
    })

    const req = makeGetRequest('token-3')
    const res = await GET(req, { params: Promise.resolve({ token: 'token-3' }) })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.fields.rail).toBe('umbra-stealth')
  })
})
