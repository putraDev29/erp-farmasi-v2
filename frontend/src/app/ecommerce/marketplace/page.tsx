"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  AlertTriangle,
  ChevronLeft as BackIcon,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";

export default function MarketplaceHistoryPage() {
  const router = useRouter();

  // Filters matching Ketoko Spec (Image 3)
  const [startDate, setStartDate] = useState("2026-11-01 00:00:00");
  const [endDate, setEndDate] = useState("2026-11-15 23:59:59");
  const [marketplace, setMarketplace] = useState("");

  const { data: history = [], isLoading, refetch } = useQuery({
    queryKey: ["marketplace-history", startDate, endDate, marketplace],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      params.append("type", "MARKETPLACE");

      const res = await api.get(`/sales?${params.toString()}`);
      return res.data?.data || [];
    },
  });

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none">
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
            History Pesanan Marketplace
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

      {/* 2. IMPORTANT NOTICE BANNER (Yellowish cream matching screenshot) */}
      <div className="shrink-0 bg-[#fff9e6] border border-[#ffe082] text-[#8d6e19] px-3 py-1.5 rounded flex items-start gap-2 text-[11px] leading-tight">
        <AlertTriangle className="w-4 h-4 text-[#e6a817] shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold text-[#b7791f]">PENTING:</strong>
          <p className="mt-0.5">
            1. Shopee hanya bisa menampilkan transaksi dalam interval waktu 15 hari, pastikan untuk menentukan Filter Tanggal dengan benar. (Contoh : 2026-11-01 00:00:00 s/d 2026-11-15 23:59:59)
          </p>
        </div>
      </div>

      {/* 3. FILTER ROW */}
      <div className="shrink-0 flex flex-wrap items-center gap-3 bg-white p-2 rounded border border-slate-200 shadow-2xs text-[11px]">
        <div className="flex items-center gap-1.5">
          <label className="text-slate-600 font-semibold whitespace-nowrap">Tanggal Dari :</label>
          <input
            type="text"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-6 px-2 border border-slate-300 rounded text-[11px] w-40 focus:outline-none focus:border-emerald-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-slate-600 font-semibold whitespace-nowrap">Tanggal Sampai :</label>
          <input
            type="text"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-6 px-2 border border-slate-300 rounded text-[11px] w-40 focus:outline-none focus:border-emerald-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
          <label className="text-slate-600 font-semibold whitespace-nowrap">Marketplace :</label>
          <select
            value={marketplace}
            onChange={(e) => setMarketplace(e.target.value)}
            className="h-6 px-2 border border-slate-300 rounded text-[11px] bg-white flex-1 focus:outline-none focus:border-emerald-500 text-slate-500"
          >
            <option value="">Select...</option>
            <option value="Shopee">Shopee</option>
            <option value="Tokopedia">Tokopedia</option>
            <option value="TikTok Shop">TikTok Shop</option>
            <option value="Lazada">Lazada</option>
          </select>
        </div>

        {/* Cari button (Sky blue like screenshot) */}
        <button
          type="button"
          onClick={() => refetch()}
          className="h-6 px-3 bg-[#4ba3e3] hover:bg-[#388ecf] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Cari</span>
        </button>
      </div>

      {/* 4. TABLE SECTION (7 Columns matching Image 3) */}
      <div className="flex-1 min-h-0 bg-white border border-slate-300 rounded overflow-auto shadow-2xs">
        <table className="w-full text-[11px] text-left border-collapse whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10 shadow-2xs h-6">
            <tr>
              <th className="py-0.5 px-2.5 border-r border-slate-200">No Nota (Marketplace)</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Marketplace</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Nama Toko</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Status Pesanan</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Tanggal</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Kurir</th>
              <th className="py-0.5 px-2.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  Memuat riwayat marketplace...
                </td>
              </tr>
            ) : history.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-24 text-slate-400">
                  No data
                </td>
              </tr>
            ) : (
              history.map((h: any) => (
                <tr key={h.id} className="border-b border-slate-100 hover:bg-slate-50/80 h-6">
                  <td className="py-0.5 px-2.5 border-r border-slate-100 font-mono text-emerald-700 font-semibold">
                    {h.invoice_no}
                  </td>
                  <td className="py-0.5 px-2.5 border-r border-slate-100">
                    <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-bold">
                      Shopee
                    </span>
                  </td>
                  <td className="py-0.5 px-2.5 border-r border-slate-100">
                    Apotek Berkat Official
                  </td>
                  <td className="py-0.5 px-2.5 border-r border-slate-100">
                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-semibold">
                      COMPLETED
                    </span>
                  </td>
                  <td className="py-0.5 px-2.5 border-r border-slate-100">
                    {formatDate(h.date)}
                  </td>
                  <td className="py-0.5 px-2.5 border-r border-slate-100">
                    J&T Express
                  </td>
                  <td className="py-0.5 px-2.5 text-right font-bold text-slate-800">
                    {formatCurrency(h.total_amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
