import Topbar from "@/components/topbar";
import UmbraGate from "@/components/umbra-gate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen items-center bg-black overflow-hidden">
      <Topbar />
      <main className="flex-1 overflow-y-auto p-6">
        <UmbraGate>{children}</UmbraGate>
      </main>
    </div>
  );
}
