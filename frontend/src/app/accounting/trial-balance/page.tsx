"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { api, formatCurrency } from "@/lib/api";

export default function TrialBalancePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["trial-balance"],
    queryFn: async () => {
      const res = await api.get("/accounting/trial-balance");
      return res.data?.data;
    },
  });

  const rows = data?.rows || [];
  const totalDebit = data?.total_debit || 0;
  const totalCredit = data?.total_credit || 0;
  const isBalanced = data?.is_balanced;

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none">
      <div className="shrink-0 flex items-center justify-between border-b border-slate-200 pb-1">
        <div>
          <h1 className="text-sm font-bold text-slate-800">Neraca Saldo (Trial Balance)</h1>
          <p className="text-[11px] text-slate-500">Verifikasi keseimbangan saldo debit dan kredit seluruh akun buku besar.</p>
        </div>
        <div>
          {isBalanced ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Neraca Seimbang (Balanced)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-50 text-red-800 border border-red-200 text-[11px] font-bold">
              <AlertCircle className="w-3.5 h-3.5 text-red-600" />
              <span>Neraca Tidak Seimbang!</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white rounded border border-slate-300 overflow-auto shadow-2xs">
        <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
          <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 shadow-2xs h-6">
            <tr>
              <th className="py-0.5 px-3 border-r border-slate-200">Kode Akun</th>
              <th className="py-0.5 px-3 border-r border-slate-200">Nama Akun Rekening</th>
              <th className="py-0.5 px-3 border-r border-slate-200">Tipe Akun</th>
              <th className="py-0.5 px-3 text-right border-r border-slate-200">Debit (IDR)</th>
              <th className="py-0.5 px-3 text-right">Kredit (IDR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
            {isLoading ? (
              <tr><td colSpan={5} className="py-8 text-center text-slate-400 font-sans">Menghitung neraca saldo...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-slate-400 font-sans">Belum ada akun terdaftar.</td></tr>
            ) : (
              rows.map((r: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50 transition h-6">
                  <td className="py-0.5 px-3 font-mono font-bold text-slate-900 border-r border-slate-200">{r.code}</td>
                  <td className="py-0.5 px-3 font-semibold text-slate-800 border-r border-slate-200">{r.name}</td>
                  <td className="py-0.5 px-3 text-slate-600 border-r border-slate-200">{r.type}</td>
                  <td className="py-0.5 px-3 text-right font-mono text-slate-900 font-bold border-r border-slate-200">
                    {r.debit > 0 ? formatCurrency(r.debit) : "-"}
                  </td>
                  <td className="py-0.5 px-3 text-right font-mono text-slate-900 font-bold">
                    {r.credit > 0 ? formatCurrency(r.credit) : "-"}
                  </td>
                </tr>
              ))
            )}
            <tr className="sticky bottom-0 bg-slate-100 font-black border-t-2 border-slate-300 h-6">
              <td colSpan={3} className="py-0.5 px-3 font-sans text-slate-800 uppercase font-bold border-r border-slate-200">
                Total Neraca Saldo:
              </td>
              <td className="py-0.5 px-3 text-right font-mono text-emerald-700 border-r border-slate-200">{formatCurrency(totalDebit)}</td>
              <td className="py-0.5 px-3 text-right font-mono text-emerald-700">{formatCurrency(totalCredit)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
