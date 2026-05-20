import { describe, it, expect, vi, beforeEach } from 'vitest'
import crypto from 'node:crypto'

// Mock the db module before importing the service
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

import { createReceipt, getReceiptDetails } from '@/lib/receipt/receipt-service'
import { db } from '@/lib/db'

const mockDb = db as unknown as {
  receipt: {
    create: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
  }
}

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex')
}

describe('receipt-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createReceipt', () => {
    it('creates a receipt with correct hash fields', async () => {
      const now = new Date('2024-01-15T10:00:00.000Z')
      const payment = {
        id: 'payment-123',
        txSignature: 'sig-abc',
        amount: BigInt(1000000),
        updatedAt: now,
        recipientAddr: 'recipient-wallet-addr',
        // other fields not needed for this test
      } as any

      const senderWallet = 'sender-wallet-addr'

      const expectedCanonical = ['payment-123', 'sig-abc', '1000000', now.toISOString()].join('|')
      const expectedHash = sha256Hex(expectedCanonical)

      const mockReceipt = {
        id: 'receipt-1',
        paymentId: 'payment-123',
        receiptHash: expectedHash,
        senderWallet,
        recipientWallet: 'recipient-wallet-addr',
        createdAt: now,
      }

      mockDb.receipt.create.mockResolvedValue(mockReceipt)

      const result = await createReceipt(payment, senderWallet)

      expect(mockDb.receipt.create).toHaveBeenCalledWith({
        data: {
          paymentId: 'payment-123',
          receiptHash: expectedHash,
          senderWallet,
          recipientWallet: 'recipient-wallet-addr',
        },
      })
      expect(result.receiptHash).toBe(expectedHash)
    })

    it('uses empty string for txSignature when null', async () => {
      const now = new Date('2024-01-15T10:00:00.000Z')
      const payment = {
        id: 'payment-456',
        txSignature: null,
        amount: BigInt(500000),
        updatedAt: now,
        recipientAddr: 'recipient-addr',
      } as any

      const expectedCanonical = ['payment-456', '', '500000', now.toISOString()].join('|')
      const expectedHash = sha256Hex(expectedCanonical)

      mockDb.receipt.create.mockResolvedValue({
        id: 'receipt-2',
        paymentId: 'payment-456',
        receiptHash: expectedHash,
        senderWallet: 'sender-addr',
        recipientWallet: 'recipient-addr',
        createdAt: now,
      })

      await createReceipt(payment, 'sender-addr')

      const callArg = mockDb.receipt.create.mock.calls[0][0]
      expect(callArg.data.receiptHash).toBe(expectedHash)
    })
  })

  describe('getReceiptDetails', () => {
    it('returns null if receipt not found', async () => {
      mockDb.receipt.findUnique.mockResolvedValue(null)

      const result = await getReceiptDetails('payment-999', 'any-wallet')

      expect(result).toBeNull()
    })

    it('returns null if walletAddress is neither sender nor recipient', async () => {
      const mockReceipt = {
        id: 'receipt-1',
        paymentId: 'payment-123',
        receiptHash: 'hash-abc',
        senderWallet: 'sender-wallet',
        recipientWallet: 'recipient-wallet',
        createdAt: new Date('2024-01-15T10:00:00.000Z'),
        payment: {
          id: 'payment-123',
          type: 'PAYROLL',
          status: 'DELIVERED',
          txSignature: 'sig-abc',
          amount: BigInt(1000000),
          currency: 'SOL',
          recipientAddr: 'recipient-wallet',
          rail: 'umbra',
          createdAt: new Date('2024-01-15T10:00:00.000Z'),
          payrollRunId: 'run-1',
          payrollRun: { periodLabel: '2024-01-15' },
        },
      }

      mockDb.receipt.findUnique.mockResolvedValue(mockReceipt)

      const result = await getReceiptDetails('payment-123', 'unauthorized-wallet')

      expect(result).toBeNull()
    })

    it('returns data if walletAddress matches senderWallet', async () => {
      const createdAt = new Date('2024-01-15T10:00:00.000Z')
      const mockReceipt = {
        id: 'receipt-1',
        paymentId: 'payment-123',
        receiptHash: 'hash-abc',
        senderWallet: 'sender-wallet',
        recipientWallet: 'recipient-wallet',
        createdAt,
        payment: {
          id: 'payment-123',
          type: 'PAYROLL',
          status: 'DELIVERED',
          txSignature: 'sig-abc',
          amount: BigInt(1000000),
          currency: 'SOL',
          recipientAddr: 'recipient-wallet',
          rail: 'umbra',
          createdAt,
          payrollRunId: 'run-1',
          payrollRun: { periodLabel: '2024-01-15' },
        },
      }

      mockDb.receipt.findUnique.mockResolvedValue(mockReceipt)

      const result = await getReceiptDetails('payment-123', 'sender-wallet')

      expect(result).not.toBeNull()
      expect(result!.receipt.senderWallet).toBe('sender-wallet')
      expect(result!.payment.amount).toBe('1000000')
      expect(result!.receipt.createdAt).toBe(createdAt.toISOString())
    })

    it('returns data if walletAddress matches recipientWallet', async () => {
      const createdAt = new Date('2024-01-15T10:00:00.000Z')
      const mockReceipt = {
        id: 'receipt-1',
        paymentId: 'payment-123',
        receiptHash: 'hash-abc',
        senderWallet: 'sender-wallet',
        recipientWallet: 'recipient-wallet',
        createdAt,
        payment: {
          id: 'payment-123',
          type: 'PAYROLL',
          status: 'DELIVERED',
          txSignature: 'sig-abc',
          amount: BigInt(2000000),
          currency: 'USDC',
          recipientAddr: 'recipient-wallet',
          rail: 'umbra',
          createdAt,
          payrollRunId: 'run-2',
          payrollRun: { periodLabel: '2024-01-15' },
        },
      }

      mockDb.receipt.findUnique.mockResolvedValue(mockReceipt)

      const result = await getReceiptDetails('payment-123', 'recipient-wallet')

      expect(result).not.toBeNull()
      expect(result!.receipt.recipientWallet).toBe('recipient-wallet')
      expect(result!.payment.amount).toBe('2000000')
      expect(result!.payment.currency).toBe('USDC')
    })
  })
})
