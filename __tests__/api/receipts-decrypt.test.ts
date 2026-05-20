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

vi.mock('@/lib/crypto/verify-signature', () => ({
  verifyEd25519Signature: vi.fn(),
  parseDecryptChallenge: vi.fn(),
  base58Decode: vi.fn(),
}))

import { POST } from '@/app/api/receipts/[id]/decrypt/route'
import { db } from '@/lib/db'
import { receiptService } from '@/lib/receipt/receipt-service'
import {
  verifyEd25519Signature,
  parseDecryptChallenge,
  base58Decode,
} from '@/lib/crypto/verify-signature'

const mockDb = db as any
const mockReceiptService = receiptService as any
const mockVerify = verifyEd25519Signature as ReturnType<typeof vi.fn>
const mockParse = parseDecryptChallenge as ReturnType<typeof vi.fn>
const mockBase58Decode = base58Decode as ReturnType<typeof vi.fn>

function makeRequest(body: object) {
  return new Request('http://localhost/api/receipts/payment-123/decrypt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validParams = { params: Promise.resolve({ id: 'payment-123' }) }

describe('POST /api/receipts/[id]/decrypt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: valid base58 decode
    mockBase58Decode.mockReturnValue(new Uint8Array(32).fill(1))
  })

  it('returns 400 if message missing', async () => {
    const req = makeRequest({ signature: 'sig-hex', walletAddress: 'wallet-addr' })
    const res = await POST(req, validParams)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/message/)
  })

  it('returns 400 if signature missing', async () => {
    const req = makeRequest({ message: 'PSR:decrypt:hash:12345', walletAddress: 'wallet-addr' })
    const res = await POST(req, validParams)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/signature/)
  })

  it('returns 400 if walletAddress missing', async () => {
    const req = makeRequest({ message: 'PSR:decrypt:hash:12345', signature: 'sig-hex' })
    const res = await POST(req, validParams)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/walletAddress/)
  })

  it('returns 403 if signature verification fails', async () => {
    mockVerify.mockReturnValue(false)

    const req = makeRequest({
      message: 'PSR:decrypt:hash-abc:12345',
      signature: 'bad-sig-hex',
      walletAddress: 'valid-base58-addr',
    })
    const res = await POST(req, validParams)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toMatch(/signature/i)
  })

  it('returns 403 if challenge is expired (parseDecryptChallenge returns null)', async () => {
    mockVerify.mockReturnValue(true)
    mockParse.mockReturnValue(null) // expired or malformed

    const req = makeRequest({
      message: 'PSR:decrypt:hash-abc:1234567890',
      signature: 'valid-sig',
      walletAddress: 'valid-wallet',
    })
    const res = await POST(req, validParams)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toMatch(/expired/i)
  })

  it('returns 403 if receiptHash in challenge does not match DB receipt', async () => {
    mockVerify.mockReturnValue(true)
    mockParse.mockReturnValue({ receiptHash: 'challenge-hash' })
    mockDb.receipt.findUnique.mockResolvedValue({
      id: 'receipt-1',
      paymentId: 'payment-123',
      receiptHash: 'different-hash',
      senderWallet: 'sender-wallet',
      recipientWallet: 'recipient-wallet',
    })

    const req = makeRequest({
      message: 'PSR:decrypt:challenge-hash:12345',
      signature: 'valid-sig',
      walletAddress: 'valid-wallet',
    })
    const res = await POST(req, validParams)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toMatch(/mismatch/i)
  })

  it('returns 403 if walletAddress not authorized (not sender/recipient)', async () => {
    mockVerify.mockReturnValue(true)
    mockParse.mockReturnValue({ receiptHash: 'correct-hash' })
    mockDb.receipt.findUnique.mockResolvedValue({
      id: 'receipt-1',
      paymentId: 'payment-123',
      receiptHash: 'correct-hash',
      senderWallet: 'sender-wallet',
      recipientWallet: 'recipient-wallet',
    })
    mockReceiptService.getReceiptDetails.mockResolvedValue(null) // auth failed

    const req = makeRequest({
      message: 'PSR:decrypt:correct-hash:12345',
      signature: 'valid-sig',
      walletAddress: 'unauthorized-wallet',
    })
    const res = await POST(req, validParams)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toMatch(/denied|sender|recipient/i)
  })

  it('returns 200 with payment details on happy path', async () => {
    mockVerify.mockReturnValue(true)
    mockParse.mockReturnValue({ receiptHash: 'correct-hash' })
    mockDb.receipt.findUnique.mockResolvedValue({
      id: 'receipt-1',
      paymentId: 'payment-123',
      receiptHash: 'correct-hash',
      senderWallet: 'sender-wallet',
      recipientWallet: 'recipient-wallet',
    })

    const paymentDetails = {
      receipt: {
        id: 'receipt-1',
        paymentId: 'payment-123',
        receiptHash: 'correct-hash',
        senderWallet: 'sender-wallet',
        recipientWallet: 'recipient-wallet',
        createdAt: new Date().toISOString(),
      },
      payment: {
        id: 'payment-123',
        type: 'PAYROLL',
        status: 'DELIVERED',
        txSignature: 'sig-abc',
        amount: '1000000',
        currency: 'SOL',
        recipientAddr: 'recipient-wallet',
        rail: 'umbra',
        createdAt: new Date().toISOString(),
        payrollRunId: 'run-1',
      },
    }

    mockReceiptService.getReceiptDetails.mockResolvedValue(paymentDetails)

    const req = makeRequest({
      message: 'PSR:decrypt:correct-hash:12345',
      signature: 'valid-sig',
      walletAddress: 'sender-wallet',
    })
    const res = await POST(req, validParams)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.receipt.receiptHash).toBe('correct-hash')
    expect(body.payment.amount).toBe('1000000')
    expect(body.payment.currency).toBe('SOL')
  })
})
