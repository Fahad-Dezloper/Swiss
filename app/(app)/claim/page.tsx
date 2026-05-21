"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWallets } from "@privy-io/react-auth/solana";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useUmbraClient } from "@/hooks/use-umbra-client";
import { useSuccessSound } from "@/hooks/use-success-sound";
import { truncateAddress, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  Download,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Loader2,
} from "lucide-react";

interface ReceivedReceipt {
  id: string;
  paymentId: string;
  receiptHash: string;
  senderWallet: string;
  recipientWallet: string;
  createdAt: string;
  payment: {
    id: string;
    amount: string;
    currency: string;
    status: string;
    txSignature: string | null;
    recipientAddr: string;
    rail: string;
    createdAt: string;
    payrollRun: { periodLabel: string } | null;
  } | null;
}

interface MockUtxo {
  id: string;
  amountUsdc: number; // human-readable
  fromAddr: string;
  date: string;
}

function formatAmount(amount: string, currency: string): string {
  if (currency === "SOL")
    return (Number(amount) / LAMPORTS_PER_SOL).toFixed(4) + " SOL";
  return (Number(amount) / 1_000_000).toFixed(2) + " " + currency;
}

// One deterministic mock UTXO — always shown until claimed
const SEED_UTXO: MockUtxo = {
  id: "mock-utxo-0",
  amountUsdc: 42.5,
  fromAddr: "8xMF3rjZYo6cQzGh9Pk2NnbDFXLzMQvHtTqWpEsYjA1c",
  date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
};

export default function ClaimPage() {
  const { wallets } = useWallets();
  const wallet = wallets[0] ?? null;
  const address = wallet?.address ?? null;
  const playSuccess = useSuccessSound();

  const umbra = useUmbraClient(wallet);

  // Pending UTXOs — starts with the seed, moves to claimed on success
  const [pendingUtxos, setPendingUtxos] = useState<MockUtxo[]>([SEED_UTXO]);
  const [claimedUtxos, setClaimedUtxos] = useState<MockUtxo[]>([]);
  const [claiming, setClaiming] = useState<string | null>(null);

  // Registration gate
  const [registering, setRegistering] = useState(false);

  // On-chain received receipts
  const [received, setReceived] = useState<ReceivedReceipt[]>([]);
  const [loadingReceived, setLoadingReceived] = useState(false);

  useEffect(() => {
    if (!address) return;
    setLoadingReceived(true);
    fetch(
      `/api/receipts?walletAddress=${encodeURIComponent(address)}&tab=received`,
    )
      .then((r) => r.json())
      .then((data) => setReceived(Array.isArray(data) ? data : []))
      .catch(() => setReceived([]))
      .finally(() => setLoadingReceived(false));
  }, [address]);

  async function handleRegister() {
    if (!wallet) return;
    setRegistering(true);
    try {
      await umbra.register();
      playSuccess();
      toast.success("Registered with Umbra", {
        description:
          "Your stealth account is ready. You can now claim payments.",
      });
    } catch {
      toast.error("Registration failed — try again");
    } finally {
      setRegistering(false);
    }
  }

  async function handleClaim(utxo: MockUtxo) {
    if (!wallet) return;
    setClaiming(utxo.id);
    try {
      // Real signature — proves ownership
      const msg = `PSR × Umbra — Claim ${utxo.amountUsdc} USDC\n\nFrom: ${utxo.fromAddr}\nTimestamp: ${Date.now()}`;
      await wallet.signMessage({ message: new TextEncoder().encode(msg) });

      // Simulate claiming delay
      await new Promise((r) => setTimeout(r, 1200));

      // Move from pending → claimed
      setPendingUtxos((prev) => prev.filter((u) => u.id !== utxo.id));
      setClaimedUtxos((prev) => [utxo, ...prev]);

      playSuccess();
      toast.success(`Claimed ${utxo.amountUsdc} USDC`, {
        description: "Payment withdrawn to your public USDC balance.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Claim failed";
      if (
        !msg.toLowerCase().includes("reject") &&
        !msg.toLowerCase().includes("cancel")
      ) {
        toast.error("Claim failed", { description: msg });
      }
    } finally {
      setClaiming(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Download className="h-4 w-4 text-white" />
          <h1 className="text-xl font-semibold text-white">Claim</h1>
        </div>
        <p className="mt-1 text-sm text-[#888]">
          Claim USDC payments sent to you privately via Umbra&apos;s stealth
          pool
        </p>
      </div>

      {!address && (
        <div className="rounded-xl border border-[#222] bg-[#111] px-6 py-10 text-center">
          <p className="text-sm text-[#888]">
            Connect your wallet to view claimable payments.
          </p>
        </div>
      )}

      {address && (
        <>
          {/* ── Registration gate ── */}
          {!umbra.isRegistered && umbra.status !== "initializing" && (
            <div className="rounded-xl border border-[#2a1e0e] bg-[#1a1008] p-5 space-y-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-[#f0a030]" />
                <div>
                  <p className="text-sm font-semibold text-white">
                    Register to claim
                  </p>
                  <p className="text-xs text-[#888] mt-0.5">
                    Sign once to activate your Umbra stealth account — required
                    before claiming.
                  </p>
                </div>
              </div>
              <button
                onClick={handleRegister}
                disabled={registering || umbra.status === "registering"}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#43AED6] text-white text-sm font-medium hover:bg-[#3a9dc3] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {registering || umbra.status === "registering" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Approve in
                    wallet…
                  </>
                ) : (
                  "Register with Umbra →"
                )}
              </button>
            </div>
          )}

          {umbra.status === "initializing" && (
            <div className="rounded-xl border border-[#222] bg-[#111] px-6 py-6 flex items-center gap-3">
              <div className="h-5 w-5 rounded-full border border-[#333] animate-pulse" />
              <p className="text-sm text-[#555]">Connecting to Umbra…</p>
            </div>
          )}

          {/* ── Pending Claims ── */}
          <div className="rounded-xl border border-[#222] bg-[#111] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#222] flex items-center justify-between">
              <span className="text-xs text-[#888] uppercase tracking-wider font-medium">
                Pending Claims
              </span>
              <span className="text-xs text-[#555]">
                {pendingUtxos.length} item{pendingUtxos.length !== 1 ? "s" : ""}
              </span>
            </div>

            {pendingUtxos.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <CheckCircle2 className="h-6 w-6 text-[#333] mx-auto mb-2" />
                <p className="text-sm text-[#555]">All payments claimed.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#222]">
                {pendingUtxos.map((utxo) => (
                  <div
                    key={utxo.id}
                    className="flex items-center justify-between px-5 py-4 hover:bg-black/5 transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-white font-mono">
                        {utxo.amountUsdc.toFixed(2)} USDC
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#555]">from</span>
                        <span className="text-xs text-[#888] font-mono">
                          {truncateAddress(utxo.fromAddr)}
                        </span>
                        <span className="text-xs text-[#444]">·</span>
                        <span className="text-xs text-[#555]">
                          {formatDate(utxo.date)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleClaim(utxo)}
                      disabled={!umbra.isRegistered || claiming === utxo.id}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#43AED6] !text-white cursor-pointer text-xs font-semibold hover:bg-[#3a9dc3] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                      {claiming === utxo.id ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />{" "}
                          Claiming…
                        </>
                      ) : (
                        "Claim →"
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Claimed ── */}
          {claimedUtxos.length > 0 && (
            <div className="rounded-xl border border-[#222] bg-[#111] overflow-hidden">
              <div className="px-5 py-3 border-b border-[#222] flex items-center justify-between">
                <span className="text-xs text-[#888] uppercase tracking-wider font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Claimed
                </span>
                <span className="text-xs text-[#555]">
                  {claimedUtxos.length} item
                  {claimedUtxos.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="divide-y divide-[#222]">
                {claimedUtxos.map((utxo) => (
                  <div
                    key={utxo.id}
                    className="flex items-center justify-between px-5 py-4 opacity-60"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-white font-mono">
                        {utxo.amountUsdc.toFixed(2)} USDC
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#555]">from</span>
                        <span className="text-xs text-[#888] font-mono">
                          {truncateAddress(utxo.fromAddr)}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Claimed
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Received On-chain ── */}
          <div className="rounded-xl border border-[#222] bg-[#111] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#222] flex items-center justify-between">
              <span className="text-xs text-[#888] uppercase tracking-wider font-medium">
                Received On-chain
              </span>
              <button
                onClick={() => {
                  if (!address) return;
                  setLoadingReceived(true);
                  fetch(
                    `/api/receipts?walletAddress=${encodeURIComponent(address)}&tab=received`,
                  )
                    .then((r) => r.json())
                    .then((data) =>
                      setReceived(Array.isArray(data) ? data : []),
                    )
                    .catch(() => setReceived([]))
                    .finally(() => setLoadingReceived(false));
                }}
                className="text-[#555] hover:text-white transition-colors"
                aria-label="Refresh"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loadingReceived ? "animate-spin" : ""}`}
                />
              </button>
            </div>

            {loadingReceived ? (
              <div className="px-6 py-10 text-center text-sm text-[#555] animate-pulse">
                Loading…
              </div>
            ) : received.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-[#555]">
                No on-chain payments received yet.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#222]">
                    {["From", "Amount", "Date", "Receipt"].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left text-xs text-[#888] uppercase tracking-wider font-medium"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222]">
                  {received.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-black/20 transition-colors"
                    >
                      <td className="px-5 py-4 font-mono text-white text-xs">
                        {truncateAddress(r.senderWallet)}
                      </td>
                      <td className="px-5 py-4 font-mono text-white text-xs font-semibold">
                        {r.payment
                          ? formatAmount(r.payment.amount, r.payment.currency)
                          : "—"}
                      </td>
                      <td className="px-5 py-4 text-[#888] text-xs">
                        {formatDate(r.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/receipt/${r.paymentId}`}
                          className="text-xs text-[#888] hover:text-white underline font-mono transition-colors"
                        >
                          view →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
