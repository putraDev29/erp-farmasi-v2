"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ImportRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings/import/supplier");
  }, [router]);

  return (
    <div className="p-8 text-center text-slate-400 text-xs">
      Mengarahkan ke Import Data Supplier...
    </div>
  );
}
