"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Cog,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  ChevronLeft as BackIcon,
} from "lucide-react";
import { api } from "@/lib/api";

export default function CustomerPointsFixPage() {
  const router = useRouter();
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await api.get("/customers");
      return res.data?.data || [];
    },
  });

  const fixMutation = useMutation({
    mutationFn: async (payload: { customer_id?: string; process_all: boolean }) => {
      return await api.post("/sales/points/fix", payload);
    },
    onSuccess: (res: any) => {
      setSuccessMsg(res.data?.message || "Proses perbaikan point berhasil dijalankan!");
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || err.message || "Gagal melakukan perbaikan point");
      setSuccessMsg(null);
    },
  });

  return (
    <div className="flex flex-col h-full min-h-0 space-y-2 text-xs select-none">
      {/* 1. TOP HEADER BAR */}
      <div className="shrink-0 flex items-center justify-between border-b border-slate-200 pb-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-slate-600 hover:text-slate-900"
          >
            <BackIcon className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-bold text-slate-800">
            Perbaikan Point Pelanggan
          </h1>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
          <span>APOTEK BERKAT PURNAMA [UTAMA]</span>
          <span className="w-4 h-4 bg-red-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
            33
          </span>
          <span className="w-5 h-5 bg-emerald-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
            A
          </span>
          <span>ADMIN2</span>
        </div>
      </div>

      {/* 2. NOTICE BANNER (Yellow Cream matching Image 10) */}
      <div className="shrink-0 bg-[#fff9e6] border border-[#ffe082] text-[#8d6e19] p-3 rounded space-y-1.5 text-[11px] leading-relaxed shadow-2xs">
        <div className="flex items-center gap-1.5 font-bold text-[#b7791f]">
          <Lightbulb className="w-4 h-4 text-[#e6a817]" />
          <span>KETERANGAN:</span>
        </div>
        <ol className="list-decimal list-inside space-y-1 pl-1">
          <li>
            Proses Perbaikan Point Pelanggan adalah proses perhitungan nilai point berdasarkan data transaksi penjualan pelanggan dari awal periode sampai sekarang.
          </li>
          <li>
            Proses ini sebaiknya dilakukan pada saat tidak ada aktivitas/tutup toko.
          </li>
        </ol>
      </div>

      {/* 3. NOTIFICATION MESSAGES */}
      {successMsg && (
        <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 flex items-center gap-2 text-[11px]">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-2.5 bg-red-50 text-red-800 rounded border border-red-200 flex items-center gap-2 text-[11px]">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* 4. FORM AND PROCESS BUTTONS (Matching Image 10) */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        <div className="bg-white p-4 rounded border border-slate-200 shadow-2xs space-y-4 max-w-xl text-[11px]">
          <div className="space-y-1">
            <label className="block text-slate-700 font-semibold">
              Pelanggan :
            </label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full h-7 px-2.5 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">Select...</option>
              {customers.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code || "CUST"})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            {/* Proses button */}
            <button
              type="button"
              disabled={!selectedCustomer || fixMutation.isPending}
              onClick={() =>
                fixMutation.mutate({
                  customer_id: selectedCustomer,
                  process_all: false,
                })
              }
              className="h-6 px-3 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1.5 shadow-2xs transition active:scale-95 disabled:opacity-50"
            >
              <Cog className="w-3.5 h-3.5" />
              <span>{fixMutation.isPending ? "Memproses..." : "Proses"}</span>
            </button>

            {/* Proses Semua Pelanggan button */}
            <button
              type="button"
              disabled={fixMutation.isPending}
              onClick={() =>
                fixMutation.mutate({
                  process_all: true,
                })
              }
              className="h-6 px-3 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1.5 shadow-2xs transition active:scale-95 disabled:opacity-50"
            >
              <Cog className="w-3.5 h-3.5" />
              <span>{fixMutation.isPending ? "Memproses..." : "Proses Semua Pelanggan"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
