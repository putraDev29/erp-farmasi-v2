"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft as BackIcon,
  Settings as ProcessIcon,
  Lightbulb,
  CheckCircle2,
} from "lucide-react";
import { api } from "@/lib/api";

export default function FixBalancePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [warehouseId, setWarehouseId] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await api.get("/warehouses");
      return res.data?.data || [];
    },
  });

  React.useEffect(() => {
    if (warehouses.length > 0 && !warehouseId) {
      setWarehouseId(warehouses[0].id);
    }
  }, [warehouses, warehouseId]);

  const fixMutation = useMutation({
    mutationFn: async () => {
      return await api.post("/inventory/fix-balances", {
        warehouse_id: warehouseId || undefined,
      });
    },
    onSuccess: () => {
      setIsSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["inventory-balances"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      alert("Proses perbaikan saldo persediaan berhasil dijalankan.");
    },
    onError: (err: any) => {
      alert("Gagal melakukan perbaikan saldo: " + (err.response?.data?.message || err.message));
    },
  });

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none">
      {/* 1. Header */}
      <div className="shrink-0 flex items-center justify-between border-b border-slate-200 pb-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-slate-600 hover:text-slate-900"
            title="Kembali"
          >
            <BackIcon className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-bold text-slate-800">
            Proses Perbaikan Saldo
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

      {/* 2. Petunjuk & Informasi Penjelasan */}
      <div className="shrink-0 bg-slate-50 border border-slate-300 rounded p-2.5 text-[11px] space-y-1 text-slate-700 shadow-2xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-800">
          <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
          <span>KETERANGAN :</span>
        </div>
        <ol className="list-decimal list-inside space-y-0.5 text-slate-600 pl-1 leading-relaxed text-[10.5px]">
          <li>
            Proses Perbaikan Saldo adalah proses perhitungan ulang data persediaan secara menyeluruh berdasarkan mutasi transaksi.
          </li>
          <li>
            Apabila terdapat perbedaan antara kartu stok dan saldo fisik, jalankan proses ini agar saldo stok sinkron kembali. Disarankan dilakukan saat aktivitas transaksi sedang tidak padat.
          </li>
        </ol>
      </div>

      {/* 3. Form Input Kode Kantor */}
      <div className="bg-white p-2.5 rounded border border-slate-300 space-y-2 shadow-2xs">
        <div className="max-w-md">
          <label className="block text-slate-600 font-semibold mb-0.5 text-[11px]">
            Kode Kantor :
          </label>
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500"
          >
            {warehouses.map((w: any) => (
              <option key={w.id} value={w.id}>
                {w.code} - {w.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <button
            type="button"
            onClick={() => fixMutation.mutate()}
            disabled={fixMutation.isPending}
            className="h-6 px-3 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1.5 shadow-2xs transition active:scale-95 disabled:opacity-50"
          >
            <ProcessIcon className="w-3 h-3" />
            <span>{fixMutation.isPending ? "Sedang Memproses..." : "Proses"}</span>
          </button>
        </div>
      </div>

      {isSuccess && (
        <div className="p-2 bg-emerald-50 border border-emerald-300 rounded flex items-center gap-2 text-[11px] text-emerald-800 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Proses kalkulasi ulang saldo persediaan selesai. Semua saldo buku dan mutasi telah disinkronkan.</span>
        </div>
      )}
    </div>
  );
}
