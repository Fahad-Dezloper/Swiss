"use client";

import { useActiveWallet, usePrivy, useWallets } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import { truncateAddress } from "@/lib/utils";

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
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#111] border border-[#222]">
        <span className="h-2 w-2 rounded-full bg-[#888] shrink-0" />
        <span className="text-xs text-[#888] font-mono">Loading…</span>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <button
        onClick={login}
        className="px-3 py-2 rounded-lg bg-white text-black text-xs font-medium hover:bg-[#e0e0e0] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        Connect Wallet
      </button>
    );
  }

  return (
    <button
      onClick={hovered ? logout : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#111] border border-[#222] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
    >
      {hovered ? (
        <>
          <span className="h-2 w-2 rounded-full bg-[#888] shrink-0" />
          <span className="text-xs text-[#888] font-mono">Disconnect</span>
        </>
      ) : (
        <>
          <span className="h-2 w-2 rounded-full bg-white shrink-0" />
          <span className="text-xs text-[#888] font-mono truncate max-w-[120px]">
            {address ? truncateAddress(address) : "Connected"}
          </span>
        </>
      )}
    </button>
  );
}
