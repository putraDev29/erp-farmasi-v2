"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api, formatCurrency } from "@/lib/api";

export default function BalanceSheetPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["balance-sheet"],
    queryFn: async () => {
      const res = await api.get("/accounting/balance-sheet");
      return res.data?.data;
    },
  });

  if (isLoading) {
    return <div className="p-12 text-center text-slate-400 text-xs">Menghitung neraca keuangan...</div>;
  }

  const assets = data?.asset_accounts || [];
  const liabilities = data?.liability_accounts || [];
  const equities = data?.equity_accounts || [];

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none">
      <div className="shrink-0 flex items-center justify-between border-b border-slate-200 pb-1">
        <div>
          <h1 className="text-sm font-bold text-slate-800">Neraca Keuangan (Balance Sheet)</h1>
          <p className="text-[11px] text-slate-500">Posisi harta aktiva, kewajiban utang, dan ekuitas modal apotek.</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-2 overflow-hidden">
        {/* Assets Side */}
        <div className="flex flex-col h-full bg-white p-2.5 rounded border border-slate-300 shadow-2xs min-h-0">
          <div className="shrink-0 border-b border-slate-200 pb-1.5 flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-800 uppercase">Aktiva (Harta / Aset)</h3>
            <span className="text-xs font-bold text-emerald-700 font-mono">{formatCurrency(data?.total_assets)}</span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 text-[11px] pr-1">
            {assets.map((a: any) => (
              <div key={a.id} className="py-1 flex justify-between">
                <span className="text-slate-800">{a.code} - {a.name}</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(a.balance)}</span>
              </div>
            ))}
          </div>

          <div className="shrink-0 pt-1.5 border-t border-slate-200 flex justify-between items-center font-bold text-xs bg-slate-50 p-1.5 rounded">
            <span>TOTAL AKTIVA:</span>
            <span className="font-mono text-emerald-700 text-xs">{formatCurrency(data?.total_assets)}</span>
          </div>
        </div>

        {/* Liabilities & Equity Side */}
        <div className="flex flex-col h-full bg-white p-2.5 rounded border border-slate-300 shadow-2xs min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1 text-[11px]">
            {/* Liabilities */}
            <div>
              <div className="border-b border-slate-200 pb-1 flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-800 uppercase">Kewajiban (Utang)</h3>
                <span className="text-xs font-bold text-red-600 font-mono">{formatCurrency(data?.total_liabilities)}</span>
              </div>

              <div className="divide-y divide-slate-100 text-[11px]">
                {liabilities.map((a: any) => (
                  <div key={a.id} className="py-1 flex justify-between">
                    <span className="text-slate-800">{a.code} - {a.name}</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(a.balance)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Equity */}
            <div>
              <div className="border-b border-slate-200 pb-1 flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-800 uppercase">Ekuitas (Modal)</h3>
                <span className="text-xs font-bold text-purple-700 font-mono">{formatCurrency(data?.total_equity)}</span>
              </div>

              <div className="divide-y divide-slate-100 text-[11px]">
                {equities.map((a: any) => (
                  <div key={a.id} className="py-1 flex justify-between">
                    <span className="text-slate-800">{a.code} - {a.name}</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(a.balance)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="shrink-0 pt-1.5 border-t border-slate-200 flex justify-between items-center font-bold text-xs bg-slate-50 p-1.5 rounded">
            <span>TOTAL PASIVA (UTANG + MODAL):</span>
            <span className="font-mono text-emerald-700 text-xs">{formatCurrency(data?.total_liab_equity)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
