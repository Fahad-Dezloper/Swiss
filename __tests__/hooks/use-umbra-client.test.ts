import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

vi.mock('@/lib/umbra/signer-adapter', () => ({
  createUmbraSignerFromPrivy: vi.fn((wallet) => ({
    address: wallet.address,
    signMessage: vi.fn().mockResolvedValue(new Uint8Array(64)),
    signTransaction: vi.fn(),
    signTransactions: vi.fn(),
  })),
}))

import { useUmbraClient } from '@/hooks/use-umbra-client'

function makeMockWallet(address: string = 'test-wallet-addr') {
  return { address, signMessage: vi.fn(), signTransaction: vi.fn() }
}

describe('useUmbraClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initial state: status=idle, isRegistered=false when no wallet', () => {
    const { result } = renderHook(() => useUmbraClient(null))
    expect(result.current.status).toBe('idle')
    expect(result.current.isRegistered).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('when wallet provided: status transitions idle -> initializing -> ready', async () => {
    const wallet = makeMockWallet()
    const { result } = renderHook(() => useUmbraClient(wallet))

    expect(result.current.status).toBe('initializing')

    await act(async () => { await vi.runAllTimersAsync() })

    expect(result.current.status).toBe('ready')
  })

  it('isRegistered reads from localStorage cache on init', () => {
    const wallet = makeMockWallet('cached-wallet')
    localStorage.setItem('psr_umbra_registered_cached-wallet', '1')

    const { result } = renderHook(() => useUmbraClient(wallet))

    expect(result.current.isRegistered).toBe(true)
  })

  it('after init with localStorage cached: isRegistered stays true', async () => {
    const wallet = makeMockWallet('cached-wallet-2')
    localStorage.setItem('psr_umbra_registered_cached-wallet-2', '1')

    const { result } = renderHook(() => useUmbraClient(wallet))

    await act(async () => { await vi.runAllTimersAsync() })

    expect(result.current.status).toBe('ready')
    expect(result.current.isRegistered).toBe(true)
  })

  it('after init without cache: isRegistered=false', async () => {
    const wallet = makeMockWallet('unregistered-wallet')

    const { result } = renderHook(() => useUmbraClient(wallet))

    await act(async () => { await vi.runAllTimersAsync() })

    expect(result.current.status).toBe('ready')
    expect(result.current.isRegistered).toBe(false)
  })

  it('register() throws if wallet not connected', async () => {
    const { result } = renderHook(() => useUmbraClient(null))

    await expect(result.current.register()).rejects.toThrow('Wallet not connected')
  })

  it('register() sets isRegistered=true and caches in localStorage', async () => {
    const wallet = makeMockWallet('register-wallet')

    const { result } = renderHook(() => useUmbraClient(wallet))

    await act(async () => { await vi.runAllTimersAsync() })
    expect(result.current.status).toBe('ready')
    expect(result.current.isRegistered).toBe(false)

    await act(async () => {
      const registerPromise = result.current.register()
      await vi.runAllTimersAsync()
      await registerPromise
    })

    expect(result.current.isRegistered).toBe(true)
    expect(result.current.status).toBe('ready')
    expect(localStorage.getItem('psr_umbra_registered_register-wallet')).toBe('1')
  })

  it('checkRecipientRegistered returns false for unknown address', async () => {
    const wallet = makeMockWallet()
    const { result } = renderHook(() => useUmbraClient(wallet))

    await act(async () => { await vi.runAllTimersAsync() })

    let registered: boolean
    await act(async () => {
      const p = result.current.checkRecipientRegistered('unknown-addr')
      await vi.runAllTimersAsync()
      registered = await p
    })

    expect(registered!).toBe(false)
  })

  it('checkRecipientRegistered returns true for localStorage-cached address', async () => {
    localStorage.setItem('psr_umbra_registered_known-addr', '1')
    const wallet = makeMockWallet()
    const { result } = renderHook(() => useUmbraClient(wallet))

    await act(async () => { await vi.runAllTimersAsync() })

    let registered: boolean
    await act(async () => {
      const p = result.current.checkRecipientRegistered('known-addr')
      await vi.runAllTimersAsync()
      registered = await p
    })

    expect(registered!).toBe(true)
  })
})
