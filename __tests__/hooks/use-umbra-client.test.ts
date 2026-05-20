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

    mockGetUmbraClient.mockResolvedValue(makeMockClient())

    const mockQuerier = vi.fn().mockResolvedValue({ state: 'exists' })
    mockGetUserAccountQuerier.mockReturnValue(mockQuerier)

    const mockScanner = vi.fn().mockResolvedValue([])
    mockGetClaimableUtxoScanner.mockReturnValue(mockScanner)

    const mockRegFn = vi.fn().mockResolvedValue(undefined)
    mockGetUserRegistrationFunction.mockReturnValue(mockRegFn)

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

    expect(result.current.status).toBe('initializing')

    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })
  })

  it('isRegistered reads from localStorage cache on init', () => {
    const wallet = makeMockWallet('cached-wallet')
    localStorage.setItem('psr_umbra_registered_cached-wallet', '1')

    const { result } = renderHook(() => useUmbraClient(wallet))

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
    localStorage.setItem('psr_umbra_registered_error-wallet', '1')

    mockGetUmbraClient.mockRejectedValue(new Error('Network error'))

    vi.useFakeTimers()
    const { result } = renderHook(() => useUmbraClient(wallet))

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    vi.useRealTimers()

    expect(result.current.status).toBe('error')
    expect(result.current.isRegistered).toBe(true)
    expect(result.current.error).toBe('Network error')
  })

  it('register() throws if client not initialized', async () => {
    const { result } = renderHook(() => useUmbraClient(null))

    await expect(result.current.register()).rejects.toThrow('Umbra client not initialized')
  })

  it('register() calls getUserRegistrationFunction and sets isRegistered=true', async () => {
    const wallet = makeMockWallet('register-wallet')
    const mockQuerier = vi.fn().mockResolvedValue(null)
    mockGetUserAccountQuerier.mockReturnValue(mockQuerier)

    const mockRegisterFn = vi.fn().mockResolvedValue(undefined)
    mockGetUserRegistrationFunction.mockReturnValue(mockRegisterFn)

    const { result } = renderHook(() => useUmbraClient(wallet))

    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })
    expect(result.current.isRegistered).toBe(false)

    await act(async () => {
      await result.current.register()
    })

    expect(mockGetUserRegistrationFunction).toHaveBeenCalled()
    expect(mockRegisterFn).toHaveBeenCalled()
    expect(result.current.isRegistered).toBe(true)
    expect(result.current.status).toBe('ready')
    expect(localStorage.getItem('psr_umbra_registered_register-wallet')).toBe('1')
  })
})
