"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  AlertTriangle,
  ChevronLeft as BackIcon,
  RefreshCw,
  Smartphone,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";

export default function MarketplaceHistoryPage() {
  const router = useRouter();

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 60);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [marketplace, setMarketplace] = useState("");

  const { data: history = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["marketplace-history", startDate, endDate, marketplace],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      if (marketplace) {
        if (marketplace === "Mobile App") params.append("source", "MOBILE");
        else params.append("source", marketplace);
      }
      params.append("type", "MARKETPLACE");
      params.append("status", "SELESAI");

      const res = await api.get(`/sales/orders?${params.toString()}`);
      return res.data?.data || [];
    },
    refetchInterval: 5000,
  });

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none">
      {/* 1. TOP HEADER BAR */}
      <div className="shrink-0 flex items-center justify-between border-b border-slate-200 pb-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <BackIcon className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span>History Pesanan Marketplace &amp; Mobile</span>
            </h1>
            <p className="text-[10px] text-slate-400">
              Riwayat transaksi pesanan marketplace dan mobile yang telah selesai
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
          <span>APOTEK BERKAT PURNAMA [UTAMA]</span>
        </div>
      </div>

      {/* 2. NOTICE BANNER */}
      <div className="shrink-0 bg-[#fff9e6] border border-[#ffe082] text-[#8d6e19] px-3 py-1.5 rounded flex items-start gap-2 text-[11px] leading-tight">
        <AlertTriangle className="w-4 h-4 text-[#e6a817] shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold text-[#b7791f]">INFORMASI:</strong>
          <p className="mt-0.5">
            Menampilkan seluruh transaksi pesanan obat dari Aplikasi Mobile Apotek dan Marketplace yang telah selesai diverifikasi, dikirim, dan diterima oleh pelanggan.
          </p>
        </div>
      </div>

      {/* 3. FILTER ROW */}
      <div className="shrink-0 flex flex-wrap items-center gap-3 bg-white p-2 rounded border border-slate-200 shadow-2xs text-[11px]">
        <div className="flex items-center gap-1.5">
          <label className="text-slate-600 font-semibold whitespace-nowrap">Tanggal Dari :</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-6 px-2 border border-slate-300 rounded text-[11px] w-36 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-slate-600 font-semibold whitespace-nowrap">Tanggal Sampai :</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-6 px-2 border border-slate-300 rounded text-[11px] w-36 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
          <label className="text-slate-600 font-semibold whitespace-nowrap">Marketplace / Sumber :</label>
          <select
            value={marketplace}
            onChange={(e) => setMarketplace(e.target.value)}
            className="h-6 px-2 border border-slate-300 rounded text-[11px] bg-white flex-1 focus:outline-none focus:border-emerald-500 text-slate-700 cursor-pointer"
          >
            <option value="">Semua Sumber</option>
            <option value="Mobile App">Mobile App Apotek</option>
            <option value="Shopee">Shopee</option>
            <option value="Tokopedia">Tokopedia</option>
            <option value="TikTok Shop">TikTok Shop</option>
            <option value="Lazada">Lazada</option>
          </select>
        </div>

        {/* Cari / Refresh button */}
        <button
          type="button"
          onClick={() => refetch()}
          className="h-6 px-3 bg-[#4ba3e3] hover:bg-[#388ecf] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 4. TABLE SECTION */}
      <div className="flex-1 min-h-0 bg-white border border-slate-300 rounded overflow-auto shadow-2xs">
        <table className="w-full text-[11px] text-left border-collapse whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10 shadow-2xs h-6">
            <tr>
              <th className="py-0.5 px-2.5 border-r border-slate-200">No. Transaksi</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">No. SP / Nota</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Platform</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Pemesan (Apotek/Sarana)</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-center">Status Pesanan</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Tanggal Selesai</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Kurir / Surat Jalan</th>
              <th className="py-0.5 px-2.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <RefreshCw className="w-5 h-5 text-sky-500 animate-spin" />
                    <span>Memuat riwayat transaksi marketplace...</span>
                  </div>
                </td>
              </tr>
            ) : history.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-24 text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <Smartphone className="w-8 h-8 text-slate-300" />
                    <span className="font-medium text-slate-500">Belum ada riwayat pesanan marketplace yang selesai.</span>
                  </div>
                </td>
              </tr>
            ) : (
              history.map((h: any) => (
                <tr key={h.id} className="border-b border-slate-100 hover:bg-slate-50/80 h-6">
                  <td className="py-0.5 px-2.5 border-r border-slate-100 font-mono text-emerald-700 font-semibold">
                    {h.order_no}
                  </td>
                  <td className="py-0.5 px-2.5 border-r border-slate-100 font-mono text-slate-600">
                    {h.marketplace_order_no || h.customer_sp_number || "-"}
                  </td>
                  <td className="py-0.5 px-2.5 border-r border-slate-100">
                    <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded text-[10px] font-bold">
                      {h.source === "MOBILE" || h.source === "MARKETPLACE" ? "Mobile App" : h.source || "Marketplace"}
                    </span>
                  </td>
                  <td className="py-0.5 px-2.5 border-r border-slate-100 font-medium text-slate-800 max-w-[200px] truncate">
                    {h.customer?.name || h.marketplace_store || "Pelanggan Mobile"}
                  </td>
                  <td className="py-0.5 px-2.5 border-r border-slate-100 text-center">
                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-300 rounded text-[10px] font-semibold">
                      {h.status || "SELESAI"}
                    </span>
                  </td>
                  <td className="py-0.5 px-2.5 border-r border-slate-100 text-slate-500">
                    {formatDate(h.received_date || h.date)}
                  </td>
                  <td className="py-0.5 px-2.5 border-r border-slate-100 text-slate-600">
                    {h.delivery_courier || h.delivery_order_no || "Kurir Apotek"}
                  </td>
                  <td className="py-0.5 px-2.5 text-right font-mono font-bold text-slate-800">
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
