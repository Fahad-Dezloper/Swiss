"use client";

import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { ArrowRight, ChevronDown, Equal, Loader2 } from "lucide-react";
import React, { useRef } from "react";
import useMeasure from "react-use-measure";
import { cn } from "@/lib/utils";

interface SwapProps {
  recipientAddr: string;
  setRecipientAddr: (val: string) => void;
  amount: string;
  setAmount: (val: string) => void;
  sending: boolean;
  sendStep: string;
  sendError: string | null;
  connectedWallet: any;
  umbra: any;
  checkingRecipient: boolean;
  recipientRegistered: boolean | null;
  onSubmit: (e: React.FormEvent) => void;
}

export default function Swap({
  recipientAddr,
  setRecipientAddr,
  amount,
  setAmount,
  sending,
  sendStep,
  sendError,
  connectedWallet,
  umbra,
  checkingRecipient,
  recipientRegistered,
  onSubmit,
}: SwapProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [ref, bounds] = useMeasure();
  const [ref2, bounds2] = useMeasure();

  // Balance constants (USDC on Umbra Devnet)
  const BALANCE = 250.0;
  const value = parseFloat(amount) || 0;
  const isInsufficient = value > BALANCE;
  const usdValue = value; // 1:1 USD pegged value for USDC

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;

    if (!/^[0-9]*\.?[0-9]*$/.test(inputVal) && inputVal !== "") {
      return;
    }

    if (inputVal === "" || inputVal === ".") {
      setAmount(inputVal);
      return;
    }

    if (inputVal.startsWith(".")) {
      setAmount(inputVal);
      return;
    }

    const newValue = parseFloat(inputVal) || 0;
    const maxValue = 100000;

    if (newValue > maxValue) {
      setAmount(maxValue.toString());
    } else {
      setAmount(inputVal);
    }
  };

  const handleUseMax = () => {
    setAmount(BALANCE.toString());
  };

  const displayValue = amount || "0";
  const digits = displayValue.split("");

  return (
    <MotionConfig transition={{ type: "spring", stiffness: 400, damping: 35 }}>
      <div className="flex h-fit w-full items-center justify-center bg-[#ffffff] text-[#000000] rounded-3xl">
        {/* Scoped CSS override to bypass the global ::selection style */}
        <style>{`
          .custom-selection::selection {
            background-color: rgba(0, 0, 0, 0.1) !important;
            color: #000000 !important;
          }
        `}</style>

        <form
          onSubmit={onSubmit}
          className="flex flex-col items-center justify-center gap-3"
        >
          {/* Top Card: Amount Input */}
          <div className="relative flex w-[300px] flex-col items-center justify-center gap-5 rounded-3xl border border-[#e5e5e5] bg-[#ffffff] px-3 py-3 sm:w-[350px]">
            <div className="flex w-full items-center justify-between">
              {/* Static Token Selector */}
              <div className="flex items-center gap-3 text-left select-none">
                <div className="h-9 w-9 overflow-hidden rounded-full bg-[#f5f5f5] flex items-center justify-center font-bold text-xs text-[#000000] border border-[#e5e5e5]">
                  <img
                    src={"/logo/umbra.png"}
                    alt="umbra logo"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-[#000000]">
                    USDC (Umbra)
                  </h2>
                  <p className="text-[10px] text-[#737373]">
                    Private Devnet USDC
                  </p>
                </div>
              </div>

              {/* Use Max Button */}
              <button
                type="button"
                onClick={handleUseMax}
                className="flex items-center gap-1 rounded-full bg-[#f5f5f5] px-3 py-1 text-xs font-semibold text-[#000000] border border-[#e5e5e5] transition-all hover:bg-[#e9e9e9] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <motion.span
                  animate={{ width: bounds.width > 0 ? bounds.width : "auto" }}
                >
                  <span ref={ref} className="inline-flex overflow-hidden">
                    <AnimatePresence mode="popLayout">
                      {value > BALANCE - 0.01 ? (
                        <motion.span
                          key="using"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          Using{" "}
                        </motion.span>
                      ) : (
                        <motion.span
                          key="use"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          Use{" "}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                </motion.span>
                Max
              </button>
            </div>

            <div className="w-full border-t border-[#e5e5e5]" />

            {/* Input & digits display */}
            <div className="mb-6 flex w-full flex-col items-center justify-center gap-4">
              <div className="relative w-[300px] overflow-hidden text-center">
                <input
                  ref={inputRef}
                  type="text"
                  className={cn(
                    "inset-0 w-full cursor-pointer text-center text-[45px] font-semibold tracking-tight text-transparent caret-[#000000] outline-none bg-transparent border-none focus:ring-0 focus:outline-none custom-selection",
                    amount === "" && "caret-transparent",
                  )}
                  placeholder="0"
                  value={amount}
                  onChange={handleInputChange}
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <AnimatePresence initial={false} mode="popLayout">
                    {digits.map((digit, index) => (
                      <motion.span
                        key={`${digit}-${index}`}
                        className="text-[45px] font-semibold tracking-tight text-[#000000]"
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: "0%", opacity: 1 }}
                        exit={{ y: "100%", opacity: 0 }}
                      >
                        {digit}
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* USD Value / Insufficient warnings */}
              <div className="flex w-full items-center justify-center gap-2">
                <AnimatePresence initial={false} mode="popLayout">
                  {!isInsufficient ? (
                    <motion.div
                      key="usd-value"
                      style={{ transformOrigin: "top center" }}
                      initial={{ opacity: 0, y: "100%", scale: 0 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0 }}
                      className="flex items-center justify-center gap-2 text-[#000000]"
                    >
                      <div className="rounded-full bg-[#f5f5f5] p-1 border border-[#e5e5e5]">
                        <Equal className="size-4 text-[#737373]" />
                      </div>
                      <motion.div
                        animate={{ width: bounds2.width }}
                        className="flex items-center gap-2 overflow-hidden"
                      >
                        <div
                          ref={ref2}
                          className="text-sm flex justify-between font-semibold tracking-tight text-[#000000]"
                        >
                          <span>$</span>
                          {(() => {
                            const charCount: Record<string, number> = {};
                            return usdValue
                              .toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                              .split("")
                              .map((char) => {
                                charCount[char] = (charCount[char] || 0) + 1;
                                const isDuplicate = charCount[char] > 1;
                                const key = isDuplicate
                                  ? `usd-${char}-dupChar-${charCount[char]}`
                                  : `usd-${char}`;
                                return (
                                  <motion.span
                                    key={key}
                                    layoutId={key}
                                    className="inline-block"
                                  >
                                    {char}
                                  </motion.span>
                                );
                              });
                          })()}
                        </div>
                      </motion.div>
                    </motion.div>
                  ) : (
                    <motion.p
                      key="not-enough-balance"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        y: 0,
                        x: [0, -5, 5, -3, 3, 0],
                        transition: {
                          x: { delay: 0.2, times: [0, 0.2, 0.4, 0.6, 0.8, 1] },
                          type: "spring",
                          stiffness: 400,
                          damping: 35,
                        },
                      }}
                      exit={{ opacity: 0, scale: 0 }}
                      style={{ transformOrigin: "bottom center" }}
                      className="text-sm w-max text-center font-semibold tracking-tight text-red-655"
                    >
                      Not Enough USDC
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="absolute -bottom-6 rounded-full border border-[#e5e5e5] bg-[#ffffff] p-1.5 z-10 shadow-sm">
              <ChevronDown className="size-4 opacity-55 text-[#000000]" />
            </div>
          </div>

          {/* Bottom Card: Recipient Input */}
          <div className="flex w-[300px] flex-col items-start justify-start gap-4 rounded-3xl border border-[#e5e5e5] bg-[#ffffff] px-4 py-4 sm:w-[350px] text-[#000000]">
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full overflow-hidden bg-[#f5f5f5] flex items-center justify-center font-bold text-xs text-[#000000] border border-[#e5e5e5]">
                  <img
                    src={"/logo/sol.png"}
                    alt="solana logo"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-[#000000]">
                    Recipient
                  </h2>
                  <p className="text-[10px] text-[#737373]">Solana address</p>
                </div>
              </div>
              {recipientAddr.trim() && (
                <div className="text-[10px] font-semibold">
                  {checkingRecipient ? (
                    <span className="text-[#737373] animate-pulse">
                      Checking…
                    </span>
                  ) : recipientRegistered === true ? (
                    <span className="text-emerald-600">✓ On Umbra</span>
                  ) : recipientRegistered === false ? (
                    <span className="text-amber-500" title="Recipient must register on PSR before they can claim this payment">
                      Must register to claim
                    </span>
                  ) : null}
                </div>
              )}
            </div>

            <div className="w-full border-t border-[#e5e5e5]" />

            <input
              type="text"
              value={recipientAddr}
              onChange={(e) => setRecipientAddr(e.target.value)}
              placeholder="Solana wallet address…"
              className="w-full bg-transparent border-b border-[#e5e5e5] py-1 text-sm text-[#000000] placeholder-neutral-300 focus:outline-none focus:border-neutral-800 font-mono transition-all"
              required
            />
            {recipientRegistered === false && !checkingRecipient && (
              <p className="text-[10px] text-[#737373] leading-relaxed">
                Recipient hasn&apos;t registered on PSR yet. They&apos;ll need to connect their wallet and register with Umbra before they can claim this payment.
              </p>
            )}
          </div>

          {/* Sender Umbra Status */}
          {connectedWallet && (
            <div className="flex w-[300px] sm:w-[350px] items-center justify-between rounded-2xl border border-[#e5e5e5] bg-[#f5f5f5] px-3.5 py-2.5 text-xs text-[#000000] transition-all hover:bg-neutral-100">
              <div className="flex items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    umbra.status === "ready"
                      ? umbra.isRegistered
                        ? "bg-emerald-500"
                        : "bg-amber-500"
                      : "bg-[#737373] animate-pulse"
                  }`}
                />
                <span className="text-xs text-[#737373]">
                  {umbra.status === "ready" &&
                    (umbra.isRegistered
                      ? "Registered on Umbra"
                      : "Ready to Register")}
                  {umbra.status === "initializing" && "Connecting…"}
                  {umbra.status === "registering" && "Registering…"}
                </span>
              </div>
              {umbra.status === "ready" && !umbra.isRegistered && (
                <button
                  type="button"
                  onClick={umbra.register}
                  className="text-[10px] font-semibold text-[#000000] underline hover:no-underline cursor-pointer bg-transparent border-none transition-all hover:scale-[1.02]"
                >
                  Register
                </button>
              )}
            </div>
          )}

          {/* Error Alert Box */}
          {sendError && (
            <div className="w-[300px] sm:w-[350px] p-3 rounded-2xl border border-red-100 bg-red-50 text-xs text-red-600 text-center leading-relaxed">
              {sendError}
            </div>
          )}

          {/* Connect Warning */}
          {!connectedWallet && (
            <p className="text-xs text-[#737373] text-center py-1">
              Please connect your wallet to make payments.
            </p>
          )}

          {/* Action Button */}
          <button
            type="submit"
            disabled={
              sending ||
              !recipientAddr.trim() ||
              !amount.trim() ||
              !connectedWallet ||
              !umbra.isRegistered ||
              isInsufficient
            }
            className="w-[300px] sm:w-[350px] rounded-full bg-[#000000] hover:bg-[#1a1a1a] py-3 text-sm font-semibold text-[#ffffff] transition-all active:scale-[0.98] disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 border border-[#000000] shadow-sm hover:shadow-md"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[#ffffff]" />
                <span>{sendStep}</span>
              </>
            ) : connectedWallet ? (
              <>
                <span>Send Private USDC</span>
                <ArrowRight className="h-4 w-4 text-[#ffffff]" />
              </>
            ) : (
              <span>Connect Wallet First</span>
            )}
          </button>

          {/* Clear Fields button */}
          {(amount || recipientAddr) && (
            <button
              type="button"
              onClick={() => {
                setAmount("");
                setRecipientAddr("");
              }}
              className="text-xs text-[#737373] hover:text-[#000000] transition-colors cursor-pointer mt-1 bg-transparent border-none"
            >
              Clear fields
            </button>
          )}
        </form>
      </div>
    </MotionConfig>
  );
}
