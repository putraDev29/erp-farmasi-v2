"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, DollarSign } from "lucide-react";
import { api, formatCurrency } from "@/lib/api";

export default function ProfitAndLossPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["profit-and-loss"],
    queryFn: async () => {
      const res = await api.get("/accounting/profit-and-loss");
      return res.data?.data;
    },
  });

  if (isLoading) {
    return <div className="p-12 text-center text-slate-400 text-xs">Menghitung laporan laba rugi...</div>;
  }

  const revAccounts = data?.revenue_accounts || [];
  const cogsAccounts = data?.cogs_accounts || [];
  const expAccounts = data?.expense_accounts || [];

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none">
      <div className="shrink-0 flex items-center justify-between border-b border-slate-200 pb-1">
        <div>
          <h1 className="text-sm font-bold text-slate-800">Laporan Laba Rugi (Income Statement)</h1>
          <p className="text-[11px] text-slate-500">Kalkulasi pendapatan operasional, harga pokok penjualan, dan laba bersih.</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white rounded border border-slate-300 shadow-2xs p-3 space-y-3 overflow-y-auto max-w-4xl">
        {/* 1. Revenue Section */}
        <div>
          <h3 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">1. Pendapatan Penjualan</h3>
          <div className="divide-y divide-slate-100 text-[11px]">
            {revAccounts.map((a: any) => (
              <div key={a.id} className="py-1 flex justify-between">
                <span className="text-slate-800">{a.code} - {a.name}</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(a.balance)}</span>
              </div>
            ))}
            <div className="py-1 flex justify-between font-bold text-emerald-700 border-t border-slate-200">
              <span>Total Pendapatan:</span>
              <span className="font-mono">{formatCurrency(data?.total_revenue)}</span>
            </div>
          </div>
        </div>

        {/* 2. COGS Section */}
        <div>
          <h3 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">2. Beban Pokok Penjualan (HPP)</h3>
          <div className="divide-y divide-slate-100 text-[11px]">
            {cogsAccounts.map((a: any) => (
              <div key={a.id} className="py-1 flex justify-between">
                <span className="text-slate-800">{a.code} - {a.name}</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(a.balance)}</span>
              </div>
            ))}
            <div className="py-1 flex justify-between font-bold text-red-600 border-t border-slate-200">
              <span>Total HPP:</span>
              <span className="font-mono">({formatCurrency(data?.total_cogs)})</span>
            </div>
          </div>
        </div>

        {/* Gross Profit Highlight */}
        <div className="p-2.5 bg-emerald-50 rounded border border-emerald-200 flex justify-between items-center text-[11px]">
          <span className="font-bold text-emerald-900 uppercase">Laba Kotor (Gross Profit):</span>
          <span className="text-sm font-black text-emerald-700 font-mono">{formatCurrency(data?.gross_profit)}</span>
        </div>

        {/* 3. Operating Expenses */}
        <div>
          <h3 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">3. Beban Operasional & Administrasi</h3>
          <div className="divide-y divide-slate-100 text-[11px]">
            {expAccounts.map((a: any) => (
              <div key={a.id} className="py-1 flex justify-between">
                <span className="text-slate-800">{a.code} - {a.name}</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(a.balance)}</span>
              </div>
            ))}
            <div className="py-1 flex justify-between font-bold text-red-600 border-t border-slate-200">
              <span>Total Beban Operasional:</span>
              <span className="font-mono">({formatCurrency(data?.total_expense)})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Net Profit Highlight (Pinned bottom) */}
      <div className="shrink-0 p-2.5 bg-slate-900 text-white rounded flex justify-between items-center max-w-4xl">
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Laba Bersih Usaha (Net Profit)</span>
          <span className="text-[10px] text-emerald-400">Periode Berjalan</span>
        </div>
        <span className="text-base font-black text-emerald-400 font-mono">
          {formatCurrency(data?.net_profit)}
        </span>
      </div>
    </div>
  );
}
