import NavLinks from "@/components/nav-links";
import WalletButton from "@/components/wallet-button";

export default function Topbar() {
  return (
    <header className="h-16 shrink-0 flex items-center justify-center px-6 mt-6 w-full">
      <div className="flex items-center gap-3.5 border border-neutral-250/70 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <NavLinks />
        <div className="h-4 w-px bg-neutral-200" />
        <WalletButton />
      </div>
    </header>
  );
}
