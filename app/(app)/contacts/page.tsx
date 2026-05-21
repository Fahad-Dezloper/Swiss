'use client'

import { useEffect, useState } from 'react'
import { useWallets } from '@privy-io/react-auth/solana'
import { Trash2, Plus } from 'lucide-react'
import { truncateAddress } from '@/lib/utils'

interface Contact {
  id: string
  alias: string
  destinationRef: string
}

export default function ContactsPage() {
  const { wallets } = useWallets()
  const address = wallets[0]?.address ?? null

  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [alias, setAlias] = useState('')
  const [dest, setDest] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchContacts() {
    if (!address) return
    fetch(`/api/contacts?walletAddress=${encodeURIComponent(address)}`)
      .then((r) => r.json())
      .then((d) => setContacts(Array.isArray(d) ? d : []))
      .catch(() => setContacts([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (address) fetchContacts()
    else setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!address || !alias.trim() || !dest.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, alias: alias.trim(), destinationRef: dest.trim() }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error((d as { error?: string }).error || 'Failed to save')
      }
      setAlias('')
      setDest('')
      await fetchContacts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
      setContacts((prev) => prev.filter((c) => c.id !== id))
    } catch {
      // ignore
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Address Book</h1>
        <p className="mt-1 text-sm text-[#888]">Save recipient aliases to speed up payroll runs</p>
      </div>

      {!address ? (
        <div className="rounded-xl border border-[#222] bg-[#111] px-6 py-10 text-center">
          <p className="text-sm text-[#888]">Connect your wallet to manage contacts.</p>
        </div>
      ) : (
        <>
          {/* Add contact form */}
          <div className="rounded-xl border border-[#222] bg-[#111] p-6 space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Contact
            </h2>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#888] uppercase tracking-wider">
                    Name / Alias
                  </label>
                  <input
                    type="text"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    placeholder="e.g. Alice Dev"
                    required
                    className="w-full px-3 py-2 bg-black border border-[#222] rounded-lg text-sm text-white placeholder-[#555] focus:outline-none focus:ring-1 focus:ring-white focus:border-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#888] uppercase tracking-wider">
                    Solana Address
                  </label>
                  <input
                    type="text"
                    value={dest}
                    onChange={(e) => setDest(e.target.value)}
                    placeholder="Solana address…"
                    required
                    className="w-full px-3 py-2 bg-black border border-[#222] rounded-lg text-sm text-white placeholder-[#555] focus:outline-none focus:ring-1 focus:ring-white focus:border-white font-mono"
                  />
                </div>
              </div>
              {error && (
                <p className="text-xs text-[#888] px-3 py-2 rounded-lg border border-[#333]">{error}</p>
              )}
              <button
                type="submit"
                disabled={saving || !alias.trim() || !dest.trim()}
                className="px-4 py-2 rounded-lg bg-[#43AED6] text-white text-sm font-medium hover:bg-[#3a9dc3] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving…' : 'Save Contact'}
              </button>
            </form>
          </div>

          {/* Contact list */}
          <div className="rounded-xl border border-[#222] bg-[#111] overflow-hidden">
            <div className="px-6 py-3 border-b border-[#222]">
              <span className="text-xs text-[#888] uppercase tracking-wider font-medium">
                Contacts ({contacts.length})
              </span>
            </div>
            {loading ? (
              <div className="px-6 py-8 text-center text-sm text-[#888]">Loading…</div>
            ) : contacts.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-[#555]">
                No contacts yet. Add one above.
              </div>
            ) : (
              <ul className="divide-y divide-[#222]">
                {contacts.map((c) => (
                  <li key={c.id} className="flex items-center justify-between px-6 py-4 hover:bg-black transition-colors">
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm text-white font-medium">{c.alias}</p>
                      <p className="text-xs text-[#888] font-mono">{truncateAddress(c.destinationRef, 8)}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => navigator.clipboard.writeText(c.destinationRef)}
                        className="text-xs text-[#555] hover:text-white transition-colors"
                        title="Copy address"
                      >
                        copy
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-[#555] hover:text-white transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
