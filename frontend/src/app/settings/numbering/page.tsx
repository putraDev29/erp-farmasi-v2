"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NumberingRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings/numbering/transactions");
  }, [router]);

  return (
    <div className="p-8 text-center text-slate-400 text-xs">
      Mengarahkan ke Setting Nomor Transaksi...
    </div>
  );
}
