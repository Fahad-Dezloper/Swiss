import Logo from "@/components/logo";
import NavLinks from "@/components/nav-links";
import WalletButton from "@/components/wallet-button";

export default function Topbar() {
  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-[#222] bg-black">
      <div className="flex items-center gap-6">
        <Logo />
        <NavLinks />
      </div>
      <WalletButton />
    </header>
  );
}
