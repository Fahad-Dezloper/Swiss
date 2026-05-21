import Link from "next/link";
import { LockKeyhole } from "lucide-react";

export default function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <div className="h-6 w-6 rounded bg-white flex items-center justify-center shrink-0">
        <LockKeyhole className="h-3.5 w-3.5 text-black" />
      </div>
      <div>
        <p className="text-white font-semibold tracking-tight text-sm leading-none">
          Swiss
        </p>
        <p className="text-[#555] text-[10px] leading-none mt-0.5">
          Private Payroll
        </p>
      </div>
    </Link>
  );
}
