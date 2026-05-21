"use client";
import { PrivyClientConfig, PrivyProvider } from "@privy-io/react-auth";
import {
  toSolanaWalletConnectors,
  defaultSolanaRpcsPlugin,
} from "@privy-io/react-auth/solana";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useState } from "react";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID!;

const privyConfig: PrivyClientConfig = {
  appearance: {
    theme: "light",
    walletChainType: "solana-only",
    walletList: ["detected_solana_wallets"],
  },
  loginMethods: ["wallet"],
  // No embedded wallets — users connect their own Phantom/Solflare/etc
  externalWallets: {
    solana: {
      connectors: toSolanaWalletConnectors(),
    },
  },
  // Provide default Solana RPCs so Privy doesn't error on missing chain config
  plugins: [defaultSolanaRpcsPlugin()],
};

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <PrivyProvider appId={PRIVY_APP_ID} config={privyConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: '#111',
              border: '1px solid #222',
              color: '#fff',
              borderRadius: '12px',
            },
          }}
        />
      </QueryClientProvider>
    </PrivyProvider>
  );
}
