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

import { generateDeliveredProof, generateClaimedProof, getProofByToken } from '@/lib/proof/proof-service'
import { db } from '@/lib/db'

const mockDb = db as unknown as {
  payment: {
    findUniqueOrThrow: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
  proofEvent: {
    create: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
  }
}

describe('proof-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateDeliveredProof', () => {
    it('creates a ProofEvent with type DELIVERED and a verifierToken UUID', async () => {
      mockDb.payment.findUniqueOrThrow.mockResolvedValue({
        txSignature: 'sig-abc',
        status: 'DELIVERED',
      })

      const createdProof = {
        id: 'proof-1',
        paymentId: 'payment-123',
        proofType: 'DELIVERED',
        generatedById: 'user-1',
        verifierToken: '550e8400-e29b-41d4-a716-446655440000',
        verifierPackageHash: 'some-hash',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      }

      mockDb.proofEvent.create.mockResolvedValue(createdProof)

      const result = await generateDeliveredProof('payment-123', 'user-1')

      expect(mockDb.proofEvent.create).toHaveBeenCalledOnce()
      const createArgs = mockDb.proofEvent.create.mock.calls[0][0]
      expect(createArgs.data.proofType).toBe('DELIVERED')
      expect(createArgs.data.paymentId).toBe('payment-123')
      expect(createArgs.data.generatedById).toBe('user-1')
      // verifierToken should be set (UUID)
      expect(typeof createArgs.data.verifierToken).toBe('string')
      expect(createArgs.data.verifierToken.length).toBeGreaterThan(0)
      expect(result.proofType).toBe('DELIVERED')
    })

    it('sets expiresAt 30 days in future', async () => {
      mockDb.payment.findUniqueOrThrow.mockResolvedValue({
        txSignature: 'sig-abc',
        status: 'DELIVERED',
      })

      const before = Date.now()
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000

      mockDb.proofEvent.create.mockImplementation(async ({ data }: any) => ({
        id: 'proof-2',
        ...data,
        createdAt: new Date(),
      }))

      await generateDeliveredProof('payment-123', 'user-1')

      const createArgs = mockDb.proofEvent.create.mock.calls[0][0]
      const expiresAt: Date = createArgs.data.expiresAt
      const after = Date.now()

      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + thirtyDaysMs - 1000)
      expect(expiresAt.getTime()).toBeLessThanOrEqual(after + thirtyDaysMs + 1000)
    })
  })

  describe('generateClaimedProof', () => {
    it('creates a ProofEvent with type CLAIMED', async () => {
      const claimedProof = {
        id: 'proof-3',
        paymentId: 'payment-456',
        proofType: 'CLAIMED',
        generatedById: 'user-2',
        verifierToken: '660e8400-e29b-41d4-a716-446655440001',
        verifierPackageHash: 'claimed-hash',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      }

      mockDb.proofEvent.create.mockResolvedValue(claimedProof)

      const result = await generateClaimedProof('payment-456', 'user-2', 'claim-sig-xyz')

      expect(mockDb.proofEvent.create).toHaveBeenCalledOnce()
      const createArgs = mockDb.proofEvent.create.mock.calls[0][0]
      expect(createArgs.data.proofType).toBe('CLAIMED')
      expect(createArgs.data.paymentId).toBe('payment-456')
      expect(createArgs.data.generatedById).toBe('user-2')
      expect(result.proofType).toBe('CLAIMED')
    })

    it('does not call payment.findUniqueOrThrow for CLAIMED proof', async () => {
      mockDb.proofEvent.create.mockResolvedValue({
        id: 'proof-4',
        proofType: 'CLAIMED',
        verifierToken: 'some-uuid',
        expiresAt: new Date(),
        createdAt: new Date(),
      })

      await generateClaimedProof('payment-789', 'user-3', 'claim-tx-sig')

      expect(mockDb.payment.findUniqueOrThrow).not.toHaveBeenCalled()
    })
  })

  describe('getProofByToken', () => {
    it('delegates to db.proofEvent.findUnique', async () => {
      const mockProof = {
        id: 'proof-5',
        verifierToken: 'test-token-uuid',
        proofType: 'DELIVERED',
        paymentId: 'payment-123',
      }

      mockDb.proofEvent.findUnique.mockResolvedValue(mockProof)

      const result = await getProofByToken('test-token-uuid')

      expect(mockDb.proofEvent.findUnique).toHaveBeenCalledWith({
        where: { verifierToken: 'test-token-uuid' },
      })
      expect(result).toEqual(mockProof)
    })

    it('returns null if token not found', async () => {
      mockDb.proofEvent.findUnique.mockResolvedValue(null)

      const result = await getProofByToken('nonexistent-token')

      expect(result).toBeNull()
    })
  })
})
