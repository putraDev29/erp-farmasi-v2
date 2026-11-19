"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SettingsIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings/roles");
  }, [router]);

  return (
    <div className="p-8 text-center text-slate-400 text-xs">
      Mengarahkan ke Kelompok Akses User...
    </div>
  );
}
