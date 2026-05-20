import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock all Umbra SDK modules (v5 subpath structure)
vi.mock('@umbra-privacy/sdk', () => ({
  getUmbraClient: vi.fn(),
  getATAIntoStealthPoolNoteCreatorProver: vi.fn(),
  getUserRegistrationProver: vi.fn(),
}))

vi.mock('@umbra-privacy/sdk/registration', () => ({
  getUserRegistrationFunction: vi.fn(),
}))

vi.mock('@umbra-privacy/sdk/query', () => ({
  getUserAccountQuerierFunction: vi.fn(),
}))

vi.mock('@umbra-privacy/sdk/deposit', () => ({
  getATAIntoReceiverBurnableStealthPoolNoteCreatorFunction: vi.fn(),
}))

vi.mock('@umbra-privacy/sdk/burn', () => ({
  getBurnableStealthPoolNoteScannerFunction: vi.fn(),
}))

vi.mock('@/lib/umbra/signer-adapter', () => ({
  createUmbraSignerFromPrivy: vi.fn((wallet) => ({
    address: wallet.address,
    signMessage: vi.fn(),
    signTransaction: vi.fn(),
    signTransactions: vi.fn(),
  })),
}))

import { getUmbraClient, getUserRegistrationProver } from '@umbra-privacy/sdk'
import { getUserRegistrationFunction } from '@umbra-privacy/sdk/registration'
import { getUserAccountQuerierFunction } from '@umbra-privacy/sdk/query'
import { getBurnableStealthPoolNoteScannerFunction } from '@umbra-privacy/sdk/burn'
import { useUmbraClient } from '@/hooks/use-umbra-client'

const mockGetUmbraClient = getUmbraClient as ReturnType<typeof vi.fn>
const mockGetUserAccountQuerier = getUserAccountQuerierFunction as ReturnType<typeof vi.fn>
const mockGetUserRegistrationFunction = getUserRegistrationFunction as ReturnType<typeof vi.fn>
const mockGetClaimableUtxoScanner = getBurnableStealthPoolNoteScannerFunction as ReturnType<typeof vi.fn>
const mockGetUserRegistrationProver = getUserRegistrationProver as ReturnType<typeof vi.fn>

function makeMockWallet(address: string = 'test-wallet-addr') {
  return {
    address,
    signMessage: vi.fn(),
    signTransaction: vi.fn(),
  }
}

function makeMockClient() {
  return { _type: 'umbraClient' }
}

describe('useUmbraClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    // Default mock: getUmbraClient resolves to a mock client
    mockGetUmbraClient.mockResolvedValue(makeMockClient())

    // Default: user exists (registered)
    const mockQuerier = vi.fn().mockResolvedValue({ state: 'exists' })
    mockGetUserAccountQuerier.mockReturnValue(mockQuerier)

    // Default: scanner returns empty
    const mockScanner = vi.fn().mockResolvedValue([])
    mockGetClaimableUtxoScanner.mockReturnValue(mockScanner)

    // Default: registration fn
    const mockRegFn = vi.fn().mockResolvedValue(undefined)
    mockGetUserRegistrationFunction.mockReturnValue(mockRegFn)

    // Default: zk prover mock
    mockGetUserRegistrationProver.mockReturnValue({})
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

    // Immediately after render, status should be 'initializing'
    expect(result.current.status).toBe('initializing')

    // After async resolution, status should be 'ready'
    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })
  })

  it('isRegistered reads from localStorage cache on init', () => {
    const wallet = makeMockWallet('cached-wallet')
    // Pre-seed localStorage
    localStorage.setItem('psr_umbra_registered_cached-wallet', '1')

    const { result } = renderHook(() => useUmbraClient(wallet))

    // Should read from cache immediately (synchronous init state)
    expect(result.current.isRegistered).toBe(true)
  })

  it('after successful init with registered=true: localStorage is set', async () => {
    const wallet = makeMockWallet('new-wallet-addr')

    const mockQuerier = vi.fn().mockResolvedValue({ state: 'exists' })
    mockGetUserAccountQuerier.mockReturnValue(mockQuerier)

    const { result } = renderHook(() => useUmbraClient(wallet))

    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })

    expect(result.current.isRegistered).toBe(true)
    expect(localStorage.getItem('psr_umbra_registered_new-wallet-addr')).toBe('1')
  })

  it('after init with unregistered user: isRegistered=false', async () => {
    const wallet = makeMockWallet('unregistered-wallet')

    const mockQuerier = vi.fn().mockResolvedValue(null)
    mockGetUserAccountQuerier.mockReturnValue(mockQuerier)

    const { result } = renderHook(() => useUmbraClient(wallet))

    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })

    expect(result.current.isRegistered).toBe(false)
  })

  it('on init error: status=error, isRegistered stays at cached value', async () => {
    const wallet = makeMockWallet('error-wallet')
    // Pre-seed localStorage: registered
    localStorage.setItem('psr_umbra_registered_error-wallet', '1')

    mockGetUmbraClient.mockRejectedValue(new Error('Network error'))

    // Use fake timers to skip the 2s retry delay
    vi.useFakeTimers()
    const { result } = renderHook(() => useUmbraClient(wallet))

    // Advance past the retry delay (2000ms) and flush all pending promises
    await act(async () => {
      await vi.runAllTimersAsync()
    })

    vi.useRealTimers()

    expect(result.current.status).toBe('error')
    // Should keep cached value (true) — registered users can still use the app
    expect(result.current.isRegistered).toBe(true)
    expect(result.current.error).toBe('Network error')
  })

  it('register() throws if client not initialized', async () => {
    // wallet is null — client never gets initialized
    const { result } = renderHook(() => useUmbraClient(null))

    await expect(result.current.register()).rejects.toThrow('Umbra client not initialized')
  })

  it('register() calls getUserRegistrationFunction and sets isRegistered=true', async () => {
    const wallet = makeMockWallet('register-wallet')
    // Start as unregistered
    const mockQuerier = vi.fn().mockResolvedValue(null)
    mockGetUserAccountQuerier.mockReturnValue(mockQuerier)

    const mockRegisterFn = vi.fn().mockResolvedValue(undefined)
    mockGetUserRegistrationFunction.mockReturnValue(mockRegisterFn)

    const { result } = renderHook(() => useUmbraClient(wallet))

    // Wait for init to complete (status=ready, unregistered)
    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })
    expect(result.current.isRegistered).toBe(false)

    // Call register
    await act(async () => {
      await result.current.register()
    })

    expect(mockGetUserRegistrationFunction).toHaveBeenCalled()
    expect(mockRegisterFn).toHaveBeenCalled()
    expect(result.current.isRegistered).toBe(true)
    expect(result.current.status).toBe('ready')
    // Should cache in localStorage
    expect(localStorage.getItem('psr_umbra_registered_register-wallet')).toBe('1')
  })
})
