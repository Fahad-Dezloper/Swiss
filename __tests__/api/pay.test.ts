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

vi.mock('@/lib/receipt/receipt-service', () => ({
  receiptService: {
    createReceipt: vi.fn(),
    getReceipt: vi.fn(),
    getReceiptDetails: vi.fn(),
  },
}))

vi.mock('@/lib/proof/proof-service', () => ({
  proofService: {
    generateProof: vi.fn(),
    generateDeliveredProof: vi.fn(),
    generateClaimedProof: vi.fn(),
    getProofByToken: vi.fn(),
  },
}))

import { POST } from '@/app/api/pay/route'
import { db } from '@/lib/db'
import { receiptService } from '@/lib/receipt/receipt-service'
import { proofService } from '@/lib/proof/proof-service'

function makeRequest(body: object) {
  return new Request('http://localhost/api/pay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const mockDb = db as any
const mockReceiptService = receiptService as any
const mockProofService = proofService as any

describe('POST /api/pay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 if recipientAddr missing', async () => {
    const req = makeRequest({ amount: '1000', txSignature: 'sig', senderWallet: 'wallet' })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/recipientAddr/)
  })

  it('returns 400 if amount missing', async () => {
    const req = makeRequest({ recipientAddr: 'addr', txSignature: 'sig', senderWallet: 'wallet' })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/amount/)
  })

  it('returns 400 if txSignature missing', async () => {
    const req = makeRequest({ recipientAddr: 'addr', amount: '1000', senderWallet: 'wallet' })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/txSignature/)
  })

  it('returns 400 if senderWallet missing', async () => {
    const req = makeRequest({ recipientAddr: 'addr', amount: '1000', txSignature: 'sig' })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/senderWallet/)
  })

  it('returns 400 if amount is not a valid integer string', async () => {
    const req = makeRequest({
      recipientAddr: 'addr',
      amount: 'not-a-number',
      txSignature: 'sig',
      senderWallet: 'wallet',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/integer/)
  })

  it('returns 201 with payment, receipt, proofToken on happy path', async () => {
    const paymentObj = {
      id: 'payment-1',
      type: 'PAYROLL',
      status: 'DELIVERED',
      senderUserId: 'user-1',
      recipientAddr: 'recipient-addr',
      amount: BigInt(1000000),
      currency: 'SOL',
      rail: 'umbra',
      txSignature: 'tx-sig-abc',
      payrollRunId: 'run-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    mockDb.user.findFirst.mockResolvedValue(null)
    mockDb.user.create.mockResolvedValue({ id: 'user-1' })
    mockDb.organization.findFirst.mockResolvedValue({ id: 'org-1' })
    mockDb.payrollRun.findFirst.mockResolvedValue(null)
    mockDb.payrollRun.create.mockResolvedValue({ id: 'run-1' })
    mockDb.payment.create.mockResolvedValue(paymentObj)

    mockReceiptService.createReceipt.mockResolvedValue({
      id: 'receipt-1',
      receiptHash: 'hash-abc',
    })

    mockProofService.generateDeliveredProof.mockResolvedValue({
      verifierToken: 'token-xyz',
    })

    const req = makeRequest({
      recipientAddr: 'recipient-addr',
      amount: '1000000',
      txSignature: 'tx-sig-abc',
      senderWallet: 'sender-wallet-addr',
    })

    const res = await POST(req)
    expect(res.status).toBe(201)

    const body = await res.json()
    expect(body).toHaveProperty('payment')
    expect(body).toHaveProperty('receipt')
    expect(body).toHaveProperty('proofToken', 'token-xyz')
    expect(body.receipt.id).toBe('receipt-1')
    expect(body.receipt.receiptHash).toBe('hash-abc')
    // amount should be serialized as string
    expect(body.payment.amount).toBe('1000000')
  })

  it('serializes BigInt amount to string in response', async () => {
    const paymentObj = {
      id: 'payment-2',
      type: 'PAYROLL',
      status: 'DELIVERED',
      senderUserId: 'user-1',
      recipientAddr: 'recipient-addr',
      amount: BigInt(9999999999),
      currency: 'USDC',
      rail: 'umbra',
      txSignature: 'tx-sig-xyz',
      payrollRunId: 'run-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    mockDb.user.findFirst.mockResolvedValue({ id: 'user-1' })
    mockDb.organization.findFirst.mockResolvedValue({ id: 'org-1' })
    mockDb.payrollRun.findFirst.mockResolvedValue({ id: 'run-1' })
    mockDb.payment.create.mockResolvedValue(paymentObj)
    mockReceiptService.createReceipt.mockResolvedValue({ id: 'receipt-2', receiptHash: 'hash-xyz' })
    mockProofService.generateDeliveredProof.mockResolvedValue({ verifierToken: 'token-abc' })

    const req = makeRequest({
      recipientAddr: 'recipient-addr',
      amount: '9999999999',
      txSignature: 'tx-sig-xyz',
      senderWallet: 'sender-wallet',
    })

    const res = await POST(req)
    expect(res.status).toBe(201)

    const body = await res.json()
    expect(typeof body.payment.amount).toBe('string')
    expect(body.payment.amount).toBe('9999999999')
  })
})
