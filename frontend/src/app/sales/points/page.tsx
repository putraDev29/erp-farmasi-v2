"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Cog,
  Plus,
  Trash2,
  Search,
  ChevronLeft as BackIcon,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";

export default function SalesPointsPage() {
  const router = useRouter();

  // Filters matching Ketoko Spec (Image 9)
  const [startDate, setStartDate] = useState("2026-11-01");
  const [endDate, setEndDate] = useState("2026-11-30");
  const [customerId, setCustomerId] = useState("");
  const [isProcessed, setIsProcessed] = useState(false);

  // Queries
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await api.get("/customers");
      return res.data?.data || [];
    },
  });

  const { data: pointData, isLoading, refetch } = useQuery({
    queryKey: ["customer-points", customerId, startDate, endDate],
    queryFn: async () => {
      if (!customerId) return { total_points_earned: 0, transactions: [] };
      const params = new URLSearchParams();
      params.append("customer_id", customerId);
      params.append("start_date", startDate);
      params.append("end_date", endDate);
      const res = await api.get(`/sales/points?${params.toString()}`);
      return res.data?.data || { total_points_earned: 0, transactions: [] };
    },
    enabled: !!customerId,
  });

  React.useEffect(() => {
    if (customers.length > 0 && !customerId) {
      setCustomerId(customers[0].id);
    }
  }, [customers, customerId]);

  const transactions = pointData?.transactions || [];
  const totalPoints = pointData?.total_points_earned || 0;

  const handleProcess = () => {
    setIsProcessed(true);
    refetch();
  };

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
            Point Penjualan
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

      {/* 2. FILTER SECTION (Matching Image 9) */}
      <div className="shrink-0 bg-white p-2.5 rounded border border-slate-200 shadow-2xs space-y-2 text-[11px]">
        {/* Row 1: Tanggal */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <label className="text-slate-600 font-semibold whitespace-nowrap">Tanggal Dari :</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-6 px-2 border border-slate-300 rounded text-[11px]"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-slate-600 font-semibold whitespace-nowrap">Tanggal Sampai :</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-6 px-2 border border-slate-300 rounded text-[11px]"
            />
          </div>
        </div>

        {/* Row 2: Pelanggan & Total Point */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5 min-w-[280px]">
            <label className="text-slate-600 font-semibold whitespace-nowrap">Pelanggan :</label>
            <div className="flex gap-1 flex-1">
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white text-slate-700"
              >
                {customers.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="h-6 w-6 border border-slate-300 rounded flex items-center justify-center text-slate-600 hover:bg-slate-50 shrink-0"
              >
                <Search className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-slate-600 font-semibold whitespace-nowrap">
              Total Point yang didapat :
            </label>
            <input
              type="text"
              value={totalPoints.toFixed(2)}
              disabled
              className="h-6 w-24 px-2 border border-slate-300 rounded text-right bg-slate-50 font-bold text-slate-800"
            />
          </div>
        </div>

        {/* Row 3: Action Button [Proses] */}
        <div>
          <button
            type="button"
            onClick={handleProcess}
            className="h-6 px-3 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95"
          >
            <Cog className="w-3.5 h-3.5" />
            <span>Proses</span>
          </button>
        </div>
      </div>

      {/* 3. TABLE SECTION (6 Columns Matching Image 9) */}
      <div className="flex-1 min-h-0 bg-white rounded border border-slate-200 overflow-auto shadow-2xs">
        <table className="w-full text-[11px] text-left border-collapse whitespace-nowrap">
          <thead className="sticky top-0 z-10 bg-slate-50 text-slate-700 font-bold border-b border-slate-200 h-6 shadow-2xs">
            <tr>
              <th className="py-0.5 px-2.5 border-r border-slate-200">No Transaksi</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Tipe Transaksi</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Tanggal</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-right">Total Transaksi</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-right">Point Transaksi</th>
              <th className="py-0.5 px-2.5">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {/* Saldo Awal row (Always present as in Image 9) */}
            <tr className="border-b border-slate-100 bg-slate-50/50 font-medium h-6">
              <td className="py-0.5 px-2.5 border-r border-slate-100 font-semibold">
                Saldo Awal
              </td>
              <td className="py-0.5 px-2.5 border-r border-slate-100">
                SA
              </td>
              <td className="py-0.5 px-2.5 border-r border-slate-100">
                01/11/2026
              </td>
              <td className="py-0.5 px-2.5 border-r border-slate-100 text-right">
                0.00
              </td>
              <td className="py-0.5 px-2.5 border-r border-slate-100 text-right font-bold text-emerald-700">
                0.00
              </td>
              <td className="py-0.5 px-2.5 text-slate-500">
                Saldo Awal
              </td>
            </tr>

            {transactions.map((tx: any, idx: number) => (
              <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 h-6">
                <td className="py-0.5 px-2.5 border-r border-slate-100 font-semibold text-emerald-700">
                  {tx.transaction_no}
                </td>
                <td className="py-0.5 px-2.5 border-r border-slate-100">
                  {tx.transaction_type}
                </td>
                <td className="py-0.5 px-2.5 border-r border-slate-100">
                  {formatDate(tx.date)}
                </td>
                <td className="py-0.5 px-2.5 border-r border-slate-100 text-right">
                  {formatCurrency(tx.total_amount)}
                </td>
                <td className="py-0.5 px-2.5 border-r border-slate-100 text-right font-bold text-emerald-700">
                  {tx.point_amount.toFixed(2)}
                </td>
                <td className="py-0.5 px-2.5 text-slate-600">
                  {tx.notes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4. BOTTOM BAR (Sisa Point, Ambil Point Buttons) */}
      <div className="shrink-0 flex items-center justify-between bg-white p-2 rounded border border-slate-200 shadow-2xs text-[11px]">
        <div className="flex items-center gap-1.5">
          <label className="text-slate-700 font-bold whitespace-nowrap">Sisa Point :</label>
          <input
            type="text"
            value={totalPoints.toFixed(2)}
            disabled
            className="h-6 w-24 px-2 border border-slate-300 rounded text-right bg-slate-50 font-bold text-emerald-700"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => alert("Fitur Ambil/Tukar Poin Pelanggan")}
            className="h-6 px-3 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ambil Poin</span>
          </button>
          <button
            type="button"
            onClick={() => alert("Hapus Ambil Poin")}
            className="h-6 px-3 bg-white hover:bg-slate-50 border border-red-300 text-red-600 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus Ambil Poin</span>
          </button>
        </div>
      </div>
    </div>
  );
}
