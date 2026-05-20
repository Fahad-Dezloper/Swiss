"use client";

import { useActiveWallet, usePrivy } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import { truncateAddress } from "@/lib/utils";
import { Wallet } from "lucide-react";

export default function WalletButton() {
  const { ready, authenticated, login, logout } = usePrivy();
  const wallet = useActiveWallet();
  const [hovered, setHovered] = useState(false);

  const address = wallet?.wallet?.address ?? null;

  // After authentication, call /api/setup and store result
  useEffect(() => {
    if (!authenticated || !address) return;

    fetch(`/api/setup?walletAddress=${encodeURIComponent(address)}`)
      .then((r) => r.json())
      .then((data) => {
        try {
          localStorage.setItem("psr_session", JSON.stringify(data));
        } catch {
          // ignore
        }
      })
      .catch(() => {});
  }, [authenticated, address]);

  if (!ready) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-50 border border-neutral-200">
        <span className="h-1.5 w-1.5 rounded-full bg-neutral-300 animate-pulse shrink-0" />
        <span className="text-xs text-neutral-400 font-mono">Loading…</span>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <button
        onClick={login}
        className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-neutral-950 hover:bg-neutral-850 text-neutral-50 text-xs font-semibold tracking-tight transition-all active:scale-95 hover:scale-[1.02] focus:outline-none shadow-sm cursor-pointer"
      >
        <Wallet className="h-3.5 w-3.5" />
        <span>Connect</span>
      </button>
    );
  }

  return (
    <button
      onClick={hovered ? logout : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 hover:border-neutral-300 text-xs font-mono font-medium text-neutral-800 transition-all active:scale-95 focus:outline-none cursor-pointer"
    >
      {hovered ? (
        <>
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
          <span className="text-red-600 font-sans font-semibold">
            Disconnect
          </span>
        </>
      ) : (
        <>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span>{address ? truncateAddress(address) : "Connected"}</span>
        </>
      )}
    </button>
  );
}
