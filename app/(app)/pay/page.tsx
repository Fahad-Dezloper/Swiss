"use client";

import { useEffect, useState } from "react";
import { useWallets } from "@privy-io/react-auth/solana";
import { useUmbraClient } from "@/hooks/use-umbra-client";
import { useSuccessSound } from "@/hooks/use-success-sound";
import { toast } from "sonner";
import Swap from "@/components/Swap";

const USDC_DECIMALS = 6;

interface RecentSend {
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

export default function PayPage() {
  const { wallets } = useWallets();
  const connectedWallet = wallets[0] ?? null;
  const address = connectedWallet?.address ?? null;

  const umbra = useUmbraClient(connectedWallet);
  const playSuccess = useSuccessSound();

  const [recipientAddr, setRecipientAddr] = useState("");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendStep, setSendStep] = useState<string>("idle");

  const [recentSends, setRecentSends] = useState<RecentSend[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  const [recipientRegistered, setRecipientRegistered] = useState<
    boolean | null
  >(null);
  const [checkingRecipient, setCheckingRecipient] = useState(false);

  async function fetchRecentSends() {
    if (!address) return;
    setLoadingRecent(true);
    try {
      const res = await fetch(
        `/api/receipts?walletAddress=${encodeURIComponent(address)}&tab=paid`,
      );
      const data = await res.json();
      setRecentSends(Array.isArray(data) ? data : []);
    } catch {
      setRecentSends([]);
    } finally {
      setLoadingRecent(false);
    }
  }

  useEffect(() => {
    if (address) fetchRecentSends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  // Check if recipient is registered on Umbra
  useEffect(() => {
    if (!recipientAddr.trim() || umbra.status !== "ready") {
      setRecipientRegistered(null);
      return;
    }
    let cancelled = false;
    setCheckingRecipient(true);
    umbra
      .checkRecipientRegistered(recipientAddr.trim())
      .then((registered) => {
        if (!cancelled) {
          setRecipientRegistered(registered);
          setCheckingRecipient(false);
        }
      })
      .catch(() => {
        if (!cancelled) setCheckingRecipient(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipientAddr, umbra.status]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!recipientAddr.trim() || !amount.trim()) return;
    if (!connectedWallet) {
      setSendError("Connect a Solana wallet first");
      return;
    }

    setSending(true);
    setSendError(null);

    try {
      if (!umbra.isRegistered)
        throw new Error("Register with Umbra first — click 'Register' below");

      const usdcAmount = parseFloat(amount.trim());
      if (isNaN(usdcAmount) || usdcAmount <= 0)
        throw new Error("Amount must be positive");
      const microUsdc = BigInt(Math.round(usdcAmount * 10 ** USDC_DECIMALS));

      const { txSignature } = await umbra.sendUsdc({
        recipientAddress: recipientAddr.trim(),
        amount: microUsdc,
        onStep: (step) => setSendStep(step),
      });

      setSendStep("Recording receipt…");
      const res = await fetch("/api/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientAddr: recipientAddr.trim(),
          amount: String(microUsdc),
          currency: "USDC",
          txSignature,
          senderWallet: connectedWallet.address,
          rail: "umbra",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error || `Failed: ${res.status}`,
        );
      }

      setRecipientAddr("");
      setAmount("");
      playSuccess();
      toast.success("Payment sent!", {
        description: `${usdcAmount.toFixed(2)} USDC sent privately via Umbra.`,
      });
      await fetchRecentSends();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSending(false);
      setSendStep("idle");
    }
  }

  return (
    <Swap
      recipientAddr={recipientAddr}
      setRecipientAddr={setRecipientAddr}
      amount={amount}
      setAmount={setAmount}
      sending={sending}
      sendStep={sendStep}
      sendError={sendError}
      connectedWallet={connectedWallet}
      umbra={umbra}
      checkingRecipient={checkingRecipient}
      recipientRegistered={recipientRegistered}
      onSubmit={handleSend}
    />
  );
}
