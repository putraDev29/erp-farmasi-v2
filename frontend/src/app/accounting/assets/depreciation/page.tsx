"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft as BackIcon,
  Printer,
  Settings,
  AlertTriangle,
  List,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";

export default function AssetDepreciationPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [tglProses, setTglProses] = useState("2026-11-18");

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["fixed-assets"],
    queryFn: async () => {
      const res = await api.get("/accounting/fixed-assets");
      return res.data?.data || [];
    },
  });

  const depreciateMutation = useMutation({
    mutationFn: async () => {
      return await api.post("/accounting/assets/depreciate", {});
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["fixed-assets"] });
      queryClient.invalidateQueries({ queryKey: ["journals"] });
      alert(
        `Proses penyusutan berhasil!\n${res.data?.data?.assets_processed || 0} aset telah disusutkan sejumlah ${formatCurrency(
          res.data?.data?.total_amount || 0
        )}.`
      );
    },
    onError: (err: any) => {
      alert("Gagal memproses penyusutan: " + (err.response?.data?.message || err.message));
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
          <h1 className="text-sm font-bold text-slate-800">Proses Penyusutan</h1>
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

      {/* 2. Top Filter Controls (Screenshot 6: Tanggal, Proses, List Proses, Cetak) */}
      <div className="shrink-0 bg-white p-2 rounded border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-end gap-2 text-[11px]">
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Tanggal :</label>
            <input
              type="date"
              value={tglProses}
              onChange={(e) => setTglProses(e.target.value)}
              className="w-40 h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-sky-500"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              if (confirm("Jalankan proses penyusutan aset untuk periode bulan ini?")) {
                depreciateMutation.mutate();
              }
            }}
            disabled={depreciateMutation.isPending}
            className="h-6 px-3 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-50"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{depreciateMutation.isPending ? "Memproses..." : "Proses"}</span>
          </button>

          <button
            type="button"
            onClick={() => router.push("/accounting/assets")}
            className="h-6 px-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition"
          >
            <List className="w-3.5 h-3.5 text-slate-600" />
            <span>List Proses</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="h-6 px-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Cetak</span>
          </button>
        </div>
      </div>

      {/* 3. Yellow Alert Notice (Screenshot 6) */}
      <div className="shrink-0 bg-[#fffbeb] border border-amber-300 px-3 py-1.5 rounded flex items-center gap-2 text-[11px] text-amber-900 shadow-2xs">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <span>
          <strong>Penting:</strong> Proses Penyusutan dilakukan per bulan, pilih salah satu tanggal untuk mewakili bulan tersebut.
        </span>
      </div>

      {/* 4. Table (Screenshot 6: Kode Aset | Nama Aset | Tgl Perolehan | Umur (Tahun) | Jml Aset | Nilai Aset | Total | Akum. Penyusutan (Proses) | Nilai Sisa) */}
      <div className="flex-1 min-h-0 bg-white border border-slate-300 rounded overflow-auto shadow-2xs">
        <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
          <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 h-6 shadow-2xs">
            <tr>
              <th className="py-0.5 px-3 border-r border-slate-200 w-36">Kode Aset</th>
              <th className="py-0.5 px-3 border-r border-slate-200">Nama Aset</th>
              <th className="py-0.5 px-3 border-r border-slate-200 w-32">Tgl Perolehan</th>
              <th className="py-0.5 px-3 border-r border-slate-200 text-center w-28">Umur (Tahun)</th>
              <th className="py-0.5 px-3 border-r border-slate-200 text-right w-24">Jml Aset</th>
              <th className="py-0.5 px-3 border-r border-slate-200 text-right w-32">Nilai Aset</th>
              <th className="py-0.5 px-3 border-r border-slate-200 text-right w-32">Total</th>
              <th className="py-0.5 px-3 border-r border-slate-200 text-right w-44">Akum. Penyusutan (Proses)</th>
              <th className="py-0.5 px-3 text-right w-36">Nilai Sisa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="py-16 text-center text-slate-400">
                  Memuat data aset untuk disusutkan...
                </td>
              </tr>
            ) : assets.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-20 text-center text-slate-400 font-normal">
                  No data
                </td>
              </tr>
            ) : (
              assets.map((a: any) => {
                const years = Math.round((a.useful_life_months || 0) / 12);
                return (
                  <tr key={a.id} className="h-6 hover:bg-slate-50 transition">
                    <td className="py-0.5 px-3 font-mono font-semibold text-blue-700 border-r border-slate-200">
                      {a.asset_code}
                    </td>
                    <td className="py-0.5 px-3 border-r border-slate-200">
                      {a.name}
                    </td>
                    <td className="py-0.5 px-3 border-r border-slate-200">
                      {formatDate(a.acquisition_date)}
                    </td>
                    <td className="py-0.5 px-3 text-center border-r border-slate-200">
                      {years}
                    </td>
                    <td className="py-0.5 px-3 text-right font-mono border-r border-slate-200">
                      1.00
                    </td>
                    <td className="py-0.5 px-3 text-right font-mono font-bold text-slate-800 border-r border-slate-200">
                      {formatCurrency(a.acquisition_cost)}
                    </td>
                    <td className="py-0.5 px-3 text-right font-mono font-bold text-slate-800 border-r border-slate-200">
                      {formatCurrency(a.acquisition_cost)}
                    </td>
                    <td className="py-0.5 px-3 text-right font-mono font-semibold text-rose-700 border-r border-slate-200">
                      {formatCurrency(a.accumulated_deprec || 0)}
                    </td>
                    <td className="py-0.5 px-3 text-right font-mono font-bold text-emerald-700">
                      {formatCurrency(a.book_value || a.acquisition_cost)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
