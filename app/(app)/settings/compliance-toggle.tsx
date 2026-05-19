'use client'

import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'

export default function ComplianceToggle() {
  const [enabled, setEnabled] = useState(false)

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-[#6366f1]/10 border border-[#6366f1]/20 flex items-center justify-center shrink-0 mt-0.5">
          <ShieldCheck className="h-4 w-4 text-[#6366f1]" />
        </div>
        <div>
          <p className="text-sm font-medium text-[#e2e8f0]">Compliance Mode</p>
          <p className="text-xs text-[#6b7280] mt-0.5 leading-relaxed">
            When enabled, all settlement receipts include an auditable compliance log.
            Disclosure requests will require additional verification before generating links.
          </p>
          {enabled && (
            <p className="text-xs text-amber-400 mt-2">
              Compliance mode active — audit logs are being retained.
            </p>
          )}
        </div>
      </div>

      {/* Toggle */}
      <button
        role="switch"
        aria-checked={enabled}
        onClick={() => setEnabled((p) => !p)}
        className={`relative shrink-0 h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111118] ${
          enabled ? 'bg-[#6366f1]' : 'bg-[#1e1e2e]'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
