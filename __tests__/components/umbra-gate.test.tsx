import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock privy wallets hook
vi.mock('@privy-io/react-auth/solana', () => ({
  useWallets: vi.fn(),
}))

// Mock the umbra client hook
vi.mock('@/hooks/use-umbra-client', () => ({
  useUmbraClient: vi.fn(),
}))

// lucide-react icons — simple pass-through mocks
vi.mock('lucide-react', () => ({
  ShieldCheck: ({ className }: any) => <svg data-testid="shield-check-icon" className={className} />,
  RefreshCw: ({ className }: any) => <svg data-testid="refresh-cw-icon" className={className} />,
  X: ({ className }: any) => <svg data-testid="x-icon" className={className} />,
}))

import { useWallets } from '@privy-io/react-auth/solana'
import { useUmbraClient } from '@/hooks/use-umbra-client'
import UmbraGate from '@/components/umbra-gate'

const mockUseWallets = useWallets as ReturnType<typeof vi.fn>
const mockUseUmbraClient = useUmbraClient as ReturnType<typeof vi.fn>

function defaultUmbraState(overrides: Partial<ReturnType<typeof useUmbraClient>> = {}) {
  return {
    status: 'idle' as const,
    error: null,
    errorKind: null as 'init' | 'registration' | null,
    isRegistered: false,
    register: vi.fn(),
    checkRecipientRegistered: vi.fn(),
    sendUsdc: vi.fn(),
    scanUtxos: vi.fn(),
    claimUtxo: vi.fn(),
    ...overrides,
  }
}

describe('UmbraGate component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: no wallet
    mockUseWallets.mockReturnValue({ wallets: [] })
    mockUseUmbraClient.mockReturnValue(defaultUmbraState())
  })

  it('renders children when no wallet connected', () => {
    mockUseWallets.mockReturnValue({ wallets: [] })

    render(
      <UmbraGate>
        <div data-testid="child">Hello</div>
      </UmbraGate>
    )

    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('shows spinner when umbra.status === initializing', () => {
    mockUseWallets.mockReturnValue({ wallets: [{ address: 'wallet-addr' }] })
    mockUseUmbraClient.mockReturnValue(defaultUmbraState({ status: 'initializing' }))

    render(
      <UmbraGate>
        <div data-testid="child">Content</div>
      </UmbraGate>
    )

    expect(screen.queryByTestId('child')).not.toBeInTheDocument()
    expect(screen.getByText(/connecting to umbra/i)).toBeInTheDocument()
  })

  it('shows spinner with "approve" message when umbra.status === registering', () => {
    mockUseWallets.mockReturnValue({ wallets: [{ address: 'wallet-addr' }] })
    mockUseUmbraClient.mockReturnValue(defaultUmbraState({ status: 'registering' }))

    render(
      <UmbraGate>
        <div data-testid="child">Content</div>
      </UmbraGate>
    )

    expect(screen.queryByTestId('child')).not.toBeInTheDocument()
    // Should show "approve" message
    expect(screen.getByText(/approve/i)).toBeInTheDocument()
  })

  it('renders children when umbra.isRegistered === true (status=ready)', () => {
    mockUseWallets.mockReturnValue({ wallets: [{ address: 'wallet-addr' }] })
    mockUseUmbraClient.mockReturnValue(
      defaultUmbraState({ status: 'ready', isRegistered: true })
    )

    render(
      <UmbraGate>
        <div data-testid="child">Content</div>
      </UmbraGate>
    )

    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('renders children when isRegistered=true even if status=error', () => {
    mockUseWallets.mockReturnValue({ wallets: [{ address: 'wallet-addr' }] })
    mockUseUmbraClient.mockReturnValue(
      defaultUmbraState({ status: 'error', isRegistered: true, error: 'Some error', errorKind: 'init' })
    )

    render(
      <UmbraGate>
        <div data-testid="child">Content</div>
      </UmbraGate>
    )

    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('shows registration screen when status=ready and !isRegistered', () => {
    mockUseWallets.mockReturnValue({ wallets: [{ address: 'wallet-addr' }] })
    mockUseUmbraClient.mockReturnValue(
      defaultUmbraState({ status: 'ready', isRegistered: false })
    )

    render(
      <UmbraGate>
        <div data-testid="child">Content</div>
      </UmbraGate>
    )

    expect(screen.queryByTestId('child')).not.toBeInTheDocument()
    // Should show registration screen title
    expect(screen.getByText(/set up private payments/i)).toBeInTheDocument()
  })

  it('registration screen has "Register with Umbra →" button', () => {
    mockUseWallets.mockReturnValue({ wallets: [{ address: 'wallet-addr' }] })
    mockUseUmbraClient.mockReturnValue(
      defaultUmbraState({ status: 'ready', isRegistered: false })
    )

    render(
      <UmbraGate>
        <div>Content</div>
      </UmbraGate>
    )

    expect(screen.getByRole('button', { name: /register with umbra/i })).toBeInTheDocument()
  })

  it('clicking Register button calls umbra.register()', async () => {
    const mockRegister = vi.fn().mockResolvedValue(undefined)
    mockUseWallets.mockReturnValue({ wallets: [{ address: 'wallet-addr' }] })
    mockUseUmbraClient.mockReturnValue(
      defaultUmbraState({ status: 'ready', isRegistered: false, register: mockRegister })
    )

    render(
      <UmbraGate>
        <div>Content</div>
      </UmbraGate>
    )

    const btn = screen.getByRole('button', { name: /register with umbra/i })
    fireEvent.click(btn)

    // register is called asynchronously
    await vi.waitFor(() => {
      expect(mockRegister).toHaveBeenCalledOnce()
    })
  })

  it('shows dismissible warning banner on init error (children still render)', () => {
    mockUseWallets.mockReturnValue({ wallets: [{ address: 'wallet-addr' }] })
    mockUseUmbraClient.mockReturnValue(
      defaultUmbraState({ status: 'error', isRegistered: false, error: 'Connection refused', errorKind: 'init' })
    )

    render(
      <UmbraGate>
        <div data-testid="child">Content</div>
      </UmbraGate>
    )

    // Children ARE rendered (init error is a banner, not a blocker)
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText(/umbra connection failed/i)).toBeInTheDocument()
  })

  it('registration error shows retry button, not the banner', () => {
    mockUseWallets.mockReturnValue({ wallets: [{ address: 'wallet-addr' }] })
    mockUseUmbraClient.mockReturnValue(
      defaultUmbraState({ status: 'ready', isRegistered: false, error: 'Registration failed — transaction simulation error.', errorKind: 'registration' })
    )

    render(
      <UmbraGate>
        <div data-testid="child">Content</div>
      </UmbraGate>
    )

    // Children NOT rendered — registration screen blocks
    expect(screen.queryByTestId('child')).not.toBeInTheDocument()
    // Shows retry button
    expect(screen.getByRole('button', { name: /retry registration/i })).toBeInTheDocument()
    // Shows the error message inline
    expect(screen.getByText(/transaction simulation error/i)).toBeInTheDocument()
  })

  it('init error banner can be dismissed', () => {
    mockUseWallets.mockReturnValue({ wallets: [{ address: 'wallet-addr' }] })
    mockUseUmbraClient.mockReturnValue(
      defaultUmbraState({ status: 'error', isRegistered: false, error: 'Some error', errorKind: 'init' })
    )

    render(
      <UmbraGate>
        <div>Content</div>
      </UmbraGate>
    )

    // Banner initially visible
    expect(screen.getByText(/umbra connection failed/i)).toBeInTheDocument()

    // Click dismiss (X button)
    const dismissBtn = screen.getByRole('button', { name: /dismiss/i })
    fireEvent.click(dismissBtn)

    // Banner gone, children still there
    expect(screen.queryByText(/umbra connection failed/i)).not.toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })
})
