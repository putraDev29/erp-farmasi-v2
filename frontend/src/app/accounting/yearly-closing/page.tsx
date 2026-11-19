"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft as BackIcon,
  Lightbulb,
  Settings,
} from "lucide-react";
import { api } from "@/lib/api";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export default function YearlyClosingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [periode, setPeriode] = useState("Desember");
  const [tahun, setTahun] = useState("2026");

  const closingMutation = useMutation({
    mutationFn: async () => {
      return await api.post("/accounting/yearly-closing", {
        year: Number(tahun),
      });
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries();
      alert(`Proses tutup tahun periode ${tahun} berhasil diproses.`);
    },
    onError: (err: any) => {
      alert("Gagal melakukan proses tahunan: " + (err.response?.data?.message || err.message));
    },
  });

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none bg-[#fafbfc]">
      {/* 1. Header */}
      <div className="shrink-0 flex items-center justify-between border-b border-slate-200 pb-1 px-1">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-slate-600 hover:text-slate-900"
            title="Kembali"
          >
            <BackIcon className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-bold text-slate-800">Proses Tahunan</h1>
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

      {/* 2. Notice Box (Screenshot 7: KETERANGAN with Lightbulb) */}
      <div className="shrink-0 bg-[#eff6ff] border border-blue-200 p-2.5 rounded text-[11px] text-slate-800 space-y-1 shadow-2xs">
        <div className="flex items-center gap-1.5 font-bold text-amber-700">
          <Lightbulb className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span>KETERANGAN :</span>
        </div>
        <ol className="list-decimal list-inside space-y-0.5 text-slate-700 pl-1">
          <li>Tutup Tahun adalah proses penutupan data transaksi dan pemindahan saldo akhir ke saldo awal pada periode tahun berikutnya.</li>
          <li>Proses ini dapat dilakukan setiap saat, jika anda membutuhkan informasi Persediaan, Jurnal, dan Laporan yang berkaitan dengan Akuntansi.</li>
          <li>Apabila terdapat perubahan data pada bulan yang telah berlalu maka anda diwajibkan untuk melakukan proses tutup tahun.</li>
          <li>Apabila terdapat stok minus maka anda diwajibkan untuk melakukan opname stok.</li>
        </ol>
      </div>

      {/* 3. Form Inputs (Screenshot 7: Periode, Tahun, Periode Akuntansi, Proses) */}
      <div className="shrink-0 bg-white p-3 rounded border border-slate-300 space-y-2.5 text-[11px] shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Periode :</label>
            <select
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded bg-white text-[11px] focus:outline-none focus:border-sky-500"
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Tahun :</label>
            <input
              type="number"
              value={tahun}
              onChange={(e) => setTahun(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div className="text-[11px] font-semibold text-slate-600 pt-1">
          Periode Akuntansi 01/01/{tahun} sampai 31/12/{tahun}
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              if (confirm(`Jalankan proses tutup tahun untuk periode tahun ${tahun}?`)) {
                closingMutation.mutate();
              }
            }}
            disabled={closingMutation.isPending}
            className="h-6 px-3 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-50"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{closingMutation.isPending ? "Memproses..." : "Proses"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
