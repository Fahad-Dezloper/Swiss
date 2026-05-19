export interface Session { orgId: string; userId: string; walletAddress: string }
const KEY = 'psr_session'
export function getSession(): Session | null {
  if (typeof window === 'undefined') return null
  const s = localStorage.getItem(KEY)
  return s ? JSON.parse(s) : null
}
export function setSession(s: Session) { localStorage.setItem(KEY, JSON.stringify(s)) }
