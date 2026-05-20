import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @solana/kit before importing the adapter
vi.mock('@solana/kit', () => {
  const mockEncoder = {
    encode: vi.fn((tx: any) => new Uint8Array([1, 2, 3])),
  }
  const mockDecoder = {
    decode: vi.fn((bytes: any) => ({ signatures: { 'mock-key': new Uint8Array([9, 8, 7]) } })),
  }
  return {
    getTransactionEncoder: vi.fn(() => mockEncoder),
    getTransactionDecoder: vi.fn(() => mockDecoder),
  }
})

import { createUmbraSignerFromPrivy } from '@/lib/umbra/signer-adapter'
import type { PrivySolanaWallet } from '@/lib/umbra/signer-adapter'

function makeMockWallet(address: string = 'wallet-addr-123'): PrivySolanaWallet {
  return {
    address,
    signMessage: vi.fn(async ({ message }) => ({
      signature: new Uint8Array([10, 20, 30]),
    })),
    signTransaction: vi.fn(async ({ transaction }) => ({
      signedTransaction: new Uint8Array([4, 5, 6]),
    })),
  }
}

describe('createUmbraSignerFromPrivy', () => {
  it('returns an object with address, signMessage, signTransaction, signTransactions', () => {
    const wallet = makeMockWallet('test-address')
    const signer = createUmbraSignerFromPrivy(wallet)

    expect(signer.address).toBe('test-address')
    expect(typeof signer.signMessage).toBe('function')
    expect(typeof signer.signTransaction).toBe('function')
    expect(typeof signer.signTransactions).toBe('function')
  })

  describe('signMessage', () => {
    it('calls wallet.signMessage and returns correct shape { message, signature, signer }', async () => {
      const wallet = makeMockWallet('signer-addr')
      const signer = createUmbraSignerFromPrivy(wallet)

      const message = new Uint8Array([72, 101, 108, 108, 111])
      const result = await signer.signMessage(message)

      expect(wallet.signMessage).toHaveBeenCalledWith({ message })
      expect(result).toHaveProperty('message', message)
      expect(result).toHaveProperty('signature')
      expect(result).toHaveProperty('signer', 'signer-addr')
    })
  })

  describe('signTransaction', () => {
    it('encodes transaction, calls wallet.signTransaction, then decodes and merges signatures', async () => {
      const { getTransactionEncoder, getTransactionDecoder } = await import('@solana/kit')
      const wallet = makeMockWallet()
      const signer = createUmbraSignerFromPrivy(wallet)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tx = { signatures: { 'existing-key': new Uint8Array([1]) }, messageBytes: new Uint8Array([9]), message: {} } as any
      const result = await signer.signTransaction(tx)

      const encoder = (getTransactionEncoder as any)()
      const decoder = (getTransactionDecoder as any)()

      expect(encoder.encode).toHaveBeenCalledWith(tx)
      expect(wallet.signTransaction).toHaveBeenCalled()
      expect(decoder.decode).toHaveBeenCalled()
      // Result should include original tx fields + merged signatures
      expect(result.signatures).toMatchObject({ 'existing-key': expect.any(Uint8Array) })
    })
  })

  describe('signTransactions', () => {
    it('calls signTransaction for each tx in array', async () => {
      const wallet = makeMockWallet()
      const signer = createUmbraSignerFromPrivy(wallet)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const txs: any[] = [
        { signatures: {}, messageBytes: new Uint8Array([1]), message: { a: 1 } },
        { signatures: {}, messageBytes: new Uint8Array([2]), message: { b: 2 } },
        { signatures: {}, messageBytes: new Uint8Array([3]), message: { c: 3 } },
      ]

      const results = await signer.signTransactions(txs)

      expect(wallet.signTransaction).toHaveBeenCalledTimes(3)
      expect(results).toHaveLength(3)
    })

    it('returns empty array for empty input', async () => {
      const wallet = makeMockWallet()
      const signer = createUmbraSignerFromPrivy(wallet)

      const results = await signer.signTransactions([])

      expect(results).toHaveLength(0)
      expect(wallet.signTransaction).not.toHaveBeenCalled()
    })
  })
})
