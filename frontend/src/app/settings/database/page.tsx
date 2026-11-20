"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check, Lightbulb, Settings2, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function DatabaseSettingsPage() {
  const router = useRouter();
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const actionMutation = useMutation({
    mutationFn: async (actionType: "vacuum_standard" | "vacuum_full" | "reindex") => {
      return await api.post("/settings/database/vacuum", { action: actionType });
    },
    onSuccess: (_, actionType) => {
      const label =
        actionType === "vacuum_standard"
          ? "Vacuum Standard"
          : actionType === "vacuum_full"
          ? "Vacuum Full"
          : "Re Index";
      setToastMsg(`Proses ${label} database berhasil diselesaikan!`);
      setTimeout(() => setToastMsg(null), 3500);
    },
    onError: () => {
      setToastMsg("Gagal menjalankan perintah pemeliharaan database.");
      setTimeout(() => setToastMsg(null), 3500);
    },
  });

  const handleAction = (actionType: "vacuum_standard" | "vacuum_full" | "reindex") => {
    const label =
      actionType === "vacuum_standard"
        ? "Vacuum Standard"
        : actionType === "vacuum_full"
        ? "Vacuum Full"
        : "Re Index";
    setToastMsg(`Sedang menjalankan proses ${label}...`);
    actionMutation.mutate(actionType);
  };

  return (
    <div className="flex flex-col h-full bg-white text-slate-800 text-xs select-none">
      {toastMsg && (
        <div className="fixed top-12 right-6 z-50 px-4 py-2 rounded shadow-md bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* SUB-HEADER / TITLE BAR */}
      <div className="h-10 px-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="text-slate-600 hover:text-slate-800 flex items-center text-xs"
          >
            <ChevronLeft className="w-4 h-4 mr-0.5" />
            <span className="font-semibold text-sm text-slate-800">Pengaturan Database</span>
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="font-medium">APOTEK BERKAT PURNAMA [UTAMA]</span>
          <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold">
            33
          </span>
          <div className="flex items-center gap-1 text-emerald-600 font-semibold">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
              A
            </span>
            <span>ADMIN2</span>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="p-4 bg-[#f0f5ff] border border-[#d6e4ff] rounded shadow-2xs space-y-4 max-w-6xl">
          {/* INFORMASI HEADER */}
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
            <span>INFORMASI :</span>
          </div>

          {/* EXPLANATIONS */}
          <div className="space-y-1 text-[11px] text-slate-700 leading-relaxed pl-1">
            <p>
              <span className="font-semibold text-slate-800">Vacuum Standard :</span>{" "}
              Merampingkan ukuran database, dengan menghapus hasil proses perhitungan database yang tidak berguna. Sehingga akan dapat mempercepat kinerja database.
            </p>
            <p>
              <span className="font-semibold text-slate-800">Vacuum Full :</span>{" "}
              Sama seperti vaccum standard, pada facuum full prosesnya lebih lama.
            </p>
            <p>
              <span className="font-semibold text-slate-800">ReIndex :</span>{" "}
              Membuat index ulang yaitu mengatur index data sehingga menunjang algoritma dari database agar lebih cepat dalam pencarian data.
            </p>
            <p className="pt-2 text-slate-600 font-medium">
              Lakukan proses ini ketika sudah tidak ada transaksi yang sedang berlangsung atau saat tutup toko.
            </p>
          </div>

          {/* BUTTONS ROW */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => handleAction("vacuum_standard")}
              disabled={actionMutation.isPending}
              type="button"
              className="h-8 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
            >
              <Settings2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Vacuum Standard</span>
            </button>

            <button
              onClick={() => handleAction("vacuum_full")}
              disabled={actionMutation.isPending}
              type="button"
              className="h-8 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
            >
              <Settings2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Vacuum Full</span>
            </button>

            <button
              onClick={() => handleAction("reindex")}
              disabled={actionMutation.isPending}
              type="button"
              className="h-8 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
            >
              <Settings2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Re Index</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
