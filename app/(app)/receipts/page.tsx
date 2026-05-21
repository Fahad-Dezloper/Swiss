"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallets } from "@privy-io/react-auth/solana";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { truncateAddress, truncateHash, formatDate } from "@/lib/utils";
import { Copy, Check, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSuccessSound } from "@/hooks/use-success-sound";

type Tab = "paid" | "received";

interface ReceiptRow {
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

function formatAmount(amount: string, currency: string): string {
  if (currency === "SOL")
    return (Number(amount) / LAMPORTS_PER_SOL).toFixed(4) + " SOL";
  return (Number(amount) / 1_000_000).toFixed(2) + " " + currency;
}

export default function ReceiptsPage() {
  const router = useRouter();
  const { wallets } = useWallets();
  const wallet = wallets[0] ?? null;
  const address = wallet?.address ?? null;
  const playSuccess = useSuccessSound();

  const [tab, setTab] = useState<Tab>("paid");
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [signing, setSigning] = useState<string | null>(null);

  async function fetchReceipts(currentTab: Tab, walletAddr: string) {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/receipts?walletAddress=${encodeURIComponent(walletAddr)}&tab=${currentTab}`,
      );
      const data = await res.json();
      setReceipts(Array.isArray(data) ? data : []);
    } catch {
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (address) fetchReceipts(tab, address);
    else setReceipts([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, address]);

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  async function signAndView(paymentId: string, receiptHash: string) {
    if (!wallet) return;
    setSigning(paymentId);
    try {
      const msg = `PSR:view-receipt:${receiptHash}:${Date.now()}`;
      const msgBytes = new TextEncoder().encode(msg);
      await wallet.signMessage({ message: msgBytes });
      playSuccess();
      toast.success("Verified — opening receipt…");
      router.push(`/receipt/${paymentId}`);
    } catch {
      // user rejected — stay on page
    } finally {
      setSigning(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 bg-[#ffffff] p-6 rounded-3xl text-[#000000]">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-[#000000]">
          Receipts
        </h1>
        <p className="text-sm text-[#737373]">
          Cryptographic payment receipts for{" "}
          {address ? (
            <span className="font-mono font-medium text-[#000000] bg-[#f5f5f5] px-1.5 py-0.5 rounded border border-[#e5e5e5]">
              {truncateAddress(address)}
            </span>
          ) : (
            "your wallet"
          )}
        </p>
      </div>

      {/* Tab toggle */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-[#f5f5f5] border border-[#e5e5e5] w-fit">
        <button
          onClick={() => setTab("paid")}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            tab === "paid"
              ? "bg-[#ffffff] text-[#000000] shadow-sm border border-[#e5e5e5]/50 font-bold"
              : "text-[#737373] hover:text-[#000000]"
          }`}
        >
          Paid
        </button>
        <button
          onClick={() => setTab("received")}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            tab === "received"
              ? "bg-[#ffffff] text-[#000000] shadow-sm border border-[#e5e5e5]/50 font-bold"
              : "text-[#737373] hover:text-[#000000]"
          }`}
        >
          Received
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-[#e5e5e5] bg-[#ffffff] overflow-hidden shadow-sm">
        {!address ? (
          <div className="px-6 py-12 text-center text-sm text-[#737373] bg-[#f9f9f9]">
            Connect your wallet to view receipts.
          </div>
        ) : loading ? (
          <div className="px-6 py-12 text-center text-sm text-[#737373] bg-[#f9f9f9] animate-pulse">
            Loading receipts…
          </div>
        ) : receipts.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-[#737373] bg-[#f9f9f9]">
            No {tab === "paid" ? "paid" : "received"} receipts yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#e5e5e5] bg-[#f9f9f9]">
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-[#737373] uppercase tracking-wider">
                    {tab === "paid" ? "Recipient" : "Sender"}
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-[#737373] uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-[#737373] uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-[#737373] uppercase tracking-wider">
                    Receipt Hash
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-[#737373] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e5]">
                {receipts.map((r) => {
                  const counterparty =
                    tab === "paid"
                      ? (r.payment?.recipientAddr ?? r.recipientWallet)
                      : r.senderWallet;
                  const hashKey = `hash-${r.id}`;
                  const addrKey = `addr-${r.id}`;
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-[#f9f9f9] transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#000000] font-mono font-medium">
                            {truncateAddress(counterparty)}
                          </span>
                          <button
                            onClick={() =>
                              copyToClipboard(counterparty, addrKey)
                            }
                            className="text-[#a3a3a3] hover:text-[#000000] transition-colors cursor-pointer bg-transparent border-none"
                          >
                            {copied === addrKey ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-[#000000] font-semibold font-mono">
                        {r.payment
                          ? formatAmount(r.payment.amount, r.payment.currency)
                          : "—"}
                      </td>
                      <td className="px-5 py-4 text-xs text-[#737373]">
                        {formatDate(r.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs text-[#737373] font-mono"
                            title={r.receiptHash}
                          >
                            {truncateHash(r.receiptHash, 6)}
                          </span>
                          <button
                            onClick={() =>
                              copyToClipboard(r.receiptHash, hashKey)
                            }
                            className="text-[#a3a3a3] hover:text-[#000000] transition-colors cursor-pointer bg-transparent border-none"
                          >
                            {copied === hashKey ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() =>
                            signAndView(r.paymentId, r.receiptHash)
                          }
                          disabled={signing === r.paymentId}
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[#43AED6] hover:bg-[#3a9dc3] text-xs font-semibold text-white transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98] border border-[#43AED6] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                        >
                          {signing === r.paymentId ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <span className="!text-white">Sign to view</span>
                              <ArrowRight className="h-3 w-3 !text-white" />
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
